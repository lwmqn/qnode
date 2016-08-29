var mqtt = require('mqtt'),
    _ = require('busyman'),
    chai = require('chai'),
    expect = chai.expect;
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require('chai').expect;

chai.use(sinonChai);

var Mqnode = require('../index.js'),
    SmartObject = require('smartobject');

var so = new SmartObject();

describe('Signature Check', function () {
     var mqnode = new Mqnode('foo', so, { version: '0.0.1' });

     // for travis-ci, since network module cannot run on it
    /*********************************************************************************/
    /****  This test cannot work on travis. Uncomment it only with local testing. ****/
    /*********************************************************************************/
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

    describe('#.setDevAttrs', function () {
        // mqnode.on('error', function (e) {
        //     console.log(e);
        // });
        it('should throw TypeError if devAttrs is not an object', function () {
            expect(function () { return mqnode.setDevAttrs('x'); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(1); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(true); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs([]); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(null); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(undefined); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs({}); }).to.throw(TypeError);

            expect(function () { return mqnode.setDevAttrs({}, function () {}); }).not.to.throw(TypeError);
            expect(function () { return mqnode.setDevAttrs({}, function (e, r) {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.enableReport', function () {
        it('should throw TypeError if oid is not a number or a string', function () {
            expect(function () { return mqnode.enableReport(); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport({}); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport([]); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(true); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(null); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(function () {}); }).to.throw(TypeError);
        });

        it('should throw TypeError if iid is not a number or a string', function () {
            expect(function () { return mqnode.enableReport(1, {}); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, []); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, true); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, null); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, function () {}); }).to.throw(TypeError);

            expect(function () { return mqnode.enableReport('x', {}); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', []); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', true); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', null); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', function () {}); }).to.throw(TypeError);
        });

        it('should throw TypeError if rid is not a number or a string', function () {
            expect(function () { return mqnode.enableReport('x', 1, {}); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', 1, []); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', 1, true); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', 1, new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport('x', 1, function () {}); }).to.throw(TypeError);

            expect(function () { return mqnode.enableReport(1, 'x', {}); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, 'x', []); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, 'x', true); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, 'x', new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.enableReport(1, 'x', function () {}); }).to.throw(TypeError);
        });
    });

    describe('#.disableReport', function () {
        it('should throw TypeError if oid is not a number or a string', function () {
            expect(function () { return mqnode.disableReport(); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport({}); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport([]); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(true); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(null); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(function () {}); }).to.throw(TypeError);
        });

        it('should throw TypeError if iid is not a number or a string', function () {
            expect(function () { return mqnode.disableReport(1, {}); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, []); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, true); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, null); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, function () {}); }).to.throw(TypeError);

            expect(function () { return mqnode.disableReport('x', {}); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', []); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', true); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', null); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', function () {}); }).to.throw(TypeError);
        });

        it('should throw TypeError if rid is not a number or a string', function () {
            expect(function () { return mqnode.disableReport('x', 1, {}); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', 1, []); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', 1, true); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', 1, new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport('x', 1, function () {}); }).to.throw(TypeError);

            expect(function () { return mqnode.disableReport(1, 'x', {}); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, 'x', []); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, 'x', true); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, 'x', new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.disableReport(1, 'x', function () {}); }).to.throw(TypeError);
        });
    });

    describe('#.connect', function () {
        it('should throw TypeError if brokerUrl is not a string', function () {
            expect(function () { return mqnode.connect(); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(1); }).to.throw(TypeError);
            expect(function () { return mqnode.connect({}); }).to.throw(TypeError);
            expect(function () { return mqnode.connect([]); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(true); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(null); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.connect(function () {}); }).to.throw(TypeError);
            expect(function () { return mqnode.connect('mqtt://192.168.0.1'); }).to.throw(TypeError);

            expect(function () { return mqnode.connect('mqtt://192.168.0.1', function () {}); }).not.to.throw(Error);
        });

        it('should throw TypeError if opt is not an object when given', function () {
            expect(function () { return mqnode.connect('mqtt://192.168.0.1', 1); }).to.throw(TypeError);
            expect(function () { return mqnode.connect('mqtt://192.168.0.1', '1'); }).to.throw(TypeError);
            expect(function () { return mqnode.connect('mqtt://192.168.0.1', true); }).to.throw(TypeError);
            expect(function () { return mqnode.connect('mqtt://192.168.0.1', []); }).to.throw(TypeError);
            expect(function () { return mqnode.connect('mqtt://192.168.0.1', new Date()); }).to.throw(TypeError);
        });
    });

    describe('#.close', function () {
        it('should throw TypeError if force is not a boolean when given', function () {
            expect(function () { return mqnode.close(1); }).to.throw(TypeError);
            expect(function () { return mqnode.close({}); }).to.throw(TypeError);
            expect(function () { return mqnode.close([]); }).to.throw(TypeError);
            expect(function () { return mqnode.close(null); }).to.throw(TypeError);
            expect(function () { return mqnode.close(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.close(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.close(true); }).to.throw(TypeError);

            expect(function () { return mqnode.close(function () {}); }).not.to.throw(Error);
            expect(function () { return mqnode.close(true, function () {}); }).not.to.throw(Error);
        });
    });

    describe('#.register', function () {
        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode.register('xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.register(true); }).to.throw(TypeError);
            expect(function () { return mqnode.register(1); }).to.throw(TypeError);
            expect(function () { return mqnode.register({}); }).to.throw(TypeError);
            expect(function () { return mqnode.register([]); }).to.throw(TypeError);
            expect(function () { return mqnode.register(new Date()); }).to.throw(TypeError);

            expect(function () { return mqnode.register(function () {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.deregister', function () {
        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode.deregister('xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.deregister(true); }).to.throw(TypeError);
            expect(function () { return mqnode.deregister(1); }).to.throw(TypeError);
            expect(function () { return mqnode.deregister({}); }).to.throw(TypeError);
            expect(function () { return mqnode.deregister([]); }).to.throw(TypeError);
            expect(function () { return mqnode.deregister(new Date()); }).to.throw(TypeError);

            expect(function () { return mqnode.deregister(function () {}); }).not.to.throw(TypeError);
        });
    });

    describe('#._update', function () {
        it('should throw TypeError if devAttrs is not an object', function () {
            expect(function () { return mqnode._update('xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode._update(); }).to.throw(TypeError);
            expect(function () { return mqnode._update(null); }).to.throw(TypeError);
            expect(function () { return mqnode._update(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode._update(true); }).to.throw(TypeError);
            expect(function () { return mqnode._update(1); }).to.throw(TypeError);
            expect(function () { return mqnode._update([]); }).to.throw(TypeError);
            expect(function () { return mqnode._update(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode._update(function () {}); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}); }).to.throw(TypeError);

            expect(function () { return mqnode._update({}, function () {}); }).not.to.throw(TypeError);
        });

        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode._update({}, 'xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, null); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, NaN); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, true); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, 1); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, []); }).to.throw(TypeError);
            expect(function () { return mqnode._update({}, new Date()); }).to.throw(TypeError);

            expect(function () { return mqnode._update({}, function () {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.notify', function () {
        it('should throw TypeError if data is not an object', function () {
            expect(function () { return mqnode.notify('xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(null); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(true); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(1); }).to.throw(TypeError);
            expect(function () { return mqnode.notify([]); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.notify(function () {}); }).to.throw(TypeError);

            expect(function () { return mqnode.notify({}); }).not.to.throw(TypeError);
        });

        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode.notify({}, 'xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, null); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, true); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, 1); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, []); }).to.throw(TypeError);
            expect(function () { return mqnode.notify({}, new Date()); }).to.throw(TypeError);

            expect(function () { return mqnode.notify({}, function () {}); }).not.to.throw(TypeError);
            expect(function () { return mqnode.notify({}); }).not.to.throw(TypeError);
        });
    });

    describe('#.respond', function () {
        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode.respond({}, 'xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, null); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, NaN); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, true); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, 1); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, []); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}, new Date()); }).to.throw(TypeError);
            expect(function () { return mqnode.respond({}); }).to.throw(TypeError);

            expect(function () { return mqnode.respond({}, function () {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.ping', function () {
        it('should throw TypeError if callback is not a function when given', function () {
            expect(function () { return mqnode.ping('xxx'); }).to.throw(TypeError);
            expect(function () { return mqnode.ping(true); }).to.throw(TypeError);
            expect(function () { return mqnode.ping(1); }).to.throw(TypeError);
            expect(function () { return mqnode.ping({}); }).to.throw(TypeError);
            expect(function () { return mqnode.ping([]); }).to.throw(TypeError);
            expect(function () { return mqnode.ping(new Date()); }).to.throw(TypeError);

            expect(function () { return mqnode.ping(function () {}); }).not.to.throw(TypeError);
        });
    });
});

describe('Functional Check', function () {
    var mqnode = new Mqnode('foo', so, { version: '0.0.1' });
    mqnode.connect('mqtt://192.16.0.1', function () {});

    describe('#ensure members', function () {
        it ('should have all correct members when initiated', function () {
            expect(mqnode.clientId).to.be.equal('foo');
            expect(mqnode.lifetime).to.be.equal(86400);
            // expect(mqnode.ip).not.to.be.null; - locally ok. Dont check@CI server, may need root
            // expect(mqnode.mac).not.to.be.null;- locally ok. dont check@CI server, may need root
            expect(mqnode.version).to.be.equal('0.0.1');
            expect(mqnode.mc).not.to.be.null;
            expect(mqnode.so).to.be.equal(so);
            expect(mqnode._connected).to.be.false;
            expect(mqnode._lfsecs).to.be.equal(0);
            expect(mqnode._pubics).to.be.deep.equal({
                register: 'register/' + mqnode.clientId,
                schedule: 'schedule/' + mqnode.clientId,
                deregister: 'deregister/' + mqnode.clientId,
                notify: 'notify/' + mqnode.clientId,
                update: 'update/' + mqnode.clientId,
                ping: 'ping/' + mqnode.clientId,
                response: 'response/' + mqnode.clientId
            });
            expect(mqnode._subics).to.be.deep.equal({
                register: 'register/response/' + mqnode.clientId,
                deregister: 'deregister/response/' + mqnode.clientId,
                schedule: 'schedule/response/' + mqnode.clientId,
                notify: 'notify/response/' + mqnode.clientId,
                update: 'update/response/' + mqnode.clientId,
                ping: 'ping/response/' + mqnode.clientId,
                request: 'request/' + mqnode.clientId,
                announce: 'announce'
            });
            expect(mqnode._tobjs).to.be.deep.equal({});
            expect(mqnode._updater).to.be.null;
            expect(mqnode._repAttrs).to.be.deep.equal({});
            expect(mqnode._reporters).to.be.deep.equal({});

            expect(mqnode.so.has('lwm2mServer')).to.be.true;
            expect(mqnode.so.has('lwm2mServer', 0)).to.be.true;
            expect(mqnode.so.has('lwm2mServer', 1)).to.be.false;
            expect(mqnode.so.has('device')).to.be.true;
            expect(mqnode.so.has('device', 0)).to.be.true;
            expect(mqnode.so.has('device', 1)).to.be.false;
            expect(mqnode.so.has('connMonitor')).to.be.true;
            expect(mqnode.so.has('connMonitor', 0)).to.be.true;
            expect(mqnode.so.has('connMonitor', 1)).to.be.false;
        });
    });

    describe('#.new', function () {
        it ('should emit ready when new done', function (done) {
            var mqnode1 = new Mqnode('foo1', so, { version: '0.0.1' });
            mqnode1.on('ready', function () {
                if (mqnode1.clientId === 'foo1')
                    done();
            });
        });
    });

    describe('#.getSmartObject', function () {
        it ('should equal to so', function () {
            expect(mqnode.getSmartObject()).to.be.equal(so);
        });
    });

    describe('#.setDevAttrs', function () {
        it ('should equal to this', function () {
            mqnode._connected = true;
            expect(mqnode.setDevAttrs({}, function () {})).to.be.equal(mqnode);
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 200 (ok) when nothing to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({}, function (err, rsp) {
                if (rsp.status === 200)
                    done();
            });
            emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 200 });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 405 (notallow) when mac to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ mac: 'x'}, function (err, rsp) {
                if (rsp.status === 405)
                    done();
            });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 405 (notallow) when clientId to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ clientId: 'x'}, function (err, rsp) {
                if (rsp.status === 405)
                    done();
            });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 400 (badreq) when unkown attr to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ gg: 'x'}, function (err, rsp) {
                if (rsp.status === 400)
                    done();
            });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 400 (badreq) when unkown attr to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ gg: 'x'}, function (err, rsp) {
                if (rsp.status === 400)
                    done();
            });
            mqnode._connected = false;
        });
    
        it ('rsp.status should equal to 204 (changed) when lifetime attr to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ lifetime: 12345 }, function (err, rsp) {
                if (rsp.status === 204)
                    done();
            });

            emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 204 (changed) when ip attr to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ ip: '192.168.1.1' }, function (err, rsp) {
                if (rsp.status === 204 && mqnode.ip === '192.168.1.1')
                    done();
            });

            emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 });
            mqnode._connected = false;
        });

        it ('rsp.status should equal to 204 (changed) when version attr to update', function (done) {
            mqnode._connected = true;
            mqnode.setDevAttrs({ version: '1.2.3' }, function (err, rsp) {
                if (rsp.status === 204 && mqnode.version === '1.2.3')
                    done();
            });

            emitFakeMessage(mqnode, mqnode._subics.update, { transId: mqnode.__transId(), status: 204 });
            mqnode._connected = false;
        });
    });


    describe.skip('#.enableReport', function () {});
    describe.skip('#.disableReport', function () {});

    describe('#.connect', function () {
        var mqnode = new Mqnode('foo', so, { version: '0.0.1' });
        mqnode.connect('mqtt://192.16.0.1', function (){});

        it('should turn _connected to true when receive connect event from this.mc', function (done) {
            setTimeout(function () {
                mqnode.mc.emit('connect');
            }, 20);

            setTimeout(function () {
                if (mqnode._connected === true) {
                    done();
                }
            }, 30);
        });

        it('should receive reconnect event from this.mc', function (done) {
            mqnode.once('reconnect', function () {
                done();
            });

            setTimeout(function () {
                mqnode.mc.emit('reconnect');
            }, 5);
        });

        it('should receive logout event from this.mc, get close and _unconnected events', function (done) {
            var count = 0;
            mqnode.once('logout', function () {
                count += 1;
                if (count === 2)
                    done();
            });

            mqnode.once('_unconnected', function () {
                count += 1;
                if (count === 2)
                    done();
            });

            setTimeout(function () {
                mqnode.mc.emit('close');
            }, 5);
        });

        it('should receive offline event from this.mc, get offine and _unconnected events', function (done) {
            var count = 0;
            mqnode.once('offline', function () {
                count += 1;
                if (count === 2)
                    done();
            });

            mqnode.once('_unconnected', function () {
                count += 1;
                if (count === 2)
                    done();
            });

            setTimeout(function () {
                mqnode.mc.emit('offline');
            }, 5);
        });

        it('should receive error event from this.mc', function (done) {
            mqnode.once('error', function () {
                done();
            });

            setTimeout(function () {
                mqnode.mc.emit('error');
            }, 5);
        });

    });

    describe('#.close', function () {
        var mqnode = new Mqnode('foo', so, { version: '0.0.1' });
        it('should return with callback - no connection', function (done) {
            mqnode.close(function (err) {
                done();
            });
        });

        it('should return with callback - with connection', function (done) {
            mqnode.connect('mqtt://192.16.0.1', function () {});

            mqnode.close(true, function () {    // force true, don't wait ack
                if (mqnode.mc === null)
                    done();
            });
        });
    });

    describe('#.publish', function () {
        var mqnode = new Mqnode('foo', so, { version: '0.0.2' }, function () {});
        it('should return with callback err - not connect() yet', function (done) {
            mqnode.publish('x/y/z', { x: 1 }, function (err) {
                if (err.message === 'No mqtt client established.')
                    done();
            });
        });

        it('should return with callback err - not connected yet', function (done) {
            mqnode.connect('mqtt://192.16.0.1', function () {});
            mqnode.publish('x/y/z', { x: 1 }, function (err) {
                if (err.message === 'No connection.')
                    done();
            });
        });

        it('should return with callback err - invalid message', function (done) {
            mqnode._connected = true;
            mqnode.publish('x/y/z', true, function (err) {
                mqnode._connected = false;
                if (err.message === 'Message should be a string or a buffer.')
                    done();
            });
        });

        it('should call encrypt' , function (done) {
            mqnode._connected = true;
            var encryStub = sinon.stub(mqnode, 'encrypt', function (msg, clientId, cb) {
                cb(null, 'called');
            });
            var mcPubStub = sinon.stub(mqnode.mc, 'publish', function (topic, encrypted, options, cbk) {
                cbk(null, 'pubCalled');
            });

            mqnode.publish('x/y/z', { x: 1 }, function (err, msg) {
                mqnode._connected = false;
                encryStub.restore();
                mcPubStub.restore();
                if (msg === 'called')
                    done();
            });
        });
    });

    describe('#.subscribe', function () {
        var mqnode = new Mqnode('foo', so, { version: '0.0.2' });
        mqnode.connect('mqtt://192.16.0.1', function (){});

        it('should call mc.subscribe' , function (done) {
            mqnode._connected = true;
            var mcSubStub = sinon.stub(mqnode.mc, 'subscribe', function (topics, opts, cbk) {
                cbk(null, 'subCalled');
            });

            mqnode.subscribe('x/y/z', { x: 1 }, function (err, msg) {
                mqnode._connected = false;
                mcSubStub.restore();
                if (msg === 'subCalled')
                    done();
            });
        });
    });

    describe('#.unsubscribe', function () {
        var mqnode = new Mqnode('foo', so, { version: '0.0.2' });
        mqnode.connect('mqtt://192.16.0.1', function (){});

        it('should call mc.unsubscribe' , function (done) {
            mqnode._connected = true;
            var mcUnsubStub = sinon.stub(mqnode.mc, 'unsubscribe', function (topics, cbk) {
                cbk(null, 'unsubCalled');
            });

            mqnode.unsubscribe('x/y/z', function (err, msg) {
                mqnode._connected = false;
                mcUnsubStub.restore();
                if (msg === 'unsubCalled')
                    done();
            });
        });
    });

    describe('#.register', function () {
        var mqnode = new Mqnode('foox', so, { version: '0.0.3' });
        mqnode.connect('mqtt://192.16.0.1', function (){});

        it('should called when receive response - ok(200)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 200 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 200)
                    done();
            });
        });

        it('should called when receive response - created(201)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 201 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 201)
                    done();
            });
        });

        it('should called when receive response - badreq(400)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 400 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 400)
                    done();
            });
        });

        it('should called when receive response - timeout(408)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 408 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 408)
                    done();
            });
        });

        it('should called when receive response - conflict(409)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 409 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 409)
                    done();
            });
        });

        it('should called when receive response - internal server error(500)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['register'], { transId: mqnode.__transId(), status: 500 });
                }, 10)
            });

            mqnode.register(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 500)
                    done();
            });
        });
    });

    describe('#.deregister', function () {
        var mqnode = new Mqnode('fooy', so, { version: '0.0.4' });
        mqnode.connect('mqtt://192.16.0.2', function (){});

        it('should called when receive response - deleted(202)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['deregister'], { transId: mqnode.__transId(), status: 202 });
                }, 10)
            });

            var closeStub = sinon.stub(mqnode, 'close', function (force, cb) {
                setTimeout(function () {
                    cb();
                }, 10)
            });

            mqnode.deregister(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                closeStub.restore();
                if (rsp.status === 202)
                    done();
            });
        });

        it('should called when receive response - notfound(404)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['deregister'], { transId: mqnode.__transId(), status: 404 });
                }, 10)
            });
            var closeStub = sinon.stub(mqnode, 'close', function (force, cb) {
                setTimeout(function () {
                    cb();
                }, 10)
            });

            mqnode.deregister(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                closeStub.restore();

                if (rsp.status === 404)
                    done();
            });
        });

        it('should called when receive response - timeout(408)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['deregister'], { transId: mqnode.__transId(), status: 408 });
                }, 10)
            });

            var closeStub = sinon.stub(mqnode, 'close', function (force, cb) {
                setTimeout(function () {
                    cb();
                }, 10)
            });

            mqnode.deregister(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                closeStub.restore();

                if (rsp.status === 408)
                    done();
            });
        });

        it('should called when receive response - internal error(500)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['deregister'], { transId: mqnode.__transId(), status: 500 });
                }, 10)
            });

            var closeStub = sinon.stub(mqnode, 'close', function (force, cb) {
                setTimeout(function () {
                    cb();
                }, 10)
            });

            mqnode.deregister(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                closeStub.restore();
                if (rsp.status === 500)
                    done();
            });
        });
    });

    describe('#.update', function () {
        var mqnode = new Mqnode('fooz', so, { version: '0.0.4' });
        mqnode.connect('mqtt://192.16.0.3', function (){});

        it('should called when receive response - changed(204)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['update'], { transId: mqnode.__transId(), status: 204 });
                }, 10)
            });

            mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 204)
                    done();
            });
        });

        it('should called when receive response - badreq(400)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['update'], { transId: mqnode.__transId(), status: 400 });
                }, 10)
            });

            mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 400)
                    done();
            });
        });

        it('should called when receive response - method not allowed(405)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['update'], { transId: mqnode.__transId(), status: 405 });
                }, 10)
            });

            mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 405)
                    done();
            });
        });

        it('should called when receive response - method not timeout(408)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['update'], { transId: mqnode.__transId(), status: 408 });
                }, 10)
            });

            mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 408)
                    done();
            });
        });

        it('should called when receive response - internal error(500)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['update'], { transId: mqnode.__transId(), status: 500 });
                }, 10)
            });

            mqnode._update({ version: '1.0.0', ip: '1.1.1.1' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 500)
                    done();
            });
        });
    });

    describe('#.notify', function () {
        var mqnode = new Mqnode('foom', so, { version: '0.0.5' });
        mqnode.connect('mqtt://192.16.0.3', function (){});

        it('should called when receive response - changed(204)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['notify'], { transId: mqnode.__transId(), status: 204 });
                }, 10)
            });

            mqnode.notify({ x: 'x' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 204)
                    done();
            });
        });

        it('should called when receive response - badreq(400)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['notify'], { transId: mqnode.__transId(), status: 400 });
                }, 10)
            });

            mqnode.notify({ x: 'x' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 400)
                    done();
            });
        });

        it('should called when receive response - notfound(404)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['notify'], { transId: mqnode.__transId(), status: 404 });
                }, 10)
            });

            mqnode.notify({ x: 'x' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 404)
                    done();
            });
        });

        it('should called when receive response - internal error(500)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['notify'], { transId: mqnode.__transId(), status: 500 });
                }, 10)
            });

            mqnode.notify({ x: 'x' }, function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 500)
                    done();
            });
        });
    });

    describe('#.ping', function () {
        var mqnode = new Mqnode('foon', so, { version: '0.0.5' });
        mqnode.connect('mqtt://192.16.0.3', function (){});

        it('should called when receive response - ok(200)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['ping'], { transId: mqnode.__transId(), status: 200 });
                }, 10)
            });

            mqnode.ping(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 200 && _.isNumber(rsp.data))
                    done();
            });
        });

        it('should called when receive response - timeout(408)' , function (done) {
            mqnode._connected = true;
            var pubStub = sinon.stub(mqnode, 'publish', function (topics, data, cb) {
                cb(null, 'pubCalled');
                setTimeout(function () {
                    emitFakeMessage(mqnode, mqnode._subics['ping'], { transId: mqnode.__transId(), status: 408 });
                }, 10)
            });

            mqnode.ping(function (err, rsp) {
                mqnode._connected = true;
                pubStub.restore();
                if (rsp.status === 408)
                    done();
            });
        });
    });
});

function emitFakeMessage(qn, intf, msgObj) {
    setTimeout(function () {
        qn.mc.emit('message', intf, JSON.stringify(msgObj));
    }, 30);
}