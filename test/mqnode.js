/* eslint-env mocha */
const _ = require('busyman')
const sinon = require('sinon')
const assert = require('assert')
const SmartObject = require('smartobject')
const Mqnode = require('../index.js')

const so = new SmartObject()

afterEach(() => {
  sinon.restore()
})

describe('mqnode -> Signature Check', () => {
  const mqnode = new Mqnode('foo', so, { version: '0.0.1' })

  describe('#new mqnode', function () {
    // for travis-ci, since network module cannot run on it
    if (process.env.NODE_ENV === 'development') {
      it('should throw TypeError if clientId is not a string', function () {
        assert.throws(() => new Mqnode(null, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(undefined, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(true, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(NaN, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(12, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode({}, so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode([], so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(new Date(), so, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode(function () {}, so, { version: '0.0.1' }), TypeError)

        assert.doesNotThrow(() => new Mqnode('foo', so, { version: '0.0.1' }), Error)
      })

      it('should throw TypeError if so is not an instance of SmartObject class', function () {
        assert.throws(() => new Mqnode('foo', 'x', { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', 12, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', null, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', undefined, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', NaN, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', true, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', new Date(), { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', {}, { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', [], { version: '0.0.1' }), TypeError)
        assert.throws(() => new Mqnode('foo', function () {}, { version: '0.0.1' }), TypeError)

        assert.doesNotThrow(() => new Mqnode('foo', so, { version: '0.0.1' }), Error)
      })

      it('should throw TypeError if devAttrs is not an object if given', function () {
        assert.throws(() => new Mqnode('foo', so, 'x'), TypeError)
        assert.throws(() => new Mqnode('foo', so, 12), TypeError)
        assert.throws(() => new Mqnode('foo', so, true), TypeError)
        assert.throws(() => new Mqnode('foo', so, new Date()), TypeError)
        assert.throws(() => new Mqnode('foo', so, []), TypeError)
        assert.throws(() => new Mqnode('foo', so, function () {}), TypeError)
      })
    }
  })

  describe('#.setDevAttrs', () => {
    it('should throw TypeError if devAttrs is not an object', () => {
      assert.throws(() => mqnode.setDevAttrs('x'), TypeError)
      assert.throws(() => mqnode.setDevAttrs(1), TypeError)
      assert.throws(() => mqnode.setDevAttrs(true), TypeError)
      assert.throws(() => mqnode.setDevAttrs([]), TypeError)
      assert.throws(() => mqnode.setDevAttrs(null), TypeError)
      assert.throws(() => mqnode.setDevAttrs(undefined), TypeError)
      assert.throws(() => mqnode.setDevAttrs(NaN), TypeError)
      assert.throws(() => mqnode.setDevAttrs(new Date()), TypeError)
      assert.throws(() => mqnode.setDevAttrs({}), TypeError)

      assert.doesNotThrow(() => mqnode.setDevAttrs({}, () => {}), TypeError)
      assert.doesNotThrow(() => mqnode.setDevAttrs({}, (e, r) => {}), TypeError)
    })
  })

  describe('#.enableReport', () => {
    it('should throw TypeError if oid is not a number or a string', () => {
      assert.throws(() => mqnode.enableReport(), TypeError)
      assert.throws(() => mqnode.enableReport({}), TypeError)
      assert.throws(() => mqnode.enableReport([]), TypeError)
      assert.throws(() => mqnode.enableReport(true), TypeError)
      assert.throws(() => mqnode.enableReport(null), TypeError)
      assert.throws(() => mqnode.enableReport(NaN), TypeError)
      assert.throws(() => mqnode.enableReport(new Date()), TypeError)
      assert.throws(() => mqnode.enableReport(() => {}), TypeError)
    })

    it('should throw TypeError if iid is not a number or a string', () => {
      assert.throws(() => mqnode.enableReport(1, {}), TypeError)
      assert.throws(() => mqnode.enableReport(1, []), TypeError)
      assert.throws(() => mqnode.enableReport(1, true), TypeError)
      assert.throws(() => mqnode.enableReport(1, null), TypeError)
      assert.throws(() => mqnode.enableReport(1, NaN), TypeError)
      assert.throws(() => mqnode.enableReport(1, new Date()), TypeError)
      assert.throws(() => mqnode.enableReport(1, () => {}), TypeError)

      assert.throws(() => mqnode.enableReport('x', {}), TypeError)
      assert.throws(() => mqnode.enableReport('x', []), TypeError)
      assert.throws(() => mqnode.enableReport('x', true), TypeError)
      assert.throws(() => mqnode.enableReport('x', null), TypeError)
      assert.throws(() => mqnode.enableReport('x', NaN), TypeError)
      assert.throws(() => mqnode.enableReport('x', new Date()), TypeError)
      assert.throws(() => mqnode.enableReport('x', () => {}), TypeError)
    })

    it('should throw TypeError if rid is not a number or a string', () => {
      assert.throws(() => mqnode.enableReport('x', 1, {}), TypeError)
      assert.throws(() => mqnode.enableReport('x', 1, []), TypeError)
      assert.throws(() => mqnode.enableReport('x', 1, true), TypeError)
      assert.throws(() => mqnode.enableReport('x', 1, new Date()), TypeError)
      assert.throws(() => mqnode.enableReport('x', 1, () => {}), TypeError)

      assert.throws(() => mqnode.enableReport(1, 'x', {}), TypeError)
      assert.throws(() => mqnode.enableReport(1, 'x', []), TypeError)
      assert.throws(() => mqnode.enableReport(1, 'x', true), TypeError)
      assert.throws(() => mqnode.enableReport(1, 'x', new Date()), TypeError)
      assert.throws(() => mqnode.enableReport(1, 'x', () => {}), TypeError)
    })
  })

  describe('#.disableReport', () => {
    it('should throw TypeError if oid is not a number or a string', () => {
      assert.throws(() => mqnode.disableReport(), TypeError)
      assert.throws(() => mqnode.disableReport({}), TypeError)
      assert.throws(() => mqnode.disableReport([]), TypeError)
      assert.throws(() => mqnode.disableReport(true), TypeError)
      assert.throws(() => mqnode.disableReport(null), TypeError)
      assert.throws(() => mqnode.disableReport(NaN), TypeError)
      assert.throws(() => mqnode.disableReport(new Date()), TypeError)
      assert.throws(() => mqnode.disableReport(() => {}), TypeError)
    })

    it('should throw TypeError if iid is not a number or a string', () => {
      assert.throws(() => mqnode.disableReport(1, {}), TypeError)
      assert.throws(() => mqnode.disableReport(1, []), TypeError)
      assert.throws(() => mqnode.disableReport(1, true), TypeError)
      assert.throws(() => mqnode.disableReport(1, null), TypeError)
      assert.throws(() => mqnode.disableReport(1, NaN), TypeError)
      assert.throws(() => mqnode.disableReport(1, new Date()), TypeError)
      assert.throws(() => mqnode.disableReport(1, () => {}), TypeError)

      assert.throws(() => mqnode.disableReport('x', {}), TypeError)
      assert.throws(() => mqnode.disableReport('x', []), TypeError)
      assert.throws(() => mqnode.disableReport('x', true), TypeError)
      assert.throws(() => mqnode.disableReport('x', null), TypeError)
      assert.throws(() => mqnode.disableReport('x', NaN), TypeError)
      assert.throws(() => mqnode.disableReport('x', new Date()), TypeError)
      assert.throws(() => mqnode.disableReport('x', () => {}), TypeError)
    })

    it('should throw TypeError if rid is not a number or a string', () => {
      assert.throws(() => mqnode.disableReport('x', 1, {}), TypeError)
      assert.throws(() => mqnode.disableReport('x', 1, []), TypeError)
      assert.throws(() => mqnode.disableReport('x', 1, true), TypeError)
      assert.throws(() => mqnode.disableReport('x', 1, new Date()), TypeError)
      assert.throws(() => mqnode.disableReport('x', 1, () => {}), TypeError)

      assert.throws(() => mqnode.disableReport(1, 'x', {}), TypeError)
      assert.throws(() => mqnode.disableReport(1, 'x', []), TypeError)
      assert.throws(() => mqnode.disableReport(1, 'x', true), TypeError)
      assert.throws(() => mqnode.disableReport(1, 'x', new Date()), TypeError)
      assert.throws(() => mqnode.disableReport(1, 'x', () => {}), TypeError)
    })
  })

  describe('#.connect', () => {
    it('should throw TypeError if brokerUrl is not a string', () => {
      assert.throws(() => mqnode.connect(), TypeError)
      assert.throws(() => mqnode.connect(1), TypeError)
      assert.throws(() => mqnode.connect({}), TypeError)
      assert.throws(() => mqnode.connect([]), TypeError)
      assert.throws(() => mqnode.connect(true), TypeError)
      assert.throws(() => mqnode.connect(null), TypeError)
      assert.throws(() => mqnode.connect(NaN), TypeError)
      assert.throws(() => mqnode.connect(new Date()), TypeError)
      assert.throws(() => mqnode.connect(() => {}), TypeError)

      assert.doesNotThrow(() => mqnode.connect('mqtt://192.168.0.1'), TypeError)
      assert.doesNotThrow(() => mqnode.connect('mqtt://192.168.0.1', () => {}), Error)
    })

    it('should throw TypeError if opt is not an object when given', () => {
      assert.throws(() => mqnode.connect('mqtt://192.168.0.1', 1), TypeError)
      assert.throws(() => mqnode.connect('mqtt://192.168.0.1', '1'), TypeError)
      assert.throws(() => mqnode.connect('mqtt://192.168.0.1', true), TypeError)
      assert.throws(() => mqnode.connect('mqtt://192.168.0.1', []), TypeError)
      assert.throws(() => mqnode.connect('mqtt://192.168.0.1', new Date()), TypeError)
    })
  })

  describe('#.close', () => {
    it('should throw TypeError if force is not a boolean when given', () => {
      assert.throws(() => mqnode.close(1), TypeError)
      assert.throws(() => mqnode.close({}), TypeError)
      assert.throws(() => mqnode.close([]), TypeError)
      assert.throws(() => mqnode.close(null), TypeError)
      assert.throws(() => mqnode.close(NaN), TypeError)
      assert.throws(() => mqnode.close(new Date()), TypeError)

      assert.doesNotThrow(() => mqnode.close(true), TypeError)
      assert.doesNotThrow(() => mqnode.close(() => {}), Error)
      assert.doesNotThrow(() => mqnode.close(true, () => {}), Error)
    })
  })

  describe('#.register', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode.register('xxx'), TypeError)
      assert.throws(() => mqnode.register(true), TypeError)
      assert.throws(() => mqnode.register(1), TypeError)
      assert.throws(() => mqnode.register({}), TypeError)
      assert.throws(() => mqnode.register([]), TypeError)
      assert.throws(() => mqnode.register(new Date()), TypeError)

      assert.doesNotThrow(() => mqnode.register(() => {}), TypeError)
    })
  })

  describe('#.deregister', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode.deregister('xxx'), TypeError)
      assert.throws(() => mqnode.deregister(true), TypeError)
      assert.throws(() => mqnode.deregister(1), TypeError)
      assert.throws(() => mqnode.deregister({}), TypeError)
      assert.throws(() => mqnode.deregister([]), TypeError)
      assert.throws(() => mqnode.deregister(new Date()), TypeError)

      assert.doesNotThrow(() => mqnode.deregister(() => {}), TypeError)
    })
  })

  describe('#._update', () => {
    it('should throw TypeError if devAttrs is not an object', () => {
      assert.throws(() => mqnode._update('xxx'), TypeError)
      assert.throws(() => mqnode._update(), TypeError)
      assert.throws(() => mqnode._update(null), TypeError)
      assert.throws(() => mqnode._update(NaN), TypeError)
      assert.throws(() => mqnode._update(true), TypeError)
      assert.throws(() => mqnode._update(1), TypeError)
      assert.throws(() => mqnode._update([]), TypeError)
      assert.throws(() => mqnode._update(new Date()), TypeError)
      assert.throws(() => mqnode._update(() => {}), TypeError)
      assert.throws(() => mqnode._update({}), TypeError)

      assert.doesNotThrow(() => mqnode._update({}, () => {}), TypeError)
    })

    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode._update({}, 'xxx'), TypeError)
      assert.throws(() => mqnode._update({}, null), TypeError)
      assert.throws(() => mqnode._update({}, NaN), TypeError)
      assert.throws(() => mqnode._update({}, true), TypeError)
      assert.throws(() => mqnode._update({}, 1), TypeError)
      assert.throws(() => mqnode._update({}, []), TypeError)
      assert.throws(() => mqnode._update({}, new Date()), TypeError)

      assert.doesNotThrow(() => mqnode._update({}, () => {}), TypeError)
    })
  })

  describe('#.notify', () => {
    it('should throw TypeError if data is not an object', () => {
      assert.throws(() => mqnode.notify('xxx'), TypeError)
      assert.throws(() => mqnode.notify(), TypeError)
      assert.throws(() => mqnode.notify(null), TypeError)
      assert.throws(() => mqnode.notify(NaN), TypeError)
      assert.throws(() => mqnode.notify(true), TypeError)
      assert.throws(() => mqnode.notify(1), TypeError)
      assert.throws(() => mqnode.notify([]), TypeError)
      assert.throws(() => mqnode.notify(new Date()), TypeError)
      assert.throws(() => mqnode.notify(() => {}), TypeError)
      assert.throws(() => mqnode.notify({}), TypeError)

      assert.doesNotThrow(() => mqnode.notify({}, () => {}), TypeError)
    })

    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode.notify({}, 'xxx'), TypeError)
      assert.throws(() => mqnode.notify({}, null), TypeError)
      assert.throws(() => mqnode.notify({}, NaN), TypeError)
      assert.throws(() => mqnode.notify({}, true), TypeError)
      assert.throws(() => mqnode.notify({}, 1), TypeError)
      assert.throws(() => mqnode.notify({}, []), TypeError)
      assert.throws(() => mqnode.notify({}, new Date()), TypeError)
      assert.throws(() => mqnode.notify({}), TypeError)

      assert.doesNotThrow(() => mqnode.notify({}, () => {}), TypeError)
    })
  })

  describe('#.respond', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode.respond({}, 'xxx'), TypeError)
      assert.throws(() => mqnode.respond({}, null), TypeError)
      assert.throws(() => mqnode.respond({}, NaN), TypeError)
      assert.throws(() => mqnode.respond({}, true), TypeError)
      assert.throws(() => mqnode.respond({}, 1), TypeError)
      assert.throws(() => mqnode.respond({}, []), TypeError)
      assert.throws(() => mqnode.respond({}, new Date()), TypeError)

      assert.doesNotThrow(() => mqnode.respond({}), TypeError)
      assert.doesNotThrow(() => mqnode.respond({}, () => {}), TypeError)
    })
  })

  describe('#.ping', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      assert.throws(() => mqnode.ping('xxx'), TypeError)
      assert.throws(() => mqnode.ping(true), TypeError)
      assert.throws(() => mqnode.ping(1), TypeError)
      assert.throws(() => mqnode.ping({}), TypeError)
      assert.throws(() => mqnode.ping([]), TypeError)
      assert.throws(() => mqnode.ping(new Date()), TypeError)
      assert.throws(() => mqnode.ping(), TypeError)

      assert.doesNotThrow(() => mqnode.ping(() => {}), TypeError)
    })
  })
})

