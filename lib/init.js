'use strict';

var _ = require('busyman'),
    debug = require('debug')('mqtt-node:init'),
    request = require('./request'),
    reporter = require('./reporter'),
    msgHandlers = require('./msg_handlers');

// For Travis-CI Testing
if (process.env.npm_lifecycle_event === 'test') {
    var network = {
        get_active_interface: function (cb) {
            setTimeout(function () {
                cb(null, {
                    ip_address: '192.168.1.99',
                    gateway_ip: '192.168.1.1',
                    mac_address: '00:11:22:33:44:AA:BB:CC:DD'
                });
            }, 100);
        }
    };
} else {
    var network = require('network');
}

module.exports = function (qn) {
    var so = qn.so,
        waitForIp = false;

    if (!so.has('lwm2mServer', 0)) {

        debug('Initialize lwm2mServer object, lifetime: %d', qn.lifetime);

        so.init('lwm2mServer', 0, {     // oid = 1
            shortServerId: null,        // rid = 0
            lifetime: qn.lifetime,      // rid = 1
            defaultMinPeriod: 1,        // rid = 2
            defaultMaxPeriod: 60,       // rid = 3
            regUpdateTrigger: {         // rid = 8
                exec: function (cb) {
                    var devAttrs = {
                        transId: null,
                        lifetime: qn.lifetime,
                        ip: qn.ip,
                        version: qn.version
                    };

                    qn._update(devAttrs, function (err, rsp) {});
                    cb(200);    // 200 ok
                }
            }
        });
    }

    if (!so.has('device', 0)) {

        debug("Initialize device object, manuf: 'lwmqn', model: 'MQ1'");

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

        debug("Initialize connMonitor object");

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

    debug("Prepare read/write methods");

    so.__read = so.read;    // __read is the original read
    so.read = function (oid, iid, rid, callback, opt) {
        var isReadable = so.isReadable(oid, iid, rid),
            dataToCheck;

        return so.__read(oid, iid, rid, function (err, data) {
            if (isReadable) {
                dataToCheck = data;
                setImmediate(function () {
                    reporter.checkAndReportResource(qn, oid, iid, rid, dataToCheck);
                });
            }

            callback(err, data);
        }, opt);
    };

    so.__write = so.write;    // __write is the original write
    so.write = function (oid, iid, rid, value, callback, opt) {
        var isReadable = so.isReadable(oid, iid, rid),
            dataToCheck;

        return so.__write(oid, iid, rid, value, function (err, data) {
            if (isReadable) {
                dataToCheck = data || value;
                setImmediate(function () {
                    reporter.checkAndReportResource(qn, oid, iid, rid, dataToCheck);
                });
            }

            callback(err, data);
        }, opt);
    };

    debug("Set up LWMQN interfaces");

    _.forEach([ 'register', 'deregister', 'schedule', 'notify', 'update', 'ping' ], function (intf) {
        qn._pubics[intf] = intf + '/' + qn.clientId;
        qn._subics[intf] = intf + '/response/' + qn.clientId;
    });

    qn._pubics.response = 'response/' + qn.clientId;
    qn._subics.request = 'request/' + qn.clientId;
    qn._subics.announce = 'announce';

    debug("Set up message handlers");

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
                _lwmqnSubAndReg(qn);    // subscribe LWMQN interfaces and register to Shepherd
        }, 100);
    });

    // get ip and mac if not given
    if (!qn.ip || !qn.mac) {
        waitForIp = true;

        network.get_active_interface(function(err, info) {
            if (!err) {
                qn.ip = qn.ip || info.ip_address.toLowerCase();
                qn.mac = info.mac_address.toLowerCase();
                debug("ip: %s, mac: %s, router ip: %s", qn.ip, qn.mac, info.gateway_ip);
                debug("Local init done! Wait for LWMQN network establishment");
                qn.emit('ready');
            } else {
                qn._emitError(err);
            }
            waitForIp = false;
        });
    }

    if (!waitForIp) {
        debug("Local init done! Wait for LWMQN network establishment");
        qn.emit('ready');
    }

    return true;
};

function _lwmqnSubAndReg(qn) {
    var subics1 = [ qn._subics.register, qn._subics.deregister, qn._subics.request ],
        subics2 = [ qn._subics.notify, qn._subics.update, qn._subics.ping, qn._subics.announce, qn._subics.schedule ],
        regRsp;

    function sub2Callback(err, granted) {
        if (err) {
            qn.emit('_connect_cb', { err: err, rsp: null });
        } else if (regRsp.status === 201) { // new created
            debug('LWMQN establishing done! - New client joined');
            qn.emit('_connect_cb', { err: null, rsp: regRsp });
        } else if (regRsp.status === 200) { // already exists, ok
            debug('LWMQN establishing done! - Old client rejoined');
            qn.emit('_connect_cb', { err: null, rsp: regRsp });
        }
    }

    function sub1Callback(err, granted) {
        if (err) {
            qn.emit('_connect_cb', { err: err, rsp: null });
        } else {
            qn.register(function (err, rsp) {
                regRsp = rsp;
                if (err) {
                    qn.emit('_connect_cb', { err: err, rsp: null });
                } else {
                    qn.mc.subscribe(subics2, function (err) {
                        if (err) {
                            qn.emit('_connect_cb', { err: err, rsp: null });
                        } else {
                            debug('LWMQN establishing stage 2: notify, update, ping, announce, and schedule interfaces subscribed');
                            process.nextTick(sub2Callback);
                        }
                    });
                }
            });
        }
    }

    qn.mc.subscribe(subics1, function (err) {
        if (err) {
            qn.emit('_connect_cb', { err: err, rsp: null });
        } else {
            debug('LWMQN establishing stage 1: register, deregister, and request interfaces subscribed');
            process.nextTick(sub1Callback);
        }
    });
};
