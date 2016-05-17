var CONST = require('./constants'),
    TTYPE = CONST.TTYPE,
    CMD = CONST.CMD,
    TAG = CONST.TAG,
    ERR = CONST.ERR,
    RSP = CONST.RSP;

var reqTimeout = CONST.REQ_TIMEOUT,
    privateListeners = {};

var helpers = {};

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
        qn.once(evt, callback);
    }

    return qn.publish(qn._pubics[intf], data, function (err, rsp) {
        if (err) {
            qn.emit(evt, err, null);
            if (!_.isUndefined(qn._tobjs[evt])) {
                clearTimeout(qn._tobjs[evt]);
                delete qn._tobjs[evt];
            }
        }
    });
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
        rpt = false;

    if (_.isNil(rAttrs))
        return false;

    var gt = rAttrs.gt,
        lt = rAttrs.lt,
        step = rAttrs.stp,
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
            // log it
            console.log('Bad command id: ' + rsp.cmdId + '. Decrption maybe fail');
            // console.log(e);
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
            break;
    }

    process.nextTick(function () {
        reqMsgHdlr(qn, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            qn.pubResponse(rsp);
        });
    });
};

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
                            _lfUpdate(qn, true);
                        else
                            _lfUpdate(qn, false);
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

/********************************************/
/*** MqttNode Request Handlers            ***/
/********************************************/
helpers._readReqHandler = function(node, trg, msg, cb) {
    var status = RSP.content;

    if (trg.type === TTYPE.obj) {
        node._dumpObj(msg.oid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.inst) {
        node._dumpObj(msg.oid, msg.iid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.rsc) {
        node._readResrc(msg.oid, msg.iid, msg.rid, function (err, data) {
            if (err === ERR.unreadable)
                status = RSP.notallowed;

            cb(status, data);
        });
    }
};

helpers._writeReqHandler = function (node, trg, msg, cb) {
    // [TODO] 1. allow object and instance
    //        2. tackle access control in the near future

    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) {    // will support in the future
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.rsc) {
        node._writeResrc(true, msg.oid, msg.iid, msg.rid, msg.data, function (err, val) {
            if (err) {
                if (err === ERR.badtype)
                    cb(RSP.badreq, val);
                else
                    cb(RSP.notallowed, val);
            } else {
                cb(RSP.changed, val);
            }
        });
    }
};

helpers._discoverReqHandler = function (node, trg, msg, cb) {
    var attrs,
        resrcList = {};

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid));
        _.forEach(trg.value, function (inst, iid) {
            resrcList[iid] = [];
            _.forEach(inst, function (r, rid) {
                resrcList[iid].push(mutils.ridNum(msg.oid, rid));
            });
        });
        attrs.resrcList = resrcList;
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid, msg.rid));
    }

    cb(RSP.content, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
};

helpers._writeAttrsReqHandler = function (node, trg, msg, cb) {
    var badAttr = false,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp', 'cancel', 'pintvl' ],
        attrs;

    if (!_.isPlainObject(msg.data)) {
        cb(RSP.badreq, null);
        return;
    }

    _.forEach(msg.data, function (n, k) {
        badAttr = badAttr || !_.includes(allowedAttrs, k);
    });

    if (badAttr) {
        cb(RSP.badreq, null);
        return;
    }

    // The availability has been checked in _reqHdlr
    if (trg.type === TTYPE.obj) {
        if (msg.data.cancel)
            node.disableReport(msg.oid);
        node._setAttrs(msg.oid, msg.data);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid);
        node._setAttrs(msg.oid, msg.iid, msg.data);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data.cancel)
            node.disableReport(msg.oid, msg.iid, msg.rid);
        node._setAttrs(msg.oid, msg.iid, msg.rid, msg.data);
    }

    attrs = _.cloneDeep(node._getAttrs(msg.oid, msg.iid, msg.rid));

    cb(RSP.changed,  _.omit(attrs, [ 'mute', 'lastRpVal' ]));
};

helpers._executeReqHandler = function (node, trg, msg, cb) {
    if (trg.type !== TTYPE.rsc) {
        cb(RSP.notallowed, null);
    } else {
        node.execResrc(msg.oid, msg.iid, msg.rid, msg.data, function (status, data) {
            status = status || RSP.changed;
            cb(status, data);
        });
    }
};

helpers._observeReqHandler = function (node, trg, msg, cb) {
    // msg.data = { option: 1 } to cancel reporting

    if (trg.type === TTYPE.obj) {
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data && msg.data.option)
            node.disableReport(msg.oid, msg.iid);
        else
            node.enableReport(msg.oid, msg.iid);

        cb(RSP.content);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data && msg.data.option)
            node.disableReport(msg.oid, msg.iid, msg.rid);
        else
            node.enableReport(msg.oid, msg.iid, msg.rid);

        cb(RSP.content);
    }
};

helpers._pingReqHandler = function (node, trg, msg, cb) {
    cb(RSP.ok);
};

helpers._unknownReqHandler = function (node, trg, msg, cb) {
    cb(RSP.badreq, null);
};

module.exports = helpers;
