var util = require('util'),
    crypto = require('crypto'),
    EventEmitter = require('events');

var _ = require('busyman'),
    SmartObject = require('smartobject');

var mqtt = require('mqtt'),
    mutils = require('lwmqn-util');

var init = require('./init');
    helper = require('./helper'),
    CNST = require('./constants');

/**** Code Enumerations ****/
var TTYPE = CNST.TTYPE,
    CMD = CNST.CMD,
    TAG = CNST.TAG,
    ERR = CNST.ERR,
    RSP = CNST.RSP;

function MqttNode(clientId, devAttrs) {
    var self = this,
        _transid = 0,
        lsnCounter;

    devAttrs = devAttrs || {};

    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');
    else if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);
    // EventEmitter.listenerCount for MT7688 node@0.12.7
    lsnCounter = EventEmitter.listenerCount || this.listenerCount;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400; // seconds
    this.ip = devAttrs.ip || null;
    this.mac = devAttrs.mac || null;
    this.version = devAttrs.version || 'v0.0.1';

    this.mc = null;         // mqtt client
    this.so = new SmartObject();    // default smartobjects, initialize in _init()

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
            if (++_transid > 255)
                _transid = 0;
        }
        nextid();

        if (_.isString(intf)) {
            while (lsnCounter(intf + ':rsp:' + _transid) > 0)
                nextid();
        }

        return _transid;
    };

    this.encrypt = function (msgStr, clientId, callback) {  // Overide at will
        callback(null, msgStr);
    };

    this.decrypt = function (msgBuf, clientId, callback) {  // Overide at will
        callback(null, msgBuf);
    };

    init(this);
}

util.inherits(MqttNode, EventEmitter);

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
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
        callback(null, dump);
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

    if (!trg.exist)
        return undefined;

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

    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should be given as an object.');

    trg = this._target(oid, iid, rid);

    if (!trg.exist)
        return false;

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

    if (!_.has(opts, 'reconnectPeriod'))
        opts.reconnectPeriod = 3000;

    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId))
        throw new Error('clientId cannot be changed.');

    opts = _.assign(opts, { clientId: this.clientId });

    this.mc = mqtt.connect(brokerUrl, opts);

    lsnEvtsToRemove.forEach(function (evt) {
        helper._removePrivateListeners(self.mc, evt);
    });

    helper._addPrivateListener(this.mc, 'connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });

    helper._addPrivateListener(this.mc, 'message', function (topic, message, packet) {
        self.emit('raw', topic, message, packet);
    });

    helper._addPrivateListener(this.mc, 'reconnect', function () {
        self.emit('reconnect');
    });

    helper._addPrivateListener(this.mc, 'close', function () {
        self.emit('close');
        self.emit('_unconnected');
    });

    helper._addPrivateListener(this.mc, 'offline', function () {
        self.emit('offline');
        self.emit('_unconnected');
    });

    helper._addPrivateListener(this.mc, 'error', function (err) {
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
        if (key === 'lifetime') {
            self.lifetime = self.so.lwm2mServer[0].lifetime = update.lifetime = attrs.lifetime;
            helper._lfUpdate(self, true);
        } else if (key === 'ip') {
            self.ip = self.so.connMonitor[0].ip = update.ip = attrs.ip;
        } else if (key === 'version') {
            self.version = update.version = attrs.version;
        } else if (key === 'mac' || key === 'clientId') {
            localStatus = localStatus || RSP.notallowed;
        } else {
            localStatus = localStatus || RSP.badreq;
        }
    });

    if (_.isEmpty(update))
        localStatus = localStatus || RSP.ok;

    if (localStatus && _.isFunction(callback))
        callback(null, { status: localStatus });
    else
        this.pubUpdate(update, callback);

    return this;
};

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    var self = this,
        okey;

    if (!_.isPlainObject(resrcs))
        throw new TypeError('resrcs should be an object.');

    okey = mutils.oidKey(oid);
    this.so[okey] = this.so[okey] || {};
    this.so[okey][iid] = this.so[okey][iid] || {};

    _.forEach(resrcs, function (r, rid) {
        var  rkey;

        if (_.isFunction(r))
            throw new TypeError('resource cannot be a function.');

        rkey = mutils.ridKey(oid, rid);

        if (_.isObject(r))
            r._isCb = _.isFunction(r.read) || _.isFunction(r.write) || _.isFunction(r.exec);

        self.so[okey][iid][rkey] = r;
    });

    return this;
};

