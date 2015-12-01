var EventEmitter = require('events').EventEmitter,
    should = require('should'),
    Gadget = require('../components/gadget.js'),
    Device = require('../components/device.js'),
    NetCore = require('../components/netcore'),
    sketches = require('../components/sketches.js'),
    sg = require('./signalGen'),
    moment = require('moment'),
    _ = require('lodash'),
    Chance = require('chance'),
    chance = new Chance();

/*************************************************************************************************/
/*** NetCore Mockup Generation                                                                 ***/
/*************************************************************************************************/
var module = { name: 'fakeModule'},
    protocol = {
        application: null,
        transport: null,
        network: 'nwk',
        link: 'link'
    },
    nmx = { name: 'fakeNmx' },
    rawDevice = {
        name: 'fakeRawDevice'
    };

var nc = new NetCore('fakeNC', module, protocol);
_.assign(module, EventEmitter.prototype);
_.assign(nmx, EventEmitter.prototype);

nc.setDeviceNamePrefix('ut_');
nc.registerNetDriver('reset', 'noRsp', function () {});
nc.registerNetDriver('identify', 'noRsp', function () {});
nc.registerNetDriver('permitJoin', 'noRsp', function () {});
nc.registerNetDriver('removeDevice', 'noRsp', function () {});
nc.registerNetDriver('maintain', 'noRsp', function () {});
nc.registerNetDriver('ping', 'specificRsp', function () {});
nc.registerNetDriver('findParent', 'specificRsp', function () {});
nc.registerNetDriver('readAttributes', 'specificRsp', function () {});

nc.registerUtility('extractDevInfo', function () {});
nc.registerUtility('extractRawDevice', function () {});
nc.registerUtility('extractNetInfo', function () {});
nc.registerUtility('selectSketch', function () {});
nc.registerUtility('prettifyGadget', function () {});
nc.enable();
nc.setNetMux(nmx);

var fakeDev = new Device(rawDevice, nc);

fakeDev.setId(100);
fakeDev.setProperty('net.role', 'test')
       .setProperty('net.address.permanent', '0x12341234AABBCCDD')
       .setProperty('net.address.dynamic', '0xCDEF')
       .setProperty('net.parentDevId', 'parentDevId')
       .setProperty('info.name', 'name')
       .setProperty('info.manufacturer', 'manufacturer')
       .setProperty('info.model.hwRev', 'hwRev')
       .setProperty('info.model.swVer', 'swVer')
       .setProperty('info.serialNo', 'serialNo')
       .setProperty('info.powerSupply.line.voltage', 'line')
       .setProperty('info.powerSupply.battery.voltage', 'battery')
       .setProperty('info.powerSupply.harverster.voltage', 'harverster')
       .setProperty('info.joinTime', moment().unix());

// Things to be tested
// 1. Device Constructor
//    - name
//    - other defaults
// 2. Methods Signature check - throw error
// 3. Methods Functionality and Output Check
//    - enable(), disable(), isEnabled(), setId(), getId()
//    - setProperty(), linkGadget(), unlinkGadget(), listGadgets()
//    - getAuxIdByGadId()
//    - joinTime(), upTime()

describe('Constructor Testing', function () {
    var mydev = fakeDev;

    it('name check', function () {
        (mydev.getName()).should.be.eql('ut_100');
    });

    it('raw device check', function () {
        (mydev.getRawDevice()).should.be.equal(rawDevice);
    });

    it('netcore check', function () {
        (mydev.getNetCore()).should.be.equal(nc);
    });

    it('maySleep default check', function () {
        (mydev.maySleep).should.be.true();
    });
});

