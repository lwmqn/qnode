/* eslint-env mocha */
const assert = require('assert')
const SmartObject = require('smartobject')
const rewire = require('rewire')
const init = rewire('../lib/init.js')
const EventEmitter = require('events')

class Mqnode extends EventEmitter {
  constructor (so) {
    super()
    this.so = so
    this._subics = {}
    this._pubics = {}
    this.mc = {
      subscribe: (sub, cb) => cb()
    }
    this.lifetime = 1
    this.ip = 1
    this.version = 1
  }
}

var so = new SmartObject()
const qn = new Mqnode(so)

describe('init -> ', function () {
  it('returns true', function () {
    assert.strictEqual(init(qn), true)
  })

  it('_lwmqnSubAndReg - emits err', function () {
    const _lwmqnSubAndReg = init.__get__('_lwmqnSubAndReg')
    const qn = new Mqnode(so)
    qn.mc.subscribe = (subics, cb) => cb(new Error())

    qn.on('_connect_cb', (rsp) => {
      assert.deepStrictEqual(rsp, { err: new Error(), rsp: null })
    })
    assert.doesNotReject(_lwmqnSubAndReg(qn))
  })

  it('_lwmqnSubAndReg - succeeded', function () {
    const _lwmqnSubAndReg = init.__get__('_lwmqnSubAndReg')
    const qn = new Mqnode(so)
    qn.register = (cb) => cb(null, { status: 200 })

    qn.on('_connect_cb', (rsp) => {
      assert.deepStrictEqual(rsp, { err: null, rsp: { status: 200 } })
    })

    assert.doesNotReject(_lwmqnSubAndReg(qn))
  })

  it('_lwmqnSubAndReg - stage 1 - sub REGISTER, DEREGISTER, REQUEST err', function () {
    const _lwmqnSubAndRegStage1 = init.__get__('_lwmqnSubAndRegStage1')
    const qn = new Mqnode(so)
    qn.mc.subscribe = (subics, cb) => cb(new Error())

    assert.rejects(_lwmqnSubAndRegStage1(qn), new Error())
  })

  it('_lwmqnSubAndReg - stage 1 - REQUEST register err', function () {
    const _lwmqnSubAndRegStage1 = init.__get__('_lwmqnSubAndRegStage1')
    const qn = new Mqnode(so)
    qn.register = (cb) => cb(new Error())
    qn.mc.subscribe = (subics, cb) => cb(null)

    assert.rejects(_lwmqnSubAndRegStage1(qn), new Error())
  })

  it('_lwmqnSubAndReg - stage 2 - sub NOTIFY, UPDATE, PING, ANNOUNCE, SCHEDULE err', function () {
    const _lwmqnSubAndRegStage2 = init.__get__('_lwmqnSubAndRegStage2')
    const qn = new Mqnode(so)
    qn.mc.subscribe = (subics, cb) => cb(new Error())

    assert.rejects(_lwmqnSubAndRegStage2(qn), undefined)
  })

  it('_lwmqnSubAndReg - stage 2 - succeeded - existing client (200) ', function () {
    const _lwmqnSubAndRegStage2 = init.__get__('_lwmqnSubAndRegStage2')
    const qn = new Mqnode(so)

    qn.on('_connect_cb', (rsp) => {
      assert.deepStrictEqual(rsp, { err: null, rsp: { status: 200 } })
    })

    assert.doesNotReject(_lwmqnSubAndRegStage2(qn, { status: 200 }))
  })

  it('_lwmqnSubAndReg - stage 2 - succeeded - new client (201)', function () {
    const _lwmqnSubAndRegStage2 = init.__get__('_lwmqnSubAndRegStage2')
    const qn = new Mqnode(so)

    qn.on('_connect_cb', (rsp) => {
      assert.deepStrictEqual(rsp, { err: null, rsp: { status: 201 } })
    })

    assert.doesNotReject(_lwmqnSubAndRegStage2(qn, { status: 201 }))
  })
})
