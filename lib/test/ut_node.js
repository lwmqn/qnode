var should = require('should'),
    _ = require('lodash'),
    MqttNode = require('../mqtt-node'),
    SmartObject = MqttNode.SmartObject;

var cId = 'Im-client-node',
    devAttrs = {
        lifetime: 60000,
        ip: '140.117.11.1',
        mac: '11:22:AA:BB:CC:DD',
        version: 'v0.0.1'
    };

describe('Constructor Check', function () {
    it('MqttNode(clientId, devAttrs)', function () {
        var node = new MqttNode(cId, devAttrs);
        should(node.clientId).be.eql(cId);
        should(node.ip).be.eql('140.117.11.1');
        should(node.mac).be.eql('11:22:AA:BB:CC:DD');
        should(node.version).be.eql('v0.0.1');
        should(node.lifetime).be.eql(60000);
        should(node.mc).be.null();
        should(node.so).be.null();
        should(node.subics).be.eql({
            register: 'register/response/' + cId,
            deregister: 'deregister/response/' + cId,
            notify: 'notify/response/' + cId,
            update: 'update/response/' + cId,
            ping: 'ping/response/' + cId,
            request: 'request/' + cId,
            announce: 'announce'
        });
        should(node.pubics).be.eql({
            register: 'register/' + cId,
            deregister: 'deregister/' + cId,
            notify: 'notify/' + cId,
            update: 'update/' + cId,
            ping: 'ping/' + cId,
            response: 'response/' + cId,
        });
    });

});

describe('Signature Check', function () {
    it('MqttNode(clientId, devAttrs)', function () {
        (function () { return new MqttNode(); }).should.throw();
        (function () { return new MqttNode([]); }).should.throw();
        (function () { return new MqttNode({}); }).should.throw();
        (function () { return new MqttNode('test'); }).should.not.throw();
        (function () { return new MqttNode('test', []); }).should.throw();
        (function () { return new MqttNode('test', 30); }).should.throw();
        (function () { return new MqttNode('test', 'xxx'); }).should.throw();
    });

    it('bindSo(so)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        (function () { return node.bindSo({}); }).should.throw();
        (function () { return node.bindSo([]); }).should.throw();
        (function () { return node.bindSo(3); }).should.throw();
        (function () { return node.bindSo('xxx'); }).should.throw();

        // should(node.bindSo(so_sample)).be.equal(node);
        // should(node.so).be.equal(so_sample);
        // should(so_sample.node).be.equal(node);
    });

    it('getRootObject(oid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);

        (function () { node.getRootObject({}); }).should.throw();
        (function () { node.getRootObject([]); }).should.throw();
        (function () { node.getRootObject(1); }).should.not.throw();
        (function () { node.getRootObject('2'); }).should.not.throw();
        (function () { node.getRootObject('xxx'); }).should.not.throw();
    });

    it('getIObject(oid, iid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);

        (function () { node.getIObject({}); }).should.throw();
        (function () { node.getIObject([]); }).should.throw();
        (function () { node.getIObject(1, {}); }).should.throw();
        (function () { node.getIObject(1, []); }).should.throw();


        (function () { node.getIObject('x'); }).should.throw();
        (function () { node.getIObject(1); }).should.throw();
        (function () { node.getIObject('x', 100); }).should.not.throw();
        (function () { node.getIObject(1, '100'); }).should.not.throw();
    });

    it('getResource(oid, iid, rid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);

        (function () { node.getResource({}); }).should.throw();
        (function () { node.getResource([]); }).should.throw();
        (function () { node.getResource(1, {}); }).should.throw();
        (function () { node.getResource(1, []); }).should.throw();
        (function () { node.getResource('x'); }).should.throw();
        (function () { node.getResource(1); }).should.throw();
        (function () { node.getResource('x', 1); }).should.throw();
        (function () { node.getResource(1, 'x'); }).should.throw();

        (function () { node.getResource('x', 100, 1); }).should.not.throw();
        (function () { node.getResource(1, '100', 'ss'); }).should.not.throw();
    });
});

describe('Functional Check', function () {
    it('bindSo(so)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        should(node.bindSo(so_sample)).be.equal(node);
        should(node.so).be.equal(so_sample);
        should(so_sample.node).be.equal(node);
    });

    it('objectList()', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');

        (function () { node.objectList(); }).should.throw();
        node.bindSo(so_sample);
        (function () { node.objectList(); }).should.not.throw();

        should(node.objectList()).be.eql([ { oid: 3, iid: 0 }, { oid: 4, iid: 0 }, { oid: 3303, iid: 0 } ]);
    });

    it('getRootObject(oid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);
        should(node.getRootObject('device')).not.be.undefined();
        should(node.getRootObject('device')).be.equal(node.so.device);
        should(node.getRootObject(4)).be.equal(node.so.connMonitor);
        should(node.getRootObject(3303)).be.equal(node.so.tempSensor);
    });

    it('getIObject(oid, iid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);
        should(node.getIObject('device', 1)).be.undefined();
        should(node.getIObject('device', 0)).be.equal(node.so.device[0]);
        should(node.getIObject(4, 0)).be.equal(node.so.connMonitor[0]);
        should(node.getIObject(3303, 0)).be.equal(node.so.tempSensor[0]);
    });

    it('getResource(oid, iid, rid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node.bindSo(so_sample);
        should(node.getResource('device', 0, 'xreboot')).be.undefined();
        should(node.getResource('device', 0, 'reboot')).not.be.undefined();
        should(node.getResource(4, 0, 'xip')).be.undefined();
        should(node.getResource(4, 0, 'ip')).not.be.undefined();
        should(node.getResource(3303, 0, 'xunits')).be.undefined();
        should(node.getResource(3303, 0, 'units')).not.be.undefined();

        should(node.getResource('xdevice', 0, 'reboot')).be.undefined();
        should(node.getResource('device', 1, 'reboot')).be.undefined();
        should(node.getResource(4, 2, 'ip')).be.undefined();
        should(node.getResource(14, 0, 'ip')).be.undefined();
    });
});