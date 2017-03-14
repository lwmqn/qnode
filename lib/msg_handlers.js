'use strict';

var _ = require('busyman'),
    debug = require('debug')('mqtt-node:msgHdlr'),
    warn = require('debug')('mqtt-node:msgHdlr:warn'),
    mutils = require('lwmqn-util');

var CNST = require('./constants'),
    reporter = require('./reporter');

var TTYPE = CNST.TTYPE,
    CMDNAMES = CNST.CMDNAMES,
    ERR = CNST.ERR,
    CMD = CNST.CMD,
    RSP = CNST.RSP;

var handlers = {};

handlers._rawHdlr = function (qn, topic, message, packet) {
    if (!_.isFunction(qn.decrypt)) {
        qn.decrypt = function (msgStr, callback) {
            callback(null, msgStr);
        };
    }

    qn.decrypt(message, function (err, decrypted) {
        var intf = mutils.slashPath(topic),
            isGeneric = !_.includes(qn._subics, intf),
            strmsg,
            jmsg,
            tid,
            _evt;

        if (err) {
            warn('decrytion fails');    // log 'decrytion fails'
            return;
        }

        message = decrypted;

        if (isGeneric) {
            setImmediate(function () {
                qn.emit('message', topic, message, packet);
            });
            return;
        }

        strmsg = (message instanceof Buffer) ? message.toString() : message;

        if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
            try {
                jmsg = JSON.parse(strmsg);
                tid = jmsg.transId;
            } catch (e) {
                warn('Parse json fails. Interface: ' + intf + '. Message: ' + strmsg);   // log 'parse json fails'
                return;
            }
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
            case qn._subics.schedule:
                _evt = 'schedule:rsp:' + tid;
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
                _evt = '_request';      //  No callbacks
                break;
            case qn._subics.announce:
                _evt = 'announce';      //  No callbacks
                jmsg = strmsg;
                break;
            default:
                break;
        }

        if (!_.isUndefined(_evt)) {
            if (_evt === 'announce') {
                setImmediate(function () {
                    qn.emit(_evt, jmsg);
                });
            } else {
                setImmediate(function () {
                    qn.emit(_evt, null, jmsg);  // err-first
                });
            }

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

        debug('REQ <-- %s, transId: %d', CMDNAMES[msg.cmdId], msg.transId);
    }

    if (rsp.cmdId !== CMD.ping && rsp.cmdId !== CMD.identify) {
        try {
            trg = qn._target(msg.oid, msg.iid, msg.rid);    // { type, exist }

            if (trg.type === TTYPE.root || _.isNil(msg.oid))
                rsp.status = RSP.badreq;  // Request Root is not allowed
            else if (!trg.exist)
                rsp.status = RSP.notfound;
            else
                rtn = false;
        } catch (err) {
            warn(err);
        }
    } else {
        rtn = false;
    }

    if (rtn) {
        if (_.isObject(msg))
            debug('RSP --> %s, transId: %d', CMDNAMES[msg.cmdId] || msg.cmdId, msg.transId);
        else
            debug('RSP --> %s, transId: %d', msg);
        qn.respond(rsp);
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
        case CMD.identify:
            reqMsgHdlr = handlers._identifyReqHandler;
            break;
        default:
            reqMsgHdlr = handlers._unknownReqHandler;
    }

    setImmediate(function () {
        reqMsgHdlr(qn, trg, msg, function (status, data) {
            rsp.status = status;
            rsp.data = data;

            debug('RSP --> %s, transId: %d, status: %d', CMDNAMES[rsp.cmdId], rsp.transId, rsp.status);

            qn.respond(rsp);
        });
    });
};

/********************************************/
/*** MqttNode Request Handlers            ***/
/********************************************/
handlers._readReqHandler = function(qn, trg, msg, cb) {
    // trg: { type, exist }
    var so = qn.getSmartObject(),
        status = RSP.content;

    if (!trg.exist) {

        invokeCb(qn, msg, RSP.notfound, null, cb); // (status, data, cb)

    } else if (trg.type === TTYPE.obj) {

        so.dump(msg.oid, { restrict: true }, function (err, data) {
            if (err)
                status = RSP.inerr;

            invokeCb(qn, msg, status, data, cb);
        });

    } else if (trg.type === TTYPE.inst) {

        so.dump(msg.oid, msg.iid, { restrict: true }, function (err, data) {
            if (err)
                status = RSP.inerr;

            invokeCb(qn, msg, status, data, cb);
        });

    } else if (trg.type === TTYPE.rsc) {

        so.read(msg.oid, msg.iid, msg.rid, { restrict: true }, function (err, data) {
            if (err) {
                if (data === '_unreadable_' || data === '_exec_')
                    status = RSP.notallowed;
                else if (data === '_notfound_')
                    status = RSP.notfound;
                else
                    status = RSP.inerr;
            } else {
                status = RSP.content;
            }
            invokeCb(qn, msg, status, data, cb);
        });

    } else {
        invokeCb(qn, msg, RSP.badreq, null, cb);
    }
};

handlers._writeReqHandler = function (qn, trg, msg, cb) {
    // trg: { type, exist }
    var so = qn.getSmartObject(),
        status = RSP.changed;

    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) {    // [TODO] will support in the future
        invokeCb(qn, msg, RSP.notallowed, null, cb);
    } else if (trg.type === TTYPE.rsc) {
        so.write(msg.oid, msg.iid, msg.rid, msg.data, { restrict: true }, function (err, data) {
            if (err) {
                if (data === '_unwritable_'|| data === '_exec_')
                    status = RSP.notallowed;
                else if (data === '_notfound_')
                    status = RSP.notfound;
                else
                    status = RSP.inerr;
            } else {
                status = RSP.changed;
            }

            invokeCb(qn, msg, status, data, cb);
        });

    } else {
        invokeCb(qn, msg, RSP.badreq, null, cb);
    }
};

