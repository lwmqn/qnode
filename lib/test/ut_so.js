var EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    should = require('should'),
    _ = require('lodash'),
    SmartObject = require('../smartobject');
    IObject = require('../iobject');

var iObj1 = new IObject("device", [ { manuf: 'sivann'}, { model: 'testv1' }, { serial: "0.0.1" }, { swVer: "1.1.1" } ]);
var iObj11 = new IObject("device", [ { manuf: 'sivann'}, { model: 'testv1' }, { serial: "0.0.1" }, { swVer: "1.1.1" } ]);
var iObj12 = new IObject("device", [ { manuf: 'sivann'}, { model: 'testv1' }, { serial: "0.0.1" }, { swVer: "1.1.1" } ]);

var iObj2 = new IObject("connMonitor", { ip: "192.168.0.100" });
var iObj3 = new IObject("tempSensor", [ { sensorValue: 6 }, { units: "Cel" } ]);


describe('Constructor Check', function () {
    it('SmartObject(name, iObjects)', function () {
        var so = new SmartObject('my_so', [ iObj1, iObj2 ]);
        should(so.name).be.eql('my_so');
        should(so.node).be.eql(null);
        should(so.attrs).be.eql({ mute: true, cancel: true, pmin: 10, pmax: 60, gt: null, lt: null, step: null });
        should(so.device[0]).be.equal(iObj1);
        should(so.connMonitor[0]).be.equal(iObj2);
    });
});

describe('Signature Check', function () {
    it('SmartObject.getTemplate(tId)', function () {
        (function () { return SmartObject.getTemplate(); }).should.throw();
        (function () { return SmartObject.getTemplate({}); }).should.throw();
        (function () { return SmartObject.getTemplate([]); }).should.throw();
        (function () { return SmartObject.getTemplate(false); }).should.throw();
        (function () { return SmartObject.getTemplate(null); }).should.throw();
        (function () { return SmartObject.getTemplate(999); }).should.throw();
        (function () { return SmartObject.getTemplate('xxx'); }).should.throw();
    });

    it('SmartObject(name, iObjects)', function () {
        (function () { return new SmartObject(1); }).should.throw();
        (function () { return new SmartObject(['x']); }).should.throw();
        (function () { return new SmartObject({ x: 1 }); }).should.throw();
        (function () { return new SmartObject(); }).should.not.throw();
        (function () { return new SmartObject(iObj1); }).should.not.throw();
        (function () { return new SmartObject([iObj1, iObj2]); }).should.not.throw();
        (function () { return new SmartObject({ 'x': 3 }); }).should.throw();
    });

    it('addIObjects(iObjects)', function () {
        var so = new SmartObject('my_so');
        (function () { return so.addIObjects({ 'x': 3 }); }.should.throw());
        (function () { return so.addIObjects(iObj1); }.should.not.throw());
        (function () { return so.addIObjects([ iObj2, iObj3 ]); }.should.not.throw());
    });

    it('findIObject(oid, iid)', function () {
        var so = new SmartObject('my_so', [ iObj1, iObj2, iObj3 ]);
        (function () { return so.findIObject({}, 1); }.should.throw());
        (function () { return so.findIObject([], 2); }.should.throw());
        (function () { return so.findIObject(null, 2); }.should.throw());
        (function () { return so.findIObject(undefined, 2); }.should.throw());
        (function () { return so.findIObject(1, {}); }.should.throw());
        (function () { return so.findIObject(1, []); }.should.throw());
        (function () { return so.findIObject(1, null); }.should.not.throw());

        (function () { return so.findIObject(1); }.should.not.throw());     // iid default to 0
        (function () { return so.findIObject('xxx'); }.should.not.throw()); // iid default to 0
        (function () { return so.findIObject('device', '3'); }.should.not.throw());     // iid default to 0
    });

    it('dumpIObject(oid, iid)', function () {
        var so = new SmartObject('my_so', [ iObj1, iObj2, iObj3 ]);
        (function () { return so.dumpIObject({}, 1); }.should.throw());
        (function () { return so.dumpIObject([], 2); }.should.throw());
        (function () { return so.dumpIObject(null, 2); }.should.throw());
        (function () { return so.dumpIObject(undefined, 2); }.should.throw());
        (function () { return so.dumpIObject(1, {}); }.should.throw());
        (function () { return so.dumpIObject(1, []); }.should.throw());
        (function () { return so.dumpIObject(1, null); }.should.not.throw());

        (function () { return so.dumpIObject(1); }.should.not.throw());
        (function () { return so.dumpIObject('xxx'); }.should.not.throw());
        (function () { return so.dumpIObject('device', '3'); }.should.not.throw());
    });

    it('notify(oid, iid, rid, value)', function () {
        var so = new SmartObject('my_so', [ iObj1, iObj2, iObj3 ]);
        so.node = { // fake node
            notify: function () {}
        };

        (function () { return so.notify(1, 0, 12, 'hi'); }.should.not.throw());
        (function () { return so.notify(1, 0, 12, {}); }.should.not.throw());
        (function () { return so.notify(1, 0, 'hi'); }.should.throw());
        (function () { return so.notify(1, 0, {}); }.should.not.throw());
        (function () { return so.notify(1, 0, []); }.should.throw());

        (function () { return so.notify(1, 'hi'); }.should.throw());
        (function () { return so.notify(1, {}); }.should.not.throw());
    });
});

