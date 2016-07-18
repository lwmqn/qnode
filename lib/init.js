var _ = require('busyman'),
    network = require('network'),
    request = require('./request'),
    reporter = require('./reporter'),
    msgHandlers = require('./msg_handlers');

module.exports = function (qn) {
    var so = qn.so,
        waitForIp = false;

    if (!so.has('lwm2mServer', 0)) {
        so.init('lwm2mServer', 0, {     // oid = 1
            shortServerId: null,        // rid = 0
            lifetime: qn.lifetime,      // rid = 1
            defaultMinPeriod: 1,        // rid = 2
            defaultMaxPeriod: 60,       // rid = 3
            regUpdateTrigger: {         // rid = 8
                exec: function () {
                    qn.register();
                }                       // [TODO] pub register?
            }
        });
    }

    if (!so.has('device', 0)) {
        so.init('device', 0, {          // oid = 3
            manuf: 'lwmqn',             // rid = 0
            model: 'MQ1',               // rid = 1
            reboot: {                   // rid = 4
                exec: function () {}
            },
            availPwrSrc: 0,             // rid = 6
            pwrSrcVoltage: 5000,        // rid = 7
            devType: 'generic',         // rid = 17
            hwVer: 'v1',                // rid = 18
            swVer: 'v1'                 // rid = 19
        });
    }

    if (!so.has('connMonitor', 0)) {
        so.init('connMonitor', 0, {     // oid = 4
            ip: {                       // rid = 4
                read: function (cb) {
                    network.get_active_interface(function(err, info) {
                        if (err)
                            cb(err);
                        else
                            cb(null, info.ip_address);
                    });
                }
            },
            routeIp: {                  // rid = 5
                read: function (cb) {
                    network.get_active_interface(function(err, info) {
                        if (err)
                            cb(err);
                        else
                            cb(null, info.gateway_ip);
                    });
                }
            }
        });
    }

    so.__read = so.read;    // __read is the original read
    so.read = function (oid, iid, rid, callback, opt) {
        var isReadable = so.isReadable(oid, iid, rid),
            isExecutable = so.isExecutable(oid, iid, rid),
            dataToCheck;

        return so.__read(oid, iid, rid, function (err, data) {
            if (!isReadable)
                dataToCheck = isExecutable ? '_exec_' : '_unreadable_'
            else
                dataToCheck = data;

            if (!_.isNil(dataToCheck)) {
                process.nextTick(function () {
                    reporter.checkAndReportResource(qn, oid, iid, rid, dataToCheck);
                });
            }

            callback(err, data);
        }, opt);
    };

    so.__write = so.write;    // __write is the original write
    so.write = function (oid, iid, rid, value, callback, opt) {
        var isWritable = so.isWritable(oid, iid, rid),
            isExecutable = so.isExecutable(oid, iid, rid),
            dataToCheck;

        return so.__write(oid, iid, rid, value, function (err, data) {
            if (!isWritable)
                dataToCheck = isExecutable ? '_exec_' : '_unwritable_'
            else
                dataToCheck = data || value;

            if (!_.isNil(dataToCheck)) {
                process.nextTick(function () {
                    reporter.checkAndReportResource(qn, oid, iid, rid, dataToCheck);
                });
            }

            callback(err, data);
        }, opt);
    };

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

    qn.on('_request', function (err, msg) {     // emit @ msgHandlers._rawHdlr with (err, jmsg)
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
        }, 100);
    });

    // get ip and mac if not given
    if (!qn.ip || !qn.mac) {
        waitForIp = true;

        network.get_active_interface(function(err, info) {
            if (!err) {
                qn.ip = qn.ip || info.ip_address.toLowerCase();
                qn.mac = info.mac_address.toLowerCase();
                qn.emit('ready');
            } else {
                qn.emit('error', err);
            }
            waitForIp = false;
        });
    }

    if (!waitForIp)
        qn.emit('ready');

    return true;
};