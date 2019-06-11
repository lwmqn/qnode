/* eslint-env mocha */
const sinon = require('sinon')
const assert = require('assert')
const SmartObject = require('smartobject')
const rewire = require('rewire')
const request = rewire('../lib/request.js')
const EventEmitter = require('events')
const CNST = require('../lib/constants')
const { TTYPE } = CNST
const _ = require('busyman')

const so = new SmartObject()

class Mqnode extends EventEmitter {
  constructor (clientId, so) {
    super()
    this.clientId = clientId
    this.so = so
    this._subics = {}
    this._pubics = {}
    this.mc = {
      subscribe: (sub, cb) => cb()
    }
    this.lsnCounter = this.listenerCount.bind(this)
    this.lifetime = 1
    this.ip = 1
    this.version = 1
    this._repAttrs = {}
    this._reporters = {}
    this._connected = true
    this._transid = 0
    this._tobjs = {}
  }

  getSmartObject () {
    return this.so
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

  _target (oid, iid, rid) {
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

  publish () {
    return this
  }

  close () {

  }

  notify (data, callback) {
    if (!_.isPlainObject(data)) throw new TypeError('data should be an object.')
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return null
  }
}

afterEach(() => {
  sinon.restore()
})

describe('request -> ', function () {
  it('register', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.register(qn, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('deregister', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.deregister(qn, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('checkin', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.checkin(qn, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('checkout', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.checkout(qn, 1000, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('update', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.checkout(qn, 1000, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('notify', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.notify(qn, 1000, (err, res) => {
      assert.deepStrictEqual(err, null)
      assert.deepStrictEqual(res, { status: 201 })
    })
  })

  it('ping', function () {
    const qn = new Mqnode('client1', so)
    request.__set__('_req', (qn, intf, data, cb) => cb(null, { status: 201 }))
    request.ping(qn, (err, res) => {
      assert.deepStrictEqual(err, null)
    })
  })
})
