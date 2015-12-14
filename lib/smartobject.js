'use strict';

var _ = require('lodash'),
    Q = require('q'),
    IObject = require('./iobject'),
    mutils = require('./utils/mutils');

var defaultAttrs = {  // should be in 'oid' name space
        mute: true,
        cancel: true,
        pmin: 10,
        pmax: 60,
        gt: null,                 // only valid for number
        lt: null,                 // only valid for number
        step: null,               // only valid for number
        // lastReportedValue: xxx // optional
    };

function SmartObject(name, iObjects) {
    if (arguments.length === 1 && _.isObject(name)) {
        iObjects = name;
        name = undefined;
    }

    if (!_.isString(name) && !_.isUndefined(name))
        throw new TypeError('name of SmartObject should be a string.');

    this.name = name || 'default_so';
    this.node = null;
    this.attrs = {  // should be in 'oid' name space
        defaultAttrs: {
            mute: true,
            cancel: true,
            pmin: 10,
            pmax: 60,
            gt: null,                 // only valid for number
            lt: null,                 // only valid for number
            step: null,               // only valid for number
            // lastReportedValue: xxx // optional
        }
    };

    if (iObjects)
        this.addIObjects(iObjects);
}

SmartObject.prototype.objectList = function () {
    var excludeKeys = [ 'name', 'node', 'attrs' ],
        objList = [];

    _.forOwn(this, function (instances, id) {
        if (!_.isFunction(instances) && !_.includes(excludeKeys, id)) {
            _.forEach(instances, function (iobj) {
                if (iobj instanceof IObject)
                    objList.push({ oid: mutils.oidNumber(iobj.oid), iid: iobj.iid });
            });
        }
    });

    return objList;
};

SmartObject.prototype.getAttrs = function (oid) {
    oid = mutils.oidKey(oid);
    return this.attrs[oid];
};

SmartObject.prototype.setAttrs = function (oid, attrs) {
    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should a plain object');

    oid = mutils.oidKey(oid);
    this.attrs[oid] = _.assign({ mute: true, cancel: true }, attrs);
    return this;
};

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
    iObj.so = this;

    return iObj.iid;
};

