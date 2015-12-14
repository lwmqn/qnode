var should = require('should'),
    _ = require('lodash'),
    MqttNode = require('../mqtt-node'),
    SmartObject = require('../smartobject');

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

    it('_bindSo(so)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        (function () { return node._bindSo({}); }).should.throw();
        (function () { return node._bindSo([]); }).should.throw();
        (function () { return node._bindSo(3); }).should.throw();
        (function () { return node._bindSo('xxx'); }).should.throw();

        // should(node._bindSo(so_sample)).be.equal(node);
        // should(node.so).be.equal(so_sample);
        // should(so_sample.node).be.equal(node);
    });

    it('_getRootObject(oid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);

        (function () { node._getRootObject({}); }).should.throw();
        (function () { node._getRootObject([]); }).should.throw();
        (function () { node._getRootObject(1); }).should.not.throw();
        (function () { node._getRootObject('2'); }).should.not.throw();
        (function () { node._getRootObject('xxx'); }).should.not.throw();
    });

    it('_getIObject(oid, iid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);

        (function () { node._getIObject({}); }).should.throw();
        (function () { node._getIObject([]); }).should.throw();
        (function () { node._getIObject(1, {}); }).should.throw();
        (function () { node._getIObject(1, []); }).should.throw();


        (function () { node._getIObject('x'); }).should.throw();
        (function () { node._getIObject(1); }).should.throw();
        (function () { node._getIObject('x', 100); }).should.not.throw();
        (function () { node._getIObject(1, '100'); }).should.not.throw();
    });

    it('_getResource(oid, iid, rid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);

        (function () { node._getResource({}); }).should.throw();
        (function () { node._getResource([]); }).should.throw();
        (function () { node._getResource(1, {}); }).should.throw();
        (function () { node._getResource(1, []); }).should.throw();
        (function () { node._getResource('x'); }).should.throw();
        (function () { node._getResource(1); }).should.throw();
        (function () { node._getResource('x', 1); }).should.throw();
        (function () { node._getResource(1, 'x'); }).should.throw();

        (function () { node._getResource('x', 100, 1); }).should.not.throw();
        (function () { node._getResource(1, '100', 'ss'); }).should.not.throw();
    });
});

describe('Functional Check', function () {
    it('_bindSo(so)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        should(node._bindSo(so_sample)).be.equal(node);
        should(node.so).be.equal(so_sample);
        should(so_sample.node).be.equal(node);
    });

    it('objectList()', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');

        (function () { node.objectList(); }).should.throw();
        node._bindSo(so_sample);
        (function () { node.objectList(); }).should.not.throw();

        should(node.objectList()).be.eql([ { oid: 3, iid: 0 }, { oid: 4, iid: 0 }, { oid: 3303, iid: 0 } ]);
    });

    it('_getRootObject(oid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);
        should(node._getRootObject('device')).not.be.undefined();
        should(node._getRootObject('device')).be.equal(node.so.device);
        should(node._getRootObject(4)).be.equal(node.so.connMonitor);
        should(node._getRootObject(3303)).be.equal(node.so.tempSensor);
    });

    it('_getIObject(oid, iid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);
        should(node._getIObject('device', 1)).be.undefined();
        should(node._getIObject('device', 0)).be.equal(node.so.device[0]);
        should(node._getIObject(4, 0)).be.equal(node.so.connMonitor[0]);
        should(node._getIObject(3303, 0)).be.equal(node.so.tempSensor[0]);
    });

    it('_getResource(oid, iid, rid)', function () {
        var node = new MqttNode(cId, devAttrs);
        var so_sample = SmartObject.getTemplate('tempSensor');
        node._bindSo(so_sample);
        should(node._getResource('device', 0, 'xreboot')).be.undefined();
        should(node._getResource('device', 0, 'reboot')).not.be.undefined();
        should(node._getResource(4, 0, 'xip')).be.undefined();
        should(node._getResource(4, 0, 'ip')).not.be.undefined();
        should(node._getResource(3303, 0, 'xunits')).be.undefined();
        should(node._getResource(3303, 0, 'units')).not.be.undefined();

        should(node._getResource('xdevice', 0, 'reboot')).be.undefined();
        should(node._getResource('device', 1, 'reboot')).be.undefined();
        should(node._getResource(4, 2, 'ip')).be.undefined();
        should(node._getResource(14, 0, 'ip')).be.undefined();
    });
});