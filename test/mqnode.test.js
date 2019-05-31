/* eslint-env mocha */
const _ = require('busyman')
const chai = require('chai')
const sinon = require('sinon')
const expect = require('chai').expect

chai.use(require('sinon-chai'))

const SmartObject = require('smartobject')
const Mqnode = require('../index.js')

const so = new SmartObject()

describe('Signature Check', () => {
  const mqnode = new Mqnode('foo', so, { version: '0.0.1' })

  // for travis-ci, since network module cannot run on it
  /** ****************************************************************************** */
  /** **  This test cannot work on travis. Uncomment it only with local testing. *** */
  /** ****************************************************************************** */
  // describe('#new mqnode', function () {
  //     it('should throw TypeError if clientId is not a string', function () {
  //         expect(function () { return new Mqnode(null, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(undefined, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(true, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(NaN, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(12, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode({}, so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode([], so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(new Date(), so, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode(function () {}, so, { version: '0.0.1' } ); }).to.throw(TypeError);

  //         expect(function () { return new Mqnode('foo', so, { version: '0.0.1' } ); }).not.to.throw(Error);
  //     });

  //     it('should throw TypeError if so is not an instance of SmartObject class', function () {
  //         expect(function () { return new Mqnode('foo', 'x', { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', 12, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', null, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', undefined, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', NaN, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', true, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', new Date(), { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', {}, { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', [], { version: '0.0.1' } ); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', function () {}, { version: '0.0.1' } ); }).to.throw(TypeError);

  //         expect(function () { return new Mqnode('foo', so, { version: '0.0.1' } ); }).not.to.throw(Error);
  //     });

  //     it('should throw TypeError if devAttrs is not an object if given', function () {
  //         expect(function () { return new Mqnode('foo', so, 'x'); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, 12); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, true); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, new Date()); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, []); }).to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, function () {}); }).to.throw(TypeError);

  //         expect(function () { return new Mqnode('foo', so, null); }).not.to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, undefined); }).not.to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, NaN); }).not.to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, {}); }).not.to.throw(TypeError);
  //         expect(function () { return new Mqnode('foo', so, { version: '0.0.1' } ); }).not.to.throw(Error);
  //     });
  // });

  describe('#.setDevAttrs', () => {
    // mqnode.on('error', function (e) {
    //     console.log(e);
    // });
    it('should throw TypeError if devAttrs is not an object', () => {
      expect(() => mqnode.setDevAttrs('x')).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(1)).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(true)).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs([])).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(null)).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(undefined)).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(NaN)).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs(new Date())).to.throw(TypeError)
      expect(() => mqnode.setDevAttrs({})).to.throw(TypeError)

      expect(() => mqnode.setDevAttrs({}, () => {})).not.to.throw(TypeError)
      expect(() => mqnode.setDevAttrs({}, (e, r) => {})).not.to.throw(TypeError)
    })
  })

  describe('#.enableReport', () => {
    it('should throw TypeError if oid is not a number or a string', () => {
      expect(() => mqnode.enableReport()).to.throw(TypeError)
      expect(() => mqnode.enableReport({})).to.throw(TypeError)
      expect(() => mqnode.enableReport([])).to.throw(TypeError)
      expect(() => mqnode.enableReport(true)).to.throw(TypeError)
      expect(() => mqnode.enableReport(null)).to.throw(TypeError)
      expect(() => mqnode.enableReport(NaN)).to.throw(TypeError)
      expect(() => mqnode.enableReport(new Date())).to.throw(TypeError)
      expect(() => mqnode.enableReport(() => {})).to.throw(TypeError)
    })

    it('should throw TypeError if iid is not a number or a string', () => {
      expect(() => mqnode.enableReport(1, {})).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, [])).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, true)).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, null)).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, NaN)).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, new Date())).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, () => {})).to.throw(TypeError)

      expect(() => mqnode.enableReport('x', {})).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', [])).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', true)).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', null)).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', NaN)).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', new Date())).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', () => {})).to.throw(TypeError)
    })

    it('should throw TypeError if rid is not a number or a string', () => {
      expect(() => mqnode.enableReport('x', 1, {})).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', 1, [])).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', 1, true)).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', 1, new Date())).to.throw(TypeError)
      expect(() => mqnode.enableReport('x', 1, () => {})).to.throw(TypeError)

      expect(() => mqnode.enableReport(1, 'x', {})).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, 'x', [])).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, 'x', true)).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, 'x', new Date())).to.throw(TypeError)
      expect(() => mqnode.enableReport(1, 'x', () => {})).to.throw(TypeError)
    })
  })

  describe('#.disableReport', () => {
    it('should throw TypeError if oid is not a number or a string', () => {
      expect(() => mqnode.disableReport()).to.throw(TypeError)
      expect(() => mqnode.disableReport({})).to.throw(TypeError)
      expect(() => mqnode.disableReport([])).to.throw(TypeError)
      expect(() => mqnode.disableReport(true)).to.throw(TypeError)
      expect(() => mqnode.disableReport(null)).to.throw(TypeError)
      expect(() => mqnode.disableReport(NaN)).to.throw(TypeError)
      expect(() => mqnode.disableReport(new Date())).to.throw(TypeError)
      expect(() => mqnode.disableReport(() => {})).to.throw(TypeError)
    })

    it('should throw TypeError if iid is not a number or a string', () => {
      expect(() => mqnode.disableReport(1, {})).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, [])).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, true)).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, null)).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, NaN)).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, new Date())).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, () => {})).to.throw(TypeError)

      expect(() => mqnode.disableReport('x', {})).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', [])).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', true)).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', null)).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', NaN)).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', new Date())).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', () => {})).to.throw(TypeError)
    })

    it('should throw TypeError if rid is not a number or a string', () => {
      expect(() => mqnode.disableReport('x', 1, {})).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', 1, [])).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', 1, true)).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', 1, new Date())).to.throw(TypeError)
      expect(() => mqnode.disableReport('x', 1, () => {})).to.throw(TypeError)

      expect(() => mqnode.disableReport(1, 'x', {})).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, 'x', [])).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, 'x', true)).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, 'x', new Date())).to.throw(TypeError)
      expect(() => mqnode.disableReport(1, 'x', () => {})).to.throw(TypeError)
    })
  })

  describe('#.connect', () => {
    it('should throw TypeError if brokerUrl is not a string', () => {
      expect(() => mqnode.connect()).to.throw(TypeError)
      expect(() => mqnode.connect(1)).to.throw(TypeError)
      expect(() => mqnode.connect({})).to.throw(TypeError)
      expect(() => mqnode.connect([])).to.throw(TypeError)
      expect(() => mqnode.connect(true)).to.throw(TypeError)
      expect(() => mqnode.connect(null)).to.throw(TypeError)
      expect(() => mqnode.connect(NaN)).to.throw(TypeError)
      expect(() => mqnode.connect(new Date())).to.throw(TypeError)
      expect(() => mqnode.connect(() => {})).to.throw(TypeError)

      expect(() => mqnode.connect('mqtt://192.168.0.1')).not.to.throw(TypeError)
      expect(() => mqnode.connect('mqtt://192.168.0.1', () => {})).not.to.throw(Error)
    })

    it('should throw TypeError if opt is not an object when given', () => {
      expect(() => mqnode.connect('mqtt://192.168.0.1', 1)).to.throw(TypeError)
      expect(() => mqnode.connect('mqtt://192.168.0.1', '1')).to.throw(TypeError)
      expect(() => mqnode.connect('mqtt://192.168.0.1', true)).to.throw(TypeError)
      expect(() => mqnode.connect('mqtt://192.168.0.1', [])).to.throw(TypeError)
      expect(() => mqnode.connect('mqtt://192.168.0.1', new Date())).to.throw(TypeError)
    })
  })

  describe('#.close', () => {
    it('should throw TypeError if force is not a boolean when given', () => {
      expect(() => mqnode.close(1)).to.throw(TypeError)
      expect(() => mqnode.close({})).to.throw(TypeError)
      expect(() => mqnode.close([])).to.throw(TypeError)
      expect(() => mqnode.close(null)).to.throw(TypeError)
      expect(() => mqnode.close(NaN)).to.throw(TypeError)
      expect(() => mqnode.close(new Date())).to.throw(TypeError)

      expect(() => mqnode.close(true)).not.to.throw(TypeError)
      expect(() => mqnode.close(() => {})).not.to.throw(Error)
      expect(() => mqnode.close(true, () => {})).not.to.throw(Error)
    })
  })

  describe('#.register', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode.register('xxx')).to.throw(TypeError)
      expect(() => mqnode.register(true)).to.throw(TypeError)
      expect(() => mqnode.register(1)).to.throw(TypeError)
      expect(() => mqnode.register({})).to.throw(TypeError)
      expect(() => mqnode.register([])).to.throw(TypeError)
      expect(() => mqnode.register(new Date())).to.throw(TypeError)

      expect(() => mqnode.register(() => {})).not.to.throw(TypeError)
    })
  })

  describe('#.deregister', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode.deregister('xxx')).to.throw(TypeError)
      expect(() => mqnode.deregister(true)).to.throw(TypeError)
      expect(() => mqnode.deregister(1)).to.throw(TypeError)
      expect(() => mqnode.deregister({})).to.throw(TypeError)
      expect(() => mqnode.deregister([])).to.throw(TypeError)
      expect(() => mqnode.deregister(new Date())).to.throw(TypeError)

      expect(() => mqnode.deregister(() => {})).not.to.throw(TypeError)
    })
  })

  describe('#._update', () => {
    it('should throw TypeError if devAttrs is not an object', () => {
      expect(() => mqnode._update('xxx')).to.throw(TypeError)
      expect(() => mqnode._update()).to.throw(TypeError)
      expect(() => mqnode._update(null)).to.throw(TypeError)
      expect(() => mqnode._update(NaN)).to.throw(TypeError)
      expect(() => mqnode._update(true)).to.throw(TypeError)
      expect(() => mqnode._update(1)).to.throw(TypeError)
      expect(() => mqnode._update([])).to.throw(TypeError)
      expect(() => mqnode._update(new Date())).to.throw(TypeError)
      expect(() => mqnode._update(() => {})).to.throw(TypeError)
      expect(() => mqnode._update({})).to.throw(TypeError)

      expect(() => mqnode._update({}, () => {})).not.to.throw(TypeError)
    })

    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode._update({}, 'xxx')).to.throw(TypeError)
      expect(() => mqnode._update({}, null)).to.throw(TypeError)
      expect(() => mqnode._update({}, NaN)).to.throw(TypeError)
      expect(() => mqnode._update({}, true)).to.throw(TypeError)
      expect(() => mqnode._update({}, 1)).to.throw(TypeError)
      expect(() => mqnode._update({}, [])).to.throw(TypeError)
      expect(() => mqnode._update({}, new Date())).to.throw(TypeError)

      expect(() => mqnode._update({}, () => {})).not.to.throw(TypeError)
    })
  })

  describe('#.notify', () => {
    it('should throw TypeError if data is not an object', () => {
      expect(() => mqnode.notify('xxx')).to.throw(TypeError)
      expect(() => mqnode.notify()).to.throw(TypeError)
      expect(() => mqnode.notify(null)).to.throw(TypeError)
      expect(() => mqnode.notify(NaN)).to.throw(TypeError)
      expect(() => mqnode.notify(true)).to.throw(TypeError)
      expect(() => mqnode.notify(1)).to.throw(TypeError)
      expect(() => mqnode.notify([])).to.throw(TypeError)
      expect(() => mqnode.notify(new Date())).to.throw(TypeError)
      expect(() => mqnode.notify(() => {})).to.throw(TypeError)
      expect(() => mqnode.notify({})).to.throw(TypeError)

      expect(() => mqnode.notify({}, () => {})).not.to.throw(TypeError)
    })

    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode.notify({}, 'xxx')).to.throw(TypeError)
      expect(() => mqnode.notify({}, null)).to.throw(TypeError)
      expect(() => mqnode.notify({}, NaN)).to.throw(TypeError)
      expect(() => mqnode.notify({}, true)).to.throw(TypeError)
      expect(() => mqnode.notify({}, 1)).to.throw(TypeError)
      expect(() => mqnode.notify({}, [])).to.throw(TypeError)
      expect(() => mqnode.notify({}, new Date())).to.throw(TypeError)
      expect(() => mqnode.notify({})).to.throw(TypeError)

      expect(() => mqnode.notify({}, () => {})).not.to.throw(TypeError)
    })
  })

  describe('#.respond', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode.respond({}, 'xxx')).to.throw(TypeError)
      expect(() => mqnode.respond({}, null)).to.throw(TypeError)
      expect(() => mqnode.respond({}, NaN)).to.throw(TypeError)
      expect(() => mqnode.respond({}, true)).to.throw(TypeError)
      expect(() => mqnode.respond({}, 1)).to.throw(TypeError)
      expect(() => mqnode.respond({}, [])).to.throw(TypeError)
      expect(() => mqnode.respond({}, new Date())).to.throw(TypeError)

      expect(() => mqnode.respond({})).not.to.throw(TypeError)
      expect(() => mqnode.respond({}, () => {})).not.to.throw(TypeError)
    })
  })

  describe('#.ping', () => {
    it('should throw TypeError if callback is not a function when given', () => {
      expect(() => mqnode.ping('xxx')).to.throw(TypeError)
      expect(() => mqnode.ping(true)).to.throw(TypeError)
      expect(() => mqnode.ping(1)).to.throw(TypeError)
      expect(() => mqnode.ping({})).to.throw(TypeError)
      expect(() => mqnode.ping([])).to.throw(TypeError)
      expect(() => mqnode.ping(new Date())).to.throw(TypeError)
      expect(() => mqnode.ping()).to.throw(TypeError)

      expect(() => mqnode.ping(() => {})).not.to.throw(TypeError)
    })
  })
})

