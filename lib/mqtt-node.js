'use strict';

var util = require('util'),
    EventEmitter = require('events'),
    _ = require('lodash'),
    network = require('network'),
    Q = require('q'),
    mqtt = require('mqtt'),
    template = require('./template'),
    MDEFS = require('./defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID;

var lifeUpdater;

function MqttNode(clientId, lifetime, version, ip, mac) {
    EventEmitter.call(this);

    var self = this;

    this.clientId = clientId || 'mqtt_smarthing_client';
    this.lifetime = Math.floor(lifetime) || 86400;  // seconds
    this.version = version || '0.0.1';
    this.ip = ip || null;
    this.mac = mac || null;

    this.mc = null;     // mqtt client
    this.so = null;     // Smart Object

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
    this.on('_request', this._requestHandler);

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
module.exports = MqttNode;

/*************************************************************************************************/
/*** MqttNode Prototype                                                                        ***/
/*************************************************************************************************/
MqttNode.prototype.hookSmartObject = function (so) {
    if (!(so instanceof MqttNode.SmartObject))
        throw new TypeError('so should be an instance of SmartObject');

    if (this.so)
        throw new Error('There is already a so, cannot register another one');

    so.owner = this;
    this.so = so;
    return this;
};

MqttNode.prototype.connect = function (brokerUrl, opts) {
    var self = this,
        mc;

    if (!this.so)
        throw new Error('Smart Object is not registered yet');

    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId))
        throw new Error('clientId of the MqttNode cannot be changed during connection');

    opts = opts || {};
    opts = _.assign(opts, { clientId: this.clientId });

    mc = this.mc = mqtt.connect(brokerUrl, opts);

    mc.on('connect', function (connack) {
        console.log(connack);
        self.emit('connect', connack);
        self.emit('_connected');

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
    });


    return mc;
};

