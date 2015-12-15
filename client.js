var MqttNode = require('./index');
var devAttrs = {
    lifetime: 2000,
    version: '1.1.1',
    ip: '192.168.1.110',
    mac: '00:0c:29:71:74:ff'
};

var qnode = new MqttNode('mnode_1', devAttrs, 'tempSensor');
qnode.writeResrc('tempSensor', 0, 'sensorValue', 300);

//so.addIObjects(newObject);

console.log(qnode.objectList());

qnode.on('connect', function () {
    console.log('connect');

    // setTimeout(function() {
    //     setInterval(function () {
    //         var val = 67 + Math.floor(Math.random() * 100 + 1);
    //         qnode.writeResrc('tempSensor', 0, 'sensorValue', val);
    //     }, 6000);
    // }, 10000);

    // setTimeout(function () {
    //     setInterval(function () {
    //         console.log('xxxxx');
    //         //console.log(qnode.getIObject('device', 0).getResrcAttrs(0));
    //         console.log(qnode.getAttrs('device', 0, 0));
    //     }, 6000);
    // }, 10000);
});

qnode.on('request', function (msg) {
    console.log(msg);
});

qnode.on('reg_rsp', function (msg) {
    console.log('reg_rsp');
    console.log(msg);
    setTimeout(function () {
        // qnode.addIObject('testoid', {
        //     tr1: 1,
        //     tr2: 'hello'
        // });

        // qnode.pubUpdate({
        //     lifetime: 999,
        //     ip: '661.222.333.444',
        //     //mac: 'xxx'
        //     //objList: qnode.objectList()
        // }).fail(function(err) {
        //     console.log(err);
        // });

        qnode.pingServer();
        // qnode.pubDeregister(;)
    }, 5000);

});


qnode.on('dereg_rsp', function (msg) {
    console.log('dereg_rsp');
    console.log(msg);
});


qnode.on('ping_rsp', function (msg) {
    console.log('ping_rsp');
    console.log(msg);
});

qnode.on('announce', function (msg) {
    console.log('announce');
    console.log(msg);
});

qnode.on('reconnect', function () {
    console.log('reconnect');
});

qnode.on('update_rsp', function (rsp) {
    console.log('update_rsp *****');
    console.log(rsp);
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