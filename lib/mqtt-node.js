'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      network = require('network'),
      Q = require('q'),
      mqtt = require('mqtt'),
      mutils = require('./utils/mutils'),
      SmartObject = require('./smartobject'),
      IObject = require('./iobject');

var privateListeners = {},
    lifeUpdater;

function MqttNode(clientId, devAttrs, template) {
    if (!_.isString(clientId) && !_.isNumber(clientId))
        throw new TypeError('clientId should be better a string.');

    if (_.isString(devAttrs)) {
        template = devAttrs;
        devAttrs = undefined;
    }

    devAttrs = devAttrs || {};

    if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    if (!_.isString(template) && !_.isUndefined(template))
        throw new TypeError('template should be a string. Or, just leave it undefined.');

    EventEmitter.call(this);

    var self = this;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400;      // seconds
    this.ip = devAttrs.ip || null;
    this.mac = devAttrs.mac || null;
    this.version = devAttrs.version || '0.0.1';

    this.mc = null;     // mqtt client
    this.so = null;     // smart object

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

    //----------- protected properties ---------------------
    this._pubics = {
        register: `register/${this.clientId}`,
        deregister: `deregister/${this.clientId}`,
        notify: `notify/${this.clientId}`,
        update: `update/${this.clientId}`,
        ping: `ping/${this.clientId}`,
        response: `response/${this.clientId}`
    };

    this._subics = {
        register: `register/response/${this.clientId}`,
        deregister: `deregister/response/${this.clientId}`,
        notify: `notify/response/${this.clientId}`,
        update: `update/response/${this.clientId}`,
        ping: `ping/response/${this.clientId}`,
        request: `request/${this.clientId}`,
        announce: 'announce'
    };
    //-----------------------------------------------------

    this.onExecReq = function (msg) {        // [FIXME] Deprecated: Overide at will
        console.log('Execute command received.');
    };

    //---------------- inner procedures -------------------
    this.on('_connected', function () {
        setTimeout(function () {
            self._connectedHandler();
        }, 600);
    });

    this.on('_request', this._requestMessageDispatcher);

    this.on('_reg_rsp', function (rsp) {
        if (rsp.status === 200 || rsp.status === 201) {
            self.emit('register_success', rsp);
            self._startLifeUpdater();
        } else {
            self.emit('register_fail', rsp);
        }
    });
    //-----------------------------------------------------

    if (template)
        this._bindSo(SmartObject.getTemplate(template));
}

util.inherits(MqttNode, EventEmitter);

/*************************************************************************************************/
/*** Public Methods                                                                            ***/
/*************************************************************************************************/
MqttNode.prototype.connect = function (brokerUrl, opts) {
    var self = this,
        eventOfListenersToRemove = [ 'connect', 'message', 'reconnect', 'close', 'offline', 'error' ],
        mc;

    if (!this.so)
        throw new Error('No smart object bound yet.');

    opts = opts || {};

    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId))
        throw new Error('clientId of the MqttNode cannot be changed during connection');

    opts = _.assign(opts, { clientId: this.clientId });

    mc = this.mc = mqtt.connect(brokerUrl, opts);

    eventOfListenersToRemove.forEach(function (evt) {
        removePrivateListeners(mc, evt);
    });

    addPrivateListener(mc, 'connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });

    addPrivateListener(mc, 'message', function (topic, message, packet) {
        self.emit('message', topic, message, packet);

        var msg,
            jsonMsg,
            evt;

        msg = (message instanceof Buffer) ? message.toString() : message;

        jsonMsg = mutils.jsonify(msg);
        topic = mutils.slashPath(topic);

        if (!_.isUndefined(jsonMsg))
            msg = jsonMsg;

        switch (topic) {
            case self._subics.register:
                evt = 'reg_rsp';
                break;
            case self._subics.deregister:
                evt = 'dereg_rsp';
                break;
            case self._subics.notify:
                // [TODO]
                // node.disableReport(msg.oid, msg.iid, msg.rid);
                evt = 'notify_rsp';
                break;
            case self._subics.update:
                evt = 'update_rsp';
                break;
            case self._subics.ping:
                evt = 'ping_rsp';
                break;
            case self._subics.request:
                evt = 'request';
                break;
            case self._subics.announce:
                evt = 'announce';
                break;
            default:
                break;
        }

        if (evt)
            self.emit(evt, msg);

        if (evt === 'reg_rsp')
            self.emit('_reg_rsp', msg);

        if (evt === 'request')
            self.emit('_request', msg);
    });

    addPrivateListener(mc, 'reconnect', function () {
        self.emit('reconnect');
    });

    addPrivateListener(mc, 'close', function () {
        self.emit('close');
    });

    addPrivateListener(mc, 'offline', function () {
        self.emit('offline');
    });

    addPrivateListener(mc, 'error', function (err) {
        self.emit('error', err);
    });

    // [TODO] return this?
    return mc;
};

