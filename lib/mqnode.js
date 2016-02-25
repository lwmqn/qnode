var util = require('util'),
    crypto = require('crypto'),
    EventEmitter = require('events');

var _ = require('lodash'),
    mqtt = require('mqtt'),
    network = require('network'),
    mutils = require('lwmqn-util');

/**** Code Enumerations ****/
var TTYPE = { root: 0, obj: 1, inst: 2, rsc: 3 },
    CMD = { read: 0, write: 1, discover: 2, writeAttrs: 3, execute: 4, observe: 5, notify: 6, ping: 7 },
    TAG = { notfound: '_notfound_', unreadable: '_unreadable_', exec: '_exec_', unwritable: '_unwritable_', unexecutable: '_unexecutable_' },
    ERR = { success: 0, notfound: 1, unreadable: 2, unwritable: 3, unexecutable: 4, timeout: 5, badtype: 6 },
    RSP = { ok: 200, created: 201, deleted: 202, changed: 204, content: 205, badreq: 400,
            unauth: 401, notfound: 404, notallowed: 405, timeout: 408, conflict: 409 };

var privateListeners = {},
    reqTimeout = 60000;

function MqttNode(clientId, devAttrs) {
    devAttrs = devAttrs || {};
    if (!_.isString(clientId)) throw new TypeError('clientId should be a string.');
    if (!_.isPlainObject(devAttrs)) throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);

    var self = this,
        _transid = 0,
        // EventEmitter.listenerCount for MT7688 node@0.12.7
        lsnCounter = EventEmitter.listenerCount || this.listenerCount;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400;      // seconds
    this.ip = devAttrs.ip || null;
    this.mac = devAttrs.mac || null;
    this.version = devAttrs.version || 'v0.0.1';

    this.mc = null;         // mqtt client
    this.so = null;         // default smartobjects, initialize in _init()

    this._pubics = {};      // LWMQN interface to publish to, initialize in _init()
    this._subics = {};      // LWMQN interface to subscribe to, initialize in _init()
    this._tobjs = {};       // timeout objects for request control
    this._lfsecs = 0;       // lifetime counter
    this._updater = null;   // updating upon lifetime alarm
    this._repAttrs = {};    // collection of report settings
    this._reporters = {};   // collection of the enabled report senders
    this._connected = false;

    this._nextTransId = function (intf) {
        function nextid() {
            if (++_transid > 255) _transid = 0;
        }
        nextid();

        if (_.isString(intf))
            while (lsnCounter(intf + ':rsp:' + _transid) > 0) nextid();

        return _transid;
    };

    this.encrypt = function (msgStr, clientId) {         // Overide at will
        return msgStr;
    };

    this.decrypt = function (msgBuf, clientId) {         // Overide at will
        return msgBuf;
    };

    this._init();
}

util.inherits(MqttNode, EventEmitter);

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype._init = function () {
    var self = this;
    // set up default smartobjects
    this.so = {
        lwm2mServer: {
            0: {  // oid = 1
                shortServerId: null,        // rid = 0
                lifetime: this.lifetime,    // rid = 1
                defaultMinPeriod: 1,        // rid = 2
                defaultMaxPeriod: 60,       // rid = 3
                regUpdateTrigger: {         // rid = 8
                    exec: function () { self.pubRegister(); }   // [TODO] pub register?
                }
            }
        },
        device: {
            0: {       // oid = 3
                manuf: 'lwmqn',             // rid = 0
                model: 'MQ1',               // rid = 1
                reboot: {                   // rid = 4
                    exec: function () {}
                },
                availPwrSrc: 0,             // rid = 6
                pwrSrcVoltage: 5000,        // rid = 7
                devType: 'generic',         // rid = 17
                hwVer: 'v1',                // rid = 18
                swVer: 'v1'                 // rid = 19
            }
        },
        connMonitor: {
            0: {  // oid = 4
                ip: this.ip,                // rid = 4
                routeIp: ''                 // rid = 5
            }
        }
    };

    // get ip and mac if not given
    if (!this.ip || !this.mac) {
        network.get_active_interface(function(err, info) {
            self.ip = self.ip || info.ip_address;
            self.mac = self.mac || info.mac_address;
            self.so.connMonitor.ip = self.ip;
            self.so.connMonitor.routeIp = self.gateway_ip;
        });
    }

    // set up LWMQN interfaces
    _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
        self._pubics[intf] = intf + '/' + self.clientId;
        self._subics[intf] = intf + '/response/' + self.clientId;
    });
    this._pubics.response = 'response/' + this.clientId;
    this._subics.request = 'request/' + this.clientId;
    this._subics.announce = 'announce';

    // set up message handlers
    this.on('raw', function (topic, message, packet) {
        _rawHdlr(self, topic, message, packet);
    });

    this.on('_request', function (err, msg) {
        // process.nextTick(_reqHdlr, self, msg);
        process.nextTick(function () {  // for MT7688 node@0.12.7
            _reqHdlr(self, msg);
        });
    });

    this.on('_unconnected', function () {
        self._connected = false;
    });

    this.on('_connected', function () {
        self._connected = true;
        setTimeout(function () {
            _lwmqnSubAndReg(self); // subscribe LWMQN interfaces and register to Shepherd
        }, 600);
    });
};

