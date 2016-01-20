'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      network = require('network'),
      mqtt = require('mqtt'),
      mutils = require('./utils/mutils');

/**** Code Enumerations ****/
const TTYPE = { root: 0, obj: 1, inst: 2, rsc: 3 },
      CMD = { read: 0, write: 1, discover: 2, writeAttrs: 3, execute: 4, observe: 5, notify: 6 },
      TAG = { notfound: '_notfound_', unreadable: '_unreadable_', exec: '_exec_', unwritable: '_unwritable_' },
      ERR = { success: 0, notfound: 1, unreadable: 2, unwritable: 3, unexecutable: 4, timeout: 5, noclient: 6 },
      RSP = { ok: 200, created: 201, deleted: 202, changed: 204, content: 205, badreq: 400,
              unauth: 401, notfound: 404, notallowed: 405, conflict: 409 };

var privateListeners = {},
    reqTimeout = 60000,
    lock = false;   // lock for publish requests

function MqttNode(clientId, devAttrs) {
    devAttrs = devAttrs || {};
    if (!_.isString(clientId)) throw new TypeError('clientId should be a string.');
    if (!_.isPlainObject(devAttrs)) throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);

    var self = this,
        _transid = 0;

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

    this._init();

    this._nextTransId = function (intf) {
        function nextid() {
            if (++_transid > 255) _transid = 0;
        }
        nextid();

        if (_.isString(intf))
            while (this.listenerCount(intf + ':rsp:' + _transid) > 0) nextid();

        return _transid;
    };

    this.encrypt = function (msg) {         // Overide at will
        return msg;
    };

    this.decrypt = function (msg) {         // Overide at will
        return msg;
    };
}

util.inherits(MqttNode, EventEmitter);

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype._init = function () {
    var self = this;
    // set up default smartobjects
    this.so = {
        lwm2mServer: {  // oid = 1
            shortServerId: null,        // rid = 0
            lifetime: this.lifetime,    // rid = 1
            defaultMinPeriod: 1,        // rid = 2
            defaultMaxPeriod: 60,       // rid = 3
            regUpdateTrigger: {         // rid = 8
                exec: function () { self.pubRegister(); }   // [TODO] pub register?
            }
        },
        device: {       // oid = 3
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
        },
        connMonitor: {  // oid = 4
            ip: this.ip,                // rid = 4
            routeIp: ''                 // rid = 5
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
        process.nextTick(self._rawHdlr, topic, message, packet);
    });

    this.on('_request', function () {
        self._reqHdlr();
    });

    this.on('_connected', function () {
        setTimeout(function () {
            self._lwmqnSubAndReg(); // subscribe LWMQN interfaces and register to Shepherd
        }, 600);
    });
};

// [TODO] callback signature?
MqttNode.prototype._lwmqnSubAndReg = function () {
    var self = this,
        subTopics = _.map(this._subics, function (t) {
            return t;
        });

    this.mc.subscribe(subTopics, function (err, granted) {
        if (err) {
            self.emit('error', err);
        } else {
            // after subscription, register to Shepherd server
            self.pubRegister(function (err, rsp) {
                if (err)
                    self.emit('error', err);
                else
                    self.emit('registered', rsp);
            });
        }
    });
};

MqttNode.prototype._has = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid), 
        has = false,
        rkey;

    if (arguments.length === 1) {
        has = !_.isUndefined(this.so[okey]);
    } else if (arguments.length === 2) {
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]);
    } else if (arguments.length === 3) {
        rkey = mutils.ridKey(oid, rid);
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]) && !_.isUndefined(this.so[okey][iid][rid]);
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

    if (!_.isNil(oid))
        trg.type = (oid === '') ? TTYPE.root : TTYPE.obj;

    if (!_.isNil(iid))
        trg.type = TTYPE.inst;

    if (!_.isNil(rid)) {
        trg.type = TTYPE.rsc;
        rkey = mutils.ridKey(oid, rid);
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

MqttNode.prototype._reqTimeout = function (key, delay) {
    this._tobjs[key] = setTimeout(function () {
        this.emit(key, { status: ERR.timeout });
        delete this._tobjs[key];
    }, delay);
};

MqttNode.prototype._pubReq = function (intf, data, callback) {
    var self = this,
        evt;

    data.transId = this._nextTransId(intf);
    if (_.isFunction(callback)) {
        evt = intf + ':rsp:' + data.transId;
        this._reqTimeout(evt, reqTimeout);
        this.once(evt, callback);
    }

    return this.publish(this._pubics[intf], data, function (err, rsp) {
        if (err) {
            self.emit(evt, err, null);
            if (!_.isUndefined(self._tobjs[evt])) {
                clearTimeout(self._tobjs[evt]);
                delete self._tobjs[evt];
            }
        }
    });
};

MqttNode.prototype._readResrc = function (chk, oid, iid, rid, callback) {
    var self = this,
        trg = this._target(oid, iid, rid),
        resrc = trg.value;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            process.nextTick(cb, err, data);

        if (chk && !_.isNil(data)) self._chkResrc(oid, iid, rid, data);
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
            invokeCb(ERR.unreadable, null, callback);
    } else if (_.isObject(resrc)) {
        invokeCb(ERR.success, resrc, callback);
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unreadable, null, callback);
    } else {
        invokeCb(ERR.success, resrc, callback);
    }
};

