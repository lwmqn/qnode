var _ = require('busyman'),
    CNST = require('./constants');

var request = {};

function reqTimeout(qn, key, delay) {
    qn._tobjs[key] = setTimeout(function () {
        qn.emit(key, null, { status: CNST.RSP.timeout });
        delete qn._tobjs[key];
    }, delay);
};

function req(qn, intf, data, callback) {
    var evt;

    data.transId = qn._nextTransId(intf);

    if (_.isFunction(callback)) {
        evt = intf + ':rsp:' + data.transId;
        reqTimeout(qn, evt, CNST.REQ_TIMEOUT);

        qn.once(evt, function (err, rsp) {
            // if not timeout yet, clear it
            if (!_.isUndefined(qn._tobjs[evt])) {
                clearTimeout(qn._tobjs[evt]);
                delete qn._tobjs[evt];
            }
            callback(err, rsp);
        });
    }

    return qn.publish(qn._pubics[intf], data, function (err, rsp) {
        // if mqtt publish fails
        if (err)
            qn.emit(evt, err, null);
    });
};

request.register = function (qn, callback) {
    var data = {
            transId: null,
            lifetime: qn.lifetime,
            objList: qn.so.objectList(),
            ip: qn.ip,
            mac: qn.mac,
            version: qn.version
        };

    return req(qn, 'register', data, callback);
};

request.deregister = function (qn, callback) {
    var data = {
            transId: null,
            data: null
        };

    return req(qn, 'deregister', data, function (err, rsp) {
        if (!err && rsp.status === CNST.RSP.deleted)
            qn.mc.end();

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

request.update = function (qn, devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    return req(qn, 'update', _.omit(devAttrs, [ 'mac', 'clientId' ]), callback);
};

request.notify = function (qn, data, callback) {
    return req(qn, 'notify', data, function (err, rsp) {
        if (rsp && rsp.cancel)
            qn.disableReport(data.oid, data.iid, data.rid);

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

request.ping = function (qn, callback) {
    var txTime = _.now(),
        data = {
            transId: null,
            data: null
        };

    return req(qn, 'ping', data, function (err, rsp) {
        if (!err && rsp.status !== CNST.RSP.timeout)
            rsp.data = _.now() - txTime;    // rxTime - txTime

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

request.lwmqnSubAndReg = function (qn) {
    var subics1 = [ qn._subics.register, qn._subics.deregister, qn._subics.request ],
        subics2 = [ qn._subics.notify, qn._subics.update, qn._subics.ping, qn._subics.announce ],
        regRsp;

    function sub2Callback(err, granted) {
        if (err) {
            qn.emit('error', err);
        } else {
            qn.emit('registered', regRsp);  // life update taclked in _rawHdlr()
            qn.emit('ready');
        }
    }

    function sub1Callback(err, granted) {
        if (err) {
            qn.emit('error', err);
        } else {
            qn.pubRegister(function (err, rsp) {
                regRsp = rsp;
                if (err) 
                    qn.emit('error', err);
                else
                    qn.mc.subscribe(subics2, sub2Callback);
            });
        }
    }

    qn.mc.subscribe(subics1, sub1Callback);
};

module.exports = request;