MqttNode.prototype.dumpObjectList = function () {
    var objList = [],
        dumpedSo;

    if (!this.so)
        throw new Error('Smart Object is not registered yet');

    dumpedSo = this.so.dump();

    _.forEach(dumpedSo, function (iObjs, oid) {
        var numOid = parseInt(oid);
        oid = _.isNumber(numOid) ? numOid : oid;

        _.forEach(iObjs, function (iObj, iid) {
            var numIid = parseInt(iid);
            iid = _.isNumber(numIid) ? numIid : iid;
            objList.push({ oid: oid, iid: iid });
        });
    });

    return objList;
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

/********************************************/
/*** MqttNode Protected Methods          ***/
/********************************************/
MqttNode.prototype._register = function (callback) {
    var self = this,
        deferred = Q.defer(),
        reg_data = {
            lifetime: this.lifetime,
            version: this.version,
            objList: this.dumpObjectList(),
            ip: this.ip
        };

    if (!this.ip) {
        network.get_active_interface(function(err, info) {
            if (err) {
                deferred.reject(err);
            } else {
                reg_data.ip = self.ip = info.ip_address;
                self.publish(self.pubics.register, reg_data).fail(function(err) {
                    deferred.reject(err);
                }).done(function () {
                    deferred.resolve();
                });
            }
        });
    } else {
        self.publish(self.pubics.register, reg_data).fail(function(err) {
            deferred.reject(err);
        }).done(function () {
            deferred.resolve();
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype._connectedHandler = function () {
    var self = this,
        mc = this.mc,
        subTopics = _.map(this.subics, function (t) {
            return t;
        });

    mc.on('message', function (topic, message, packet) {
        console.log('YYYYYYYYYYYYYYYYYYYYYYYYyy');
        var msg,
            evt;

        msg = (message instanceof Buffer) ? message.toString() : message;

        if (msg[0] === '{' && msg[msg.length-1] === '}')    // JSON string
            msg = JSON.parse(msg);

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

    this.on('_reg_rsp', function (rsp) {
        console.log('xxxxxxxxxxxxxxxxxxxxxx');
        console.log(rsp);
        if (rsp.status !== 200 && rsp.status !== 201)
            self.emit('err', new Error('mqtt-shepherd register error [code: ' + rsp.status + ']'));
        else
            self._startLifeUpdater();
    });

    mc.subscribe(subTopics, function (err, granted) {
        if (err) {
            self.emit('error', err);
        } else {
            // after subscription, register to Shepherd server
            self._register().fail(function (err) {
                self.emit('error', err);
            }).done(function () {
                console.log('REG OK');
            });
        }
    });
};

MqttNode.prototype._getRootObject = function (oid) {
    var oidKey = OID.get(oid) ? OID.get(oid).key : oid;
    return this.so[oidKey];
};

MqttNode.prototype._getIObject = function (oid, iid) {
    var rootObj = this._getRootObject(oid);

    if (rootObj)
        return rootObj[iid];

    return;
};

MqttNode.prototype._getResource = function (oid, iid, rid) {
    var iObj = this._getIObject(oid, iid),
        ridKey = RID.get(rid) ? RID.get(rid).key : rid;

    if (iObj)
        return iObj[ridKey];

    return;
};

MqttNode.prototype._requestHandler = function (msg) {
    if (!this.so)
        throw new Error('Smart Object is not registered properly');

    var self = this,
        iObjRoot,
        iObj,
        resrc,
        oid = msg.oid,
        iid = msg.iid,
        rid = msg.rid,
        cmdId = MDEFS.CMD.get(msg.cmdId) ? MDEFS.CMD.get(msg.cmdId).key : msg.cmdId,
        targetType = '',
        rspMsg = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: 200,
            data: null
        };

    if (!_.isUndefined(oid) || !_.isNull(oid)) {
        targetType = 'object';

        iObjRoot = this._getRootObject(oid);
        if (!iObjRoot) {
            rspMsg.status = 404;    // Not Found
            this.publish(this.pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(iid) || !_.isNull(iid)) {
        targetType = 'instance';

        iObj = this._getIObject(oid, iid);
        if (!iObj) {
            rspMsg.status = 404;
            this.publish(this.pubics.response, rspMsg);
            return;
        }
    }

    if (!_.isUndefined(rid) || !_.isNull(rid)) {
        targetType = 'resource';
        resrc = this._getResource(oid, iid, rid);
        if (_.isUndefined(resrc)) {
            rspMsg.status = 404;
            this.publish(this.pubics.response, rspMsg);
            return;
        }
    }

    var rspData;

    switch (cmdId) {
        case 'read':
            if (targetType === 'object')
                rspData = this.so.dumpIObject(oid);

            if (targetType === 'instance')
                rspData = this.so.dumpIObject(oid, iid);

            if (targetType === 'resource')
                rspData = iObj.readResrc(rid);

            rspMsg.status = 205;
            break;

        case 'write':
            if (targetType === 'object')         // not supported 
                rspMsg.status = 405;

            if (targetType === 'instance')       // not supported 
                rspMsg.status = 405;

            if (targetType === 'resource') {
                rspData = iObj.writeResrc(rid, msg.data);
                rspMsg.status = 204;
            }
            break;

        case 'discover':
            if (targetType === 'object')
                rspMsg.data = this.so.getAttrs();

            if (targetType === 'instance')
                rspMsg.data = iObj.getAttrs();

            if (targetType === 'resource')
                rspMsg.data = iObj.getResrcAttrs(rid);

            rspMsg.status = 205;
            break;

        case 'writeAttrs':
            if (targetType === 'object')
                this.so.writeAttrs(msg.attrs);

            if (targetType === 'instance')
                iObj.writeAttrs(msg.attrs);

            if (targetType === 'resource')
                iObj.writeResrcAttrs(rid, msg.attrs);

            rspMsg.status = 204;
            break;

        case 'execute':     // execute, leave it to developers
            break;

        case 'observe':
            if (targetType === 'object')        // not support
                rspMsg.status = 405;

            if (targetType === 'instance')      // not support
                rspMsg.status = 405;

            if (targetType === 'resource') {
                iObj.enableResrcReporter(rid);
                rspMsg.status = 200;
            }
            break;

        case 'notify':      // notify, this is not a request, do nothing
            break;

        default:            // unknown, send back 'bad request'
            rspMsg.status = 400;
            break;
    }

    if (cmdId !== 'execute' && cmdId !== 'notify')
        this.publish(this.pubics.response, rspMsg);
};

MqttNode.prototype._startLifeUpdater = function () {
    // this.lifetimer;
    var self = this,
        checkPoint,
        lfCountSecs = 0;

    if (this.lifetime > 43199)
        checkPoint = 43200 ;    // 12 hours

    if (lifeUpdater)
        clearInterval(lifeUpdater);

    lifeUpdater = setInterval(function () {
        lfCountSecs += 1;
        if (lfCountSecs === checkPoint) {
            self.mqUpdate();
            self._startLifeUpdater();
        }
    }, 1000);
};
