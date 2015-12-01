'use strict';

var _ = require('lodash'),
    Q = require('q'),
    IObject = require('./iobject'),
    mutils = require('./utils/mutils');

function SmartObject(name, iObjects) {
    if (!_.isString(name))
        throw new TypeError('name of SmartObject should be a string.');

    this.name = name;
    this.node = null;
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

SmartObject.prototype.addIObjects = function (iObjects) {
    var self = this,
        iids = [];

    //-------- insert multiple iObjects -----------
    if (_.isArray(iObjects)) {
        iObjects.forEach(function (iobj) {
            iids.push(self.addIObjects(iobj));
        });
        return iids;
    }

    //---------- insert single iObject ------------
    if (!(iObjects instanceof IObject))
        throw new TypeError('iObject should be an instance of IObject class.');

    var iObj = iObjects,
        oidKey = mutils.oidKey(iObj.oid),
        target = this[oidKey] = this[oidKey] || {},
        iidNum = 0;

    if (_.isNull(iObj.iid) || _.isUndefined(iObj.iid)) {
        while (target[iidNum]) {
            iidNum += 1;
        }
        iObj.iid = iidNum;
    } else if (!_.isUndefined(target[iObj.iid])) {
        throw new Error('iid conflict');
    }

    target[iObj.iid] = iObj;
    iObj.owner = this;

    return iObj.iid;
};

SmartObject.prototype.dumpIObject = function (oid, iid, callback) {
    var deferred = Q.defer(),
        oidKey = mutils.oidKey(oid),
        obj = this[oidKey],
        dumpAllProms = [],
        dumped = {};

    if (!obj) {
        deferred.resolve();

    } else if (_.isUndefined(iid)) {    // iid not assigned, dump all instances
        _.forOwn(obj, function (iobj, iid) {
            dumpAllProms.push(
                iobj.dump().then(function (data) {
                    dumped[iid] = data;
                })
            );
        });

        Q.all(dumpAllProms).done(function () {
            deferred.resolve(dumped);
        }, function (err) {
            deferred.reject(err);
        });

    } else if (!obj[iid]) {             // iid valid, but no such instance there
        deferred.resolve();

    } else {
        obj[iid].dump().done(function (data) {
            dumped[iid] = data;
            deferred.resolve(dumped);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.dump = function (callback) {
    var self = this,
        deferred = Q.defer(),
        excludeKeys = [ 'name', 'node', 'attrs' ],
        dumpAllProms = [],
        dumped = {};

    _.forOwn(this, function (n, oid) {
        if (!_.isFunction(n) && !_.includes(excludeKeys, oid)) {
            dumpAllProms.push(
                self.dumpIObject(oid).then(function (data) {
                    dumped[mutils.oidNumber(oid)] = data;
                })
            );
        }
    });

    Q.all(dumpAllProms).done(function () {
        deferred.resolve(dumped);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.findIObject = function (oid, iid) {
    var oidKey = mutils.oidKey(oid);

    iid = iid || 0;

    if (!this[oidKey])
        return;

    return this[oidKey][iid];
};

SmartObject.prototype.notify = function (oid, iid, rid, value) {
    if (!this.node)
        return false;

    this.node.notify(oid, iid, rid, value);
    return true;
};

module.exports = SmartObject;
