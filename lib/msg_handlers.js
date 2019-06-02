const _ = require('busyman')
const debug = require('debug')('mqtt-node:msgHdlr')
const warn = require('debug')('mqtt-node:msgHdlr:warn')
const mutils = require('lwmqn-util')

const CNST = require('./constants')
const reporter = require('./reporter')

const { TTYPE } = CNST
const { CMDNAMES } = CNST
const { CMD } = CNST
const { RSP } = CNST

function invokeCb (qn, msg, status, data, cb) {
  if (_.isFunction(cb)) {
    process.nextTick(() => {
      cb(status, data)
    })
  }

  if (!_.isNil(data)) reporter.checkAndReportResource(qn, msg.oid, msg.iid, msg.rid, data)
}

module.exports = {
  _rawHdlr (qn, topic, message, packet) {
    if (!_.isFunction(qn.decrypt)) {
      qn.decrypt = function (msgStr, callback) {
        callback(null, msgStr)
      }
    }

    qn.decrypt(message, (err, decrypted) => {
      const intf = mutils.slashPath(topic)
      const isGeneric = !_.includes(qn._subics, intf)
      let jmsg
      let tid
      let _evt

      if (err) {
        warn('decrytion fails') // log 'decrytion fails'
        return
      }

      message = decrypted

      if (isGeneric) {
        setImmediate(() => {
          qn.emit('message', topic, message, packet)
        })
        return
      }

      let strmsg = (message instanceof Buffer) ? message.toString() : message

      if (strmsg[0] === '{' && strmsg[strmsg.length - 1] === '}') {
        try {
          jmsg = JSON.parse(strmsg)
          tid = jmsg.transId
        } catch (e) {
          warn(`Parse json fails. Interface: ${intf}. Message: ${strmsg}`) // log 'parse json fails'
          return
        }
      }
      switch (intf) {
        case qn._subics.register:
          if (_.isObject(jmsg)) {
            _evt = `register:rsp:${tid}`
            if (jmsg.status === RSP.ok || jmsg.status === RSP.created) qn._lifeUpdate(true)
            else qn._lifeUpdate(false)
          }
          break
        case qn._subics.deregister:
          _evt = `deregister:rsp:${tid}`
          break
        case qn._subics.schedule:
          _evt = `schedule:rsp:${tid}`
          break
        case qn._subics.notify:
          _evt = `notify:rsp:${tid}`
          break
        case qn._subics.update:
          _evt = `update:rsp:${tid}`
          break
        case qn._subics.ping:
          _evt = `ping:rsp:${tid}`
          break
        case qn._subics.request:
          _evt = '_request' //  No callbacks
          break
        case qn._subics.announce:
          _evt = 'announce' //  No callbacks
          jmsg = strmsg
          break
        default:
          break
      }

      if (!_.isUndefined(_evt)) {
        if (_evt === 'announce') {
          setImmediate(() => {
            qn.emit(_evt, jmsg)
          })
        } else {
          setImmediate(() => {
            qn.emit(_evt, null, jmsg) // err-first
          })
        }

        if (!_.isUndefined(qn._tobjs[_evt])) {
          clearTimeout(qn._tobjs[_evt])
          delete qn._tobjs[_evt]
        }
      }
    })
  },
  _reqHdlr (qn, msg) {
    let reqMsgHdlr
    let trg
    let rtn = true
    const rsp = { transId: null, cmdId: 'unknown', status: RSP.ok, data: null }

    if (_.isObject(msg)) {
      rsp.transId = msg.transId
      rsp.cmdId = msg.cmdId

      debug('REQ <-- %s, transId: %d', CMDNAMES[msg.cmdId], msg.transId)
    }

    if (rsp.cmdId !== CMD.ping && rsp.cmdId !== CMD.identify) {
      try {
        trg = qn._target(msg.oid, msg.iid, msg.rid) // { type, exist }

        if (trg.type === TTYPE.root || _.isNil(msg.oid)) rsp.status = RSP.badreq // Request Root is not allowed
        else if (!trg.exist) rsp.status = RSP.notfound
        else rtn = false
      } catch (err) {
        warn(err)
      }
    } else {
      rtn = false
    }

    if (rtn) {
      if (_.isObject(msg)) debug('RSP --> %s, transId: %d', CMDNAMES[msg.cmdId] || msg.cmdId, msg.transId)
      else debug('RSP --> %s, transId: %d', msg)
      qn.respond(rsp)
      return
    }

    switch (rsp.cmdId) {
      case CMD.read:
        reqMsgHdlr = handlers._readReqHandler
        break
      case CMD.write:
        reqMsgHdlr = handlers._writeReqHandler
        break
      case CMD.writeAttrs:
        reqMsgHdlr = handlers._writeAttrsReqHandler
        break
      case CMD.discover:
        reqMsgHdlr = handlers._discoverReqHandler
        break
      case CMD.execute:
        reqMsgHdlr = handlers._executeReqHandler
        break
      case CMD.observe:
        reqMsgHdlr = handlers._observeReqHandler
        break
      case CMD.ping:
        reqMsgHdlr = handlers._pingReqHandler
        break
      case CMD.identify:
        reqMsgHdlr = handlers._identifyReqHandler
        break
      default:
        reqMsgHdlr = handlers._unknownReqHandler
    }

    setImmediate(() => {
      reqMsgHdlr(qn, trg, msg, (status, data) => {
        rsp.status = status
        rsp.data = data

        debug('RSP --> %s, transId: %d, status: %d', CMDNAMES[rsp.cmdId], rsp.transId, rsp.status)

        qn.respond(rsp)
      })
    })
  },
  _readReqHandler (qn, trg, msg, cb) {
    // trg: { type, exist }
    const so = qn.getSmartObject()
    let status = RSP.content

    if (!trg.exist) {
      invokeCb(qn, msg, RSP.notfound, null, cb) // (status, data, cb)
    } else if (trg.type === TTYPE.obj) {
      so.dump(msg.oid, { restrict: true }, (err, data) => {
        if (err) status = RSP.inerr

        invokeCb(qn, msg, status, data, cb)
      })
    } else if (trg.type === TTYPE.inst) {
      so.dump(msg.oid, msg.iid, { restrict: true }, (err, data) => {
        if (err) status = RSP.inerr

        invokeCb(qn, msg, status, data, cb)
      })
    } else if (trg.type === TTYPE.rsc) {
      so.read(msg.oid, msg.iid, msg.rid, { restrict: true }, (err, data) => {
        if (err) {
          if (data === '_unreadable_' || data === '_exec_') status = RSP.notallowed
          else if (data === '_notfound_') status = RSP.notfound
          else status = RSP.inerr
        } else {
          status = RSP.content
        }
        invokeCb(qn, msg, status, data, cb)
      })
    } else {
      invokeCb(qn, msg, RSP.badreq, null, cb)
    }
  },
  _writeReqHandler (qn, trg, msg, cb) {
    const so = qn.getSmartObject()
    let status = RSP.changed

    if (trg.type === TTYPE.obj || trg.type === TTYPE.inst) { // [TODO] will support in the future
      invokeCb(qn, msg, RSP.notallowed, null, cb)
    } else if (trg.type === TTYPE.rsc) {
      so.write(msg.oid, msg.iid, msg.rid, msg.data, { restrict: true }, (err, data) => {
        if (err) {
          if (data === '_unwritable_' || data === '_exec_') status = RSP.notallowed
          else if (data === '_notfound_') status = RSP.notfound
          else status = RSP.inerr
        } else {
          status = RSP.changed
        }

        invokeCb(qn, msg, status, data, cb)
      })
    } else {
      invokeCb(qn, msg, RSP.badreq, null, cb)
    }
  },
  _executeReqHandler (qn, trg, msg, cb) {
    const so = qn.getSmartObject()
    let status

    if (trg.type !== TTYPE.rsc) {
      invokeCb(qn, msg, RSP.notallowed, null, cb)
    } else {
      so.exec(msg.oid, msg.iid, msg.rid, msg.data, (err, data) => {
        if (err) {
          if (data === '_unexecutable_') status = RSP.notallowed
          else if (data === '_notfound_') status = RSP.notfound
          else if (data === '_badarg_') status = RSP.badreq
          else status = RSP.inerr
        } else {
          status = RSP.changed
        }

        invokeCb(qn, msg, status, data, cb)
      })
    }
  },
  _writeAttrsReqHandler (qn, trg, msg, cb) {
    let attrs
    let badAttr = false
    const allowedAttrs = ['pmin', 'pmax', 'gt', 'lt', 'stp', 'cancel', 'pintvl']

    if (!_.isPlainObject(msg.data)) return cb(RSP.badreq, null)

    _.forEach(msg.data, (n, k) => {
      badAttr = badAttr || !_.includes(allowedAttrs, k)
    })

    if (badAttr) return cb(RSP.badreq, null)

    // The availability has been checked in _reqHdlr
    if (trg.type === TTYPE.obj) {
      if (msg.data.cancel) qn.disableReport(msg.oid)

      reporter.setAttrs(qn, msg.oid, msg.data)
    } else if (trg.type === TTYPE.inst) {
      if (msg.data.cancel) qn.disableReport(msg.oid, msg.iid)

      reporter.setAttrs(qn, msg.oid, msg.iid, msg.data)
    } else if (trg.type === TTYPE.rsc) {
      if (msg.data.cancel) qn.disableReport(msg.oid, msg.iid, msg.rid)

      reporter.setAttrs(qn, msg.oid, msg.iid, msg.rid, msg.data)
    }

    attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid, msg.rid))

    cb(RSP.changed, _.omit(attrs, ['mute', 'lastRpVal']))
  },
  _discoverReqHandler (qn, trg, msg, cb) {
    const so = qn.getSmartObject()
    let target
    let status = RSP.content
    let attrs
    const resrcList = {}

    if (trg.type === TTYPE.obj) {
      attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid))
      target = so.dumpSync(msg.oid)

      if (_.isObject(target)) {
        _.forEach(target, (inst, iid) => {
          resrcList[iid] = []
          _.forEach(inst, (r, rid) => {
            resrcList[iid].push(mutils.ridNum(msg.oid, rid))
          })
        })
        attrs.resrcList = resrcList
      } else {
        status = RSP.notfound
      }
    } else if (trg.type === TTYPE.inst) {
      attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid))
    } else if (trg.type === TTYPE.rsc) {
      attrs = _.cloneDeep(reporter.getAttrs(qn, msg.oid, msg.iid, msg.rid))
    }

    if (status === RSP.notfound) cb(status, null)
    else cb(status, _.omit(attrs, ['mute', 'lastRpVal']))
  },
  _observeReqHandler (qn, trg, msg, cb) {
    // msg.data = { option: 1 } to cancel reporting
    if (trg.type === TTYPE.obj) {
      cb(RSP.notallowed)
    } else if (trg.type === TTYPE.inst) {
      if (msg.data && msg.data.option) qn.disableReport(msg.oid, msg.iid)
      else qn.enableReport(msg.oid, msg.iid)

      cb(RSP.content)
    } else if (trg.type === TTYPE.rsc) {
      if (msg.data && msg.data.option) qn.disableReport(msg.oid, msg.iid, msg.rid)
      else qn.enableReport(msg.oid, msg.iid, msg.rid)

      cb(RSP.content)
    }
  },
  _pingReqHandler: (qn, trg, msg, cb) => cb(RSP.ok),
  _identifyReqHandler (qn, trg, msg, cb) {
    if (!qn) cb(RSP.notfound)
    else if (!_.isFunction(qn.identify)) cb(RSP.inerr)
    else {
      qn.identify((err) => {
        if (err) cb(RSP.inerr)
        else cb(RSP.ok)
      })
    }
  },
  _unknownReqHandler: (qn, trg, msg, cb) => cb(RSP.badreq)
}