MqttNode.prototype._has = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid), 
        has = false,
        rkey;

    if (!_.isUndefined(oid)) {
        has = !_.isUndefined(this.so[okey]);
        if (has && !_.isUndefined(iid)) {
            has = !_.isUndefined(this.so[okey][iid]);
            if (has && !_.isUndefined(rid)) {
                rkey = mutils.ridKey(oid, rid);
                has = !_.isUndefined(this.so[okey][iid][rkey]);
            }
        }
    }

    return has;
};

MqttNode.prototype._target = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid),
        trg = {
            type: null,
            exist: this._has(oid, iid, rid),
            value: null
        },
        rkey;

    if (!_.isNil(oid)) {
        trg.type = (oid === '') ? TTYPE.root : TTYPE.obj;
        if (!_.isNil(iid)) {
            trg.type = TTYPE.inst;
            if (!_.isNil(rid)) {
                trg.type = TTYPE.rsc;
                rkey = mutils.ridKey(oid, rid);
            }
        }
    }

    if (trg.exist) {
        if (trg.type === TTYPE.obj)
            trg.value = this.so[okey];
        else if (trg.type === TTYPE.inst)
            trg.value = this.so[okey][iid];
        else if (trg.type === TTYPE.rsc)
            trg.value = this.so[okey][iid][rkey];
    }
    return trg;
};

MqttNode.prototype._dumpObj = function (oid, iid, callback) {
    var self = this,
        okey = mutils.oidKey(oid),
        dump = {},
        obj = this.so[okey],
        count = 0;

    if (_.isFunction(iid)) {
        callback = iid;
        iid = undefined;
    }

    if (_.isNil(obj)) {
        dump = null;
    } else if (_.isUndefined(iid)) {    // dump object
        count = 0;
        _.forEach(obj, function (inst, ii) {
            dump[ii] = {};
            _.forEach(inst, function (r, rid) {
                count += 1;
            });
        });

        _.forEach(obj, function (inst, ii) {
            _.forEach(inst, function (r, rid) {
                self._readResrc(oid, ii, rid, function (err, val) {
                    dump[ii][mutils.ridNum(oid, rid)] = val;
                    count -= 1;
                    if (count === 0 && _.isFunction(callback))
                        callback(null, dump);
                });
            });
        });
    } else {    // dump instance
        count = 0;
        obj = this.so[okey][iid];
        if (_.isNil(obj)) {
            dump = null;
        } else {
            _.forEach(obj, function (r, rid) {
                count += 1;
            });
            _.forEach(obj, function (r, rid) {
                self._readResrc(oid, iid, rid, function (err, val) {
                    dump[mutils.ridNum(oid, rid)] = val;
                    count -= 1;
                    if (count === 0 && _.isFunction(callback))
                        callback(null, dump);
                });
            });
        }
    }
};

MqttNode.prototype._getAttrs = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        key,
        defaultAttrs;

    if (!trg.exist) return null;
    key = mutils.oidKey(oid);
    defaultAttrs = {
        pmin: this.so.lwm2mServer[0].defaultMinPeriod,
        pmax: this.so.lwm2mServer[0].defaultMaxPeriod,
        mute: true,
        cancel: true,
        lastRpVal: null
    };

    if (trg.type === TTYPE.inst)
        key = key + ':' + iid;
    else if (trg.type === TTYPE.rsc)
        key = key + ':' + iid + ':' + mutils.ridKey(oid, rid);

    this._repAttrs[key] = this._repAttrs[key] || defaultAttrs;
    return this._repAttrs[key];
};

