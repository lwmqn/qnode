/**********************************
 Deprecated!!
************************************/

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


MqttNode.prototype.execResrc = function (oid, iid, rid, argus, callback) {
    var trg = this._target(oid, iid, rid);

    function invokeCb(status, data, cb) {
        if (_.isFunction(cb)) {
            // don't use process.nextTick(cb, status, data), mt7688 not support (node.js too old)
            process.nextTick(function () {
                cb(status, data);
            });
        }
    }

    if (_.isFunction(argus)) {
        callback = argus;
        argus = [];
    }

    if (_.isUndefined(argus))
        argus = [];

    if (!trg.exist) {
        invokeCb(RSP.notfound, null, callback);
    } else if (!_.isArray(argus)) {
        invokeCb(RSP.badreq, null, callback);
    } else if (_.isObject(trg.value) && _.isFunction(trg.value.exec)) {
        argus.push(function (sta, val) {
            invokeCb(sta, val, callback);
        });
        trg.value.exec.apply(this, argus);
    } else {
        invokeCb(RSP.notallowed, TAG.unexecutable, callback);
    }
};

module.exports = helpers;