MqttNode.prototype.readResrc = function (oid, iid, rid, callback) {
    return helper._readResrc(this, false, oid, iid, rid, callback);
};

MqttNode.prototype.writeResrc = function (oid, iid, rid, value, callback) {
    return helper._writeResrc(this, false, oid, iid, rid, value, callback);
};

MqttNode.prototype._readResrc = function (oid, iid, rid, callback) {
    return helper._readResrc(this, true, oid, iid, rid, callback);              // do access checking if remotely read
};

MqttNode.prototype._writeResrc = function (oid, iid, rid, value, callback) {    // do access checking if remotely write
    return helper._writeResrc(this, true, oid, iid, rid, value, callback);
};

MqttNode.prototype.execResrc = function (oid, iid, rid, argus, callback) {
    var trg = this._target(oid, iid, rid);

    function invokeCb(status, data, cb) {
        if (_.isFunction(cb)) {
            // don't use process.nextTick(cb, status, data), mt7688 not support (node.js too old)
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

    this.encrypt(message, this.clientId, function (err, encrypted) {
        if (!err) {
            self.mc.publish(topic, encrypted, options, function () {
                self.emit('published', { topic: topic, message: encrypted, options: options });
                if (_.isFunction(callback))
                    callback(null, null);
            });
        } else {
             callback(err);
        }
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

    console.log('PUB REG');

    return helper._pubReq(this, 'register', {
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

    return helper._pubReq(this, 'deregister', { data: null }, function (err, rsp) {
        if (!err && rsp.status === RSP.deleted)
            self.mc.end();

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    return helper._pubReq(this, 'update', _.omit(devAttrs, [ 'mac', 'clientId' ]), callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    var self = this;

    return helper._pubReq(this, 'notify', data, function (err, rsp) {
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

    return helper._pubReq(this, 'ping', { data: null }, function (err, rsp) {
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

    // WE DONT USE POLLER AT THIS MOMENT, BUT KEEP THIS SNIPPET HERE
    // if (trg.type === TTYPE.rsc) {
    //     rRpt.poller = setInterval(function () {
    //         self._readResrc(oid, iid, rid);     // just read it, helper._checkAndReportResrc() will be invoked
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

    if (!trg.exist)
        return false;

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
function _init(qn) {
    // set up default smartobjects
    qn.so = {
        lwm2mServer: {
            0: {  // oid = 1
                shortServerId: null,        // rid = 0
                lifetime: qn.lifetime,      // rid = 1
                defaultMinPeriod: 1,        // rid = 2
                defaultMaxPeriod: 60,       // rid = 3
                regUpdateTrigger: {         // rid = 8
                    exec: function () { qn.pubRegister(); }   // [TODO] pub register?
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
                ip: qn.ip,                  // rid = 4
                routeIp: ''                 // rid = 5
            }
        }
    };

    // get ip and mac if not given
    if (!qn.ip || !qn.mac) {
        network.get_active_interface(function(err, info) {
            qn.ip = info.ip_address;
            qn.mac = info.mac_address;
            qn.so.connMonitor.ip = qn.ip;
            qn.so.connMonitor.routeIp = qn.gateway_ip;
        });
    }

    // set up LWMQN interfaces
    _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
        qn._pubics[intf] = intf + '/' + qn.clientId;
        qn._subics[intf] = intf + '/response/' + qn.clientId;
    });
    qn._pubics.response = 'response/' + qn.clientId;
    qn._subics.request = 'request/' + qn.clientId;
    qn._subics.announce = 'announce';

    // set up message handlers
    qn.on('raw', function (topic, message, packet) {
        helper._rawHdlr(qn, topic, message, packet);
    });

    qn.on('_request', function (err, msg) {
        process.nextTick(function () {          // for MT7688 node@0.12.7
            helper._reqHdlr(qn, msg);
        });
    });

    qn.on('_unconnected', function () {
        qn._connected = false;
    });

    qn.on('_connected', function () {
        qn._connected = true;
        setTimeout(function () {
            if (qn._connected)
                helper._lwmqnSubAndReg(qn);     // subscribe LWMQN interfaces and register to Shepherd
        }, 200);
    });

    return true;
}

module.exports = MqttNode;
