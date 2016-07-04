var _ = require('lodash'),
    mutils = require('lwmqn-util');

var CNST = require('./constants'),
    TTYPE = CNST.TTYPE,
    CMD = CNST.CMD,
    TAG = CNST.TAG,
    ERR = CNST.ERR,
    RSP = CNST.RSP,
    reqTimeout = CNST.REQ_TIMEOUT;

var helpers = {},
    privateListeners = {};

helpers._addPrivateListener = function (emitter, evt, lsn) {
    privateListeners[evt] = privateListeners[evt] || [];
    privateListeners[evt].push({
        emitter: emitter,
        listener: lsn
    });
    emitter.on(evt, lsn);
};

helpers._removePrivateListeners = function (emitter, evt) {
    var lsnRecs = privateListeners[evt];

    if (lsnRecs && lsnRecs.length !== 0) {
        _.forEach(lsnRecs, function (rec) {
            if (rec.emitter === emitter)
                emitter.removeListener(evt, rec.listener);
        });

        _.remove(lsnRecs, function (rec) {
            return rec.emitter === emitter;
        });
    }

    if (lsnRecs && lsnRecs.length === 0) {
        lsnRecs = null;
        delete privateListeners[evt];
    }
};

helpers._reqTimeout = function (qn, key, delay) {
    qn._tobjs[key] = setTimeout(function () {
        qn.emit(key, null, { status: RSP.timeout });
        delete qn._tobjs[key];
    }, delay);
};

