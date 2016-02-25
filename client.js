var util = require('util'),
    crypto = require('crypto'),
    MqttNode = require('./index');

var devAttrs = {
    lifetime: 2000,
    version: '1.1.1',
    ip: '192.168.1.104',
    mac: '00:0c:29:71:74:ff'
};

var x = 0;
var qnode = new MqttNode('mnode_1-5', devAttrs);

qnode.encrypt = function (msg, clientId) {         // Overide at will
    console.log('ENCRYPTION: MY Client Id ' + clientId);
    var msgBuf = new Buffer(msg),
        cipher = crypto.createCipher('aes128', 'mypassword'),
        encrypted = cipher.update(msgBuf, 'binary', 'base64');

    encrypted += cipher.final('base64');
    return encrypted;
};

qnode.decrypt = function (msg, clientId) {         // Overide at will
    console.log('DECRYPTION: MY Client Id ' + clientId);

    msg = msg.toString();
    var decipher = crypto.createDecipher('aes128', 'mypassword'),
        decrypted = decipher.update(msg, 'base64', 'utf8');

    try {
        decrypted += decipher.final('utf8');
    } catch (e) {
        // log 'decrytion fails'
        console.log('decrytion fails.');
        return msg;
    }
    return decrypted;
};

qnode.initResrc('temperature', 0, {
    sensorValue: 1200,
    units: 'mCel',
    minMeaValue: 10,
    maxMeaValue: 2000,
    minRangeValue: 0,
    maxRangeValue: 4000,
    some1: {
        exec: function (name, cb) { 
            console.log('hello ' + name);
            cb(null, 'exec world');
        }
    },
    some2: {
        write: function (val, cb) {
            x = val;
            console.log('write~~~~');
            console.log(x);
            cb(null, x);
        }
    },
    some3: {
        read: function (cb) { cb(null, 'hello'); }
    }
});

qnode.on('registered', function (rsp) {

    // setInterval(function () {
    //     console.log('>>>> temperature.0.sensorValue: ' + qnode.so.temperature[0].sensorValue);
    //     var v = Math.floor((Math.random() * 100) + 1);
    //     qnode.readResrc('temperature', 'sensorValue', v, function (err, val) {
    //         console.log('>>>> read temperature.0.sensorValue');
    //         console.log(val);
    //         console.log(qnode.so.temperature[0].sensorValue);
    //     });
    // }, 1000);

    setInterval(function () {
        console.log('>>>> temperature.0.sensorValue: ' + qnode.so.temperature[0].sensorValue);
        var v = Math.floor((Math.random() * 100) + 1);
        qnode.writeResrc('temperature', 0, 'sensorValue', v, function (err, val) {
            console.log('>>>> write temperature.0.sensorValue');
            console.log(val);
            console.log(qnode.so.temperature[0].sensorValue);
        });
    }, 5000);
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
    password: 'skynyrd',
    reconnectPeriod: 5000
});