describe('Functional Check', () => {
  const mqnode = new Mqnode('foo', so, { version: '0.0.1' })
  mqnode.connect('mqtt://192.16.0.1')

  describe('#ensure members', () => {
    it('should have all correct members when initiated', () => {
      expect(mqnode.clientId).to.be.equal('foo')
      expect(mqnode.lifetime).to.be.equal(86400)
      // expect(mqnode.ip).not.to.be.null; - locally ok. Dont check@CI server, may need root
      // expect(mqnode.mac).not.to.be.null;- locally ok. dont check@CI server, may need root
      expect(mqnode.version).to.be.equal('0.0.1')
      expect(mqnode.mc).not.to.equal(null)
      expect(mqnode.so).to.be.equal(so)
      expect(mqnode._connected).to.equal(false)
      expect(mqnode._lfsecs).to.be.equal(0)
      expect(mqnode._pubics).to.be.deep.equal({
        register: `register/${mqnode.clientId}`,
        schedule: `schedule/${mqnode.clientId}`,
        deregister: `deregister/${mqnode.clientId}`,
        notify: `notify/${mqnode.clientId}`,
        update: `update/${mqnode.clientId}`,
        ping: `ping/${mqnode.clientId}`,
        response: `response/${mqnode.clientId}`
      })
      expect(mqnode._subics).to.be.deep.equal({
        register: `register/response/${mqnode.clientId}`,
        deregister: `deregister/response/${mqnode.clientId}`,
        schedule: `schedule/response/${mqnode.clientId}`,
        notify: `notify/response/${mqnode.clientId}`,
        update: `update/response/${mqnode.clientId}`,
        ping: `ping/response/${mqnode.clientId}`,
        request: `request/${mqnode.clientId}`,
        announce: 'announce'
      })
      expect(mqnode._tobjs).to.be.deep.equal({})
      expect(mqnode._updater).to.equal(null)
      expect(mqnode._repAttrs).to.be.deep.equal({})
      expect(mqnode._reporters).to.be.deep.equal({})

      expect(mqnode.so.has('lwm2mServer')).to.equal(true)
      expect(mqnode.so.has('lwm2mServer', 0)).to.equal(true)
      expect(mqnode.so.has('lwm2mServer', 1)).to.equal(false)
      expect(mqnode.so.has('device')).to.equal(true)
      expect(mqnode.so.has('device', 0)).to.equal(true)
      expect(mqnode.so.has('device', 1)).to.equal(false)
      expect(mqnode.so.has('connMonitor')).to.equal(true)
      expect(mqnode.so.has('connMonitor', 0)).to.equal(true)
      expect(mqnode.so.has('connMonitor', 1)).to.equal(false)
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
      expect(mqnode.getSmartObject()).to.be.equal(so)
    })
  })

  describe('#.setDevAttrs', () => {
    it('should equal to this', () => {
      mqnode._connected = true
      expect(mqnode.setDevAttrs({}, () => {})).to.be.equal(mqnode)
      mqnode._connected = false
    })

    it('rsp.status should equal to 200 (ok) when nothing to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({}, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 200) done()
      })
      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 200 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 405 (notallow) when mac to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ mac: 'x' }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 405) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 405 (notallow) when clientId to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ clientId: 'x' }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 405) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 400 (badreq) when unkown attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ gg: 'x' }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 400) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 400 (badreq) when unkown attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ gg: 'x' }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 400) done()
      })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when lifetime attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ lifetime: 12345 }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 204) done()
      })

      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when ip attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ ip: '192.168.1.1' }, (err, rsp) => {
        expect(err).to.be.a('null')
        if (rsp.status === 204 && mqnode.ip === '192.168.1.1') done()
      })

      emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 })
      mqnode._connected = false
    })

    it('rsp.status should equal to 204 (changed) when version attr to update', (done) => {
      mqnode._connected = true
      mqnode.setDevAttrs({ version: '1.2.3' }, (err, rsp) => {
        expect(err).to.be.a('null')
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
        expect(err).to.be.an('error')
        expect(err.message).to.equal('No mqtt client attached on qnode, cannot close connection.')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
        expect(err).to.be.a('null')
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