describe('Check Signature', function () {
    var dev; 

    it('constructor should throw error when netcore is invalid', function () {
        (function () { dev = new Device(rawDevice, { x: 3 }); }).should.throw();
        (function () { dev = new Device(rawDevice, 1); }).should.throw();
        (function () { dev = new Device(rawDevice, 'nc'); }).should.throw();
        (function () { dev = new Device(rawDevice, true); }).should.throw();
        (function () { dev = new Device(rawDevice, nc); }).should.not.throw();
    });

    // enable(), ignore
    // disable(), ignore
    // isEnabled(), ignore
    // setId()
    it('setId() should throw error when id is not a number', function () {
        (function () { dev.setId('str'); }).should.throw();
        (function () { dev.setId({ a: 10 }); }).should.throw();
        (function () { dev.setId([ '1', '2' ]); }).should.throw();
        (function () { dev.setId(); }).should.throw();
        (function () { dev.setId(true); }).should.throw();
        (function () { dev.setId(null); }).should.throw();
    });
    // getId(), ignore

    it('setStatus() should throw error when status is not one of online, offline, sleep, unknown', function () {
        (function () { dev.setStatus('str'); }).should.throw();
        (function () { dev.setStatus({ a: 10 }); }).should.throw();
        (function () { dev.setStatus([ '1', '2' ]); }).should.throw();
        (function () { dev.setStatus(); }).should.throw();
        (function () { dev.setStatus(true); }).should.throw();
        (function () { dev.setStatus(null); }).should.throw();
        (function () { dev.setStatus('online'); }).should.not.throw();
        (function () { dev.setStatus('offline'); }).should.not.throw();
        (function () { dev.setStatus('sleep'); }).should.not.throw();
        (function () { dev.setStatus('unknown'); }).should.not.throw();
    });

    it('setProperty() should throw error when key is not a string', function () {
        (function () {
            dev.setProperty(true, 1);
         }).should.throw();
    });

    it('setProperty() should return this when key is "gadgetTable"', function () {
        (dev.setProperty('_gadgetTable', 5)).should.be.equal(dev);
    });

    it('linkGadget() should throw error when gad is not an instance of Gadget', function () {
        var gadTemp = new Gadget(sketches.get('Light'), dev, 6);
        gadTemp.setId(18);
        (function () { dev.linkGadget(1); }).should.throw();
        (function () { dev.linkGadget([ 'f' ]); }).should.throw();
        (function () { dev.linkGadget('f'); }).should.throw();
        (function () { dev.linkGadget({}); }).should.throw();
        (function () { dev.linkGadget(false); }).should.throw();
        (function () { dev.linkGadget(gadTemp); }).should.not.throw();
    });

    it('unlinkGadget() should throw error when gad is not a number or not an instance of Gadget.', function () {
        var gadTemp = new Gadget(sketches.get('Light'), dev, 6);
        gadTemp.setId(18);

        (function () { dev.unlinkGadget('x'); }).should.throw();
        (function () { dev.unlinkGadget([]); }).should.throw();
        (function () { dev.unlinkGadget({}); }).should.throw();
        (function () { dev.unlinkGadget(null); }).should.throw();
        (function () { dev.unlinkGadget(false); }).should.throw();
        (function () { dev.unlinkGadget(); }).should.throw();
        (function () { dev.unlinkGadget(11); }).should.not.throw();
        (function () { dev.unlinkGadget(gadTemp); }).should.not.throw();
    });

    // listGadgets(), ignore
    it('hasGadgetAuxId() should throw error when auxId is undefined.', function () {
        (function () { dev.hasGadgetAuxId(); }).should.throw();
        (function () { dev.hasGadgetAuxId('x'); }).should.not.throw();
        (function () { dev.hasGadgetAuxId([]); }).should.not.throw();
        (function () { dev.hasGadgetAuxId({}); }).should.not.throw();
        (function () { dev.hasGadgetAuxId(null); }).should.not.throw();
        (function () { dev.hasGadgetAuxId(false); }).should.not.throw();
        (function () { dev.hasGadgetAuxId(100); }).should.not.throw();
    });

    it('findAuxIdByGadId() should throw error when gadId is not a number.', function () {
        (function () { dev.findAuxIdByGadId(); }).should.throw();
        (function () { dev.findAuxIdByGadId('x'); }).should.throw();
        (function () { dev.findAuxIdByGadId([]); }).should.throw();
        (function () { dev.findAuxIdByGadId({}); }).should.throw();
        (function () { dev.findAuxIdByGadId(null); }).should.throw();
        (function () { dev.findAuxIdByGadId(false); }).should.throw();
        (function () { dev.findAuxIdByGadId(100); }).should.not.throw();
    });

    it('findGadIdByAuxId() should throw error when auxId is undefined.', function () {
        (function () { dev.findGadIdByAuxId(); }).should.throw();
        (function () { dev.findGadIdByAuxId('x'); }).should.not.throw();
        (function () { dev.findGadIdByAuxId([]); }).should.not.throw();
        (function () { dev.findGadIdByAuxId({}); }).should.not.throw();
        (function () { dev.findGadIdByAuxId(null); }).should.not.throw();
        (function () { dev.findGadIdByAuxId(false); }).should.not.throw();
        (function () { dev.findGadIdByAuxId(100); }).should.not.throw();
    });
    // joinTime(), ignore
    // upTime(), ignore
});



