'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      network = require('network'),
      mqtt = require('mqtt'),
      mutils = require('./utils/mutils');

var TTYPE = { root: 0, obj: 1, inst: 2, rsc: 3 };
var CMD = { read: 0, write: 1, discover: 2, writeAttrs: 3, execute: 4, observe: 5, notify: 6 };
var TAG = { notfound: '_notfound_', unreadable: '_unreadable_', exec: '_exec_', unwritable: '_unwritable_' };
var ERR = { success: 0, notfound: 1, unreadable: 2, unwritable: 3, unexecutable: 4, timeout: 5, noclient: 6 };
var RSP = {
    ok: 200, created: 201, deleted: 202, changed: 204, content: 205, badreq: 400,
    unauth: 401, notfound: 404, notallowed: 405, conflict: 409
};

var privateListeners = {},
    reqTimeout = 30000,
    lifeUpdater;

function MqttNode(clientId, devAttrs) {
    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    devAttrs = devAttrs || {};
    if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);

    var self = this,
        transId = 0;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400;      // seconds
    this.ip = devAttrs.ip || null;
    this.mac = devAttrs.mac || null;
    this.version = devAttrs.version || '0.0.1';

    this.mc = null;     // mqtt client
    this.so = {         // smartobject default
        lwm2mServer: {
            shortServerId: null,
            lifetime: this.lifetime,
            defaultMinPeriod: 1,
            defaultMaxPeriod: 60,
            regUpdateTrigger: { exec:function ()  { self.pubRegister(); } }
        },
        device: {
            manuf: 'lwmqn',
            model: 'MQ1',
            reboot: { exec: function () { } },
            availPwrSrc: 0,
            pwrSrcVoltage: 5000,
            devType: 'generic',
            hwVer: 'v1',
            swVer: 'v1'},
        connMonitor: {
            ip: this.ip,
            routeIp: ''
        }
    };

    if (!this.ip || !this.mac) {
        network.get_active_interface(function(err, info) {
            if (err) {
                self.emit('error', err);
            } else {
                self.ip = self.ip || info.ip_address;
                self.mac = self.mac || info.mac_address;
            }
        });
    }

    this._repAttrs = {};
    this._tobjs = {};
    this._lfsecs = 0;
    this._updater = null;
    this._reporters = {};
    this._pubics = {};
    this._subics = {};

    _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
        self._pubics[intf] = intf + '/' + self.clientId;
        self._subics[intf] = intf + '/response/' + self.clientId;
    });
    this._pubics.response = 'response/' + this.clientId;
    this._subics.request = 'request/' + this.clientId;
    this._subics.announce = 'announce';

    this._nextTransId = function (intf) {
        function nextid() {
            transId = transId + 1;
            if (transId > 255)
                transId = 0;
        }

        nextid();
        if (_.isString(intf)) {
            while (this.listenerCount(intf + ':rsp:' + transId) > 0) {
                nextid();
            }
        }

        return transId;
    };

    this.encrypt = function (msg) {         // Overide at will
        return msg;
    };

    this.decrypt = function (msg) {         // Overide at will
        return msg;
    };

    //---------------- inner procedures -------------------

    this.on('raw', function () {
        self._rawHdlr();
    });

    this.on('_request', function () {
        self._reqHdlr();
    });

    this.on('_connected', function () {
        setTimeout(function () {
            self._connectedHandler();
        }, 600);
    });
}

util.inherits(MqttNode, EventEmitter);

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    var self = this,
        okey = mutils.oidKey(oid);

    this.so[okey] = this.so[okey] || {};
    this.so[okey][iid] = this.so[okey][iid] || {};

    _.forEach(resrcs, function (r, rid) {
        var  rkey = mutils.ridKey(oid, rid);
        if (!_.isFunction(r)) {
            this.so[okey][iid][rkey] = r;
            if (_.isObject(r))
                r._isCb = _.isFunction(r.read) || _.isFunction(r.write) || _.isFunction(r.exec);
        }
    });

    return this;
};

MqttNode.prototype.getAttrs = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        key = mutils.oidKey(oid),
        d4 = {
            pmin: this.so.lwm2mServer.defaultMinPeriod,
            pmax: this.so.lwm2mServer.defaultMaxPeriod,
            mute: true,
            cancel: true
        };

    if (!trg.exist)
        return null;

    if (trg.type === TTYPE.obj)
        key = key;
    else if (trg.type === TTYPE.inst)
        key = key + ':' + iid;
    else if (trg.type === TTYPE.rsc)
        key = key + ':' + iid + ':' + rid;

    this._repAttrs[key] = this._repAttrs[key] || d4;
    return this._repAttrs[key];
};