MqttNode.prototype.close = function (force, cb) {
    if (this.mc)
        this.mc.end(force, cb);

    return this;
};

MqttNode.prototype.publish = function (topic, message, options, callback) {
    var self = this,
        deferred = Q.defer();

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

    if (this.mc) {
        this.mc.publish(topic, message, options, function () {
            self.emit('published', {
                topic: topic,
                message: message,
                options: options
            });
            deferred.resolve();
        });
    } else {
        deferred.reject(new Error('mqtt client does not exist or is not connected'));
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubRegister = function (callback) {
    var self = this,
        deferred = Q.defer(),
        regPubChannel = this._pubics.register,
        regData = {
            lifetime: this.lifetime,
            objList: this.objectList(),
            ip: this.ip,
            mac: this.mac,
            version: this.version,
        };

    if (!this.ip || !this.mac) {
        network.get_active_interface(function(err, info) {
            if (err) {
                deferred.reject(err);
            } else {
                regData.ip = self.ip = self.ip || info.ip_address;
                regData.mac = self.mac = self.mac || info.mac_address;

                self.publish(regPubChannel, regData).done(function () {
                    deferred.resolve();
                }, function(err) {
                    deferred.reject(err);
                });
            }
        });
    } else {
        self.publish(regPubChannel, regData).done(function () {
            deferred.resolve();
        }, function(err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubDeregister = function (callback) {
    var self = this,
        deferred = Q.defer(),
        deregPubChannel = this._pubics.deregister;

    this.publish(deregPubChannel, { data: null }).done(function () {
        deferred.resolve();
    }, function(err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    var self = this,
        deferred = Q.defer(),
        updatePubChannel = this._pubics.update;

    if (_.has(devAttrs, 'mac')) {
        deferred.reject(new Error('Change of mac address at runtime is not allowed.'));
    } else {
        this.publish(updatePubChannel, devAttrs).done(function () {
            deferred.resolve();
        }, function(err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    var self = this,
        deferred = Q.defer(),
        notifyPubChannel = this._pubics.notify;

    this.publish(notifyPubChannel, data).done(function () {
        deferred.resolve();
    }, function(err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubResponse = function (rsp, callback) {
    var self = this,
        deferred = Q.defer(),
        rspPubChannel = this._pubics.response;

    this.publish(rspPubChannel, rsp).done(function () {
        deferred.resolve();
    }, function(err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pingServer = function (callback) {
    var self = this,
        deferred = Q.defer(),
        pingPubChannel = this._pubics.ping;

    this.publish(pingPubChannel, { data: null }).done(function () {
        deferred.resolve();
    }, function(err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

// [TODO] should be named as addResrc
// [TODO] another API: initResrc
MqttNode.prototype.addIObject = function (oid, iid, resrcs) {
    var iObject,
        so = this.so;

    if (arguments.length == 2) {
        resrcs = iid;
        iid = null;
    } else if (arguments.length == 3) {
        iid = iid || null;
    }

    if (!_.isObject(resrcs))
        throw new Error('resrcs should be an object');

    if (!_.isNull(iid) && this._getIObject(oid, iid)) {
        throw new Error('iObject already exists.');
    } else {
        if (!so)
            so = new SmartObject(this.clientId);

        iObject = new IObject(oid, resrcs);
        iObject.iid = iid;
        so.addIObjects(iObject);
    }

    return this._bindSo(so);
};

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    var iObject,
        so = this.so;

    if (arguments.length == 2) {
        resrcs = iid;
        iid = null;
    } else if (arguments.length == 3) {
        iid = iid || null;
    }

    if (!_.isObject(resrcs))
        throw new Error('resrcs should be an object');

    if (!so)
        so = new SmartObject(this.clientId);



    if (!_.isNull(iid)) {
        iObject = this._getIObject(oid, iid);

        if (!iObject) {
            iObject = new IObject(oid, resrcs);
            iObject.iid = iid;
            so.addIObjects(iObject);
        } else {
            _.forEach(resrcs, function (val, rid) {
                iObject.initResrc(rid, val);
            });
        }
    } else {
        iObject = new IObject(oid, resrcs);
        so.addIObjects(iObject);    // iid will be automatically assigned
    }

    return this._bindSo(so);
};

MqttNode.prototype.getAttrs = function (oid, iid, rid) {
    var attrs,
        iObject;

    if (arguments.length === 3) {
        iObject = this._getIObject(oid, iid);
        if (iObject)
            attrs = iObject.findResrcAttrs(rid);
    } else if (arguments.length === 2) {
        iObject = this._getIObject(oid, iid);
        if (iObject)
            attrs = iObject.findAttrs(rid);
    } else if (arguments.length === 1) {
        oid = mutils.oidKey(oid);
        if (this.so) {
            attrs = this.so.attrs[oid];
            if (_.isUndefined(attrs))
                attrs = this.so.attrs[oid] = _.cloneDeep(this.so.attrs.defaultAttrs);
        }
    }
    return attrs;
};

MqttNode.prototype.setAttrs = function (oid, iid, rid, attrs) {
    var iObject,
        set = true;

    if (arguments.length === 4) {
        iObject = this._getIObject(oid, iid);
        if (iObject)
            attrs = iObject.setResrcAttrs(rid, attrs);
        else
            set = false;
    } else if (arguments.length === 3) {
        attrs = rid;
        iObject = this._getIObject(oid, iid);
        if (iObject)
            attrs = iObject.setAttrs(attrs);
        else
            set = false;
    } else if (arguments.length === 2) {
        attrs = iid;
        if (this.so)
            this.so.setAttrs(oid, attrs);
        else
            set = false;
    }

    return set;
};

MqttNode.prototype.enableReport = function (oid, iid, rid, attrs) {
    // [FIXME] Now we only support resource reporting
    var iObject = this._getIObject(oid, iid);

    if (iObject) {
        if (attrs)
            iObject.setResrcAttrs(rid, attrs);

        return iObject.enableResrcReporter(rid);
    }

    return false;
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    // [FIXME] Now we only support resource reporting
    var iObject = this._getIObject(oid, iid);

    if (iObject)
        return iObject.disableResrcReporter(rid);

    return;
};

MqttNode.prototype.readResrc = function (oid, iid, rid, callback) {
    var deferred = Q.defer(),
        iObject = this._getIObject(oid, iid);

    if (!iObject) {
        deferred.reject(new Error('Resource not found.'));
    } else {
        iObject.readResrc(rid).done(function (val) {
            deferred.resolve(val);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeResrc = function (oid, iid, rid, value, callback) {
    var deferred = Q.defer(),
        iObject = this._getIObject(oid, iid);

    if (!iObject) {
        deferred.reject(new Error('Resource not found.'));
    } else {
        iObject.writeResrc(rid, value).done(function (resrc) {
            deferred.resolve(resrc);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.dump = function (callback) {
    var self = this,
        deferred = Q.defer(),
        includedKeys = [ 'clientId', 'lifetime', 'ip', 'mac', 'version' ],
        dumpAllProms = [],
        dumped = {};

     this.so.dump().done(function (soData) {
        _.forOwn(self, function (val, key) {
            if (!_.isFunction(val) && _.includes(includedKeys, key))
                dumped[key] = val;
        });
        dumped.so = soData;
        deferred.resolve(dumped);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype._bindSo = function (so) {
    if (!(so instanceof SmartObject))
        throw new TypeError('so should be an instance of SmartObject');

    if (this.so && this.so !== so)
        throw new Error('There is already a so, cannot bind another one');

    so.node = this;
    this.so = so;
    return this;
};

MqttNode.prototype.objectList = function () {
    if (!(this.so instanceof SmartObject))
        throw new Error('None of valid SmartObject bound to this mqtt-node.');

    return this.so.objectList();
};

MqttNode.prototype._getRootObject = function (oid) {
    var oidKey = mutils.oidKey(oid);
    return this.so[oidKey];
};

MqttNode.prototype._getIObject = function (oid, iid) {
    var rootObj = this._getRootObject(oid);

    if (!_.isNumber(iid) && !_.isString(iid) )
        throw new TypeError('iid should be a number or a string.');

    return rootObj ? rootObj[iid] : undefined;
};

MqttNode.prototype._getResource = function (oid, iid, rid) {
    var iObj = this._getIObject(oid, iid),
        ridKey = mutils.ridKey(oid, rid);

    if (!_.isNumber(rid) && !_.isString(rid) )
        throw new TypeError('rid should be a number or a string.');

    return iObj ? iObj[ridKey] : undefined;
};

MqttNode.prototype._connectedHandler = function () {
    var self = this,
        mc = this.mc,
        subTopics = _.map(this._subics, function (t) {
            return t;
        });

    mc.subscribe(subTopics, function (err, granted) {
        if (err) {
            self.emit('error', err);
        } else {
            // after subscription, register to Shepherd server
            self.pubRegister().done(function () {
                self.emit('register_published', err);
            }, function (err) {
                self.emit('error', err);
            });
        }
    });
};

MqttNode.prototype._startLifeUpdater = function () {
    var self = this,
        checkPoint,
        lfCountSecs = 0;

    if (this.lifetime > 43199)
        checkPoint = 43200 ;    // 12 hours

    if (lifeUpdater) {
        clearInterval(lifeUpdater);
        lifeUpdater = null;
    }

    lifeUpdater = setInterval(function () {
        lfCountSecs += 1;
        if (lfCountSecs === checkPoint) {
            self.pubUpdate({ lifetime: self.lifetime }).done();
            self._startLifeUpdater();
        }
    }, 1000);
};

MqttNode.prototype._requestMessageDispatcher = function (msg) {
    if (!this.so)
        throw new Error('Smart Object is not properly bound.');

    var self = this,
        cmdId = mutils.getCmd(msg.cmdId) ? mutils.getCmd(msg.cmdId).key : msg.cmdId,
        trgType = '',
        reqMsgHdlr,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 200,
            data: null
        };

    //---- if target not found, send back 404 response code ----
    if (!_.isUndefined(msg.oid) && !_.isNull(msg.oid)) {
        trgType = 'object';
        if (msg.oid === '') {
            rspMsg.status = 405;    // Operation on Root is Not Allowed
            this.publish(this._pubics.response, rspMsg);
            return;
        } else if (!this._getRootObject(msg.oid)) {
            rspMsg.status = 404;    // Not Found
            this.publish(this._pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(msg.iid) && !_.isNull(msg.iid)) {
        trgType = 'instance';

        if (!this._getIObject(msg.oid, msg.iid)) {
            rspMsg.status = 404;
            this.publish(this._pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(msg.rid) && !_.isNull(msg.rid)) {
        trgType = 'resource';
        if (_.isUndefined(this._getResource(msg.oid, msg.iid, msg.rid))) {
            rspMsg.status = 404;
            this.publish(this._pubics.response, rspMsg);
            return;
        }
    }

    //---- if target if available, dispatch the message to corresponding handler ----
    msg.trgType = trgType;

    switch (cmdId) {
        case 'read':
            reqMsgHdlr = _readReqHandler;
            break;
        case 'write':
            reqMsgHdlr = _writeReqHandler;
            break;
        case 'discover':
            reqMsgHdlr = _discoverReqHandler;
            break;
        case 'writeAttrs':
            reqMsgHdlr = _writeAttrsReqHandler;
            break;
        case 'execute':     // execute, leave it to developers
            reqMsgHdlr = _executeReqHandler;
            break;
        case 'observe':
            reqMsgHdlr = _observeReqHandler;
            break;
        case 'notify':      // notify, this is not a request, do nothing

            break;
        default:            // unknown, send back 'bad request'
            rspMsg.status = 400;
            reqMsgHdlr = function (node, msg) {
                node.publish(node._pubics.response, rspMsg);
            };
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(self, msg);
    });
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
function _readReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 205,    // 205: 'Content'
            data: null
        };

    if (_.isNull(msg.oid) || _.isUndefined(msg.oid)) {   // Root setting is not allowed
        rspMsg.status = 400;    // Bad Request
        node.publish(node._pubics.response, rspMsg);
        return;
    }

    if (msg.trgType === 'object') {
        node.so.dumpIObject(msg.oid).then(function (data) {
            rspMsg.data = data;
        }).done(function () {
            node.publish(node._pubics.response, rspMsg);
        });
    } else if (msg.trgType === 'instance') {
        node.so.dumpIObject(msg.oid, msg.iid).then(function (data) {
            rspMsg.data = data;
        }).done(function () {
            node.publish(node._pubics.response, rspMsg);
        });
    } else if (msg.trgType === 'resource') {
        iobj = node._getIObject(msg.oid, msg.iid);

        iobj._readResrc(msg.rid).then(function (data) {
            rspMsg.data = data;
        }).done(function () {
            node.publish(node._pubics.response, rspMsg);
        });
    }
}

function _writeReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 204,    // 204: 'Changed'
            data: null
        };

    // [TODO] 1. allow object and instance
    //        2. tackle access control in the near future
    if (msg.trgType === 'object') {             // will support in the future
        rspMsg.status = 405;                    // 405: MethodNotAllowed
        node.publish(node._pubics.response, rspMsg);
    } else if (msg.trgType === 'instance') {    // will support in the future
        rspMsg.status = 405;                    // 405: MethodNotAllowed
        node.publish(node._pubics.response, rspMsg);
    } else if (msg.trgType === 'resource') {
        iobj = node._getIObject(msg.oid, msg.iid);
        iobj._writeResrc(msg.rid, msg.data).then(function (resrc) {
            rspMsg.data = resrc;
            node.publish(node._pubics.response, rspMsg);
        }).fail(function (err) {
            console.log(err);
            rspMsg.status = 405;
            node.publish(node._pubics.response, rspMsg);
        }).done();
    }
}

function _discoverReqHandler(node, msg) {
    var iobj,
        attrs,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 205,    // 205: 'Content'
            data: null
        };

        if (msg.trgType === 'object') {
            attrs = _.cloneDeep(node.getAttrs(msg.oid));
            attrs.resrcList = node.so.resrcList(msg.oid);
        } else if (msg.trgType === 'instance') {
            attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid));
        } else if (msg.trgType === 'resource') {
            attrs = _.cloneDeep(node.getAttrs(msg.oid, msg.iid, msg.rid));
        }

    rspMsg.data = _.omit(attrs, [ 'mute', 'lastReportedValue' ]);
    node.publish(node._pubics.response, rspMsg);
}

function _writeAttrsReqHandler(node, msg) {
    var iobj,
        resrc,
        badAttr = false,
        allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'step', 'cancel', 'pintvl' ],
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 204,    // 204: 'Changed'
            data: null
        };

        if (_.isNull(msg.oid) || _.isUndefined(msg.oid)) {   // Root setting is not allowed
            rspMsg.status = 400;    // Bad Request
            node.publish(node._pubics.response, rspMsg);
            return;
        }

        if (!_.isPlainObject(msg.attrs)) {
            rspMsg.status = 400;    // Bad Request
            node.publish(node._pubics.response, rspMsg);
            return;
        }

        _.forEach(msg.attrs, function (n, k) {
            badAttr = badAttr || !_.includes(allowedAttrs, k);
        });

        if (badAttr) {
            rspMsg.status = 400;    // Bad Request
            node.publish(node._pubics.response, rspMsg);
            return;
        }

        // The availability has been checked in _requestMessageDispatcher()
        if (msg.trgType === 'object') {
            if (_.has(msg.attrs, 'cancel'))
                msg.attrs.cancel = true;        // [TODO] will support reporting in the future

            node.setAttrs(msg.oid, msg.attrs);
        } else if (msg.trgType === 'instance') {
            if (_.has(msg.attrs, 'cancel'))
                msg.attrs.cancel = true;        // [TODO] will support reporting in the future

            node.setAttrs(msg.oid, msg.iid, msg.attrs);
        } else if (msg.trgType === 'resource') {
            // cancel the observation of reporting
            if (_.has(msg.attrs, 'cancel') && msg.attrs.cancel)
                node.disableReport(msg.oid, msg.iid, msg.rid);

            node.setAttrs(msg.oid, msg.iid, msg.rid, msg.attrs);
        }

    node.publish(node._pubics.response, rspMsg);
}

function _executeReqHandler(node, msg) {
    var iobj,
        resrc,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 204,    // 200: Changed
            data: null
        };

    if (msg.trgType !== 'resource') {
        rspMsg.status = 405;    // Method Not Allowed
        node.publish(node._pubics.response, rspMsg);
        return;
    }

    iobj = node._getIObject(msg.oid, msg.iid);
    iobj.execResrc(msg.rid, msg.data, function (err, rsp) {
        rspMsg = _.assign(rspMsg, rsp);
        node.publish(node._pubics.response, rspMsg);
    });

    // [FIXME] Deprecated
    // process.nextTick(function () {
    //     node.onExecReq(msg);
    // });
}

function _observeReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 200,    // 200: 'OK'
            data: null
        };

    // [TODO] LWM2M Spec: When Observe operation contains only Object ID, 
    //                    the "Notify" operation MUST be done per Object Instance.
    if (msg.trgType === 'object') {             // [TODO] will support in the future
        rspMsg.status = 405;
    } else if (msg.trgType === 'instance') {    // [TODO] will support in the future
        rspMsg.status = 405;
    } else if (msg.trgType === 'resource') {
        node.enableReport(msg.oid, msg.iid, msg.rid);
        rspMsg.status = 205;
    } else {
        rspMsg.status = 405;
    }

    node.publish(node._pubics.response, rspMsg);
}

module.exports = MqttNode;