SmartObject.prototype.dumpIObject = function (oid, iid, callback) {
    var deferred = Q.defer(),
        oidKey = mutils.oidKey(oid),
        obj = this[oidKey],
        dumpAllProms = [],
        dumped = {};

    if (!obj)
        deferred.resolve();

    if (_.isFunction(iid)) {
        callback = iid;
        iid = undefined;
    } else if (_.isString(iid)) {
        iid = _.isNaN(parseInt(iid)) ? iid : parseInt(iid);
    }

    if (_.isUndefined(iid) || _.isNull(iid)) {    // iid not assigned, dump all instances
        _.forOwn(obj, function (iobj, i_id) {
            dumpAllProms.push(
                iobj.dump().then(function (data) {
                    dumped[i_id] = data;
                })
            );
        });

        Q.all(dumpAllProms).done(function () {
            deferred.resolve(dumped);
        }, function (err) {
            deferred.reject(err);
        });

    } else if (!_.isString(iid) && !_.isNumber(iid)) {
        throw new TypeError('iid should be a string or a number.');
    } else if (!obj[iid]) {             // iid valid, but no such instance there
        deferred.resolve();
    } else {
        obj[iid].dump().done(function (data) {
            dumped = data;
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
    var oidKey;
    
    iid = iid || 0;

    if (_.isString(iid))
        iid = _.isNaN(parseInt(iid)) ? iid : parseInt(iid);

    if (!_.isString(iid) && !_.isNumber(iid))
        throw new TypeError('iid should be a string or a number.');

    oidKey = mutils.oidKey(oid);

    if (!this[oidKey])
        return;

    return this[oidKey][iid];
};

SmartObject.prototype.notify = function (oid, iid, rid, value) {
    if (!_.isString(oid) && !_.isNumber(oid))
        throw new TypeError('oid should be a string or a number.');

    if (arguments.length === 4) {
        if (!_.isString(iid) && !_.isNumber(iid))
            throw new TypeError('iid should be a string or a number.');
        if (!_.isString(rid) && !_.isNumber(rid))
            throw new TypeError('rid should be a string or a number.');

    } else if (arguments.length === 3) {
        value = rid;
        rid = undefined;

        if (!_.isString(iid) && !_.isNumber(iid))
            throw new TypeError('iid should be a string or a number.');

        if (!_.isPlainObject(value))
            throw new TypeError('value should be an object.');

    } else if (arguments.length === 2) {
        value = iid;
        iid = undefined;
        if (!_.isPlainObject(value))
            throw new TypeError('value should be an object.');
    } else if (arguments.length < 2) {
        throw new Error('Bad arguments.');
    }

    if (!this.node)
        return false;

    this.node.notify(oid, iid, rid, value);
    return true;
};

/*************************************************************************************************/
/*** MqttNode Prototype                                                                        ***/
/*************************************************************************************************/
var commonResrcOfOid = {
    'device': [ 'manuf', 'model', 'reboot', 'factoryReset', 'hwVer', 'swVer', 'availPwrSrc', 'pwrSrcVoltage' ],
    'connMonitor': [ 'ip', 'routeIp' ],
};

var templateOids = {
    'digitalInput': [ 'dInState', 'appType', 'sensorType' ],
    'digitalOutput': [ 'dOutState', 'appType' ],
    'analogInput': [ 'aInCurrValue', 'appType', 'sensorType' ],
    'analogOutput': [ 'aOutCurrValue', 'appType' ],
    'genericSensor': [ 'sensorValue', 'units', 'appType', 'sensorType' ],
    'illumSensor': [ 'sensorValue', 'units' ],
    'presenceSensor': [ 'dInState', 'sensorType', 'busyToClearDelay', 'clearToBusyDelay' ],
    'tempSensor': [ 'sensorValue', 'units' ],
    'humidSensor': [ 'sensorValue', 'units' ],
    'pwrMea': [ 'instActivePwr' ],
    'actuation': [ 'onOff', 'appType' ],
    'setPoint': [ 'setPointValue', 'units', 'appType' ],
    'loadCtrl': [ 'eventId', 'startTime', 'durationInMin' ],
    'lightCtrl': [ 'onOff' ],
    'pwrCtrl': [ 'onOff' ],
    'accelerometer': [ 'xValue', 'yValue', 'zValue', 'units' ],
    'magnetometer': [ 'xValue', 'yValue', 'zValue', 'units' ],
    'barometer': [ 'sensorValue', 'units' ]
};

SmartObject.getTemplate = function (tId) {
    var oidKey = mutils.oidKey(tId),
        devResrcs = commonResrcOfOid.device,
        connResrcs = commonResrcOfOid.connMonitor,
        tmpResrcs = templateOids[oidKey],
        resrcs,
        iobjs = [];

    if (_.isUndefined(tmpResrcs))
        throw new Error('No such template: ' + tId);

    // build common object
    _.forEach(commonResrcOfOid, function (rids, oid) {
        resrcs = [];
        _.forEach(rids, function (rid) {
            var defaultVal = mutils.getSpecificResrcChar(oid, rid).init;
            resrcs.push(_.set({}, rid, defaultVal));
        });
        iobjs.push(new IObject(oid, resrcs));
    });

    // build template object
    resrcs = [];

    _.forEach(tmpResrcs, function (rid) {
        var defaultVal = mutils.getSpecificResrcChar(oidKey, rid).init;
        resrcs.push(_.set({}, rid, defaultVal));
    });

    iobjs.push(new IObject(oidKey, resrcs));

    return new SmartObject(`tmpl_${oidKey}`, iobjs);
};

SmartObject.IObject = IObject;

module.exports = SmartObject;
