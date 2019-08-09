/* eslint-env mocha */
const assert = require('assert')
const SmartObject = require('smartobject')
const rewire = require('rewire')
const msgHandlers = rewire('../lib/msg_handlers.js')
const EventEmitter = require('events')

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
  }

  getSmartObject () {
    return this.so
  }
}

var so = new SmartObject()

describe('msg_handlers -> ', function () {
  it('_rawHdlr err', function () {
    const qn = new Mqnode('client1', so)
    qn.decrypt = (msg, cb) => cb(new Error())
    const resp = msgHandlers._rawHdlr(qn, `register/response/${qn.clientId}`, 'msg', 'packet')
    assert.strictEqual(resp, undefined)
  })

  it('_rawHdlr - register topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { register: `register/response/client2` }
    qn._tobjs = { 'register:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `register/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('register:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['register:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - deregister topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { deregister: `deregister/response/client2` }
    qn._tobjs = { 'deregister:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `deregister/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('deregister:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['deregister:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - schedule topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { schedule: `schedule/response/client2` }
    qn._tobjs = { 'schedule:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `schedule/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('schedule:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['schedule:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - notify topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { notify: `notify/response/client2` }
    qn._tobjs = { 'notify:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `notify/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('notify:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['notify:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - update topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { update: `update/response/client2` }
    qn._tobjs = { 'update:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `update/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('update:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['update:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - ping topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { ping: `ping/response/client2` }
    qn._tobjs = { 'ping:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `ping/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('ping:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['ping:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - request topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { request: `request/response/client2` }
    qn._tobjs = { 'request:rsp:1': 1 }

    const resp = msgHandlers._rawHdlr(qn, `request/response/${qn.clientId}`)
    assert.strictEqual(resp, undefined)

    qn.on('request:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['request:rsp:1'], undefined)
    })
  })

  it('_rawHdlr - request topic', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn._subics = { announce: `announce` }
    qn._tobjs = { announce: 1 }

    const resp = msgHandlers._rawHdlr(qn, `announce`)
    assert.strictEqual(resp, undefined)

    qn.on('request:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['announce'], undefined)
    })
  })

  it('_reqHdlr - ', function () {
    const qn = new Mqnode('client2', so)
    qn.decrypt = (msg, cb) => cb(null, Buffer.from('{"transId": "1", "status": 200}'))
    qn._lifeUpdate = (status) => {}
    qn.respond = (status) => {}
    qn._subics = { announce: `announce` }
    qn._tobjs = { announce: 1 }

    const resp = msgHandlers._reqHdlr(qn, `announce`)
    assert.strictEqual(resp, undefined)

    qn.on('request:rsp:1', (msg, jmsg) => {
      assert.deepStrictEqual(msg, null)
      assert.deepStrictEqual(jmsg, { transId: '1', status: 200 })
      assert.deepStrictEqual(qn._tobjs['announce'], undefined)
    })
  })

  it('_readReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._readReqHandler(qn, 'test', null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_writeReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._writeReqHandler(qn, 'test', null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_executeReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._executeReqHandler(qn, 'test', null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_writeAttrsReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._writeAttrsReqHandler(qn, 'test', 'test', () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_discoverReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._discoverReqHandler(qn, 'test', null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_observeReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._observeReqHandler(qn, 'test', null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_pingReqHandler - ', function () {
    const qn = new Mqnode('client2', so)
    const resp = msgHandlers._pingReqHandler(qn, null, null, () => {})
    assert.strictEqual(resp, undefined)
  })

  it('_identifyReqHandler - qn not set', function () {
    msgHandlers._identifyReqHandler(null, null, null, (res) => {
      assert.strictEqual(res, 404)
    })
  })

  it('_identifyReqHandler - qn.identify not set', function () {
    const qn = new Mqnode('client2', so)
    msgHandlers._identifyReqHandler(qn, null, null, (res) => {
      assert.strictEqual(res, 500)
    })
  })

  it('_identifyReqHandler - qn.identify err', function () {
    const qn = new Mqnode('client2', so)
    qn.identify = (cb) => cb(new Error())
    msgHandlers._identifyReqHandler(qn, null, null, (res) => {
      assert.strictEqual(res, 500)
    })
  })

  it('_unknownReqHandler - success', function () {
    const qn = new Mqnode('clientid', so)
    qn.identify = (cb) => cb()
    msgHandlers._identifyReqHandler(qn, null, null, (res) => {
      assert.strictEqual(res, 200)
    })
  })
})
