var _ = require('busyman'),
    mutils = require('lwmqn-util');

var CNST = require('./constants'),
    reporter = require('./reporter');

var TTYPE = CNST.TTYPE,
    ERR = CNST.ERR,
    CMD = CNST.CMD,
    RSP = CNST.RSP;

var handlers = {};

handlers._rawHdlr = function (qn, topic, message, packet) {

    qn.decrypt(message, qn.clientId, function (err, decrypted) {
        var strmsg,
            intf,
            jmsg,
            tid,
            _evt;

        if (err) {
            console.log('decrytion fails'); // log 'decrytion fails'
            return;
        }

        message = decrypted;
        qn.emit('message', topic, message);

        strmsg = (message instanceof Buffer) ? message.toString() : message;
        intf = mutils.slashPath(topic);

        if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
            jmsg = JSON.parse(strmsg);
            tid = jmsg.transId;
        }

        switch (intf) {
            case qn._subics.register:
                if (_.isObject(jmsg)) {
                    _evt = 'register:rsp:' + tid;
                    if (jmsg.status == RSP.ok || jmsg.status == RSP.created)
                        qn._lifeUpdate(true);
                    else
                        qn._lifeUpdate(false);
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
            qn.emit(_evt, null, jmsg);              // [TODO] check emit

            if (!_.isUndefined(qn._tobjs[_evt])) {
                clearTimeout(qn._tobjs[_evt]);
                delete qn._tobjs[_evt];
            }
        }

    });
};

handlers._reqHdlr = function (qn, msg) {
    var reqMsgHdlr,
        trg,
        rtn = true,
        rsp = {
            transId: null,
            cmdId: 'unknown',
            status: RSP.ok,
            data: null
        };

    if (_.isObject(msg)) {
        rsp.transId = msg.transId;
        rsp.cmdId = msg.cmdId;
    }

    if (rsp.cmdId !== CMD.ping) {
        try {
            trg = qn._target(msg.oid, msg.iid, msg.rid);

            if (trg.type === TTYPE.root || _.isNil(msg.oid))
                rsp.status = RSP.badreq;  // Request Root is not allowed
            else if (!trg.exist)
                rsp.status = RSP.notfound;
            else
                rtn = false;
        } catch (e) {
            console.log('Bad command id: ' + rsp.cmdId + '. Decrption may fail.');
        }
    }

    if (rtn) {
        qn.pubResponse(rsp);
        return;
    }

    switch (rsp.cmdId) {
        case CMD.read:
            reqMsgHdlr = handlers._readReqHandler;
            break;
        case CMD.write:
            reqMsgHdlr = handlers._writeReqHandler;
            break;
        case CMD.writeAttrs:
            reqMsgHdlr = handlers._writeAttrsReqHandler;
            break;
        case CMD.discover:
            reqMsgHdlr = handlers._discoverReqHandler;
            break;
        case CMD.execute:
            reqMsgHdlr = handlers._executeReqHandler;
            break;
        case CMD.observe:
            reqMsgHdlr = handlers._observeReqHandler;
            break;
        case CMD.ping:
            reqMsgHdlr = handlers._pingReqHandler;
            break;
        default:
            reqMsgHdlr = handlers._unknownReqHandler;
    }

    process.nextTick(function () {
        reqMsgHdlr(qn, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;
            qn.pubResponse(rsp);
        });
    });
};