MqttNode.prototype._checkAndReportResrc = function (oid, iid, rid, currVal) {
    var rAttrs = this.getAttrs(oid, iid, rid),
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

    return rpt;
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
                self.readResrc(oid, ii, rid, function (err, val) {
                    dump[ii][mutils.ridNumber(oid, rid)] = val;
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
                self.readResrc(oid, iid, rid, function (err, val) {
                    dump[iid][mutils.ridNumber(oid, rid)] = val;
                    count -= 1;
                    if (count === 0 && _.isFunction(callback))
                        callback(null, dump);
                });
            });
        }
    }
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
        removePrivateListeners(this.mc, evt);
    });

    addPrivateListener(this.mc, 'connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });
    addPrivateListener(this.mc, 'message', function (topic, message, packet) {
        self.emit('raw', topic, message, packet);
    });
    addPrivateListener(this.mc, 'reconnect', function () {
        self.emit('reconnect');
    });
    addPrivateListener(this.mc, 'close', function () {
        self.emit('close');
    });
    addPrivateListener(this.mc, 'offline', function () {
        self.emit('offline');
    });
    addPrivateListener(this.mc, 'error', function (err) {
        self.emit('error', err);
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

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    if (!_.isPlainObject(resrcs)) throw new TypeError('resrcs should be an object.');
    var okey = mutils.oidKey(oid);

    this.so[okey] = this.so[okey] || {};
    this.so[okey][iid] = this.so[okey][iid] || {};

    _.forEach(resrcs, function (r, rid) {
        if (_.isFunction(r)) throw new TypeError('resource cannot be a function.');
        var  rkey = mutils.ridKey(oid, rid);

        if (_.isObject(r))
            r._isCb = _.isFunction(r.read) || _.isFunction(r.write) || _.isFunction(r.exec);

        this.so[okey][iid][rkey] = r;
    });
    return this;
};

MqttNode.prototype.getAttrs = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        key,
        defaultAttrs;

    if (!trg.exist) return null;
    key = mutils.oidKey(oid);
    defaultAttrs = {
        pmin: this.so.lwm2mServer.defaultMinPeriod,
        pmax: this.so.lwm2mServer.defaultMaxPeriod,
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

MqttNode.prototype.setAttrs = function (oid, iid, rid, attrs) {
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
    attrs.pmin = _.isNumber(attrs.pmin) ? attrs.pmin : this.so.lwm2mServer.defaultMinPeriod;
    attrs.pmax = _.isNumber(attrs.pmax) ? attrs.pmax : this.so.lwm2mServer.defaultMaxPeriod;
    attrs.mute = _.isBoolean(attrs.mute) ? attrs.mute : true;
    attrs.cancel = _.isBoolean(attrs.cancel) ? attrs.cancel : true;

    this._repAttrs[key] = attrs;
    return true;
};

MqttNode.prototype.readResrc = function (oid, iid, rid, callback) {
    return this._readResrc(true, oid, iid, rid, callback);
};

MqttNode.prototype.writeResrc = function (oid, iid, rid, value, callback) {
    var self = this,
        okey = mutils.oidKey(oid),
        rkey = mutils.ridKey(rid, rid),
        trg = this._target(oid, iid, rid),
        resrc = trg.value;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            process.nextTick(cb, err, data);

        if (!_.isNil(data))
            self._chkResrc(oid, iid, rid, data);
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
    } else if (_.isObject(resrc)) {
        this.so[okey][iid][rkey] = value;
        invokeCb(ERR.success, resrc, callback);
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unwritable, null, callback);
    } else {
        this.so[okey][iid][rkey] = value;
        invokeCb(ERR.success, resrc, callback);
    }
};

MqttNode.prototype.execResrc = function (oid, iid, rid, argus, callback) {
    var trg = this._target(oid, iid, rid);

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            process.nextTick(cb, err, data);
    }

    if (_.isFunction(argus)) {
        callback = argus;
        argus = [];
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, { status: RSP.notfound }, callback);
    } else if (!_.isArray(argus)) {
        invokeCb(ERR.unexecutable, { status: RSP.badreq }, callback);
    } else if (_.isObject(trg.value) && _.isFunction(trg.value.exec)) {
        argus.push(function (err, val) {
            invokeCb(err, val, callback);
        });
        trg.value.exec.apply(this, argus);
    } else {
        invokeCb(ERR.unexecutable, { status: RSP.notallowed }, callback);
    }
};

