'use strict';

var util = require('util'),
    EventEmitter = require('events'),
    _ = require('lodash'),
    network = require('network'),
    Q = require('q'),
    mqtt = require('mqtt'),
    mutils = require('./utils/mutils'),
    template = require('./template');

var lifeUpdater;

function MqttNode(clientId, lifetime, ip, mac, version) {
    EventEmitter.call(this);

    var self = this;

    this.clientId = clientId || 'mqtt_smarthing_client';
    this.lifetime = Math.floor(lifetime) || 86400;      // seconds
    this.ip = ip || null;
    this.mac = mac || null;
    this.version = version || '0.0.1';

    this.mc = null;     // mqtt client
    this.so = null;     // smart object

    this.onExecuteRequest = function (msg) {        // Overide at will
        console.log('Execute command received.');
    };

    this.pubics = {
        register: `register/${this.clientId}`,
        deregister: `deregister/${this.clientId}`,
        notify: `notify/${this.clientId}`,
        update: `update/${this.clientId}`,
        ping: `ping/${this.clientId}`,
        response: `response/${this.clientId}`
    };

    this.subics = {
        register: `register/response/${this.clientId}`,
        deregister: `deregister/response/${this.clientId}`,
        notify: `notify/response/${this.clientId}`,
        update: `update/response/${this.clientId}`,
        ping: `ping/response/${this.clientId}`,
        request: `request/${this.clientId}`,
        announce: 'announce'
    };

    this.on('_connected', this._connectedHandler);
    this.on('_request', this._requestMessageDispatcher);
    this.on('_reg_rsp', function (rsp) {
        if (rsp.status === 200 || rsp.status === 201) {
            self.emit('register_success', rsp);
            self._startLifeUpdater();
        } else {
            self.emit('register_fail', rsp);
        }
    });

    network.get_active_interface(function(err, info) {
        if (err)
            self.emit('error', err);
        else
            self.ip = info.ip_address;
    });
}

MqttNode.SmartObject = require('./smartobject');    // SmartObject Class
MqttNode.IObject = require('./iobject');            // IObject Class
MqttNode.Generate = template;

util.inherits(MqttNode, EventEmitter);

/*************************************************************************************************/
/*** MqttNode Prototype                                                                        ***/
/*************************************************************************************************/
MqttNode.prototype.bindSo = function (so) {
    if (!(so instanceof MqttNode.SmartObject))
        throw new TypeError('so should be an instance of SmartObject');

    if (this.so)
        throw new Error('There is already a so, cannot bind another one');

    so.node = this;
    this.so = so;
    return this;
};

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
        mc.removeAllListeners(evt);
    });

    mc.on('connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });

    mc.on('message', function (topic, message, packet) {
        self.emit('message', topic, message, packet);
    });

    mc.on('reconnect', function () {
        self.emit('reconnect');
    });

    mc.on('close', function () {
        self.emit('close');
    });

    mc.on('offline', function () {
        self.emit('offline');
    });

    mc.on('error', function (err) {
        self.emit('error', err);
    });

    return mc;
};

MqttNode.prototype.dumpObjectList = function () {
    var objList = [],
        dumped;

    if (!this.so)
        throw new Error('There is no smart object bound to this mqtt-node.');

    dumped = this.so.dump();

    _.forEach(dumped, function (instances, oid) {
        var numOid = mutils.oidNumber(oid);

        _.forEach(instances, function (iobj, iid) {
            var numiid = parseInt(iid);
            iid = _.isNaN(numiid) ? iid : numiid;
            objList.push({ oid: oid, iid: iid });
        });
    });

    return objList;
};

MqttNode.prototype.getRootObject = function (oid) {
    var oidKey = mutils.oidKey(oid);
    return this.so[oidKey];
};

MqttNode.prototype.getIObject = function (oid, iid) {
    var rootObj = this._getRootObject(oid);

    return rootObj ? rootObj[iid] : undefined;
};

MqttNode.prototype.getResource = function (oid, iid, rid) {
    var iObj = this.getIObject(oid, iid),
        ridKey = mutils.ridKey(oid, rid);

    return iObj ? iObj[ridKey] : undefined;
};

