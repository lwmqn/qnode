var util = require('util'),
    mutils = require('./lib/mutils.js'),
    MqttNode = require('./index');

var devAttrs = {
    lifetime: 2000,
    version: '1.1.1',
    ip: '192.168.1.104',
    mac: '00:0c:29:71:74:ff'
};

var qnode = new MqttNode('mnode_1', devAttrs);
qnode.initResrc('tempSensor', 0, {
    sensorValue: 1200,
    units: 'mCel',
    minMeaValue: 10,
    maxMeaValue: 2000,
    minRangeValue: 0,
    maxRangeValue: 4000
});
qnode.on('registered', function (rsp) {
    console.log('>>>>> registered');
    console.log(rsp);

    setTimeout(function () {
        qnode.pubDeregister(function (err, rsp) {
            console.log('>>>>> deregister');
            console.log(err);
            console.log(rsp);
        });
    }, 200);

    setTimeout(function () {
        qnode.pubDeregister(function (err, rsp) {
            console.log('>>>>> deregister');
            console.log(err);
            console.log(rsp);
        });
    }, 600);
});

qnode.on('connect', function () {

});

qnode.on('request', function (msg) {
    // console.log(msg);
});

qnode.on('announce', function (msg) {
    console.log('announce');
    console.log(msg);
});

qnode.on('reconnect', function () {
    console.log('reconnect');
});

qnode.on('close', function () {
    console.log('close');
});

qnode.on('offline', function () {
    console.log('offline');
});

qnode.on('message', function (topic, message, packet) {
    console.log(topic);
    console.log(message.toString());
});

qnode.on('error', function (err) {
    console.log(err);
    console.log('error');
});

qnode.connect('mqtt://localhost', {
    username: 'freebird',
    password: 'skynyrd'
});