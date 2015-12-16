var util = require('util'),
    mutils = require('./lib/utils/mutils.js'),
    MqttNode = require('./index');

var devAttrs = {
    lifetime: 2000,
    version: '1.1.1',
    ip: '192.168.1.110',
    mac: '00:0c:29:71:74:ff'
};

var qnode = new MqttNode('mnode_1', devAttrs, 'tempSensor');
qnode.writeResrc('tempSensor', 0, 'sensorValue', 300);

qnode.addIObject('tempSensor', 1, {
    sensorValue: 1200,
    units: 'mCel',
    minMeaValue: 10,
    maxMeaValue: 2000,
    minRangeValue: 0,
    maxRangeValue: 4000,
    resetMinMaxMeaValues: { exec: function (p1, p2, p3, callback) {
        console.log(arguments);

        var x = p2 + p3,
            rsp = {
                status: 204,
                data: x
            };

        if (typeof p2 !== 'number') {
            rsp.status = 400;
            rsp.data = null;
        }

        callback(false, rsp);
    } }
});

//so.addIObjects(newObject);

// console.log(qnode.so);
console.log(qnode.objectList());

// qnode.dump(function (err, r) {
//     // console.log(r);
//     r.so = mutils.soWithStringKeys(r.so);
//     console.log(util.inspect(r, { showHidden: true, depth: null }));
// });

qnode.on('connect', function () {
    console.log('connect');

    setTimeout(function() {
        setInterval(function () {
            var val = 67 + Math.floor(Math.random() * 100 + 1);
            qnode.writeResrc('tempSensor', 0, 'sensorValue', val).done(function (val) {
                console.log('WRITE SELF');
                console.log(val);
            });
        }, 6000);
    }, 10000);

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

qnode.on('notify_rsp', function (msg) {
    console.log(' [[[[[[[[[ notify_rsp ]]]]]]]]]]]');
    console.log(msg);
});

qnode.on('announce', function (msg) {
    console.log('announce');
    console.log(msg);

    // qnode.so.notify('device', 0, 'manuf', 'Fly_Bird');
    // qnode.so.notify('device', 0, 'manufx', 'Fly_Bird');
    // qnode.so.notify('tempSensor', 1, { resetMinMaxMeaValues: 'abcdde', sensorValue: 888 } );
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