helpers._pubReq = function (qn, intf, data, callback) {
    var evt;

    data.transId = qn._nextTransId(intf);

    if (_.isFunction(callback)) {
        evt = intf + ':rsp:' + data.transId;
        helpers._reqTimeout(qn, evt, reqTimeout);

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

helpers._lwmqnSubAndReg = function (qn) {
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

helpers._lfUpdate = function (qn, enable) {
    qn._lfsecs = 0;
    clearInterval(qn._updater);
    qn._updater = null;

    if (enable) {
        qn._updater = setInterval(function () {
            qn._lfsecs += 1;
            if (qn._lfsecs === qn.lifetime) {
                qn.pubUpdate({ lifetime: qn.lifetime });
                qn._lfsecs = 0;
            }
        }, 1000);
    }
};

helpers._checkAndReportResrc = function (qn, oid, iid, rid, currVal) {
    var rAttrs = qn._getAttrs(oid, iid, rid),
        rpt = false,
        gt, lt, step, lastrp;

    if (_.isNil(rAttrs))
        return false;

    gt = rAttrs.gt;
    lt = rAttrs.lt;
    step = rAttrs.stp;
    lastrp = rAttrs.lastRpVal;

    if (rAttrs.cancel || rAttrs.mute)
        return false;

    if (_.isObject(currVal)) {
        if (_.isObject(rAttrs.lastRpVal)) {
            _.forEach(rAttrs.lastRpVal, function (v, k) {
                rpt = rpt || (v !== rAttrs.lastRpVal[k]);
            });
        } else {
            rpt = true;
        }
    } else if (!_.isNumber(currVal)) {
        rpt = rAttrs.lastRpVal !== currVal;
    } else {
        if (_.isNumber(gt) && _.isNumber(lt) && lt > gt) {
            rpt = (lastrp !== currVal) && (currVal > gt) && (currVal < lt);
        } else {
            rpt = _.isNumber(gt) && (lastrp !== currVal) && (currVal > gt);
            rpt = rpt || (_.isNumber(lt) && (lastrp !== currVal) && (currVal < lt));
        }

        if (_.isNumber(step)) {
            rpt = rpt || (Math.abs(currVal - lastrp) > step);
        }
    }

    if (rpt) {
        qn.pubNotify({ oid: oid, iid: iid, rid: rid, data: currVal });
        rAttrs.lastRpVal = currVal;
    }

    return rpt;
};

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

        if (!_.isNil(data)) helpers._checkAndReportResrc(qn, oid, iid, rid, data);
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
            helper._checkAndReportResrc(qn, oid, iid, rid, data);
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

// [!] move to msg_handlers
helpers._reqHdlr = function (qn, msg) {
    var reqMsgHdlr,
        rtn = true,
        trg,
        rsp = {
            transId: null,
            cmdId: 'unknown',
            status: RSP.ok,
            data: null
        };

    if (_.isObject(msg)) {
        rsp = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            status: RSP.ok,
            data: null
        };
    }

    if (rsp.cmdId !== CMD.ping) {
        try {
            trg = qn._target(msg.oid, msg.iid, msg.rid);

            if (trg.type === TTYPE.root || _.isNil(msg.oid)) {
                rsp.status = RSP.badreq;  // Request Root is not allowed
            } else if (!trg.exist) {
                rsp.status = RSP.notfound;
            } else {
                rtn = false;
            }
            if (rtn) {
                qn.pubResponse(rsp);
                return;
            }
        } catch (e) {
            console.log('Bad command id: ' + rsp.cmdId + '. Decrption maybe fail');
        }
    }

    switch (rsp.cmdId) {
        case CMD.read:
            reqMsgHdlr = helpers._readReqHandler;
            break;
        case CMD.write:
            reqMsgHdlr = helpers._writeReqHandler;
            break;
        case CMD.writeAttrs:
            reqMsgHdlr = helpers._writeAttrsReqHandler;
            break;
        case CMD.discover:
            reqMsgHdlr = helpers._discoverReqHandler;
            break;
        case CMD.execute:
            reqMsgHdlr = helpers._executeReqHandler;
            break;
        case CMD.observe:
            reqMsgHdlr = helpers._observeReqHandler;
            break;
        case CMD.ping:
            reqMsgHdlr = helpers._pingReqHandler;
            break;
        default:
            reqMsgHdlr = helpers._unknownReqHandler;
    }

    process.nextTick(function () {
        reqMsgHdlr(qn, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            qn.pubResponse(rsp);
        });
    });
};

// [!] move to msg_handlers
helpers._rawHdlr = function (qn, topic, message, packet) {
    qn.decrypt(message, qn.clientId, function (err, decrypted) {
        if (err) {
            // log 'decrytion fails'
            console.log('decrytion fails');
        } else {
            message = decrypted;
            qn.emit('message', topic, message);

            var strmsg = (message instanceof Buffer) ? message.toString() : message,
                intf = mutils.slashPath(topic),
                jmsg,
                tid,
                _evt;

            if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
                jmsg = JSON.parse(strmsg);
                tid = jmsg.transId;
            }

            switch (intf) {
                case qn._subics.register:
                    if (typeof jmsg === 'object') {
                        _evt = 'register:rsp:' + tid;
                        if (jmsg.status == RSP.ok || jmsg.status == RSP.created)
                            helpers._lfUpdate(qn, true);
                        else
                            helpers._lfUpdate(qn, false);
                    }
                    break;
                case qn._subics.deregister:
                    _evt = 'deregister:rsp:' + tid;
                    break;
                case qn._subics.notify:
                    _evt = 'notify:rsp:' + tid;
                    break;
                case qn._subics.update:
                    _evt = 'update:rsp:' + tid;
                    break;
                case qn._subics.ping:
                    _evt = 'ping:rsp:' + tid;
                    break;
                case qn._subics.request:
                    _evt = '_request';  //  No callbacks
                    break;
                case qn._subics.announce:
                    _evt = 'announce';  //  No callbacks
                    jmsg = strmsg;
                    break;
            }

            if (!_.isUndefined(_evt)) {
                qn.emit(_evt, null, jmsg);
                if (!_.isUndefined(qn._tobjs[_evt])) {
                    clearTimeout(qn._tobjs[_evt]);
                    delete qn._tobjs[_evt];
                }
            }
        }
    });
};

module.exports = helpers;
