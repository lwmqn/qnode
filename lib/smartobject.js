'use strict';

var _ = require('lodash'),
    MDEFS = require('./defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID;

function SmartObject(name, iObjects) {
    this.name = name;
    this.owner = null;
    this.attrs = {
        mute: true,
        cancel: true,
        pmin: 10,
        pmax: 60,
        gt: null,                 // only valid for number
        lt: null,                 // only valid for number
        step: null,               // only valid for number
        // lastReportedValue: xxx // optional
    };

    if (iObjects)
        this.addIObjects(iObjects);
}

SmartObject.prototype.notify = function (oid, iid, rid, value) {
    if (!this.owner)
        return false;

    this.owner.notify(oid, iid, rid, value);
    return true;
};

SmartObject.prototype.dump = function () {
    var self = this,
        excludeKeys = [ 'name', 'owner', 'attrs' ],
        dumped = {};

    _.forOwn(this, function (n, oid) {
        var oidNum;

        if (!_.isFunction(n) && !_.includes(excludeKeys, oid)) {
            oidNum = MDEFS.getOidNumber(oid);
            oidNum = _.isUndefined(oidNum) ? oid : oidNum;
            dumped[oidNum] = self.dumpIObject(oid);
        }
    });

    return dumped;
};

SmartObject.prototype.dumpIObject = function (oid, iid) {
    var oidKey = MDEFS.getOidKey(oid),
        obj,
        dumped = {};

    oidKey = _.isUndefined(oidKey) ? oid : oidKey;
    obj = this[oidKey];

    if (!obj)
        return;

    if (_.isUndefined(iid)) {   // iid not assigned, dump all instances
        _.forOwn(obj, function (iobj, iid) {
            dumped[iid] = iobj.dump();
        });
    } else {
        if (!obj[iid])
            return;

        dumped[iid] = obj[iid].dump();
    }
    return dumped;
};

SmartObject.prototype.addIObjects = function (iObjects) {
    var self = this,
        iObject,
        oidKey,
        target,
        iid,
        iidNum,
        iids = [];

    if (_.isArray(iObjects)) {                   // insert multiple iObjects
        iObjects.forEach(function (obj) {
            iids.push(self.addIObjects(obj));
        });
        return iids;
    }

    iObject = iObjects;
    oidKey = MDEFS.getOidKey(iObject.oid);
    oidKey = _.isUndefined(oidKey) ? iObject.oid : oidKey;

    target = this[oidKey] = this[oidKey] || {};
    iid = iObject.iid;
    iidNum = 0;

    if (_.isUndefined(iid) ||_.isNull(iid) ) {
        while (target[iidNum]) {
            iidNum += 1;
        }
    } else {
        if (!_.isUndefined(target[iid]))
            throw new Error('iid conflict');
        else
            iidNum = iid;
    }

    target[iidNum] = iObject;
    iObject.iid = iidNum;
    iObject.owner = this;

    return iidNum;
};

SmartObject.prototype.findIObject = function (oid, iid) {
    var oidKey = MDEFS.getOidKey(oid);

    oidKey = _.isUndefined(oidKey) ? oid : oidKey;
    iid = iid || 0;

    if (!this[oidKey])
        return;

    return this[oidKey][iid];
};

module.exports = SmartObject;
