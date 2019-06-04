const EventEmitter = require('events')

const mqtt = require('mqtt')
const _ = require('busyman')
const debug = require('debug')('mqtt-node')

const init = require('./init')
const CNST = require('./constants')
const request = require('./request')
const reporter = require('./reporter')

const { RSP } = CNST
const { TTYPE } = CNST

const _target = Symbol('_target')
const _removePrivateListeners = Symbol('_removePrivateListeners')
const _addPrivateListener = Symbol('__addPrivateListener')

class MqttNode extends EventEmitter {
  constructor (clientId, so, devAttrs = {}) {
    if (!_.isString(clientId)) throw new TypeError('clientId should be a string.')
    else if (!_.isObject(so) || !_.isFunction(Object.getPrototypeOf(so).objectList)) throw new TypeError('so should be an instance of SmartObject class.')
    else if (!_.isPlainObject(devAttrs)) throw new TypeError('devAttrs should be an object.')

    super()

    this.privateListeners = {}
    this.lsnCounter = this.listenerCount.bind(this)
    this.clientId = clientId
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400 // seconds
    this.ip = devAttrs.ip || null
    this.mac = null
    this.version = devAttrs.version || '0.0.1'
    this.mc = null
    this.so = so // default smartobjects, initialize in _init()

    this._transid = 100
    this._connected = false
    this._lfsecs = 0 // lifetime counter
    this._sleep = false
    this._brokerUrl = null
    this._opts = null
    this._pubics = {} // LWMQN interface to publish to, initialize in _init()
    this._subics = {} // LWMQN interface to subscribe to, initialize in _init()
    this._tobjs = {} // timeout objects for request control
    this._updater = null // updating upon lifetime alarm
    this._repAttrs = {} // collection of report settings
    this._reporters = {} // collection of the enabled report senders

    init(this)
    debug('qnode created, clientId: %s', clientId)
  }

  /** ********************************************************************************************** */
  /** * Protected Methods                                                                         ** */
  /** ********************************************************************************************** */

  [_target] (oid, iid, rid) {
    const trg = {
      type: null,
      exist: this.getSmartObject().has(oid, iid, rid)
    }

    if (!_.isNil(oid)) {
      trg.type = (oid === '') ? TTYPE.root : TTYPE.obj
      if (!_.isNil(iid)) {
        trg.type = TTYPE.inst
        if (!_.isNil(rid)) trg.type = TTYPE.rsc
      }
    }

    return trg
  }

  [_addPrivateListener] (emitter, evt, lsn) {
    this.privateListeners[evt] = this.privateListeners[evt] || []
    this.privateListeners[evt].push({
      emitter,
      listener: lsn
    })
    emitter.on(evt, lsn)
  }

  [_removePrivateListeners] (emitter, evt) {
    let lsnRecs = this.privateListeners[evt]

    if (lsnRecs && lsnRecs.length !== 0) {
      lsnRecs.forEach((rec) => {
        if (rec.emitter === emitter) emitter.removeListener(evt, rec.listener)
      })

      _.remove(lsnRecs, rec => rec.emitter === emitter)
    }

    if (lsnRecs && lsnRecs.length === 0) {
      lsnRecs = null
      delete this.privateListeners[evt]
    }
  }

  /** ********************************************************************************************** */
  /** * Public Methods                                                                            ** */
  /** ********************************************************************************************** */
  _lifeUpdate (enable, callback) {
    const self = this

    callback = callback || function () {}

    this._lfsecs = 0
    clearInterval(this._updater)
    this._updater = null

    if (enable) {
      this._updater = setInterval(() => {
        self._lfsecs += 1
        if (self._lfsecs === self.lifetime) {
          self._update({ lifetime: self.lifetime }, callback)
          self._lfsecs = 0
        }
      }, 1000)
    }
  }

  // for testing purpose, don't use it
  __transId () {
    return this._transid
  }

  _nextTransId (intf) {
    const nextid = () => {
      if (++this._transid > 255) this._transid = 0
    }
    nextid()

    if (_.isString(intf)) {
      while (this.lsnCounter(`${intf}:rsp:${this._transid}`) > 0) nextid()
    }

    return this._transid
  }