describe('Methods Functionality and Output Check', function () {
    var dev = fakeDev;

    it('enable() check', function () {
        (dev.enable()).should.be.equal(dev);
    });

    it('disable() check', function () {
        (dev.disable()).should.be.equal(dev);
    });

    it('isEnabled() check', function () {
        (dev.enable().isEnabled()).should.be.true();
        (dev.disable().isEnabled()).should.be.false();
    });
    
    it('setId() check - same id', function () {
        (dev.setId(100)).should.be.equal(dev);
    });

    it('setId() check - different id', function () {
        (function () { dev.setId(99) }).should.throw();
    });

    it('getId() check', function () {
        (dev.getId()).should.be.equal(100);
    });

    it('getName() check', function () {
        (dev.getName()).should.be.equal('ut_100');
    });

    it('getRawDevice() check', function () {
        (dev.getRawDevice()).should.be.equal(rawDevice);
    });

    it('getNetCore() check', function () {
        (dev.getNetCore()).should.be.equal(nc);
    });

    it('setStatus() and getStatus() check', function () {
        dev.setStatus('online').should.be.equal(dev);
        dev.getStatus().should.be.eql('online');
        dev.setStatus('offline').should.be.equal(dev);
        dev.getStatus().should.be.eql('offline');
        dev.setStatus('sleep').should.be.equal(dev);
        dev.getStatus().should.be.eql('sleep');
        dev.setStatus('unknown').should.be.equal(dev);
        dev.getStatus().should.be.eql('unknown');
    });

    it('isRegistered() check', function () {
        (dev.isRegistered()).should.be.true();
    });

    it('setProperty() check', function () {
        var core = { name: 'testCore' },
            proto = { link: 'ieee802.15.4'};

        (function () { dev.setProperty('xxx', 100); }).should.throw();
        (function () { dev.setProperty('net.role1', 100); }).should.throw();
        (function () { dev.setProperty('address.permanentx', 100); }).should.throw();
        (function () { dev.setProperty('info.powerSupply.linex', 100); }).should.throw();
        (function () { dev.setProperty('info.powerSupply.line.voltagex', 100); }).should.throw();
        (function () { dev.setProperty('rawDevice', 'raw1'); }).should.throw();
        (function () { dev.setProperty('netcore', core); }).should.throw();
        (function () { dev.setProperty('protocol', proto); }).should.throw();

        (dev.setProperty('net.address.permanent', '0xaeeecddf')).should.equal(dev);
        (dev.net.address.permanent).should.equal('0xaeeecddf');
        (dev.setProperty('info.powerSupply.line.voltage', 3)).should.equal(dev);
        (dev.info.powerSupply.line.voltage).should.equal(3);

        (dev.setProperty('maySleep', 'x')).maySleep.should.be.true();
        (dev.setProperty('maySleep')).maySleep.should.be.false();
        (dev.setProperty('maySleep', null)).maySleep.should.be.false();
        (dev.setProperty('maySleep', NaN)).maySleep.should.be.false();
    });

    it('protocol() check', function () {
        (dev.protocol()).should.be.eql(protocol);
    });

    it('gadgetTable() should return the gadget table', function () {
        var gadTemp = new Gadget(sketches.get('Light'), dev, 6);
        gadTemp.setId(22);

        dev.linkGadget(gadTemp).should.equal(dev);
        dev._gadgetTable.should.eql([{ gadId: 22, auxId: 6 }]);
        (dev.gadgetTable()).should.be.an.Array();
    });

    it('linkGadget() check', function () {
        var gadTemp = new Gadget(sketches.get('Light'), dev, 66);
        gadTemp.setId(18);

        dev.linkGadget(gadTemp).should.equal(dev);
    });

    it('unlinkGadget() check', function () {
        dev.unlinkGadget(1).should.equal(dev);
        dev.unlinkGadget(2).should.equal(dev);
        dev.unlinkGadget(3).should.equal(dev);
        dev.unlinkGadget(18).should.equal(dev);
        dev.unlinkGadget(22).should.equal(dev);
        dev._gadgetTable.should.eql([]);
    });

    it('hasGadgetAuxId() check', function () {
        var gadTemp1 = new Gadget(sketches.get('Light'), dev, 11),
            gadTemp2 = new Gadget(sketches.get('Light'), dev, 16)
        gadTemp1.setId(99);
        gadTemp2.setId(100);

        dev.linkGadget(gadTemp1);
        dev.linkGadget(gadTemp2);

        (dev.hasGadgetAuxId(18)).should.be.false();
        (dev.hasGadgetAuxId(11)).should.be.true();
        (dev.hasGadgetAuxId(16)).should.be.true();
        dev.unlinkGadget(gadTemp1).should.equal(dev);
        dev.unlinkGadget(gadTemp2).should.equal(dev);
        dev._gadgetTable.should.eql([]);
    });

    it('findAuxIdByGadId() check', function () {
        var gadTemp1 = new Gadget(sketches.get('Light'), dev, 11),
            gadTemp2 = new Gadget(sketches.get('Light'), dev, 16)
        gadTemp1.setId(99);
        gadTemp2.setId(100);

        dev.linkGadget(gadTemp1);
        dev.linkGadget(gadTemp2);

        (dev.findAuxIdByGadId(99)).should.equal(11);
        should(dev.findAuxIdByGadId(1)).be.undefined();
        dev.unlinkGadget(gadTemp1);
        dev.unlinkGadget(gadTemp2);
    });

    it('joinTime() check', function () {
        should(dev.joinTime()).be.type('number');
    });

    it('upTime() check', function () {
        var joinTime = dev.joinTime(),
            now,
            diffSecs;
        
        joinTime = moment.unix(joinTime),
        now = moment();

        diffSecs = now.diff(joinTime, 'seconds');

        should(dev.upTime()).be.type('number');
        should(dev.upTime()).be.equal(diffSecs);

        dev.setProperty('info.joinTime', null);
        should(dev.upTime()).be.undefined();
        should(dev.joinTime()).be.undefined();
    });

    it('exportData() check', function () {
        dev.exportData().should.be.eql({
            id: 100,
            data: {
                name: 'ut_100',
                maySleep: false,
                netcore: 'fakeNC',
                net: {
                    role: 'test',
                    address: { permanent: '0xaeeecddf', dynamic: '0xCDEF'},
                    parentDevId: 'parentDevId'
                },
                info: {
                    name: 'name',
                    manufacturer: 'manufacturer',
                    model: {
                        hwRev: 'hwRev',
                        swVer: 'swVer'
                    },
                    serialNo: 'serialNo',
                    powerSupply: {
                        battery: {
                            voltage: 'battery'
                        },
                        harverster: {
                            voltage: 'harverster'
                        },
                        line: {
                            voltage: 3
                        }
                    },
                    joinTime: null },
                    gadTable: []
                }
        });
    });

    it('updateNetInfo() check', function () {
        dev.updateNetInfo({
            address: {
                permanent: '0x1111222233334444',
            },
            x: 3,
            role: 'roleChanged'
        });
        dev.net.address.permanent.should.eql('0x1111222233334444');
        dev.net.role.should.eql('roleChanged');
        (function () { return dev.net.x; }).should.be.undefined;
    });

    it('extractNetInfoDiff() check', function () {

        var x = dev.extractNetInfoDiff({
            address: {
                permanent: '0x1111222233334444',
                dynamic: '0xAAAA',
            },
            parentDevId: 555,
            x: 3
        });

        x.should.eql({
            address: {
                dynamic: '0xAAAA',
            },
            parentDevId: 555
        });
    });

    it('extractDevInfoDiff() check', function () {

        var x = dev.extractDevInfoDiff({
            model: {
                hwRev: '1.1',
                swVer: 'v0.2'
            },
            powerSupply: {
                battery: { voltage: '3.3V' },
                x: 100
            },
        });

        x.should.eql({
            model: {
                hwRev: '1.1',
                swVer: 'v0.2'
            },
            powerSupply: {
                battery: { voltage: '3.3V' },
            },
        });
    });
});