MqttNode.prototype.pubRegister = function (callback) {
    var objList = [];
    _.forEach(this.so, function (obj, oid) {
        _.forEach(obj, function (inst, iid) {
            objList.push({ oid: mutils.oidNumber(oid), iid: iid });
        });
    });

    return this._pubReq('register', {
        transId: null,
        lifetime: this.lifetime,
        objList: objList,
        ip: this.ip,
        mac: this.mac,
        version: this.version
    }, callback);
};

MqttNode.prototype.pubDeregister = function (callback) {
    return this._pubReq('deregister', { data: null }, callback);
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    // Change of mac address at runtime will be ignored
    return this._pubReq('update', _.omit(devAttrs, 'mac'), callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    var self = this;
    return this._pubReq('notify', data, function (err, rsp) {
        if (rsp.cancel)
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
    return this._pubReq('ping', { data: null }, function (err, rsp) {
        if (!err)
            rsp.data = (new Date()).getTime() - txTime; // rxTime - txTime
        if (_.isFunction(callback))
            callback(err, rsp);
    });
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

    if (_.isPlainObject(message))
        message = JSON.stringify(message);

    if (!_.isString(message) && !Buffer.isBuffer(message) && _.isFunction(callback)) {
        callback(new TypeError('message should be a string or a buffer.'), null);
        return this;
    }

    message = this.encrypt(message);

    this.mc.publish(topic, message, options, function () {
        self.emit('published', { topic: topic, message: originMsg, options: options });
        if (_.isFunction(callback))
            callback(null, null);
    });
    return this;
};

MqttNode.prototype._rawHdlr = function (topic, message, packet) {
    var strmsg = this.decrypt(message),
        intf = mutils.slashPath(topic),
        jmsg,
        tid,
        _evt;

    if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
        jmsg = JSON.parse(strmsg);
        tid = jmsg.transId;
    }

    switch (intf) {
        case this._subics.register:
            _evt = 'register:rsp:' + tid;
            if (jmsg.status == RSP.ok || jmsg.status == RSP.created) {
                this._lfUp(true);
            } else {
                this._lfUp(false);
            }
            break;
        case this._subics.deregister:
            _evt = 'deregister:rsp:' + tid;
            break;
        case this._subics.notify:
            _evt = 'notify:rsp:' + tid;
            break;
        case this._subics.update:
            _evt = 'update:rsp:' + tid;
            break;
        case this._subics.ping:
            _evt = 'ping:rsp:' + tid;
            break;
        case this._subics.request:
            _evt = '_request';  //  No callbacks
            break;
        case this._subics.announce:
            _evt = 'announce';  //  No callbacks
            jmsg = strmsg;
            break;
    }

    if (!_.isUndefined(_evt)) {
        this.emit(_evt, jmsg);
        if (!_.isUndefined(this._tobjs[_evt])) {
            clearTimeout(this._tobjs[_evt]);
            delete this._tobjs[_evt];
        }
    }

    this.emit('message', topic, strmsg);
};

MqttNode.prototype._reqHdlr = function (msg) {
    var self = this,
        reqMsgHdlr,
        rsp = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: RSP.ok,
            data: null
        };
    var rtn = true;

    var trg = this._target(msg.oid, msg.iid, msg.rid);

    if (trg.type === TTYPE.root || _.isNil(msg.oid)) {
        rsp.status = RSP.badreq;  // Request Root is not allowed
    } else if (!trg.exist) {
        rsp.status = RSP.notfound;
    } else {
        rtn = false;
    }

    if (rtn) {
        this.pubResponse(rsp);
        return;
    }

    switch (msg.cmdId) {
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
        case CMD.observe:
            reqMsgHdlr = _observeReqHandler;
            break;
        default:
            reqMsgHdlr = _unknownReqHandler;
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(self, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            self.pubResponse(rsp);
        });
    });
};