/********************************************/
/*** MqttNode Request Handlers            ***/
/********************************************/
handlers._readReqHandler = function(qn, trg, msg, cb) {
    var status = RSP.content;

    function invokeCb(status, data, cb) {
        if (_.isFunction(cb)) {
            process.nextTick(function () {
                cb(status, data);
            });
        }

        if (!_.isNil(data))
            reporter.checkAndReportResource(qn, msg.oid, msg.iid, msg.rid, data);
    }

    // [TODO: smartobject] _dumpWithAcl(), _readResourceWithAcl()
    if (!trg.exist) {
        invokeCb(ERR.notfound, null, cb); // (status, data, cb)
    } else if (trg.type === TTYPE.obj) {
        qn._dumpWithAcl(msg.oid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.inst) {
        qn._dumpWithAcl(msg.oid, msg.iid, function (err, data) {
            cb(status, data);
        });
    } else if (trg.type === TTYPE.rsc) {
        qn._readResourceWithAcl(msg.oid, msg.iid, msg.rid, function (err, data) {
            if (err || data === '_unreadable_' || data === '_exec_')
                status = RSP.notallowed;

            cb(status, data);
        });
    } else {
        invokeCb(RSP.badreq, null, cb);
    }
};

handlers._writeReqHandler = function (qn, trg, msg, cb) {
    // [TODO] 1. allow object and instance
    //        2. tackle access control in the near future

    // [TODO: smartobject] _writeResourceWithAcl()

    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) {    // will support in the future
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.rsc) {
        qn._writeResourceWithAcl(msg.oid, msg.iid, msg.rid, msg.data, function (err, data) {
            if (err)
                cb(RSP.badreq, val);
            else if (data === '_unwritable_' && data === '_exec_')
                cb(RSP.notallowed, data);
            else
                cb(RSP.changed, data);
        });
    } else {
        invokeCb(RSP.badreq, null, cb);
    }
};

handlers._executeReqHandler = function (qn, trg, msg, cb) {
    // [TODO: smartobject] _execResourceWithAcl()
    if (trg.type !== TTYPE.rsc) {
        invokeCb(RSP.notallowed, null, cb);
    } else {
        qn._execResourceWithAcl(msg.oid, msg.iid, msg.rid, msg.data, function (status, data) {
            status = status || RSP.changed;
            cb(status, data);
        });
    }
};

handlers._writeAttrsReqHandler = function (qn, trg, msg, cb) {
    var attrs,
        badAttr = false,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp', 'cancel', 'pintvl' ];

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
            qn.disableReport(msg.oid);

        reporter.setAttrs(qn, msg.oid, msg.data);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data.cancel)
            qn.disableReport(msg.oid, msg.iid);

        reporter.setAttrs(qn, msg.oid, msg.iid, msg.data);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data.cancel)
            qn.disableReport(msg.oid, msg.iid, msg.rid);

        reporter.setAttrs(qn, msg.oid, msg.iid, msg.rid, msg.data);
    }

    attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid, msg.rid));

    cb(RSP.changed,  _.omit(attrs, [ 'mute', 'lastRpVal' ]));
};

handlers._discoverReqHandler = function (qn, trg, msg, cb) {
    var attrs,
        resrcList = {};

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid));
        _.forEach(trg.value, function (inst, iid) {
            resrcList[iid] = [];
            _.forEach(inst, function (r, rid) {
                resrcList[iid].push(mutils.ridNum(msg.oid, rid));
            });
        });
        attrs.resrcList = resrcList;
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid, msg.rid));
    }

    cb(RSP.content, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
};

handlers._observeReqHandler = function (qn, trg, msg, cb) {
    // msg.data = { option: 1 } to cancel reporting

    if (trg.type === TTYPE.obj) {
        cb(RSP.notallowed, null);
    } else if (trg.type === TTYPE.inst) {
        if (msg.data && msg.data.option)
            qn.disableReport(msg.oid, msg.iid);
        else
            qn.enableReport(msg.oid, msg.iid);

        cb(RSP.content);
    } else if (trg.type === TTYPE.rsc) {
        if (msg.data && msg.data.option)
            qn.disableReport(msg.oid, msg.iid, msg.rid);
        else
            qn.enableReport(msg.oid, msg.iid, msg.rid);

        cb(RSP.content);
    }
};

handlers._pingReqHandler = function (qn, trg, msg, cb) {
    cb(RSP.ok);
};

handlers._unknownReqHandler = function (qn, trg, msg, cb) {
    cb(RSP.badreq, null);
};

module.exports = handlers;
