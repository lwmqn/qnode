var MqttNode = require('./index');
var devAttrs = {
    lifetime: 2000,
    version: '1.1.1',
    ip: '192.168.1.110',
    mac: '00:0c:29:71:74:9f'
};

var qnode = new MqttNode('mnode_1', devAttrs);
var so = MqttNode.SmartObject.getTemplate('tempSensor');
var newObject = new MqttNode.SmartObject.IObject('device', { manuf: 'sivann2' });

qnode.bindSo(so);
so.tempSensor[0].sensorValue = 300;
//so.device[0].manuf = 'sivannYYYYYY';
//so.addIObjects(newObject);
//console.log(so);
console.log(qnode.objectList());

qnode.on('connect', function () {
    console.log('connect');
    //console.log(so);
    // qnode.pubRegister().then(function (res) {
    //     console.log(res);
    // });

    setTimeout(function() {
        setInterval(function () {
            so.tempSensor[0].sensorValue = 67 + Math.floor(Math.random() * 100 + 1);
        }, 6000);
    }, 10000);



    setTimeout(function () {
        setInterval(function () {
            console.log('xxxxx');
            console.log(qnode.getIObject('device', 0).getResrcAttrs(0));
        }, 6000);
    }, 10000);
});

qnode.on('request', function (msg) {
    console.log(msg);
});

qnode.on('reg_rsp', function (msg) {
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
    // console.log(topic);
    // console.log(message.toString());
});

qnode.on('error', function (err) {
    console.log(err);
    console.log('error');
});

qnode.connect('mqtt://localhost', {
    username: 'freebird',
    password: 'skynyrd'
});