MqttNode.prototype._setAttrs = function (oid, iid, rid, attrs) {
    var okey = mutils.oidKey(oid),
        rkey,
        key,
        trg;

    if (arguments.length === 4) {
        rkey = mutils.ridKey(oid, rid);
        key = okey + ':' + iid + ':' + rkey;
    } else if (arguments.length === 3) {
        attrs = rid;
        rid = undefined;
        key = okey + ':' + iid;
    } else if (arguments.length === 2) {
        attrs = iid;
        iid = undefined;
    }
    if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be given as an object.');

    trg = this._target(oid, iid, rid);
    if (!trg.exist) return false;

    // attrs with default settings
    attrs.pmin = _.isNumber(attrs.pmin) ? attrs.pmin : this.so.lwm2mServer[0].defaultMinPeriod;
    attrs.pmax = _.isNumber(attrs.pmax) ? attrs.pmax : this.so.lwm2mServer[0].defaultMaxPeriod;
    attrs.mute = _.isBoolean(attrs.mute) ? attrs.mute : true;
    attrs.cancel = _.isBoolean(attrs.cancel) ? attrs.cancel : true;

    this._repAttrs[key] = attrs;
    return true;
};

/*************************************************************************************************/
/*** Public Methods                                                                            ***/
/*************************************************************************************************/
MqttNode.prototype.connect = function (brokerUrl, opts) {
    var self = this,
        lsnEvtsToRemove = [ 'connect', 'message', 'reconnect', 'close', 'offline', 'error' ];

    opts = opts || {};

    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId))
        throw new Error('clientId cannot be changed.');

    opts = _.assign(opts, { clientId: this.clientId });
    this.mc = mqtt.connect(brokerUrl, opts);

    lsnEvtsToRemove.forEach(function (evt) {
        _removePrivateListeners(self.mc, evt);
    });

    _addPrivateListener(this.mc, 'connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });

    _addPrivateListener(this.mc, 'message', function (topic, message, packet) {
        self.emit('raw', topic, message, packet);
    });

    _addPrivateListener(this.mc, 'reconnect', function () {
        self.emit('reconnect');
    });

    _addPrivateListener(this.mc, 'close', function () {
        self.emit('close');
        self.emit('_unconnected');
    });

    _addPrivateListener(this.mc, 'offline', function () {
        self.emit('offline');
        self.emit('_unconnected');
    });

    _addPrivateListener(this.mc, 'error', function (err) {
        self.emit('error', err);
        self.emit('_unconnected');
    });

    return this;
};

MqttNode.prototype.close = function (force, callback) {
    if (this.mc)
        this.mc.end(force, callback);
    else if (_.isFunction(callback))
        callback();

    return this;
};

MqttNode.prototype.setDevAttrs = function (attrs, callback) {
    var self = this,
        localStatus,
        update = {};

    _.forEach(attrs, function (attr, key) {
        if (key === 'lifetime' && attrs.lifetime !== self.lifetime) {
            self.lifetime = self.so.lwm2mServer[0].lifetime = update.lifetime = attrs.lifetime;
            _lfUpdate(self, true);
        } else if (key === 'ip' && attrs.ip !== self.ip) {
            self.ip = self.so.connMonitor[0].ip = update.ip = attrs.ip;
        } else if (key === 'version' && attrs.version !== self.version) {
            self.version = update.version = attrs.version;
        } else if (key === 'mac' && attrs.mac !== self.mac) {
            localStatus = localStatus || RSP.notallowed;
        } else {
            localStatus = localStatus || RSP.badreq;
        }
    });

    if (_.isEmpty(update))
        localStatus = localStatus || RSP.ok;

    if (localStatus && _.isFunction(callback)) {
        callback(null, { status: localStatus });
        return this;
    } else {
        return this.pubUpdate(update);
    }
};

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    if (!_.isPlainObject(resrcs)) throw new TypeError('resrcs should be an object.');
    var self = this,
        okey = mutils.oidKey(oid);

    this.so[okey] = this.so[okey] || {};
    this.so[okey][iid] = this.so[okey][iid] || {};

    _.forEach(resrcs, function (r, rid) {
        if (_.isFunction(r)) throw new TypeError('resource cannot be a function.');
        var  rkey = mutils.ridKey(oid, rid);

        if (_.isObject(r))
            r._isCb = _.isFunction(r.read) || _.isFunction(r.write) || _.isFunction(r.exec);

        self.so[okey][iid][rkey] = r;
    });
    return this;
};

MqttNode.prototype.readResrc = function (oid, iid, rid, callback) {
    return _readResrc(this, false, oid, iid, rid, callback);
};