MqttNode.prototype.publish = function (topic, message, options, callback) {
    var deferred = Q.defer();

    if (_.isObject(message))
        message = JSON.stringify(message);

    if (this.mc) {
        this.mc.publish(topic, message, options, function () {
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
        regPubChannel = this.pubics.register,
        reg_data = {
            lifetime: this.lifetime,
            objList: this.dumpObjectList(),
            ip: this.ip,
            mac: this.mac,
            version: this.version
        };

    if (!this.ip || !this.mac) {
        network.get_active_interface(function(err, info) {
            if (err) {
                deferred.reject(err);
                return;
            }

            reg_data.ip = self.ip = info.ip_address || self.ip;
            reg_data.mac = self.mac = info.mac_address || self.mac;

            self.publish(regPubChannel, reg_data).then(function () {
                deferred.resolve();
            }, function(err) {
                deferred.reject(err);
            });
        });
    } else {
        self.publish(regPubChannel, reg_data).then(function () {
            deferred.resolve();
        }, function(err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    var self = this,
        deferred = Q.defer(),
        updatePubChannel = this.pubics.update;

    this.publish(updatePubChannel, devAttrs).then(function () {
        deferred.resolve();
    }, function(err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** MqttNode Protected Methods                                                                ***/
/*************************************************************************************************/
MqttNode.prototype._connectedHandler = function () {
    var self = this,
        mc = this.mc,
        subTopics = _.map(this.subics, function (t) {
            return t;
        });

    mc.on('message', function (topic, message, packet) {
        var msg,
            jsonMsg,
            evt;

        msg = (message instanceof Buffer) ? message.toString() : message;

        jsonMsg = mutils.jsonify(msg);
        topic = mutils.slashPath(topic);

        if (!_.isUndefined(jsonMsg))
            msg = jsonMsg;

        switch (topic) {
            case self.subics.register:
                evt = 'reg_rsp';
                break;
            case self.subics.deregister:
                evt = 'dereg_rsp';
                break;
            case self.subics.notify:
                evt = 'notify_rsp';
                break;
            case self.subics.update:
                evt = 'update_rsp';
                break;
            case self.subics.ping:
                evt = 'ping_rsp';
                break;
            case self.subics.request:
                evt = 'request';
                break;
            case self.subics.announce:
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

    mc.subscribe(subTopics, function (err, granted) {
        if (err) {
            self.emit('error', err);
        } else {
            // after subscription, register to Shepherd server
            self.registerReq().done(function () {
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
        if (!this._getRootObject(msg.oid)) {
            rspMsg.status = 404;    // Not Found
            this.publish(this.pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(msg.iid) && !_.isNull(msg.iid)) {
        trgType = 'instance';

        if (!this.getIObject(msg.oid, msg.iid)) {
            rspMsg.status = 404;
            this.publish(this.pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(msg.rid) && !_.isNull(msg.rid)) {
        trgType = 'resource';
        if (_.isUndefined(this.getResource(msg.oid, msg.iid, msg.rid))) {
            rspMsg.status = 404;
            this.publish(this.pubics.response, rspMsg);
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
                node.publish(node.pubics.response, rspMsg);
            };
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(self, msg);
    });
};

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

    if (msg.trgType === 'object') {
        rspMsg.data = node.so.dumpIObject(msg.oid);
    } else if (msg.trgType === 'instance') {
        rspMsg.data = node.so.dumpIObject(msg.oid, msg.iid);
    } else if (msg.trgType === 'resource') {
        iobj = node.getIObject(msg.oid, msg.iid);
        rspMsg.data = iobj.readResrc(msg.rid);
    }

    node.publish(node.pubics.response, rspMsg);
}

function _writeReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 204,    // 204: 'Changed'
            data: null
        };

    if (msg.trgType === 'object') {             // not supported 
        rspMsg.status = 405;                    // 405: MethodNotAllowed
    } else if (msg.trgType === 'instance') {    // not supported 
        rspMsg.status = 405;                    // 405: MethodNotAllowed
    } else if (msg.trgType === 'resource') {
        iobj = node.getIObject(msg.oid, msg.iid);
        rspMsg.data = iobj.writeResrc(msg.rid, msg.data);
    }

    node.publish(node.pubics.response, rspMsg);
}

function _discoverReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 205,    // 205: 'Content'
            data: null
        };

        if (msg.trgType === 'object') {
            rspMsg.data = node.so.getAttrs();
        } else if (msg.trgType === 'instance') {
            iobj = node.getIObject(msg.oid, msg.iid);
            rspMsg.data = iobj.getAttrs();
        } else if (msg.trgType === 'resource') {
            iobj = node.getIObject(msg.oid, msg.iid);
            rspMsg.data = iobj.getResrcAttrs(msg.rid);
        }

    node.publish(node.pubics.response, rspMsg);
}

function _writeAttrsReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 204,    // 204: 'Changed'
            data: null
        };

        if (msg.trgType === 'object') {
            node.so.writeAttrs(msg.attrs);
        } else if (msg.trgType === 'instance') {
            iobj = node.getIObject(msg.oid, msg.iid);
            iobj.writeAttrs(msg.attrs);
        } else if (msg.trgType === 'resource') {
            iobj = node.getIObject(msg.oid, msg.iid);
            iobj.writeResrcAttrs(msg.rid, msg.attrs);
        }

        rspMsg.status = 204;

    node.publish(node.pubics.response, rspMsg);
}

function _executeReqHandler(node, msg) {
    process.nextTick(function () {
        node.onExecuteRequest(msg);
    });
}

// [TODO] how about disable the report
function _observeReqHandler(node, msg) {
    var iobj,
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 200,    // 200: 'OK'
            data: null
        };

    if (msg.trgType === 'object') {             // not support
        rspMsg.status = 405;
    } else if (msg.trgType === 'instance') {    // not support
        rspMsg.status = 405;
    } else if (msg.trgType === 'resource') {
        iobj = node.getIObject(msg.oid, msg.iid);
        iobj.enableResrcReporter(msg.rid);
        rspMsg.status = 200;
    }

    node.publish(node.pubics.response, rspMsg);
}

module.exports = MqttNode;
