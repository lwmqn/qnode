var network = require('network');

var msgHandlers = require('./msg_handlers'),
    request = require('./request')
    helper = require('./helper');

module.exports = function (qn) {
    var so = qn.so;
    // set up default smartobjects

    so.createIpsoOnly('lwm2mServer');
    so.createIpsoOnly('device');
    so.createIpsoOnly('connMonitor');

    so.addResources('lwm2mServer', 0, { // oid = 1
        shortServerId: null,            // rid = 0
        lifetime: qn.lifetime,          // rid = 1
        defaultMinPeriod: 1,            // rid = 2
        defaultMaxPeriod: 60,           // rid = 3
        regUpdateTrigger: {             // rid = 8
            exec: function () {
                qn.pubRegister();
            }                           // [TODO] pub register?
        }
    });

    so.addResources('device', 0, {      // oid = 3
        manuf: 'lwmqn',                 // rid = 0
        model: 'MQ1',                   // rid = 1
        reboot: {                       // rid = 4
            exec: function () {}
        },
        availPwrSrc: 0,                 // rid = 6
        pwrSrcVoltage: 5000,            // rid = 7
        devType: 'generic',             // rid = 17
        hwVer: 'v1',                    // rid = 18
        swVer: 'v1'                     // rid = 19
    });

    so.addResources('connMonitor', 0, { // oid = 4
        ip: qn.ip,                      // rid = 4
        routeIp: ''                     // rid = 5
    });

    // get ip and mac if not given
    if (!qn.ip || !qn.mac) {
        network.get_active_interface(function(err, info) {
            qn.ip = info.ip_address;
            qn.mac = info.mac_address;
            qn.so.connMonitor[0].ip = qn.ip;                // [TODO] so.writeResource()?
            qn.so.connMonitor[0].routeIp = info.gateway_ip; // [TODO] so.writeResource()?
        });
    }

    // set up LWMQN interfaces
    _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
        qn._pubics[intf] = intf + '/' + qn.clientId;
        qn._subics[intf] = intf + '/response/' + qn.clientId;
    });
    qn._pubics.response = 'response/' + qn.clientId;
    qn._subics.request = 'request/' + qn.clientId;
    qn._subics.announce = 'announce';

    // set up message handlers
    qn.on('raw', function (topic, message, packet) {
        msgHandlers._rawHdlr(qn, topic, message, packet);
    });

    qn.on('_request', function (err, msg) {
        process.nextTick(function () {          // function wrapped for MT7688 node@0.12.7
            msgHandlers._reqHdlr(qn, msg);
        });
    });

    qn.on('_unconnected', function () {
        qn._connected = false;
    });

    qn.on('_connected', function () {
        qn._connected = true;
        setTimeout(function () {
            if (qn._connected)
                request.lwmqnSubAndReg(qn);     // subscribe LWMQN interfaces and register to Shepherd
        }, 200);
    });

    return true;
};