  mc (obj) {
    this.mc = obj
  }

  identify (callback) {
    callback(new Error('Identify is not implemented'))
  }

  encrypt (msgStr, callback) { // Overide at will
    callback(null, msgStr)
  }

  decrypt (msgBuf, callback) { // Overide at will
    callback(null, msgBuf)
  }

  getSmartObject () {
    return this.so
  }

  isConnected () {
    return this._connected
  }

  enableReport (oid, iid, rid) {
    if (!_.isNil(rid)) {
      if (!_.isString(rid) && !_.isNumber(rid)) throw new TypeError('rid should be a string or a number.')
    }
    return reporter.enableReport(this, oid, iid, rid)
  }

  disableReport (oid, iid, rid) {
    if (!_.isNil(rid)) {
      if (!_.isString(rid) && !_.isNumber(rid)) throw new TypeError('rid should be a string or a number.')
    }
    return reporter.disableReport(this, oid, iid, rid)
  }

  /** ********************************************************************************************** */
  /** * Public Methods - MQTT Interfaces                                                          ** */
  /** ********************************************************************************************** */

  _emitError (err) {
    if (!this.listenerCount('error')) throw err
    else this.emit('error', err)
  }

  connect (brokerUrl, opts, callback) {
    const self = this
    const lsnEvtsToRemove = ['connect', 'message', 'reconnect', 'close', 'offline', 'error']

    if (_.isFunction(opts)) {
      callback = opts
      opts = undefined
    }

    opts = opts || {}
    callback = callback || function (err, rsp) {
      if (err) self._emitError(err)
    }

    if (!_.isString(brokerUrl)) throw new TypeError('brokerUrl should be a string.')
    if (!_.isPlainObject(opts)) throw new TypeError('opts should be an object if given.')
    if (!_.has(opts, 'reconnectPeriod')) opts.reconnectPeriod = 3000
    if (_.has(opts, 'clientId') && (opts.clientId !== this.clientId)) throw new Error('clientId cannot be changed.')

    this._brokerUrl = brokerUrl
    this._opts = opts

    opts = Object.assign(opts, { clientId: this.clientId })

    if (this.mc && this.isConnected()) {
      this.register(callback)
      return this
    }

    this.once('_connect_cb', (data) => {
      if (data.err) {
        if (_.isFunction(callback)) callback(data.err)
        else self._emitError(data.err)
      } else {
        callback(null, data.rsp)
        setImmediate(() => {
          self.emit('login')
        })
      }
    })

    this.mc = mqtt.connect(brokerUrl, opts)

    lsnEvtsToRemove.forEach((evt) => {
      this[_removePrivateListeners](self.mc, evt)
    })

    this[_addPrivateListener](this.mc, 'connect', (connack) => {
      debug('Connect to broker')

      self.emit('connect', connack)
      self.emit('_connected')
    })

    this[_addPrivateListener](this.mc, 'message', (topic, message, packet) => {
      self.emit('raw', topic, message, packet)
    })

    this[_addPrivateListener](this.mc, 'reconnect', () => {
      self.emit('reconnect')
    })

    this[_addPrivateListener](this.mc, 'close', () => {
      debug('Disconnect from broker')
      self.emit('logout')
      self.emit('_unconnected')
    })

    this[_addPrivateListener](this.mc, 'offline', () => {
      self.emit('offline')
      self.emit('_unconnected')
    })

    this[_addPrivateListener](this.mc, 'error', (err) => {
      self._emitError(err)
    })

    return this
  }

  close (force, callback) {
    const self = this
    const lsnEvtsToRemove = ['connect', 'message', 'reconnect', 'close', 'offline', 'error']

    if (_.isFunction(force)) {
      callback = force
      force = false
    }

    if (!_.isUndefined(force) && !_.isBoolean(force)) throw new TypeError('force should be a boolean if given.')

    force = !!force

    callback = callback || function (err, rsp) {
      if (err) self._emitError(err)
    }

    if (this.mc) {
      this.mc.end(force, () => {
        lsnEvtsToRemove.forEach((evt) => {
          this[_removePrivateListeners](self.mc, evt)
        })

        self.mc = null
        if (_.isFunction(callback)) callback()
      })
    } else if (_.isFunction(callback)) {
      process.nextTick(() => {
        callback(new Error('No mqtt client attached on qnode, cannot close connection.'))
      })
    }

    return this
  }