MqttNode.prototype.setAttrs = function (oid, iid, rid, attrs) {
    var key,
        rkey,
        okey = mutils.oidKey(oid);

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

    var trg = this._target(oid, iid, rid);
    if (!trg.exist)
        return false;

    attrs.pmin = attrs.pmin || this.so.lwm2mServer.defaultMinPeriod;
    attrs.pmax = attrs.pmax || this.so.lwm2mServer.defaultMaxPeriod;
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
            cb(err, data);

        if (!_.isNil(data))
            self._chkResrc(oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.write)) {
            resrc.write(value, function (err, val) {
                invokeCb(err, val, callback);
            });
        } else if (_.isFunction(resrc.exec)) {
            invokeCb(ERR.unwritable, TAG.exec, callback);
        } else {
            invokeCb(ERR.unwritable, null, callback);
        }
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
    var result,
        trg = this._target(oid, iid, rid);

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            cb(err, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, { status: RSP.notfound });
    } else if (_.isObject(trg.value) && _.isFunction(trg.value.exec)) {
        trg.value.exec.apply(this, argus, function (err, val) {
            invokeCb(err, val, callback);
        });  // [TODO] callbacks?
    } else {
        invokeCb(ERR.unexecutable, { status: RSP.notallowed });
    }
};

MqttNode.prototype._readResrc = function (chk, oid, iid, rid, callback) {
    var self = this,
        trg = this._target(oid, iid, rid),
        resrc = trg.value;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            cb(err, data);

        if (chk && !_.isNil(data))
            self._chkResrc(oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.read)) {
            resrc.read(function (err, val) {
                invokeCb(err, val, callback);
            });
        } else if (_.isFunction(resrc.exec)) {
            invokeCb(ERR.unreadable, TAG.exec, callback);
        } else {
            invokeCb(ERR.unreadable, null, callback);
        }
    } else if (_.isObject(resrc)) {
        invokeCb(ERR.success, resrc, callback);
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unreadable, null, callback);
    } else {
        invokeCb(ERR.success, resrc, callback);
    }
};


MqttNode.prototype._target = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid),
        rkey,
        trg = {
            type: null,
            exist: this._has(oid, iid, rid),
            value: null
        };

    if (!_.isNil(oid)) {
        if (oid === '')
            trg.type = TTYPE.root;
        else
            trg.type = TTYPE.obj;
    }

    if (!_.isNil(iid))
        trg.type = TTYPE.inst;

    if (!_.isNil(rid)) {
        trg.type = TTYPE.rsc;
        rkey = mutils.ridKey(oid, rid);
    }

    if (trg.exist) {
        switch (trg.type) {
            case TTYPE.obj:
                trg.value = this.so[okey];
                break;
            case TTYPE.inst:
                trg.value = this.so[okey][iid];
                break;
            case TTYPE.rsc:
                trg.value = this.so[okey][iid][rkey];
                break;
        }
    }

    return trg;
};

MqttNode.prototype._has = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid), 
        has = false,
        rkey;

    if (arguments.length === 3) {
        rkey = mutils.ridKey(oid, rid);
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]) && !_.isUndefined(this.so[okey][iid][rid]);
    } else if (arguments.length === 2) {
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]);
    } else if (arguments.length === 1) {
        has = !_.isUndefined(this.so[okey]);
    }
    return has;
};

MqttNode.prototype._reqTimeout = function (key, delay) {
    this._tobjs[key] = setTimeout(function () {
        this.emit(key, { status: ERR.timeout });
        delete this._tobjs[key];
    }, delay);
};

MqttNode.prototype._pubReq = function (intf, data, callback) {
    data.transId = this._nextTransId(intf);
    if (_.isFunction(callback)) {
        var k = intf + ':rsp:' + data.transId;
        this._reqTimeout(k, reqTimeout);
        this.once(k, callback);
    }

    this.publish(this._pubics[intf], data);
};

MqttNode.prototype.pubRegister = function (callback) {
    var data = {
            transId: null,
            lifetime: this.lifetime,
            objList: this.objectList(),
            ip: this.ip,
            mac: this.mac,
            version: this.version
        };

    return this._pubReq('register', data, callback);
};

MqttNode.prototype.pubDeregister = function (callback) {
    return this._pubReq('deregister', { data: null }, callback);
};


MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    if (_.has(devAttrs, 'mac')) {
        // [TODO] new Error('Change of mac address at runtime is not allowed.');
    }

    return this._pubReq('update', devAttrs, callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    return this._pubReq('notify', data, function (err, rsp) {
        if (rsp.cancel === true)
            this.disableReport(data.oid, data.iid, data.rid);
        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

MqttNode.prototype.pubResponse = function (rsp, callback) {
    this.publish(this._pubics.response, rsp, callback);
    return this;
};

MqttNode.prototype.pingServer = function (callback) {
    return this._pubReq('ping', { data: null }, callback);
};

MqttNode.prototype.publish = function (topic, message, options, callback) {
    var self = this;
    if (_.isFunction(options)) {
        callback = options;
        options = undefined;
    }

    options = options || {
        qos: 0,
        retain: false
    };

    if (!Buffer.isBuffer(message) && !_.isString(message)) {
        if (_.isObject(message))
            message = JSON.stringify(message);
        else
            message = message.toString();
    }

    message = this.encrypt(message);

    if (this.mc) {
        this.mc.publish(topic, message, options, function () {
            self.emit('published', {
                topic: topic,
                message: message,
                options: options
            });
            if (_.isFunction(callback))
                callback();
        });
    } else {
        // [TODO] err?
    }
    return this;
};

MqttNode.prototype._rawHdlr = function (conn, topic, message) {
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
            rsp.status = 400;
            reqMsgHdlr = function (node, msg) {
                node.publish(node._pubics.response, rsp);
            };
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(self, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            self.publish(self._pubics.response, rsp);
        });
    });
};


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
    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) {             // will support in the future
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.rsc) {
        node.writeResrc(msg.oid, msg.iid, msg.rid, msg.data, function (err, val) {
            if (err) {
                cb(RSP.notallowed, val);
            } else {
                cb(RSP.changed, val);
            }
        });
    }
}

