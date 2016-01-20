// new(n) v
// encrypt(msg) v v
// decrypt(msg) v v
// changeIp(ip)
// initResrc(...) v v
// getAttrs(...) v v
// setAttrs(...) v v
// readResrc(oid, iid, rid, callback) v v
// writeResrc(oid, iid, rid, value, callback) v v
// execResrc(oid, iid, rid, argus, callback) v v

// connect(url, opts) v v
// close(callback) v v

// pubRegister(callback) v v
// pubDeregister(callback) v v
// pingServer(callback) v v
// pubUpdate(devAttrs, callback) v v
// pubResponse(rsp, callback) v v

// publish(topic, message, options, callback) v v
// subscribe(topic, qos, callback)

// _pubReq(intf, data, callback) v v
// _target(oid, iid, rid) v v
// _has(oid, iid, rid) v v
// _id(intf) -> _nextTransId v v
// _dumpObj(...) v
// _rd(chk, oid, iid, rid, callback) v v

// _rawHdlr(conn, topic, message) v
// _reqHdlr(msg) v
//      many request handlers
// _lfUp(enable) v
// _chkResrc(oid, iid, rid, currVal) v
// enableReport(oid, iid, rid, attrs) v v
// disableReport(oid, iid, rid) v v
// _tmout(key, delay) -> _reqTimeout v v
// _path(path)



// _readResrc = function (chk, oid, iid, rid, callback) v v