describe('mqnode -> Functional Check', () => {
  const mqnode = new Mqnode('foo', so, { version: '0.0.1' })
  mqnode.connect('mqtt://192.16.0.1')

  describe('#ensure members', () => {
    it('should have all correct members when initiated', () => {
      assert.strictEqual(mqnode.clientId, 'foo')
      assert.strictEqual(mqnode.lifetime, 86400)
      assert.strictEqual(mqnode.version, '0.0.1')
      assert.notStrictEqual(mqnode.mc, null)
      assert.strictEqual(mqnode.so, so)
      assert.strictEqual(mqnode._connected, false)
      assert.strictEqual(mqnode._lfsecs, 0)
      assert.deepStrictEqual(mqnode._pubics, {
        register: `register/${mqnode.clientId}`,
        schedule: `schedule/${mqnode.clientId}`,
        deregister: `deregister/${mqnode.clientId}`,
        notify: `notify/${mqnode.clientId}`,
        update: `update/${mqnode.clientId}`,
        ping: `ping/${mqnode.clientId}`,
        response: `response/${mqnode.clientId}`
      })
      assert.deepStrictEqual(mqnode._subics, {
        register: `register/response/${mqnode.clientId}`,
        deregister: `deregister/response/${mqnode.clientId}`,
        schedule: `schedule/response/${mqnode.clientId}`,
        notify: `notify/response/${mqnode.clientId}`,
        update: `update/response/${mqnode.clientId}`,
        ping: `ping/response/${mqnode.clientId}`,
        request: `request/${mqnode.clientId}`,
        announce: 'announce'
      })
      assert.deepStrictEqual(mqnode._tobjs, {})
      assert.strictEqual(mqnode._updater, null)
      assert.deepStrictEqual(mqnode._repAttrs, {})
      assert.deepStrictEqual(mqnode._reporters, {})

      assert.strictEqual(mqnode.so.has('lwm2mServer'), true)
      assert.strictEqual(mqnode.so.has('lwm2mServer', 0), true)
      assert.strictEqual(mqnode.so.has('lwm2mServer', 1), false)
      assert.strictEqual(mqnode.so.has('device'), true)
      assert.strictEqual(mqnode.so.has('device', 0), true)
      assert.strictEqual(mqnode.so.has('device', 1), false)
      assert.strictEqual(mqnode.so.has('connMonitor'), true)
      assert.strictEqual(mqnode.so.has('connMonitor', 0), true)
      assert.strictEqual(mqnode.so.has('connMonitor', 1), false)
    })
  })

  describe('#.new', () => {
    it('should emit ready when new done', (done) => {
      const mqnode1 = new Mqnode('foo1', so, { version: '0.0.1' })
      mqnode1.on('ready', () => {
        if (mqnode1.clientId === 'foo1') done()
      })
    })
  })

  describe('#.getSmartObject', () => {
    it('should equal to so', () => {
      assert.strictEqual(mqnode.getSmartObject(), so)
    })
  })

  describe('#.setDevAttrs', () => {
    it('should equal to this', () => {
      mqnode._connected = true
      assert.strictEqual(mqnode.setDevAttrs({}, () => {}), mqnode)
      mqnode._connected = false
    })

    it('rsp.status should equal to 200 (ok) when nothing to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({}, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 200) done()
      })
      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 200 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 405 (notallow) when mac to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ mac: 'x' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 405) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 405 (notallow) when clientId to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ clientId: 'x' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 405) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 400 (badreq) when unkown attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ gg: 'x' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 400) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 400 (badreq) when unkown attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ gg: 'x' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 400) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when lifetime attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ lifetime: 12345 }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 204) done()
      })

      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when ip attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ ip: '192.168.1.1' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 204 && mqnode.ip === '192.168.1.1') done()
      })

      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when version attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ version: '1.2.3' }, (err, rsp) => {
        assert.ifError(err)
        if (rsp.status === 204 && mqnode.version === '1.2.3') done()
      })

      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
      mqnode._connected = false
    })
  })

  describe.skip('#.enableReport', () => {})
  describe.skip('#.disableReport', () => {})

  describe('#.connect', () => {
    const mqnode = new Mqnode('foo', so, { version: '0.0.1' })
    mqnode.connect('mqtt://192.16.0.1')

    it('should turn _connected to true when receive connect event from this.mc', (done) => {
      setTimeout(() => {
        mqnode.mc.emit('connect')
      }, 20)

      setTimeout(() => {
        if (mqnode._connected === true) {
          done()
        }
      }, 30)
    })

    it('should receive reconnect event from this.mc', (done) => {
      mqnode.once('reconnect', () => {
        done()
      })

      setTimeout(() => {
        mqnode.mc.emit('reconnect')
      }, 5)
    })

    it('should receive logout event from this.mc, get close and _unconnected events', (done) => {
      var count = 0
      mqnode.once('logout', () => {
        count += 1
        if (count === 2) done()
      })

      mqnode.once('_unconnected', () => {
        count += 1
        if (count === 2) done()
      })

      setTimeout(() => {
        mqnode.mc.emit('close')
      }, 5)
    })

    it('should receive offline event from this.mc, get offine and _unconnected events', (done) => {
      var count = 0
      mqnode.once('offline', () => {
        count += 1
        if (count === 2) done()
      })

      mqnode.once('_unconnected', () => {
        count += 1
        if (count === 2) done()
      })

      setTimeout(() => {
        mqnode.mc.emit('offline')
      }, 5)
    })

    it('should receive error event from this.mc', (done) => {
      mqnode.once('error', () => {
        done()
      })

      setTimeout(() => {
        mqnode.mc.emit('error')
      }, 5)
    })
  })

  describe('#.close', () => {
    const mqnode = new Mqnode('foo', so, { version: '0.0.1' })
    it('should return with callback - no connection', (done) => {
      mqnode.close((err) => {
        assert.strictEqual(err.message, 'No mqtt client attached on qnode, cannot close connection.')
        done()
      })
    })

    it('should return with callback - with connection', (done) => {
      mqnode.connect('mqtt://192.16.0.1')

      mqnode.close(true, () => { // force true, don't wait ack
        if (mqnode.mc === null) done()
      })
    })
  })

  describe('#.publish', () => {
    const mqnode = new Mqnode('foo', so, { version: '0.0.2' }, () => {})
    it('should return with callback err - not connect() yet', (done) => {
      mqnode.publish('x/y/z', { x: 1 }, (err) => {
        if (err.message === 'No mqtt client established.') done()
      })
    })

    it('should return with callback err - not connected yet', (done) => {
      mqnode.connect('mqtt://192.16.0.1')
      mqnode.publish('x/y/z', { x: 1 }, (err) => {
        if (err.message === 'No connection.') done()
      })
    })

    it('should return with callback err - invalid message', (done) => {
      mqnode._connected = true
      mqnode.publish('x/y/z', true, (err) => {
        mqnode._connected = false
        if (err.message === 'Message should be a string or a buffer.') done()
      })
    })

    it('should call encrypt', (done) => {
      mqnode._connected = true
      const encryStub = sinon.stub(mqnode, 'encrypt').callsFake((msg, cb) => {
        cb(null, 'called')
      })
      const mcPubStub = sinon.stub(mqnode.mc, 'publish').callsFake((topic, encrypted, options, cbk) => {
        cbk(null, 'pubCalled')
      })

      mqnode.publish('x/y/z', { x: 1 }, (err, msg) => {
        assert.ifError(err)
        mqnode._connected = false
        encryStub.restore()
        mcPubStub.restore()
        if (msg === 'called') done()
      })
    })
  })

  describe('#.subscribe', () => {
    const mqnode = new Mqnode('foo', so, { version: '0.0.2' })
    mqnode.connect('mqtt://192.16.0.1')

    it('should call mc.subscribe', (done) => {
      mqnode._connected = true
      const mcSubStub = sinon.stub(mqnode.mc, 'subscribe').callsFake((topics, opts, cbk) => {
        cbk(null, 'subCalled')
      })

      mqnode.subscribe('x/y/z', { x: 1 }, (err, msg) => {
        assert.ifError(err)
        mqnode._connected = false
        mcSubStub.restore()
        if (msg === 'subCalled') done()
      })
    })
  })

  describe('#.unsubscribe', () => {
    const mqnode = new Mqnode('foo', so, { version: '0.0.2' })
    mqnode.connect('mqtt://192.16.0.1')

    it('should call mc.unsubscribe', (done) => {
      mqnode._connected = true
      const mcUnsubStub = sinon.stub(mqnode.mc, 'unsubscribe').callsFake((topics, cbk) => {
        cbk(null, 'unsubCalled')
      })

      mqnode.unsubscribe('x/y/z', (err, msg) => {
        assert.ifError(err)
        mqnode._connected = false
        mcUnsubStub.restore()
        if (msg === 'unsubCalled') done()
      })
    })
  })

  describe('#.register', () => {
    const mqnode = new Mqnode('foox', so, { version: '0.0.3' })
    mqnode.connect('mqtt://192.16.0.1')

    it('should called when receive response - ok(200)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 200 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 200) done()
      })
    })

    it('should called when receive response - created(201)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 201 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 201) done()
      })
    })

    it('should called when receive response - badreq(400)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 400 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 400) done()
      })
    })

    it('should called when receive response - timeout(408)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 408 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 408) done()
      })
    })

    it('should called when receive response - conflict(409)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 409 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 409) done()
      })
    })

    it('should called when receive response - internal server error(500)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.register, { transId: mqnode.__transId(), status: 500 })
        }, 10)
      })

      mqnode.register((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 500) done()
      })
    })
  })

  describe('#.deregister', () => {
    const mqnode = new Mqnode('fooy', so, { version: '0.0.4' })
    mqnode.connect('mqtt://192.16.0.2')

    it('should called when receive response - deleted(202)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.deregister, { transId: mqnode.__transId(), status: 202 })
        }, 10)
      })

      const closeStub = sinon.stub(mqnode, 'close').callsFake((force, cb) => {
        setTimeout(() => {
          cb()
        }, 10)
      })

      mqnode.deregister((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        closeStub.restore()
        if (rsp.status === 202) done()
      })
    })

    it('should called when receive response - notfound(404)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.deregister, { transId: mqnode.__transId(), status: 404 })
        }, 10)
      })
      const closeStub = sinon.stub(mqnode, 'close').callsFake((force, cb) => {
        setTimeout(() => {
          cb()
        }, 10)
      })

      mqnode.deregister((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        closeStub.restore()

        if (rsp.status === 404) done()
      })
    })

    it('should called when receive response - timeout(408)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.deregister, { transId: mqnode.__transId(), status: 408 })
        }, 10)
      })

      const closeStub = sinon.stub(mqnode, 'close').callsFake((force, cb) => {
        setTimeout(() => {
          cb()
        }, 10)
      })

      mqnode.deregister((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        closeStub.restore()

        if (rsp.status === 408) done()
      })
    })

    it('should called when receive response - internal error(500)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.deregister, { transId: mqnode.__transId(), status: 500 })
        }, 10)
      })

      const closeStub = sinon.stub(mqnode, 'close').callsFake((force, cb) => {
        setTimeout(() => {
          cb()
        }, 10)
      })

      mqnode.deregister((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        closeStub.restore()
        if (rsp.status === 500) done()
      })
    })
  })

  describe('#.update', () => {
    const mqnode = new Mqnode('fooz', so, { version: '0.0.4' })
    mqnode.connect('mqtt://192.16.0.3')

    it('should called when receive response - changed(204)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
        }, 10)
      })

      mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 204) done()
      })
    })

    it('should called when receive response - badreq(400)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 400 })
        }, 10)
      })

      mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 400) done()
      })
    })

    it('should called when receive response - method not allowed(405)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 405 })
        }, 10)
      })

      mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 405) done()
      })
    })

    it('should called when receive response - method not timeout(408)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 408 })
        }, 10)
      })

      mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 408) done()
      })
    })

    it('should called when receive response - internal error(500)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 500 })
        }, 10)
      })

      mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 500) done()
      })
    })
  })

  describe('#.notify', () => {
    const mqnode = new Mqnode('foom', so, { version: '0.0.5' })
    mqnode.connect('mqtt://192.16.0.3')

    it('should called when receive response - changed(204)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.notify, { transId: mqnode.__transId(), status: 204 })
        }, 10)
      })

      mqnode.notify({ x: 'x' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 204) done()
      })
    })

    it('should called when receive response - badreq(400)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.notify, { transId: mqnode.__transId(), status: 400 })
        }, 10)
      })

      mqnode.notify({ x: 'x' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 400) done()
      })
    })

    it('should called when receive response - notfound(404)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.notify, { transId: mqnode.__transId(), status: 404 })
        }, 10)
      })

      mqnode.notify({ x: 'x' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 404) done()
      })
    })

    it('should called when receive response - internal error(500)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.notify, { transId: mqnode.__transId(), status: 500 })
        }, 10)
      })

      mqnode.notify({ x: 'x' }, (err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 500) done()
      })
    })
  })

  describe('#.ping', () => {
    const mqnode = new Mqnode('foon', so, { version: '0.0.5' })
    mqnode.connect('mqtt://192.16.0.3')

    it('should called when receive response - ok(200)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.ping, { transId: mqnode.__transId(), status: 200 })
        }, 10)
      })

      mqnode.ping((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 200 && _.isNumber(rsp.data)) done()
      })
    })

    it('should called when receive response - timeout(408)', (done) => {
      mqnode._connected = true
      const pubStub = sinon.stub(mqnode, 'publish').callsFake((topics, data, cb) => {
        cb(null, 'pubCalled')
        setTimeout(() => {
          emitFakeMessage(mqnode, mqnode._subics.ping, { transId: mqnode.__transId(), status: 408 })
        }, 10)
      })

      mqnode.ping((err, rsp) => {
        assert.ifError(err)
        mqnode._connected = true
        pubStub.restore()
        if (rsp.status === 408) done()
      })
    })
  })
})

function emitFakeMessage (qn, intf, msgObj) {
  setTimeout(() => {
    qn.mc.emit('message', intf, JSON.stringify(msgObj))
  }, 30)
}