function _discoverReqHandler(node, trg, msg, cb) {
    var attrs;

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid));
        attrs.resrcList = node.so.resrcList(msg.oid);
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid, msg.rid));
    }

    cb(RSP.content, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
}

function _writeAttrsReqHandler(node, trg, msg, cb) {
    var badAttr = false,
        allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'step', 'cancel', 'pintvl' ];

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

    // The availability has been checked in _requestMessageDispatcher()
    if (trg.type === TTYPE.obj) {
        if (_.has(msg.data, 'cancel'))
            msg.data.cancel = true;        // [TODO] will support reporting in the future
        node.setAttrs(msg.oid, msg.data);
    } else if (trg.type === TTYPE.inst) {
        if (_.has(msg.data, 'cancel'))
            msg.data.cancel = true;        // [TODO] will support reporting in the future
        node.setAttrs(msg.oid, msg.iid, msg.data);
    } else if (trg.type === TTYPE.rsc) {
        // cancel the observation of reporting
        if (_.has(msg.data, 'cancel') && msg.data.cancel)
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

MqttNode.prototype.enableReport = function (oid, iid, rid, attrs) {
    var okey = mutils.oidKey(oid),
        rkey = mutils.ridKey(oid, rid),
        trg = this._target(oid, iid, rid);
    if (!trg.exist) return false;

    var self = this;
    var rAttrs = this.getAttrs(oid, iid, rid);
    var rpid = okey + ':' + iid + ':' + rkey;
    var pmin = rAttrs.pmin * 1000,
        pmax = rAttrs.pmax * 1000,
        rRpt;

    rAttrs.cancel = false;
    rAttrs.mute = true;
    this._reporters[rpid] = { min: null, max: null, poller: null };
    rRpt = this._reporters[rpid];

    rRpt.max = setInterval(function () {
        rAttrs.mute = true;
        self.readResrc(oid, iid, rid, function (err, val) {
            rAttrs.mute = false;
            self.pubNotify({ oid: mutils.oidNumber(oid), iid: iid, rid: mutils.ridNumber(rid), data: val });
        });

        if (!_.isNil(rRpt.min)) {
            clearTimeout(rRpt.min);
        }

        rRpt.min = null;
        rRpt.min = setTimeout(function () {
            if (pmin === 0) {
                rAttrs.mute = false;
            } else {
                self.readResrc(oid, iid, rid, function (err, val) {
                    rAttrs.mute = false;
                    self.pubNotify({ oid: mutils.oidNumber(oid), iid: iid, rid: mutils.ridNumber(rid), data: val });
                });
            }
        }, pmin);
    }, pmax);

    return true;
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid),
        rkey = mutils.ridKey(oid, rid);
    var rpid = okey + ':' + iid + ':' + rkey;
    var rAttrs = this.getAttrs(oid, iid, rid);
    var rRpt = this._reporters[rpid];

    if (_.isUndefined(rRpt))
        return false;

    if (_.isNil(rAttrs))
        return false;

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

// [TODO] Asynchronously read resource? Q.all? But no Q, how?
MqttNode.prototype._dumpObj = function (oid, iid, callback) {
    var self = this,
        okey = mutils.oidKey(oid),
        dump = {},
        obj = this.so[okey];

    if (_.isFunction(iid)) {
        callback = iid;
        iid = undefined;
    }

    if (_.isNil(obj)) {
        dump = null;
    } else if (_.isUndefined(iid)) {    // dump object
        _.forEach(obj, function (inst, ii) {
            dump[ii] = {};
            _.forEach(inst, function (r, rid) {
                self.readResrc(oid, ii, rid, function (err, val) {
                    dump[ii][mutils.ridNumber(oid, rid)] = val;
                });
            });
        });
    } else {    // dump instance
        obj = this.so[okey][iid];
        if (_.isNil(obj)) {
            dump = null;
        } else {
            _.forEach(obj, function (r, rid) {
                self.readResrc(oid, iid, rid, function (err, val) {
                    dump[iid][mutils.ridNumber(oid, rid)] = val;
                });
            });
        }
    }
};
