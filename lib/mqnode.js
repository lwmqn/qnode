var util = require('util'),
    EventEmitter = require('events');

var mqtt = require('mqtt'),
    _ = require('busyman');

var init = require('./init'),
    CNST = require('./constants'),
    request = require('./request'),
    reporter = require('./reporter');

var RSP = CNST.RSP,
    TTYPE = CNST.TTYPE;

/*************************************************************************************************/
/*** MqttNode Class                                                                            ***/
/*************************************************************************************************/
function MqttNode(clientId, so, devAttrs) {
    var _transid = 0,
        privateListeners = {},
        lsnCounter;

    devAttrs = devAttrs || {};

    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');
    else if (!_.isObject(so) || !_.isFunction(Object.getPrototypeOf(so).objectList))
        throw new TypeError('so should be an instance of SmartObject class.');
    else if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);
    // EventEmitter.listenerCount for MT7688 node@0.12.7
    lsnCounter = EventEmitter.listenerCount || this.listenerCount;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400; // seconds
    this.ip = devAttrs.ip || null;
    this.mac = null;
    this.version = devAttrs.version || '0.0.1';

    this.mc = null;                 // mqtt client
    this.so = so;                   // default smartobjects, initialize in _init()
    this._connected = false;
    this._sleep = false;
    this._lfsecs = 0;               // lifetime counter
    this._brokerUrl = null;
    this._opts = null;

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

    // for testing purpose, don't use it
    this.__transId = function () { return _transid };

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
            exist: this.getSmartObject().has(oid, iid, rid)
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
                self.update({ lifetime: self.lifetime });
                self._lfsecs = 0;
            }
        }, 1000);
    }
};

/*************************************************************************************************/
/*** Public Methods                                                                            ***/
/*************************************************************************************************/
MqttNode.prototype.getSmartObject = function () {
    return this.so;
};

MqttNode.prototype.isConnected = function () {
    return this._connected;
};

MqttNode.prototype.setDevAttrs = function (attrs, callback) {
    var self = this,
        so = this.getSmartObject(),
        localStatus,
        updater = {};

    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should be an object.');

    // [TODO] how to deal with 'ip'?
    _.forEach(attrs, function (attr, key) {
        if (key === 'lifetime') {
            self.lifetime = updater.lifetime = attrs.lifetime;
            so.set('lwm2mServer', 0, 'lifetime', attrs.lifetime);
            self._lifeUpdate(true);
        } else if (key === 'ip') {
            self.ip = updater.ip = attrs.ip;
            self._lifeUpdate(true);
        } else if (key === 'version') {
            self.version = updater.version = attrs.version;
        } else if (key === 'mac' || key === 'clientId') {
            localStatus = localStatus || RSP.notallowed;
        } else {
            localStatus = localStatus || RSP.badreq;
        }
    });

    if (_.isEmpty(updater))
        localStatus = localStatus || RSP.ok;

    if (localStatus && _.isFunction(callback)) {
        process.nextTick(function () {
            callback(null, { status: localStatus });
        });
    } else {
        this.update(updater, callback);
    }

    return this;
};

MqttNode.prototype.enableReport = function (oid, iid, rid) {
    if (!_.isNil(rid)) {
        if (!_.isString(rid) && !_.isNumber(rid))
            throw new TypeError('rid should be a string or a number.');

    }
    return reporter.enableReport(this, oid, iid, rid);
};

MqttNode.prototype.disableReport = function (oid, iid, rid) {
    if (!_.isNil(rid)) {
        if (!_.isString(rid) && !_.isNumber(rid))
            throw new TypeError('rid should be a string or a number.');

    }
    return reporter.disableReport(this, oid, iid, rid);
};

/*************************************************************************************************/
/*** Public Methods - MQTT Interfaces                                                          ***/
/*************************************************************************************************/
MqttNode.prototype.connect = function (brokerUrl, opts) {
    var self = this,
        lsnEvtsToRemove = [ 'connect', 'message', 'reconnect', 'close', 'offline', 'error' ];

    opts = opts || {};

    if (!_.isString(brokerUrl))
        throw new TypeError('brokerUrl should be a string.');

    if (!_.isPlainObject(opts))
        throw new TypeError('opts should be an object if given.');

    if (!_.has(opts, 'reconnectPeriod'))
        opts.reconnectPeriod = 3000;

    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId))
        throw new Error('clientId cannot be changed.');

    this._brokerUrl = brokerUrl;
    this._opts = opts;

    opts = _.assign(opts, { clientId: this.clientId });

    if (this.mc && this.mc.connected)
        return this;

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
    });

    return this;
};

MqttNode.prototype.close = function (force, callback) {
    var self = this,
        lsnEvtsToRemove = [ 'connect', 'message', 'reconnect', 'close', 'offline', 'error' ];

    if (_.isFunction(force)) {
        callback = force;
        force = true;
    }

    if (!_.isUndefined(force) && !_.isBoolean(force))
        throw new TypeError('force should be a boolean if given.');

    if (this.mc) {
        this.mc.end(force, function () {
            lsnEvtsToRemove.forEach(function (evt) {
                self._removePrivateListeners(self.mc, evt);
            });

            self.mc = null;
            if (_.isFunction(callback))
                callback();
        });
    } else if (_.isFunction(callback)) {
        callback();
    }

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
    else if (!this.isConnected())
        errText = 'No connection.';
    else if (!_.isString(message) && !Buffer.isBuffer(message))
        errText = 'Message should be a string or a buffer.';

    if (errText) {
        callback(new Error(errText), null);
    } else {
        if (!_.isFunction(this.encrypt)) {
            this.encrypt = function (msgStr, clientId, callback) {
                callback(null, msgStr);
            };
        }

        this.encrypt(message, this.clientId, function (err, encrypted) {
            if (!err) {
                self.mc.publish(topic, encrypted, options, function () {
                    self.emit('published', {
                        topic: topic,
                        message: encrypted,
                        options: options
                    });

                    callback(null, encrypted);
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

/*************************************************************************************************/
/*** Public Methods - LWM2M Interfaces                                                         ***/
/*************************************************************************************************/
MqttNode.prototype.register = function (callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return request.register(this, callback);
};

MqttNode.prototype.deregister = function (callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return request.deregister(this, callback);
};

MqttNode.prototype.checkIn = function (callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    this._sleep = false;

    if (!this.isConnected())
        this.connect(this._brokerUrl, this._opts);

    return request.checkIn(this, callback);
};

MqttNode.prototype.checkOut = function (duration, callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    this._sleep = true;

    return request.checkOut(this, duration, callback);
};

MqttNode.prototype.update = function (devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return request.update(this, devAttrs, callback);
};

MqttNode.prototype.notify = function (data, callback) {
    if (!_.isPlainObject(data))
        throw new TypeError('data should be an object.');

    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return request.notify(this, data, callback);
};

MqttNode.prototype.respond = function (rsp, callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return this.publish(this._pubics.response, rsp, callback);
};

MqttNode.prototype.ping = function (callback) {
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('callback should be a function if given.');

    return request.ping(this, callback);
};

module.exports = MqttNode;
