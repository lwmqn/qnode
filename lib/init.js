const debug = require('debug')('mqtt-node:init')
const reporter = require('./reporter')
const msgHandlers = require('./msg_handlers')

// For Travis-CI Testing
var network
if (process.env.npm_lifecycle_event === 'test') {
  network = {
    get_active_interface (cb) {
      setTimeout(() => {
        cb(null, {
          ip_address: '192.168.1.99',
          gateway_ip: '192.168.1.1',
          mac_address: '00:11:22:AA:BB:CC'
        })
      }, 100)
    }
  }
} else {
  network = require('network')
}

module.exports = function (qn) {
  const { so } = qn
  let waitForIp = false

  if (!so.has('lwm2mServer', 0)) {
    debug('Initialize lwm2mServer object, lifetime: %d', qn.lifetime)

    so.init('lwm2mServer', 0, { // oid = 1
      shortServerId: null, // rid = 0
      lifetime: qn.lifetime, // rid = 1
      defaultMinPeriod: 1, // rid = 2
      defaultMaxPeriod: 60, // rid = 3
      regUpdateTrigger: { // rid = 8
        exec (cb) {
          const devAttrs = {
            transId: null,
            lifetime: qn.lifetime,
            ip: qn.ip,
            version: qn.version
          }

          qn._update(devAttrs, (err, rsp) => {
            if (err) console.warn(err)
          })
          cb(null)
        }
      }
    })
  }

  if (!so.has('device', 0)) {
    debug("Initialize device object, manuf: 'lwmqn', model: 'MQ1'")

    so.init('device', 0, { // oid = 3
      manuf: 'lwmqn', // rid = 0
      model: 'MQ1', // rid = 1
      reboot: { // rid = 4
        exec () {}
      },
      availPwrSrc: 0, // rid = 6
      pwrSrcVoltage: 5000, // rid = 7
      devType: 'generic', // rid = 17
      hwVer: 'v1', // rid = 18
      swVer: 'v1' // rid = 19
    })
  }

  if (!so.has('connMonitor', 0)) {
    debug('Initialize connMonitor object')

    so.init('connMonitor', 0, { // oid = 4
      ip: { // rid = 4
        read (cb) {
          network.get_active_interface((err, info) => {
            if (err) cb(err)
            else cb(null, info.ip_address)
          })
        }
      },
      routeIp: { // rid = 5
        read (cb) {
          network.get_active_interface((err, info) => {
            if (err) cb(err)
            else cb(null, info.gateway_ip)
          })
        }
      }
    })
  }

  debug('Prepare read/write methods')

  so.__read = so.read // __read is the original read
  so.read = function (oid, iid, rid, opt, callback) {
    if (typeof opt === 'function') {
      callback = opt
      opt = undefined
    }

    return so.__read(oid, iid, rid, opt, (err, data) => {
      if (so.isReadable(oid, iid, rid)) {
        setImmediate(() => {
          reporter.checkAndReportResource(qn, oid, iid, rid, data)
        })
      }

      callback(err, data)
    })
  }

  so.__write = so.write // __write is the original write
  so.write = function (oid, iid, rid, value, opt, callback) {
    if (typeof opt === 'function') {
      callback = opt
      opt = undefined
    }

    return so.__write(oid, iid, rid, value, opt, (err, data) => {
      if (so.isReadable(oid, iid, rid)) {
        setImmediate(() => {
          reporter.checkAndReportResource(qn, oid, iid, rid, data || value)
        })
      }

      callback(err, data)
    })
  }

  debug('Set up LWMQN interfaces')

  const eventList = [ 'register', 'deregister', 'schedule', 'notify', 'update', 'ping' ]
  eventList.forEach((intf) => {
    qn._pubics[intf] = `${intf}/${qn.clientId}`
    qn._subics[intf] = `${intf}/response/${qn.clientId}`
  })

  qn._pubics.response = `response/${qn.clientId}`
  qn._subics.request = `request/${qn.clientId}`
  qn._subics.announce = 'announce'
  qn._subicsStage1 = [qn._subics.register, qn._subics.deregister, qn._subics.request]
  qn._subicsStage2 = [qn._subics.notify, qn._subics.update, qn._subics.ping, qn._subics.announce, qn._subics.schedule]

  debug('Set up message handlers')

  qn.on('raw', (topic, message, packet) => {
    msgHandlers._rawHdlr(qn, topic, message, packet)
  })

  qn.on('_request', (err, msg) => {
    if (err) console.warn(err)
    // emit @ msgHandlers._rawHdlr with (err, jmsg)
    process.nextTick(() => { // function wrapped for MT7688 node@0.12.7
      msgHandlers._reqHdlr(qn, msg)
    })
  })

  qn.on('_unconnected', () => {
    qn._connected = false
  })

  qn.on('_connected', () => {
    qn._connected = true
    setTimeout(() => {
      if (qn._connected) _lwmqnSubAndReg(qn) // subscribe LWMQN interfaces and register to Shepherd
    }, 100)
  })

  // get ip and mac if not given
  if (!qn.ip || !qn.mac) {
    waitForIp = true

    network.get_active_interface((err, info) => {
      if (!err) {
        qn.ip = qn.ip || info.ip_address.toLowerCase()
        qn.mac = info.mac_address.toLowerCase()
        debug('ip: %s, mac: %s, router ip: %s', qn.ip, qn.mac, info.gateway_ip)
        debug('Local init done! Wait for LWMQN network establishment')
        setImmediate(() => {
          qn.emit('ready')
        })
      } else {
        qn._emitError(err)
      }
      waitForIp = false
    })
  }

  if (!waitForIp) {
    debug('Local init done! Wait for LWMQN network establishment')
    setImmediate(() => {
      qn.emit('ready')
    })
  }

  return true
}

function _lwmqnSubAndRegStage2 (qn, rsp) {
  return new Promise((resolve, reject) => {
    qn.mc.subscribe(qn._subicsStage2, (err) => {
      if (err) return reject(err)

      debug('LWMQN establishing stage 2: notify, update, ping, announce, and schedule interfaces subscribed')
      if (rsp.status === 200) { // already exists, ok
        debug('LWMQN establishing done! - Old client rejoined')
      } else if (rsp.status === 201) { // new created
        debug('LWMQN establishing done! - New client joined')
      }

      if ([200, 201].includes(rsp.status)) {
        qn.emit('_connect_cb', { err: null, rsp: rsp })
      }
    })
  })
}

function _lwmqnSubAndRegStage1 (qn) {
  return new Promise((resolve, reject) => {
    qn.mc.subscribe(qn._subicsStage1, (err) => {
      if (err) return reject(err)

      debug('LWMQN establishing stage 1: register, deregister, and request interfaces subscribed')
      qn.register((err, rsp) => {
        if (err) return reject(err)
        return resolve(rsp)
      })
    })
  })
}

function _lwmqnSubAndReg (qn) {
  return _lwmqnSubAndRegStage1(qn)
    .then(rsp => _lwmqnSubAndRegStage2(qn, rsp))
    .catch(err => qn.emit('_connect_cb', { err, rsp: null }))
}
