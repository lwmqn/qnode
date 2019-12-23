/* eslint-env mocha */
const assert = require('assert')
const SmartObject = require('@lwmqn/smartobject')
const rewire = require('rewire')
const reporter = rewire('../lib/reporter.js')
const EventEmitter = require('events')
const CNST = require('../lib/constants')
const { TTYPE } = CNST
const _ = require('busyman')

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
    this.lifetime = 1
    this.ip = 1
    this.version = 1
    this._repAttrs = {}
    this._reporters = {}
  }

  getSmartObject () {
    return this.so
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

  notify (data, callback) {
    if (!_.isPlainObject(data)) throw new TypeError('data should be an object.')
    if (!_.isFunction(callback)) throw new TypeError('callback should be given and should be a function.')
    return null
  }
}

var so = new SmartObject()
so.init('humidity', 0, {
  sensorValue: 20,
  units: 'percent'
})

describe('reporter -> ', function () {
  it('enableReport', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.enableReport(qn, 'humidity', 0, 'sensorValue')
    assert.strictEqual(resp, true)
  })

  it('disableReport', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.disableReport(qn, 'humidity', 0, 'sensorValue')
    assert.strictEqual(resp, true)
  })

  it('clear', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.clear(qn, 'humidity', 0, 'sensorValue')
    assert.strictEqual(resp, true)
  })

  it('getAttrs', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.getAttrs(qn, 'humidity', 0, 'sensorValue')
    assert.deepStrictEqual(resp, {
      cancel: true,
      lastRpVal: null,
      mute: true,
      pmax: undefined,
      pmin: undefined
    })
  })

  it('setAttrs', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.setAttrs(qn, 'humidity', 0, {
      cancel: true,
      lastRpVal: null,
      mute: true,
      pmax: undefined,
      pmin: undefined
    })
    assert.strictEqual(resp, true)
  })

  it('checkAndReportResource', function () {
    const qn = new Mqnode('client1', so)
    const resp = reporter.checkAndReportResource(qn, 'humidity', 0, 'sensorValue', {
      cancel: false,
      lastRpVal: null,
      mute: false,
      pmax: undefined,
      pmin: undefined
    })
    assert.strictEqual(resp, false)
  })
})