MqttNode.prototype._readResrc = function (oid, iid, rid, callback) {
    return _readResrc(this, true, oid, iid, rid, callback); // do access checking
};

MqttNode.prototype._writeResrc = function (chkaccess, oid, iid, rid, value, callback) {
    var self = this,
        okey = mutils.oidKey(oid),
        rkey = mutils.ridKey(oid, rid),
        trg = this._target(oid, iid, rid),
        resrc = trg.value,
        acnt = mutils.getAccessCtrl(oid, rid),
        writable = true;

    if (chkaccess && acnt)
        writable = (acnt === 'W' || acnt === 'RW') ? true : false;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            // process.nextTick(cb, err, data);
            process.nextTick(function () {
                cb(err, data);
            });

        if (!_.isNil(data))
            _checkAndReportResrc(self, oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.write))
            resrc.write(value, function (err, val) {
                invokeCb(err, val, callback);
            });
        else if (_.isFunction(resrc.exec))
            invokeCb(ERR.unwritable, TAG.exec, callback);
        else
            invokeCb(ERR.unwritable, null, callback);
    } else if (chkaccess && !writable) {
        invokeCb(ERR.unwritable, TAG.unwritable, callback);
    } else if (_.isObject(resrc)) {
        if (typeof resrc !== typeof value) {
            invokeCb(ERR.badtype, null, callback);
        } else {
            this.so[okey][iid][rkey] = value;
            invokeCb(ERR.success, value, callback);
        }
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unwritable, null, callback);
    } else {
        if (typeof resrc !== typeof value) {
            invokeCb(ERR.badtype, null, callback);
        } else {
            this.so[okey][iid][rkey] = value;
            invokeCb(ERR.success, value, callback);
        }
    }
};

MqttNode.prototype.writeResrc = function (oid, iid, rid, value, callback) {
    return this._writeResrc(false, oid, iid, rid, value, callback);
};

MqttNode.prototype.execResrc = function (oid, iid, rid, argus, callback) {
    var trg = this._target(oid, iid, rid);

    function invokeCb(status, data, cb) {
        if (_.isFunction(cb)) {
            // process.nextTick(cb, status, data);
            process.nextTick(function () {
                cb(status, data);
            });
        }
    }

    if (_.isFunction(argus)) {
        callback = argus;
        argus = [];
    }

    if (_.isUndefined(argus))
        argus = [];

    if (!trg.exist) {
        invokeCb(RSP.notfound, null, callback);
    } else if (!_.isArray(argus)) {
        invokeCb(RSP.badreq, null, callback);
    } else if (_.isObject(trg.value) && _.isFunction(trg.value.exec)) {
        argus.push(function (sta, val) {
            invokeCb(sta, val, callback);
        });
        trg.value.exec.apply(this, argus);
    } else {
        invokeCb(RSP.notallowed, TAG.unexecutable, callback);
    }
};

MqttNode.prototype.publish = function (topic, message, options, callback) {
    var self = this,
        originMsg = message;

    if (_.isFunction(options)) {
        callback = options;
        options = undefined;
    }

    options = options || { qos: 0, retain: false };

    if (!this.mc && _.isFunction(callback)) {
        callback(new Error('No mqtt client established.'), null);
        return this;
    }

    if (!this._connected) {
        callback(new Error('No connection.'), null);
        return this;
    }

    if (_.isPlainObject(message))
        message = JSON.stringify(message);

    if (!_.isString(message) && !Buffer.isBuffer(message) && _.isFunction(callback)) {
        callback(new TypeError('message should be a string or a buffer.'), null);
        return this;
    }

    message = this.encrypt(message, this.clientId);

    this.mc.publish(topic, message, options, function () {
        self.emit('published', { topic: topic, message: originMsg, options: options });
        if (_.isFunction(callback))
            callback(null, null);
    });
    return this;
};

MqttNode.prototype.subscribe = function (topics, opts, callback) {
    if (_.isFunction(opts)) {
        callback = opts;
        opts = { qos: 0 };
    }

    this.mc.subscribe(topics, opts, callback);   // function (err, granted)
    return this;
};

MqttNode.prototype.unsubscribe = function (topics, callback) {
    this.mc.unsubscribe(topics, callback);
    return this;
};

