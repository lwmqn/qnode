
const _ = require('busyman')
const mutils = require('lwmqn-util')
const { TTYPE } = require('./constants')

const reporter = {}

reporter.enableReport = function (qn, oid, iid, rid) {
  const trg = qn._target(oid, iid, rid) // { type, exist }
  const so = qn.getSmartObject()
  const rAttrs = reporter.getAttrs(qn, oid, iid, rid) // { pmin, pmax, mute, cancel, lastRpVal }
  const okey = mutils.oidKey(oid)
  let rkey; let rpid; let pmin; let pmax; let rRpt; let dumper; let
    notifier

  if (!trg.exist || !so) return false

  if (trg.type === TTYPE.obj) {
    rpid = okey

    dumper = function (cb) {
      so.dump(oid, { restrict: true }, cb)
    }

    notifier = {
      oid: mutils.oidNum(oid),
      data: null
    }
  } else if (trg.type === TTYPE.inst) {
    rpid = `${okey}:${iid}`

    dumper = function (cb) {
      so.dump(oid, iid, { restrict: true }, cb)
    }

    notifier = {
      oid: mutils.oidNum(oid),
      iid,
      data: null
    }
  } else if (trg.type === TTYPE.rsc) {
    rkey = mutils.ridKey(oid, rid)

    rpid = `${okey}:${iid}:${rkey}`

    dumper = function (cb) {
      so.read(oid, iid, rid, { restrict: true }, cb)
    }

    notifier = {
      oid: mutils.oidNum(oid),
      iid,
      rid: mutils.ridNum(rid),
      data: null
    }
  } else {
    return false
  }

  pmin = rAttrs.pmin * 1000
  pmax = rAttrs.pmax * 1000

  rAttrs.cancel = false
  rAttrs.mute = true
  qn._reporters[rpid] = { min: null, max: null, poller: null }
  rRpt = qn._reporters[rpid]

  // WE DONT USE POLLER AT THIS MOMENT, BUT KEEP THIS SNIPPET HERE
  // if (trg.type === TTYPE.rsc) {
  //     rRpt.poller = setInterval(function () {
  //         so.read(oid, iid, rid, { restrict: true });  // just read it, reporter._checkAndReportResrc() will be invoked
  //     }, rAttrs.pintvl || 500);
  // }

  rRpt.min = setTimeout(() => {
    if (pmin === 0) { // if no pmin, just report at pmax triggered
      rAttrs.mute = false
    } else {
      dumper((err, val) => {
        if (err) console.warn(err)
        rAttrs.mute = false
        notifier.data = val
        qn.notify(notifier, () => {})
      })
    }
  }, pmin)

  rRpt.max = setInterval(() => {
    rAttrs.mute = true
    dumper((err, val) => {
      if (err) console.warn(err)
      rAttrs.mute = false
      notifier.data = val
      qn.notify(notifier, () => {})
    })

    if (!_.isNil(rRpt.min)) clearTimeout(rRpt.min)

    rRpt.min = null
    rRpt.min = setTimeout(() => {
      if (pmin === 0) {
        rAttrs.mute = false
      } else {
        dumper((err, val) => {
          if (err) console.warn(err)
          rAttrs.mute = false
          notifier.data = val
          qn.notify(notifier, () => {})
        })
      }
    }, pmin)
  }, pmax)

  return true
}

reporter.disableReport = function (qn, oid, iid, rid) {
  const trg = qn._target(oid, iid, rid) // { type, exist }
  const rAttrs = reporter.getAttrs(qn, oid, iid, rid) // { pmin, pmax, mute, cancel, lastRpVal }
  const okey = mutils.oidKey(oid)
  let rpid
  let rRpt

  if (!trg.exist) return false

  if (trg.type === TTYPE.obj) rpid = okey
  else if (trg.type === TTYPE.inst) rpid = `${okey}:${iid}`
  else if (trg.type === TTYPE.rsc) rpid = `${okey}:${iid}:${mutils.ridKey(oid, rid)}`
  else return false

  rRpt = qn._reporters[rpid]

  if (_.isNull(rAttrs)) return false

  if (_.isUndefined(rRpt)) return true

  rAttrs.cancel = true
  rAttrs.mute = true

  clearTimeout(rRpt.min)
  clearInterval(rRpt.max)
  clearInterval(rRpt.poller)

  rRpt.min = null
  rRpt.max = null
  rRpt.poller = null
  rRpt = null
  delete qn._reporters[rpid]

  return true
}

