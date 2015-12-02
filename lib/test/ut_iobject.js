var EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    should = require('should'),
    _ = require('lodash'),
    IObject = require('../iobject');


describe('Constructor Check', function () {
    it('IObject(oid, ridSets)', function () {
        (function () {  var x = new IObject({}); }).should.throw();
        (function () {  var x = new IObject([]); }).should.throw();
        (function () {  var x = new IObject(); }).should.throw();
        (function () {  var x = new IObject(3202, [1, 2]); }).should.throw();
        (function () {  var x = new IObject(3202, [[2, 3], 2]); }).should.throw();

        // oid, analogInput 3202
        var iobj = new IObject(3202, [ { aInCurrValue: 1, appType: 'test', sensorType: 'temp'} ]);
        iobj.oid.should.be.eql('analogInput');
        should(iobj.iid).be.null();
        should(iobj.attrs).be.undefined();
        should(iobj.so).be.null();
        should(iobj.resrcAttrs).be.eql({});
        should(iobj.reporters).be.eql({});
        iobj.aInCurrValue.should.be.eql(1);
        iobj.appType.should.be.eql('test');
        iobj.sensorType.should.be.eql('temp');
    });
});

describe('Method Check', function () {
    this.timeout(150000);
    var ridSets = [ { aInCurrValue: 1 }, { appType: 'test' }, { sensorType: 'temp'} ];
    var iobj = new IObject(3202, ridSets);
    var attrs = {
        pmin: 4,
        pmax: 10,
        gt: 50,
        lt: 10,
        step: 5,
    },
    rAttrs = {
        pmin: 2,
        pmax: 8,
        gt: 30,
        lt: 10,
        step: 5,
    };

    var foundAttrs = _.assign({ mute: true, cancel: true, lastReportedValue: null }, attrs);
    var foundRAttrs = _.assign({ mute: true, cancel: true, lastReportedValue: null }, rAttrs);

    it('dump()', function () {
        iobj.dump().then(function (data) {
            (data).should.be.eql({
                5600: 1,
                5750: 'test',
                5751: 'temp'
            });
        }).done();
     });

    it('readResrc(rid)', function () {
        iobj.readResrc('aInCurrValue').then(function (val) { (val).should.be.eql(1); }).done();
        iobj.readResrc('5600').then(function (val) { (val).should.be.eql(1); }).done();
        iobj.readResrc(5600).then(function (val) { (val).should.be.eql(1); }).done();
        iobj.readResrc('appType').then(function (val) { (val).should.be.eql('test'); }).done();
        iobj.readResrc('5750').then(function (val) { (val).should.be.eql('test'); }).done();
        iobj.readResrc(5750).then(function (val) { (val).should.be.eql('test'); }).done();
        iobj.readResrc('sensorType').then(function (val) { (val).should.be.eql('temp'); }).done();
        iobj.readResrc('5751').then(function (val) { (val).should.be.eql('temp'); }).done();
        iobj.readResrc(5751).then(function (val) { (val).should.be.eql('temp'); }).done();

        iobj.readResrc('x').then(function (val) { should(val).be.undefined(); }).done();
        iobj.readResrc('1111').then(function (val) { should(val).be.undefined(); }).done();
        iobj.readResrc(1111).then(function (val) { should(val).be.undefined(); }).done();
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('5600', 100).then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('aInCurrValue', 100).then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc(5600, 100).then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('appType', 'testapp1').then(function fulfilled(val) { done(); }, function rejected(err) { 
            throw err;
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('5750', 'testapp2').then(function fulfilled(val) { done(); }, function rejected(err) { 
            throw err;
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc(5750, 'testapp3').then(function fulfilled(val) { done(); }, function rejected(err) { 
            throw err;
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('sensorType', 'temp1').then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('5751', 'temp2').then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc(5751, 'temp3').then(function fulfilled(val) { throw err; }, function rejected(err) { 
            done();
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('x', 1).then(function fulfilled(val) {
            should(val).be.undefined();
            done();
        }, function rejected(err) { 
            throw err;
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc('1111', 2).then(function fulfilled(val) {
            should(val).be.undefined();
            done();
        }, function rejected(err) { 
            throw err;
        });
    });

    it('writeResrc(rid, value) - write', function (done) {
        return iobj.writeResrc(1111, 3).then(function fulfilled(val) {
            should(val).be.undefined();
            done();
        }, function rejected(err) { 
            throw err;
        });
    });

    it('initResrc(rid, value)', function (done) {
        iobj.initResrc('aInCurrValue', 60);
        iobj.initResrc('5750', 'testapp4');
        iobj.initResrc(5751, 'temp4');
        iobj.readResrc('aInCurrValue').then(function fulfilled(val) {
            should(val).be.eql(60);
            done();
        }, function rejected(err) { 
            throw err;
        });
     });

    it('initResrc(rid, value)', function (done) {
        iobj.readResrc('5750').then(function fulfilled(val) {
            should(val).be.eql('testapp4');
            done();
        }, function rejected(err) { 
            throw err;
        });
     });

    it('initResrc(rid, value)', function (done) {
        iobj.readResrc(5751).then(function fulfilled(val) {
            should(val).be.eql('temp4');
            done();
        }, function rejected(err) { 
            throw err;
        });
     });

    it('initResrc(rid, value)', function (done) {
        iobj.initResrc('aInCurrValue', {
            read: function (callback) {
                callback(null, 'read');
            },
            write: function (value, callback) {
                callback(null, value);
            }
        });
        done();
     });

    it('initResrc(rid, value)', function (done) {
        iobj.readResrc('aInCurrValue').then(function fulfilled(val) {
            should(val).be.eql('read');
            done();
        }, function rejected(err) { 
            throw err;
        });
    });

    it('initResrc(rid, value)', function (done) {
        iobj.writeResrc('aInCurrValue', 80).then(function fulfilled(val) {
            should(val).be.eql(80);
            done();
        }, function rejected(err) { 
            throw err;
        });
    });

    it('getAttrs() - 1', function () {
        should(iobj.getAttrs()).be.undefined();
    });

    it('findAttrs() - 1', function () {
        should(iobj.findAttrs()).be.undefined();
    });

    it('setAttrs(attrs)', function () {
        should(iobj.setAttrs(attrs)).be.equal(iobj);
    });

    it('getAttrs() - 2', function () {
        should(iobj.getAttrs()).be.eql(foundAttrs);
    });

    it('findAttrs() - 2', function () {
        should(iobj.findAttrs()).be.eql(foundAttrs);
    });

    it('getResrcAttrs() - 1', function () {
        should(iobj.getResrcAttrs('aInCurrValue')).be.undefined();
    });

    it('findResrcAttrs() - 1', function () {
        should(iobj.findResrcAttrs('aInCurrValue')).be.eql(foundAttrs);
    });

    it('setResrcAttrs()', function () {
        should(iobj.setResrcAttrs('aInCurrValue', rAttrs)).be.equal(iobj);
    });

    it('getResrcAttrs() - 2', function () {
        should(iobj.getResrcAttrs('aInCurrValue')).be.eql(foundRAttrs);
    });

    it('findResrcAttrs() - 2', function () {
        should(iobj.findResrcAttrs('aInCurrValue')).be.eql(foundRAttrs);
    });

    it('removeResrcAttrs()', function () {
        should(iobj.removeResrcAttrs('aInCurrValue')).be.equal(iobj);
    });

    it('getResrcAttrs() - 3', function () {
        should(iobj.getResrcAttrs('aInCurrValue')).be.undefined();
    });

    it('findResrcAttrs() - 3', function () {
        should(iobj.findResrcAttrs('aInCurrValue')).be.eql(foundAttrs);
    });

    it('report(rid, value)', function () {
        should(iobj.report('aInCurrValue', 3)).be.eql('ut_reported');
    });

    it('enableResrcReporter(rid)', function (done) {
        iobj.initResrc('aInCurrValue', 40);
        should(iobj.enableResrcReporter('aInCurrValue')).be.eql(true);

        setTimeout(function () {
            iobj.initResrc('aInCurrValue', 80);
        }, 6000);


        setTimeout(function () {
            iobj.initResrc('aInCurrValue', 3);
            iobj.disableResrcReporter('aInCurrValue');
            // console.log(iobj.reporters['aInCurrValue']);
        }, 7000);

        setTimeout(function () {
            iobj.initResrc('aInCurrValue', 3);
        }, 8000);

        setTimeout(function () {
            done();
        }, 50000);
    });
});