MqttNode.prototype.pubRegister = function (callback) {
    var objList = [];
    _.forEach(this.so, function (obj, oid) {
        _.forEach(obj, function (inst, iid) {
            var iidNum = parseInt(iid);
            iidNum = _.isNaN(iidNum) ? iid : iidNum;
            objList.push({ oid: mutils.oidNum(oid), iid: iidNum });
        });
    });

    return _pubReq(this, 'register', {
        transId: null,
        lifetime: this.lifetime,
        objList: objList,
        ip: this.ip,
        mac: this.mac,
        version: this.version
    }, callback);
};

MqttNode.prototype.pubDeregister = function (callback) {
    var self = this;
    return _pubReq(this, 'deregister', { data: null }, function (err, rsp) {
        if (!err && rsp.status === RSP.deleted)
            self.mc.end();

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    return _pubReq(this, 'update', _.omit(devAttrs, [ 'mac', 'clientId' ]), callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    var self = this;
    return _pubReq(this, 'notify', data, function (err, rsp) {
        if (rsp && rsp.cancel)
            self.disableReport(data.oid, data.iid, data.rid);
        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

MqttNode.prototype.pubResponse = function (rsp, callback) {
    return this.publish(this._pubics.response, rsp, callback);
};

MqttNode.prototype.pingServer = function (callback) {
    var txTime = (new Date()).getTime();
    return _pubReq(this, 'ping', { data: null }, function (err, rsp) {
        if (!err && rsp.status !== RSP.timeout)
            rsp.data = (new Date()).getTime() - txTime; // rxTime - txTime

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

MqttNode.prototype.enableReport = function (oid, iid, rid) {
    var self = this,
        trg = this._target(oid, iid, rid),
        rAttrs = this._getAttrs(oid, iid, rid),
        okey = mutils.oidKey(oid),
        rkey,
        rpid,
        pmin,
        pmax,
        rRpt,
        dumper,
        notify;

    if (!trg.exist) return false;

    if (trg.type === TTYPE.obj) {
        rpid = okey;
        dumper = function (cb) {
            self._dumpObj(oid, cb);
        };
        notify = { oid: mutils.oidNum(oid), data: null };
    } else if (trg.type === TTYPE.inst) {
        rpid = okey + ':' + iid;
        dumper = function (cb) {
            self._dumpObj(oid, iid, cb);
        };
        notify = { oid: mutils.oidNum(oid), iid: iid, data: null };
    } else if (trg.type === TTYPE.rsc) {
        rkey = mutils.ridKey(oid, rid);
        rpid = okey + ':' + iid + ':' + rkey;
        dumper = function (cb) {
            self._readResrc(oid, iid, rid, cb);
        };
        notify = { oid: mutils.oidNum(oid), iid: iid, rid: mutils.ridNum(rid), data: null };
    }

    pmin = rAttrs.pmin * 1000;
    pmax = rAttrs.pmax * 1000;

    rAttrs.cancel = false;
    rAttrs.mute = true;
    this._reporters[rpid] = { min: null, max: null, poller: null };
    rRpt = this._reporters[rpid];

    // if (trg.type === TTYPE.rsc) {
    //     rRpt.poller = setInterval(function () {
    //         self._readResrc(oid, iid, rid);     // just read it, _checkAndReportResrc() will be invoked
    //     }, rAttrs.pintvl || 500);
    // }

    rRpt.min = setTimeout(function () {
        if (pmin === 0) {             // if no pmin, just report at pmax triggered
            rAttrs.mute = false;
        } else {
            dumper(function (err, val) {
                rAttrs.mute = false;
                notify.data = val;
                self.pubNotify(notify);
            });
        }
    }, pmin);

    rRpt.max = setInterval(function () {
        rAttrs.mute = true;
        dumper(function (err, val) {
            rAttrs.mute = false;
            notify.data = val;
            self.pubNotify(notify);
        });

        if (!_.isNil(rRpt.min))
            clearTimeout(rRpt.min);

        rRpt.min = null;
        rRpt.min = setTimeout(function () {
            if (pmin === 0) {
                rAttrs.mute = false;
            } else {
                dumper(function (err, val) {
                    rAttrs.mute = false;
                    notify.data = val;
                    self.pubNotify(notify);
                });
            }
        }, pmin);
    }, pmax);

    return true;
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        rAttrs = this._getAttrs(oid, iid, rid),
        okey = mutils.oidKey(oid),
        rpid,
        rRpt;

    if (!trg.exist) return false;

    if (trg.type === TTYPE.obj)
        rpid = okey;
    else if (trg.type === TTYPE.inst)
        rpid = okey + ':' + iid;
    else if (trg.type === TTYPE.rsc)
        rpid = okey + ':' + iid + ':' + mutils.ridKey(oid, rid);

    rRpt = this._reporters[rpid];
 
    if (_.isNull(rAttrs))
        return false;

    if (_.isUndefined(rRpt))
        return true;

    rAttrs.cancel = true;
    rAttrs.mute = true;

    clearTimeout(rRpt.min);
    clearInterval(rRpt.max);
    clearInterval(rRpt.poller);

    rRpt.min = null;
    rRpt.max = null;
    rRpt.poller = null;
    rRpt = null;
    delete this._reporters[rpid];
    return true;
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function _addPrivateListener(emitter, evt, lsn) {
    privateListeners[evt] = privateListeners[evt] || [];
    privateListeners[evt].push({
        emitter: emitter,
        listener: lsn
    });
    emitter.on(evt, lsn);
}

function _removePrivateListeners(emitter, evt) {
    var lsnRecs = privateListeners[evt];

    if (lsnRecs && lsnRecs.length !== 0) {
        _.forEach(lsnRecs, function (rec) {
            if (rec.emitter === emitter)
                emitter.removeListener(evt, rec.listener);
        });

        _.remove(lsnRecs, function (rec) {
            return rec.emitter === emitter;
        });
    }

    if (lsnRecs && lsnRecs.length === 0) {
        lsnRecs = null;
        delete privateListeners[evt];
    }
}

function _lwmqnSubAndReg(qn) {
    var subics1 = [ qn._subics.register, qn._subics.deregister, qn._subics.request ],
        subics2 = [ qn._subics.notify, qn._subics.update, qn._subics.ping, qn._subics.announce ],
        regRsp;

    function sub2Callback(err, granted) {
        if (err)
            qn.emit('error', err);
        else
            qn.emit('registered', regRsp);  // life update taclked in _rawHdlr()
    }

    function sub1Callback(err, granted) {
        if (err) {
            qn.emit('error', err);
        } else {
            qn.pubRegister(function (err, rsp) {
                regRsp = rsp;
                if (err) 
                    qn.emit('error', err);
                else
                    qn.mc.subscribe(subics2, sub2Callback);
            });
        }
    }

    qn.mc.subscribe(subics1, sub1Callback);
}

function _reqTimeout(qn, key, delay) {
    qn._tobjs[key] = setTimeout(function () {
        qn.emit(key, null, { status: RSP.timeout });
        delete qn._tobjs[key];
    }, delay);
}

function _pubReq(qn, intf, data, callback) {
    var evt;
    data.transId = qn._nextTransId(intf);

    if (_.isFunction(callback)) {
        evt = intf + ':rsp:' + data.transId;
        _reqTimeout(qn, evt, reqTimeout);
        qn.once(evt, callback);
    }

    return qn.publish(qn._pubics[intf], data, function (err, rsp) {
        if (err) {
            qn.emit(evt, err, null);
            if (!_.isUndefined(qn._tobjs[evt])) {
                clearTimeout(qn._tobjs[evt]);
                delete qn._tobjs[evt];
            }
        }
    });
}

function _lfUpdate(qn, enable) {
    qn._lfsecs = 0;
    clearInterval(qn._updater);
    qn._updater = null;

    if (enable) {
        qn._updater = setInterval(function () {
            qn._lfsecs += 1;
            if (qn._lfsecs === qn.lifetime) {
                qn.pubUpdate({ lifetime: qn.lifetime });
                qn._lfsecs = 0;
            }
        }, 1000);
    }
}

function _checkAndReportResrc(qn, oid, iid, rid, currVal) {
    var rAttrs = qn._getAttrs(oid, iid, rid),
        rpt = false;

    if (_.isNil(rAttrs))
        return false;

    var gt = rAttrs.gt,
        lt = rAttrs.lt,
        step = rAttrs.step,
        lastrp = rAttrs.lastRpVal;

     if (rAttrs.cancel || rAttrs.mute)
        return false;

    if (_.isObject(currVal)) {
        if (_.isObject(rAttrs.lastRpVal)) {
            _.forEach(rAttrs.lastRpVal, function (v, k) {
                rpt = rpt || (v !== rAttrs.lastRpVal[k]);
            });
        } else {
            rpt = true;
        }
    } else if (!_.isNumber(currVal)) {
        rpt = rAttrs.lastRpVal !== currVal;
    } else {
        if (_.isNumber(gt) && _.isNumber(lt) && lt > gt) {
            rpt = (lastrp !== currVal) && (currVal > gt) && (currVal < lt);
        } else {
            rpt = _.isNumber(gt) && (lastrp !== currVal) && (currVal > gt);
            rpt = rpt || (_.isNumber(lt) && (lastrp !== currVal) && (currVal < lt));
        }

        if (_.isNumber(step)) {
            rpt = rpt || (Math.abs(currVal - lastrp) > step);
        }
    }

    if (rpt) {
        qn.pubNotify({ oid: oid, iid: iid, rid: rid, data: currVal });
        rAttrs.lastRpVal = currVal;
    }

    return rpt;
}

function _readResrc(qn, chkaccess, oid, iid, rid, callback) {
    var trg = qn._target(oid, iid, rid),
        resrc = trg.value,
        acnt = mutils.getAccessCtrl(oid, rid),
        readable = true;

    if (chkaccess && acnt)
        readable = (acnt === 'R' || acnt === 'RW') ? true : false;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            // process.nextTick(cb, err, data);
            process.nextTick(function () {
                cb(err, data);
            });

        if (!_.isNil(data)) _checkAndReportResrc(qn, oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.read))
            resrc.read(function (err, val) {
                invokeCb(err, val, callback);
            });
        else if (_.isFunction(resrc.exec))
            invokeCb(ERR.unreadable, TAG.exec, callback);
        else
            invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else if (chkaccess && !readable) {
        invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else if (_.isObject(resrc)) {
        invokeCb(ERR.success, resrc, callback);
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else {
        invokeCb(ERR.success, resrc, callback);
    }
}

function _reqHdlr(qn, msg) {
    var reqMsgHdlr,
        rtn = true,
        trg,
        rsp = {
            transId: null,
            cmdId: 'unknown',
            status: RSP.ok,
            data: null
        };

    if (_.isObject(msg)) {
        rsp = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: RSP.ok,
            data: null
        };
    }

    if (rsp.cmdId !== CMD.ping) {
        try {
            trg = qn._target(msg.oid, msg.iid, msg.rid);

            if (trg.type === TTYPE.root || _.isNil(msg.oid)) {
                rsp.status = RSP.badreq;  // Request Root is not allowed
            } else if (!trg.exist) {
                rsp.status = RSP.notfound;
            } else {
                rtn = false;
            }
            if (rtn) {
                qn.pubResponse(rsp);
                return;
            }
        } catch (e) {
            // [TODO] log it
            console.log('Bad command id: ' + rsp.cmdId + '. Decrption maybe fail');
            // console.log(e);
        }
    }

    switch (rsp.cmdId) {
        case CMD.read:
            reqMsgHdlr = _readReqHandler;
            break;
        case CMD.write:
            reqMsgHdlr = _writeReqHandler;
            break;
        case CMD.writeAttrs:
            reqMsgHdlr = _writeAttrsReqHandler;
            break;
        case CMD.discover:
            reqMsgHdlr = _discoverReqHandler;
            break;
        case CMD.execute:
            reqMsgHdlr = _executeReqHandler;
            break;
        case CMD.observe:
            reqMsgHdlr = _observeReqHandler;
            break;
        case CMD.ping:
            reqMsgHdlr = _pingReqHandler;
            break;
        default:
            reqMsgHdlr = _unknownReqHandler;
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(qn, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            qn.pubResponse(rsp);
        });
    });
}

function _rawHdlr(qn, topic, message, packet) {
    try {
        message = qn.decrypt(message, qn.clientId);
    } catch (e) {
        // [TODO] log 'decrytion fails'
        console.log('decrytion fails');
    }

    qn.emit('message', topic, message);

    var strmsg = (message instanceof Buffer) ? message.toString() : message,
        intf = mutils.slashPath(topic),
        jmsg,
        tid,
        _evt;

    if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
        jmsg = JSON.parse(strmsg);
        tid = jmsg.transId;
    }

    switch (intf) {
        case qn._subics.register:
            if (typeof jmsg === 'object') {
                _evt = 'register:rsp:' + tid;
                if (jmsg.status == RSP.ok || jmsg.status == RSP.created)
                    _lfUpdate(qn, true);
                else
                    _lfUpdate(qn, false);
            }
            break;
        case qn._subics.deregister:
            _evt = 'deregister:rsp:' + tid;
            break;
        case qn._subics.notify:
            _evt = 'notify:rsp:' + tid;
            break;
        case qn._subics.update:
            _evt = 'update:rsp:' + tid;
            break;
        case qn._subics.ping:
            _evt = 'ping:rsp:' + tid;
            break;
        case qn._subics.request:
            _evt = '_request';  //  No callbacks
            break;
        case qn._subics.announce:
            _evt = 'announce';  //  No callbacks
            jmsg = strmsg;
            break;
    }

    if (!_.isUndefined(_evt)) {
        qn.emit(_evt, null, jmsg);
        if (!_.isUndefined(qn._tobjs[_evt])) {
            clearTimeout(qn._tobjs[_evt]);
            delete qn._tobjs[_evt];
        }
    }
}

/********************************************/
/*** MqttNode Request Handlers            ***/
/********************************************/
function _readReqHandler(node, trg, msg, cb) {
    var status = RSP.content;

    if (trg.type === TTYPE.obj) {
        node._dumpObj(msg.oid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.inst) {
        node._dumpObj(msg.oid, msg.iid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.rsc) {
        node._readResrc(msg.oid, msg.iid, msg.rid, function (err, data) {
            if (err === ERR.unreadable)
                status = RSP.notallowed;

            cb(status, data);
        });
    }
}

function _writeReqHandler(node, trg, msg, cb) {
    // [TODO] 1. allow object and instance
    //        2. tackle access control in the near future

    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) {    // will support in the future
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.rsc) {
        node._writeResrc(true, msg.oid, msg.iid, msg.rid, msg.data, function (err, val) {
            if (err) {
                if (err === ERR.badtype)
                    cb(RSP.badreq, val);
                else
                    cb(RSP.notallowed, val);
            } else {
                cb(RSP.changed, val);
            }
        });
    }
}

function _discoverReqHandler(node, trg, msg, cb) {
    var attrs,
        resrcList = {};

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid));
        _.forEach(trg.value, function (inst, iid) {
            resrcList[iid] = [];
            _.forEach(inst, function (r, rid) {
                resrcList[iid].push(mutils.ridNum(msg.oid, rid));
            });
        });
        attrs.resrcList = resrcList;
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid, msg.rid));
    }

    cb(RSP.content, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
}

function _writeAttrsReqHandler(node, trg, msg, cb) {
    var badAttr = false,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'step', 'cancel', 'pintvl' ],
        attrs;

    if (!_.isPlainObject(msg.data)) {
        cb(RSP.badreq, null);
        return;
    }

    _.forEach(msg.data, function (n, k) {
        badAttr = badAttr || !_.includes(allowedAttrs, k);
    });

    if (badAttr) {
        cb(RSP.badreq, null);
        return;
    }

    // The availability has been checked in _reqHdlr
    if (trg.type === TTYPE.obj) {
        if (msg.data.cancel)
            node.disableReport(msg.oid);
        node._setAttrs(msg.oid, msg.data);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid);
        node._setAttrs(msg.oid, msg.iid, msg.data);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid, msg.rid);
        node._setAttrs(msg.oid, msg.iid, msg.rid, msg.data);
    }

    attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid, msg.rid));

    cb(RSP.changed,  _.omit(attrs, [ 'mute', 'lastRpVal' ]));
}

