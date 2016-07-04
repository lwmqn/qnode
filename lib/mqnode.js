var util = require('util'),
    EventEmitter = require('events');

var _ = require('busyman'),
    mqtt = require('mqtt'),
    mutils = require('lwmqn-util')
    SmartObject = require('smartobject');

var init = require('./init'),
    request = require('./request'),
    reporter = require('./reporter'),
    helper = require('./helper'),
    CNST = require('./constants');

var TTYPE = CNST.TTYPE,
    TAG = CNST.TAG,
    RSP = CNST.RSP;

function MqttNode(clientId, devAttrs) {
    var _transid = 0,
        privateListeners = {},
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
    this.version = devAttrs.version || '0.0.1';

    this.mc = null;                 // mqtt client
    this.so = new SmartObject();    // default smartobjects, initialize in _init()
    this._connected = false;
    this._lfsecs = 0;               // lifetime counter

    this._pubics = {};              // LWMQN interface to publish to, initialize in _init()
    this._subics = {};              // LWMQN interface to subscribe to, initialize in _init()
    this._tobjs = {};               // timeout objects for request control
    this._updater = null;           // updating upon lifetime alarm
    this._repAttrs = {};            // collection of report settings
    this._reporters = {};           // collection of the enabled report senders

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


    this._addPrivateListener = function (emitter, evt, lsn) {
        privateListeners[evt] = privateListeners[evt] || [];
        privateListeners[evt].push({
            emitter: emitter,
            listener: lsn
        });
        emitter.on(evt, lsn);
    };

    this._removePrivateListeners = function (emitter, evt) {
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
MqttNode.prototype._target = function (oid, iid, rid) {
    var trg = {
            type: null,
            exist: this.has(oid, iid, rid),
            value: null
        },
        rkey;

    if (!_.isNil(oid)) {
        trg.type = (oid === '') ? TTYPE.root : TTYPE.obj;
        if (!_.isNil(iid)) {
            trg.type = TTYPE.inst;
            if (!_.isNil(rid))
                trg.type = TTYPE.rsc;
        }
    }

    if (trg.exist) {
        if (trg.type === TTYPE.obj)
            trg.value = this.so.get(oid);
        else if (trg.type === TTYPE.inst)
            trg.value = this.so.get(oid, iid);
        else if (trg.type === TTYPE.rsc)
            trg.value = this.so.get(oid, iid, rid);
    }

    return trg;
};

MqttNode.prototype._lifeUpdate = function (enable) {
    var self = this;

    this._lfsecs = 0;
    clearInterval(this._updater);
    this._updater = null;

    if (enable) {
        this._updater = setInterval(function () {
            self._lfsecs += 1;
            if (self._lfsecs === self.lifetime) {
                self.pubUpdate({ lifetime: self.lifetime });
                self._lfsecs = 0;
            }
        }, 1000);
    }
};

/*************************************************************************************************/
/*** Public Methods -Unchecked                                                                 ***/
/*************************************************************************************************/
MqttNode.prototype.has = function (oid, iid, rid) {
    return this.so.has(oid, iid, rid);
};

MqttNode.prototype.dump = function (oid, iid, callback) {
    return this.so.dump(oid, iid, callback);
};

MqttNode.prototype.initResources = function (oid, iid, resrcs) {
    this.so.addResources(oid, iid, resrcs);
    return this;
};

MqttNode.prototype.readResource = function (oid, iid, rid, callback) {
    return this.so.readResource(oid, iid, rid, callback);
};

MqttNode.prototype.writeResource = function (oid, iid, rid, value, callback) {
    return this.so.writeResource(oid, iid, rid, value, callback);
};

// [TODO]
MqttNode.prototype.execResource = function (oid, iid, rid, argus, callback) {
    return this.so.execResource(oid, iid, rid, argus, callback);
};

// MqttNode.prototype.readResrc = function (oid, iid, rid, callback) {
//     return helper._readResrc(this, false, oid, iid, rid, callback);
// };

// MqttNode.prototype.writeResrc = function (oid, iid, rid, value, callback) {
//     return helper._writeResrc(this, false, oid, iid, rid, value, callback);
// };

// MqttNode.prototype._readResrc = function (oid, iid, rid, callback) {
//     return helper._readResrc(this, true, oid, iid, rid, callback);              // do access checking if remotely read
// };

// MqttNode.prototype._writeResrc = function (oid, iid, rid, value, callback) {    // do access checking if remotely write
//     return helper._writeResrc(this, true, oid, iid, rid, value, callback);
// };

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
        self._removePrivateListeners(self.mc, evt);
    });

    this._addPrivateListener(this.mc, 'connect', function (connack) {
        self.emit('connect', connack);
        self.emit('_connected');
    });

    this._addPrivateListener(this.mc, 'message', function (topic, message, packet) {
        self.emit('raw', topic, message, packet);
    });

    this._addPrivateListener(this.mc, 'reconnect', function () {
        self.emit('reconnect');
    });

    this._addPrivateListener(this.mc, 'close', function () {
        self.emit('close');
        self.emit('_unconnected');
    });

    this._addPrivateListener(this.mc, 'offline', function () {
        self.emit('offline');
        self.emit('_unconnected');
    });

    this._addPrivateListener(this.mc, 'error', function (err) {
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

MqttNode.prototype.publish = function (topic, message, options, callback) {
    var self = this,
        errText,
        originMsg = message;

    if (_.isFunction(options)) {
        callback = options;
        options = undefined;
    }

    options = options || { qos: 0, retain: false };
    callback = callback || function (err) {
        if (err)
            console.log(err);
    };

    if (_.isPlainObject(message))
        message = JSON.stringify(message);

    if (!this.mc)
        errText = 'No mqtt client established.'
    else if (!this._connected)
        errText = 'No connection.';
    else if (!_.isString(message) && !Buffer.isBuffer(message))
        errText = 'Message should be a string or a buffer.';

    if (errText) {
        callback(new Error(errText), null);
    } else {
        this.encrypt(message, this.clientId, function (err, encrypted) {
            if (!err) {
                self.mc.publish(topic, encrypted, options, function () {
                    self.emit('published', {
                        topic: topic,
                        message: encrypted,
                        options: options
                    });

                    callback(null, null);
                });
            } else {
                callback(err);
            }
        });
    }

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

MqttNode.prototype.setDevAttrs = function (attrs, callback) {
    var self = this,
        localStatus,
        update = {};

    _.forEach(attrs, function (attr, key) {
        if (key === 'lifetime') {
            self.lifetime = update.lifetime = attrs.lifetime;
            self.so.setResource('lwm2mServer', 0, 'lifetime', attrs.lifetime);
            self._lifeUpdate(true);
        } else if (key === 'ip') {
            self.ip = update.ip = attrs.ip;
            self.so.setResource('connMonitor', 0, 'ip', attrs.ip);
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

MqttNode.prototype.pubRegister = function (callback) {
    return request.register(this, callback);
};

MqttNode.prototype.pubDeregister = function (callback) {
    return request.deregister(this, callback);
};

MqttNode.prototype.pubUpdate = function (devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    return request.update(this, devAttrs, callback);
};

MqttNode.prototype.pubNotify = function (data, callback) {
    return request.notify(this, data, callback);
};

MqttNode.prototype.pubResponse = function (rsp, callback) {
    return this.publish(this._pubics.response, rsp, callback);
};

MqttNode.prototype.pingServer = function (callback) {
    return request.ping(this, callback);
};

MqttNode.prototype.enableReport = function (oid, iid, rid) {
    return reporter.enableReport(this, oid, iid, rid);
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    return reporter.disableReport(this, oid, iid, rid);
};

module.exports = MqttNode;