describe('Functional Check', function () {
    it ("objectList()", function () {
        var so = new SmartObject('my_so', [iObj1, iObj11, iObj12, iObj2, iObj3]);
        console.log(so.objectList());
        so.objectList().should.eql([
            { oid: 3, iid: 0 },
            { oid: 3, iid: 1 },
            { oid: 3, iid: 2 },
            { oid: 4, iid: 0 },
            { oid: 3303, iid: 0 }
        ]);
    });

    it ("addIObjects(iObjects)", function () {
        var so = new SmartObject('my_so');
        so.addIObjects(iObj1).should.equal(0);
        so.addIObjects(iObj11).should.equal(1);
        iObj12.iid = 60;
        so.addIObjects(iObj12).should.equal(60);

        should(so.device[0]).be.equal(iObj1);
        should(so.device[1]).be.equal(iObj11);
        should(so.device[60]).be.equal(iObj12);
    });

    it ("findIObject(oid, iid)", function () {
        var so = new SmartObject('my_so', [iObj1, iObj2]);
        should(so.findIObject('device', 0)).be.equal(iObj1);
        should(so.findIObject(3, 0)).be.equal(iObj1);
        should(so.findIObject('connMonitor', 0)).be.equal(iObj2);
        should(so.findIObject(4, 0)).be.equal(iObj2);

        should(so.findIObject(3)).be.eql(iObj1);
        should(so.findIObject(3)).be.eql(so.device[0]);
        should(so.findIObject(4)).be.eql(so.connMonitor[0]);

        should(so.findIObject(6, 'xxx')).be.undefined();
        should(so.findIObject(6)).be.undefined();
        should(so.findIObject(4, 9)).be.undefined();
        should(so.findIObject(22, 0)).be.undefined();
    });

    it ("dumpIObject(oid, iid)", function (done) {
        var so = new SmartObject('my_so', [iObj1, iObj2, iObj3]);
        
        so.dumpIObject('device', 0).done(function (data) {
            if (_.isEqual(data, { '0': 'sivann', '1': 'testv1', '2': '0.0.1', '19': '1.1.1' }))
                done();
        });
    });

    it ("dumpIObject(oid, iid)", function (done) {
        var so = new SmartObject('my_so', [iObj1, iObj2, iObj3]);
        
        so.dumpIObject('connMonitor', 0).done(function (data) {
            if (_.isEqual(data, { '4': '192.168.0.100' }))
                done();
        });
    });

    it ("dumpIObject(oid, iid)", function (done) {
        var so = new SmartObject('my_so', [iObj1, iObj2, iObj3]);
        
        so.dumpIObject('connMonitor').done(function (data) {
            if (_.isEqual(data, { '0': { '4': '192.168.0.100' } }))
                done();
        });
    });

    it ("dumpIObject(oid, iid)", function (done) {
        var so = new SmartObject('my_so', [iObj1, iObj2, iObj3]);
        
        so.dumpIObject('device').done(function (data) {
            if (_.isEqual(data, { '0': { '0': 'sivann', '1': 'testv1', '2': '0.0.1', '19': '1.1.1' } }))
                done();
        });
    });


    it ("dump()", function (done) {
        var so = new SmartObject('my_so', [iObj1, iObj2]);
        
        so.dump().done(function (data) {
            if (_.isEqual(data, {
                '3': { '0': { '0': 'sivann', '1': 'testv1', '2': '0.0.1', '19': '1.1.1' } },
                '4': { '0': { '4': '192.168.0.100' } }
            }))
                done();
        });
    });


    it ("notify()", function () {
        var so = new SmartObject('my_so', [iObj1, iObj2]);
        so.node = {
            notify: function () {}
        };

        should(so.notify('device', {})).be.true();
        should(so.notify('device', 0, {})).be.true();
        should(so.notify('device', 0, 1, {})).be.true();
        should(so.notify('device', 0, 1, 'hello')).be.true();

        should(so.notify('4', 0, 1, 'hello')).be.true();
    });
});