  publish (topic, message, options, callback) {
    const self = this
    let errText

    if (_.isFunction(options)) {
      callback = options
      options = undefined
    }

    options = options || { qos: 0, retain: false }

    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    if (_.isPlainObject(message)) message = JSON.stringify(message)

    if (!this.mc) errText = 'No mqtt client established.'
    else if (!this.isConnected()) errText = 'No connection.'
    else if (!_.isString(message) && !Buffer.isBuffer(message)) errText = 'Message should be a string or a buffer.'

    if (errText) {
      process.nextTick(() => {
        callback(new Error(errText), null)
      })
    } else {
      if (!_.isFunction(this.encrypt)) {
        this.encrypt = function (msgStr, callback) {
          callback(null, msgStr)
        }
      }

      this.encrypt(message, (err, encrypted) => {
        if (!err) {
          self.mc.publish(topic, encrypted, options, () => {
            self.emit('published', {
              topic,
              message: encrypted,
              options
            })

            callback(null, encrypted)
          })
        } else {
          callback(err)
        }
      })
    }

    return this
  }

  subscribe (topics, opts, callback) {
    if (_.isFunction(opts)) {
      callback = opts
      opts = { qos: 0 }
    }

    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    this.mc.subscribe(topics, opts, callback) // function (err, granted)
    return this
  }

  unsubscribe (topics, callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    this.mc.unsubscribe(topics, callback)
    return this
  }

  /** ********************************************************************************************** */
  /** * Public Methods - LWM2M Interfaces                                                         ** */
  /** ********************************************************************************************** */

  register (callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return request.register(this, callback)
  }

  deregister (callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return request.deregister(this, callback)
  }

  checkin (callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    this._sleep = false
    return request.checkin(this, callback)
  }

  checkout (duration, callback) {
    if (_.isFunction(duration)) {
      callback = duration
      duration = undefined
    }

    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')

    duration = duration || 0
    reporter.clear(this)
    this._sleep = true

    return request.checkout(this, duration, callback)
  }

  _update (devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    if (!_.isPlainObject(devAttrs)) throw new TypeError('devAttrs should be an object.')
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')

    return request.update(this, devAttrs, callback)
  }

  update (attrs, callback) {
    const self = this
    const so = this.getSmartObject()
    let localStatus
    const updater = {}

    if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be an object.')
    else if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')

    Object.entries(attrs).forEach(([key, attr]) => {
      if (key === 'lifetime') {
        self.lifetime = updater.lifetime = attrs.lifetime
        so.set('lwm2mServer', 0, 'lifetime', attrs.lifetime)
      } else if (key === 'ip') {
        self.ip = updater.ip = attrs.ip
      } else if (key === 'version') {
        self.version = updater.version = attrs.version
      } else if (key === 'mac' || key === 'clientId') {
        localStatus = localStatus || RSP.notallowed
      } else {
        localStatus = localStatus || RSP.badreq
      }
    })

    if (localStatus && _.isFunction(callback)) {
      setImmediate(() => {
        callback(null, { status: localStatus })
      })
    } else {
      this._lifeUpdate(true) // schedule next update at lifetime
      this._update(updater, callback)
    }

    return this
  }

  // [TODO] Deprecated - take off at next major version bumped
  setDevAttrs (attrs, callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return this.update(attrs, callback)
  }

  notify (data, callback) {
    if (!_.isPlainObject(data)) throw new TypeError('data should be an object.')
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return request.notify(this, data, callback)
  }

  respond (rsp, callback) {
    if (_.isUndefined(callback)) callback = function () {}
    return this.publish(this._pubics.response, rsp, callback)
  }

  ping (callback) {
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return request.ping(this, callback)
  }
}

module.exports = MqttNode