handlers._executeReqHandler = function (qn, trg, msg, cb) {
    var so = qn.getSmartObject(),
        status;

    if (trg.type !== TTYPE.rsc) {
        invokeCb(qn, msg, RSP.notallowed, null, cb);
    } else {
        so.exec(msg.oid, msg.iid, msg.rid, msg.data, function (err, data) {
            if (err) {
                if (data === '_unexecutable_')
                    status = RSP.notallowed;
                else if (data === '_notfound_')
                    status = RSP.notfound;
                else if (data === '_badarg_')
                    status = RSP.badreq;
                else
                    status = RSP.inerr;

            } else {
                status = RSP.changed;
            }

            invokeCb(qn, msg, status, data, cb);
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
    var so = qn.getSmartObject(),
        target,
        status = RSP.content,
        attrs,
        resrcList = {};

    if (trg.type === TTYPE.obj) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid));
        target = so.dumpSync(msg.oid);

        if (_.isObject(target)) {
            _.forEach(target, function (inst, iid) {
                resrcList[iid] = [];
                _.forEach(inst, function (r, rid) {
                    resrcList[iid].push(mutils.ridNum(msg.oid, rid));
                });
            });
            attrs.resrcList = resrcList;
        } else {
            status = RSP.notfound;
        }
    } else if (trg.type === TTYPE.inst) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid));
    } else if (trg.type === TTYPE.rsc) {
        attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid, msg.rid));
    }

    if (status === RSP.notfound)
        cb(status, null);
    else
        cb(status, _.omit(attrs, [ 'mute', 'lastRpVal' ]));
};

handlers._observeReqHandler = function (qn, trg, msg, cb) {
    // msg.data = { option: 1 } to cancel reporting

    if (trg.type === TTYPE.obj) {
        cb(RSP.notallowed);
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

handlers._identifyReqHandler = function (qn, trg, msg, cb) {
    if (!qn)
        cb(RSP.notfound);
    else if (!_.isFunction(qn.identify))
        cb(RSP.inerr);
    else
        qn.identify(function (err) {
            if (err)
                cb(RSP.inerr);
            else
                cb(RSP.ok);
        });
};

handlers._unknownReqHandler = function (qn, trg, msg, cb) {
    cb(RSP.badreq);
};

function invokeCb(qn, msg, status, data, cb) {
    if (_.isFunction(cb)) {
        process.nextTick(function () {
            cb(status, data);
        });
    }

    if (!_.isNil(data))
        reporter.checkAndReportResource(qn, msg.oid, msg.iid, msg.rid, data);
}

module.exports = handlers;