MqttNode.prototype.enableReport = function (oid, iid, rid) {
    var self = this,
        trg = this._target(oid, iid, rid),
        rAttrs = this.getAttrs(oid, iid, rid),
        okey = mutils.oidKey(oid),
        rkey,
        rpid,
        pmin,
        pmax,
        rRpt,
        dumper;

    if (!trg.exist) return false;

    if (trg.type === TTYPE.obj) {
        rpid = okey;
        dumper = function (cb) {
            self._dumpObj(oid, cb);
        };
    } else if (trg.type === TTYPE.inst) {
        rpid = okey + ':' + iid;
        dumper = function (cb) {
            self._dumpObj(oid, iid, cb);
        };
    } else if (trg.type === TTYPE.rsc) {
        rkey = mutils.ridKey(oid, rid);
        rpid = okey + ':' + iid + ':' + rkey;
        dumper = function (cb) {
            self.readResrc(oid, iid, rid, cb);
        };
    }

    pmin = rAttrs.pmin * 1000;
    pmax = rAttrs.pmax * 1000;

    rAttrs.cancel = false;
    rAttrs.mute = true;
    this._reporters[rpid] = { min: null, max: null, poller: null };
    rRpt = this._reporters[rpid];

    // _dumpObj = function (oid, iid, callback)
    rRpt.max = setInterval(function () {
        rAttrs.mute = true;
        dumper(function (err, val) {
            rAttrs.mute = false;
            self.pubNotify({ oid: mutils.oidNumber(oid), iid: iid, rid: mutils.ridNumber(rid), data: val });
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
                    self.pubNotify({ oid: mutils.oidNumber(oid), iid: iid, rid: mutils.ridNumber(rid), data: val });
                });
            }
        }, pmin);
    }, pmax);

    return true;
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        rAttrs = this.getAttrs(oid, iid, rid),
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

// [TODO]
MqttNode.prototype.subscribe = function (topic, qos, callback) {
    // if (type(qos) == 'function') then
    //     callback = qos
    //     qos = nil
    // end
    // self.mc:subscribe(topic, qos or 0, callback)
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function addPrivateListener(emitter, evt, lsn) {
    privateListeners[evt] = privateListeners[evt] || [];
    privateListeners[evt].push({
        emitter: emitter,
        listener: lsn
    });
    emitter.on(evt, lsn);
}

function removePrivateListeners(emitter, evt) {
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
        node.readResrc(msg.oid, msg.iid, msg.rid, function (err, data) {
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
        node.writeResrc(msg.oid, msg.iid, msg.rid, msg.data, function (err, val) {
            if (err)
                cb(RSP.notallowed, val);
            else
                cb(RSP.changed, val);
        });
    }
}

function _discoverReqHandler(node, trg, msg, cb) {
    var attrs,
        resrcList = {};

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid));
        _.forEach(trg.value, function (inst, iid) {
            resrcList[iid] = [];
            _.forEach(inst, function (r, rid) {
                resrcList[iid].push(mutils.ridNumber(msg.oid, rid));
            });
        });
        attrs.resrcList = resrcList;
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid, msg.rid));
    }

    cb(RSP.content, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
}

function _writeAttrsReqHandler(node, trg, msg, cb) {
    var badAttr = false,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'step', 'cancel', 'pintvl' ];

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
        node.setAttrs(msg.oid, msg.data);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid);
        node.setAttrs(msg.oid, msg.iid, msg.data);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid, msg.rid);
        node.setAttrs(msg.oid, msg.iid, msg.rid, msg.data);
    }

    cb(RSP.changed, null);
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
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.rsc) {
        node.enableReport(msg.oid, msg.iid, msg.rid);
        cb(RSP.content);
    }
}

function _unknownReqHandler(node, trg, msg, cb) {
    cb(RSP.badreq, null);
}

MqttNode.prototype._lfUp = function (enable) {
    this._lfsecs = 0;
    clearInterval(this._updater);
    this._updater = null;

    if (enable) {
        this._updater = setInterval(function () {
            this._lfsecs += 1;
            if (this._lfsecs === this.lifetime) {
                this.pubUpdate({ lifetime: this.lifetime });
                this._lfsecs = 0;
            }
        }, 1000);
    }
};