reporter.clear = function (qn) {
  const repAttrs = qn._repAttrs

  _.forEach(repAttrs, (rAttrs, rpid) => {
    // rAttrs =  rpid: { pmin, pmax, mute, cancel, lastRpVal }
    let rRpt = qn._reporters[rpid]

    rAttrs.cancel = true
    rAttrs.mute = true

    if (!_.isNil(rRpt)) {
      clearTimeout(rRpt.min)
      clearInterval(rRpt.max)
      clearInterval(rRpt.poller)
      rRpt.min = null
      rRpt.max = null
      rRpt.poller = null
    }

    rRpt = null
    delete qn._reporters[rpid]
  })

  return true
}

reporter.getAttrs = function (qn, oid, iid, rid) {
  const trg = qn._target(oid, iid, rid) // { type, exist }
  const so = qn.getSmartObject()
  let key
  let defaultAttrs

  if (!trg.exist) return undefined

  key = mutils.oidKey(oid)
  defaultAttrs = {
    pmin: so.get('lwm2mServer', 0, 'defaultMinPeriod'),
    pmax: so.get('lwm2mServer', 0, 'defaultMaxPeriod'),
    mute: true,
    cancel: true,
    lastRpVal: null
  }

  if (trg.type === TTYPE.inst) key = `${key}:${iid}`
  else if (trg.type === TTYPE.rsc) key = `${key}:${iid}:${mutils.ridKey(oid, rid)}`

  qn._repAttrs[key] = qn._repAttrs[key] || defaultAttrs

  return qn._repAttrs[key]
}

reporter.setAttrs = function (qn, oid, iid, rid, attrs) {
  const okey = mutils.oidKey(oid)
  let rkey
  let key
  let trg

  if (arguments.length === 5) {
    rkey = mutils.ridKey(oid, rid)
    key = `${okey}:${iid}:${rkey}`
  } else if (arguments.length === 4) {
    attrs = rid
    rid = undefined
    key = `${okey}:${iid}`
  } else if (arguments.length === 3) {
    attrs = iid
    iid = undefined
  }

  if (!_.isPlainObject(attrs)) throw new TypeError('attrs should be given as an object.')

  trg = qn._target(oid, iid, rid)

  if (!trg.exist) return false

  // attrs with default settings
  attrs.pmin = _.isNumber(attrs.pmin) ? attrs.pmin : qn.so.get('lwm2mServer', 0, 'defaultMinPeriod')
  attrs.pmax = _.isNumber(attrs.pmax) ? attrs.pmax : qn.so.get('lwm2mServer', 0, 'defaultMaxPeriod')
  attrs.mute = _.isBoolean(attrs.mute) ? attrs.mute : true
  attrs.cancel = _.isBoolean(attrs.cancel) ? attrs.cancel : true
  attrs.lastRpVal = attrs.lastRpVal || null
  qn._repAttrs[key] = attrs

  return true
}

reporter.checkAndReportResource = function (qn, oid, iid, rid, currVal) {
  const rAttrs = reporter.getAttrs(qn, oid, iid, rid) // { pmin, pmax, mute, cancel, lastRpVal }
  let rpt = false
  let gt; let lt; let step; let
    lastrp

  if (_.isNil(rAttrs)) return false

  gt = rAttrs.gt
  lt = rAttrs.lt
  step = rAttrs.stp
  lastrp = rAttrs.lastRpVal

  if (rAttrs.cancel || rAttrs.mute) return false

  if (_.isObject(currVal)) {
    if (_.isObject(rAttrs.lastRpVal)) {
      _.forEach(rAttrs.lastRpVal, (v, k) => {
        rpt = rpt || (v !== rAttrs.lastRpVal[k])
      })
    } else {
      rpt = true
    }
  } else if (!_.isNumber(currVal)) {
    rpt = (rAttrs.lastRpVal !== currVal)
  } else {
    if (_.isNumber(gt) && _.isNumber(lt) && lt > gt) {
      rpt = (lastrp !== currVal) && (currVal > gt) && (currVal < lt)
    } else {
      rpt = _.isNumber(gt) && (lastrp !== currVal) && (currVal > gt)
      rpt = rpt || (_.isNumber(lt) && (lastrp !== currVal) && (currVal < lt))
    }

    if (_.isNumber(step)) {
      rpt = rpt || (Math.abs(currVal - lastrp) >= step)
    }
  }

  if (rpt) {
    qn.notify({
      oid, iid, rid, data: currVal
    }, () => {})
    rAttrs.lastRpVal = currVal
  }

  return rpt
}

module.exports = reporter
