var _ = require('busyman'),
    mutils = require('lwmqn-util');

var CNST = require('./constants'),
    reporter = require('./reporter'),
    TTYPE = CNST.TTYPE,
    CMD = CNST.CMD,
    TAG = CNST.TAG,
    ERR = CNST.ERR,
    RSP = CNST.RSP,
    reqTimeout = CNST.REQ_TIMEOUT;

var helpers = {};

helpers._readResrc = function (qn, chkaccess, oid, iid, rid, callback) {
    var trg = qn._target(oid, iid, rid),
        resrc = trg.value,
        acnt = mutils.getAccessCtrl(oid, rid),
        readable = true;

    if (chkaccess && acnt)
        readable = (acnt === 'R' || acnt === 'RW') ? true : false;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            // process.nextTick(cb, err, data);
            process.nextTick(function () {
                cb(err, data);
            });

        if (!_.isNil(data))
            reporter.checkAndReportResource(qn, oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.read))
            resrc.read(function (err, val) {
                invokeCb(err, val, callback);
            });
        else if (_.isFunction(resrc.exec))
            invokeCb(ERR.unreadable, TAG.exec, callback);
        else
            invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else if (chkaccess && !readable) {
        invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else if (_.isObject(resrc)) {
        invokeCb(ERR.success, resrc, callback);
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unreadable, TAG.unreadable, callback);
    } else {
        invokeCb(ERR.success, resrc, callback);
    }
};

helpers._writeResrc = function (qn, chkaccess, oid, iid, rid, value, callback) {
    var okey = mutils.oidKey(oid),
        rkey = mutils.ridKey(oid, rid),
        trg = qn._target(oid, iid, rid),
        resrc = trg.value,
        acnt = mutils.getAccessCtrl(oid, rid),
        writable = true;

    if (chkaccess && acnt)
        writable = (acnt === 'W' || acnt === 'RW') ? true : false;

    function invokeCb(err, data, cb) {
        if (_.isFunction(cb))
            process.nextTick(function () {
                cb(err, data);
            });

        if (!_.isNil(data))
            reporter.checkAndReportResource(qn, oid, iid, rid, data);
    }

    if (!trg.exist) {
        invokeCb(ERR.notfound, null, callback);
    } else if (_.isObject(resrc) && resrc._isCb) {
        if (_.isFunction(resrc.write))
            resrc.write(value, function (err, val) {
                invokeCb(err, val, callback);
            });
        else if (_.isFunction(resrc.exec))
            invokeCb(ERR.unwritable, TAG.exec, callback);
        else
            invokeCb(ERR.unwritable, null, callback);
    } else if (chkaccess && !writable) {
        invokeCb(ERR.unwritable, TAG.unwritable, callback);
    } else if (_.isObject(resrc)) {
        if (typeof resrc !== typeof value) {
            invokeCb(ERR.badtype, null, callback);
        } else {
            qn.so[okey][iid][rkey] = value;
            invokeCb(ERR.success, value, callback);
        }
    } else if (_.isFunction(resrc)) {
        invokeCb(ERR.unwritable, null, callback);
    } else {
        if (typeof resrc !== typeof value) {
            invokeCb(ERR.badtype, null, callback);
        } else {
            qn.so[okey][iid][rkey] = value;
            invokeCb(ERR.success, value, callback);
        }
    }
};

module.exports = helpers;