function _executeReqHandler(node, trg, msg, cb) {
    if (trg.type !== TTYPE.rsc) {
        cb(RSP.notallowed, null);
    } else {
        node.execResrc(msg.oid, msg.iid, msg.rid, msg.data, function (status, data) {
            status = status || RSP.changed;
            cb(status, data);
        });
    }
}

function _observeReqHandler(node, trg, msg, cb) {
    if (trg.type === TTYPE.obj) {
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.inst) {
        node.enableReport(msg.oid, msg.iid);
        cb(RSP.content);
    } else if (trg.type === TTYPE.rsc) {
        node.enableReport(msg.oid, msg.iid, msg.rid);
        cb(RSP.content);
    }
}

function _pingReqHandler(node, trg, msg, cb) {
    cb(RSP.ok);
}

function _unknownReqHandler(node, trg, msg, cb) {
    cb(RSP.badreq, null);
}

function _extendMutils(mut) {
    mut.soWithStringKeys = function (so) {
        var dumped = {};

        _.forEach(so, function (insts, oid) {
            var oidKey = mut.oidKey(oid);
            dumped[oidKey] = {};

            _.forEach(insts, function (resrcs, iid) {
                dumped[oidKey][iid] = {};
                _.forEach(resrcs, function (r, rid) {
                    var ridKey = mut.ridKey(oid, rid);
                    dumped[oidKey][iid][ridKey] = r;
                });
            });
        });
        return dumped;
    };

    return mut;
}

module.exports = MqttNode;
