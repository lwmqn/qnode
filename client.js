var MqttNode = require('./index');

var mqNode = new MqttNode('mnode_1', 1000, '1.1.1', '192.168.1.106', '00:0c:29:71:74:9f');
var so = MqttNode.Generate('tempSensor');
mqNode.hookSmartObject(so);
//console.log(so);
console.log(mqNode.dumpObjectList());

mqNode.on('request', function (msg) {
    console.log(msg);
});

mqNode.on('reg_rsp', function (msg) {
    console.log(msg);
});

mqNode.on('connect', function () {
    console.log('connect');
});

mqNode.on('reconnect', function () {
    console.log('reconnect');
});

mqNode.on('close', function () {
    console.log('close');
});

mqNode.on('offline', function () {
    console.log('offline');
});

mqNode.on('message', function (topic, message, packet) {
    //console.log(topic);
    //console.log(message);
});

mqNode.on('error', function (err) {
    console.log(err);
    console.log('error');
});

mqNode.connect('mqtt://localhost', {
    username: 'freebird',
    password: 'skynyrd'
});