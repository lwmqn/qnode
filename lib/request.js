const _ = require('busyman')
const debug = require('debug')('mqtt-node:request')
const CNST = require('./constants')

function reqTimeout (qn, key, delay) {
  delay = delay || 10000 // default to 10 secs if not given
  qn._tobjs[key] = setTimeout(() => {
    qn.emit(key, null, { status: CNST.RSP.timeout })
    delete qn._tobjs[key]
  }, delay)
}

function req (qn, intf, data, callback) {
  let evt
  let err

  if (!qn.mc || !qn._connected) {
    process.nextTick(() => {
      if (_.isFunction(callback)) callback(new Error('No connection.'))
      else qn._emitError(err)
    })
  } else {
    data.transId = qn._nextTransId(intf)
    evt = `${intf}:rsp:${data.transId}`
    reqTimeout(qn, evt, CNST.REQ_TIMEOUT)

    qn.once(evt, (err, rsp) => {
      // if not timeout yet, clear it
      if (!_.isUndefined(qn._tobjs[evt])) {
        clearTimeout(qn._tobjs[evt])
        delete qn._tobjs[evt]
      }

      rsp.transId = (rsp.status === 408) ? data.transId : rsp.transId
      debug('RSP <-- %s, transId: %d, status: %s', intf, rsp.transId, rsp.status)

      if (_.isFunction(callback)) callback(err, rsp)
    })

    return qn.publish(qn._pubics[intf], data, (err, rsp) => {
      debug('REQ --> %s, transId: %d', intf, data.transId)
      // if mqtt publish fails
      if (err) qn.emit(evt, err, null)
    })
  }
}

module.exports = {
  register (qn, callback) {
    const objectList = qn.getSmartObject().objectList()
    const data = {
      transId: null,
      lifetime: qn.lifetime,
      objList: {},
      ip: qn.ip,
      mac: qn.mac,
      version: qn.version
    }

    objectList.forEach((rec) => (data.objList[rec.oid] = rec.iid))

    return req(qn, 'register', data, (err, rsp) => {
      if (!err && rsp.status === 201) { // Created
        process.nextTick(() => {
          qn.emit('registered')
        })
      }
      callback(err, rsp)
    })
  },
  deregister (qn, callback) {
    return req(qn, 'deregister', { transId: null }, (err, rsp) => {
      if (!err) {
        if (rsp.status === CNST.RSP.deleted) {
          qn.close(false, () => {
            process.nextTick(() => {
              qn.emit('deregistered')
            })
            callback(null, rsp)
          })
        } else {
          qn.close(true, () => {
            callback(null, rsp)
          })
        }
      } else {
        callback(err)
      }
    })
  },
  checkin: (qn, callback) => req(qn, 'schedule', { transId: null, sleep: false }, callback),
  checkout: (qn, duration, callback) => req(qn, 'schedule', { transId: null, sleep: true, duration }, callback),
  update: (qn, devAttrs, callback) => req(qn, 'update', _.omit(devAttrs, ['mac', 'clientId']), callback), // Change of mac address and clientId at runtime will be ignored
  notify (qn, data, callback) {
    return req(qn, 'notify', data, (err, rsp) => {
      if (rsp && rsp.cancel) qn.disableReport(data.oid, data.iid, data.rid)
      if (_.isFunction(callback)) callback(err, rsp)
    })
  },
  ping (qn, callback) {
    const txTime = _.now()
    const data = {
      transId: null
    }

    return req(qn, 'ping', data, (err, rsp) => {
      if (!err && rsp.status !== CNST.RSP.timeout) rsp.data = _.now() - txTime // rxTime - txTime
      if (_.isFunction(callback)) callback(err, rsp)
    })
  }
}
