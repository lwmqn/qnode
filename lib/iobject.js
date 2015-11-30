'use strict';

var _ = require('lodash'),
    mqut = require('./utils/mqutils'),
    MDEFS = require('./defs/mdefs');

function IObject(oid, ridSets) {    // prefer [ { rid: value }, { rid: value  } ]
    var self = this;

    this.oid = mqut.returnOidKey(oid);
    this.iid = null;
    this.attrs = undefined;         // attrs are used by observation
    this.owner = null;              // points to whom own this iObject

    this.resrcAttrs = {};           // this holds the attrs for each resource with rid as the key
    this.reporters = {};

    if (!_.isArray(ridSets))
        ridSets = [ ridSets ];

    ridSets.forEach(function (rset) {
        if (!_.isPlainObject(rset))
            throw new TypeError('rset in ridSets should be an object.');

        _.forEach(rset, function (rval, rkey) {
            var ridKey = mqut.returnRidKey(oid, rkey);
            self[ridKey] = rval;
        });
    });
}

IObject.prototype.dump = function () {  // dump data is orginized with ids in number
    var self = this,
        excludeKeys = [ 'oid', 'iid', 'attrs', 'owner', 'resrcAttrs', 'reporters' ],
        dumped = {};

    _.forOwn(this, function (n, rid) {
        var ridNum;
        if (!_.isFunction(n) && !_.includes(excludeKeys, rid)) {
            ridNum = mqut.returnRidNumber(self.oid, rid);
            dumped[ridNum] = self.readResrc(rid);
        }
    });

    return dumped;
};  // { ridNum1: value1, ridNum2: value2, ridNum3: value3 }

// [FIXME] Sync, Async?
IObject.prototype.readResrc = function (rid) {
    var ridKey = mqut.returnRidKey(this.oid, rid),
        resrc = this[ridKey],
        currentVal;

    if (_.isUndefined(resrc))
        return currentVal;

    if (_.isObject(resrc) && _.isFunction(resrc.read))
        currentVal = resrc.read();
    else
        currentVal = resrc;                             // [FIXME] resrc only supports values if it is an array

    if (!_.isUndefined(currentVal))
        this._checkAndReportResrc(ridKey, currentVal);  // if needed, this API will automatically report it

    return currentVal;
};  // value read, any type

// [FIXME] Sync, Async?
IObject.prototype.writeResrc = function (rid, value) {
    var ridKey = mqut.returnRidKey(this.oid, rid),
        resrc = this[ridKey],
        rCntrl = mqut.getResrcControl(this.oid, rid),
        currentVal;

    if (_.isUndefined(value))
        throw new TypeError('value should be given');

    if (_.isUndefined(resrc))
        return;

    if (rCntrl) {
        if (!rCntrl.access.match(/W/g))
            throw new TypeError('resource is unwritable');
        if (rCntrl.type)    // [TODO]
            throw new TypeError('invalid resource type');

    }


    if (_.isObject(resrc) && _.isFunction(resrc.write))
        currentVal = resrc.write(value);                // write should return wrote value
    else
        currentVal = this[ridKey] = value;

    this._checkAndReportResrc(ridKey, currentVal);

    return currentVal;
};  // value written, matched type

IObject.prototype.report = function (rid, value) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs,
        notified = false;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrcAttrs = this.getResrcAttrs(ridKey);

    if (this.owner)
        notified = this.owner.notify(this.oid, this.iid, this.rid, value);

    if (resrcAttrs && notified)     // if that resource is really there, must update the lastReportValue
        resrcAttrs.lastReportedValue = value;

    return this;
};

// initResrc(rid, value) or initResrc(rid, { read: readFn, write: writeFn })
IObject.prototype.initResrc = function (rid, value) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        isRWCallback = false;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;

    if (_.isUndefined(value))
        throw new TypeError('Initial value of the resource should be given');

    if (_.isObject(value)) {
        if (!_.has(value, 'read') && !_.has(value, 'write'))
            isRWCallback = false;
        else
            isRWCallback = true;

        if (isRWCallback) {
            if (!_.isFunction(value.read) || !_.isFunction(value.write))
                throw new TypeError('Both read and write callback functions should be given');

            this[ridKey].read = value.read;
            this[ridKey].write = value.write;
        } else {
            this[ridKey] = value;
        }
    } else {
        this[ridKey] = value;
    }

    return this;
};

IObject.prototype.getAttrs = function () {
    return this.attrs;
};

IObject.prototype.setAttrs = function (attrs) {
    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should a plain object');

    this.attrs = _.assign({ mute: true, cancel: true, lastReportedValue: null }, attrs);
    return this;
};

IObject.prototype.findAttrs = function () {
    if (_.isUndefined(this.attrs))
        return this.owner.attrs;

    return this.attrs;
};

IObject.prototype.getResrcAttrs = function (rid) {
    var ridKey = MDEFS.getRidKey(this.oid, rid);

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    return this.resrcAttrs[ridKey];
};

IObject.prototype.setResrcAttrs = function (rid, attrs) {
    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should a plain object');

    var ridKey = MDEFS.getRidKey(this.oid, rid);

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    this.resrcAttrs[ridKey] = _.assign({ mute: true, cancel: true, lastReportedValue: null }, attrs);
    return this;
};

IObject.prototype.findResrcAttrs = function (rid) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrcAttrs = this.resrcAttrs[ridKey];

    if (_.isUndefined(resrcAttrs))
        this.resrcAttrs[ridKey] = this.attrs;

    if (_.isUndefined(resrcAttrs))
        this.resrcAttrs[ridKey] = this.owner.attrs;

    return resrcAttrs;
};

IObject.prototype.removeResrcAttrs = function (rid) {
    var ridKey = MDEFS.getRidKey(this.oid, rid);

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    this.resrcAttrs[ridKey] = undefined;
    delete this.resrcAttrs[ridKey];
    return this;
};

IObject.prototype.enableResrcReporter = function (rid) {
    var self = this,
        ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs,
        resrcReporter,
        pminMs,
        pmaxMs;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;

    if (_.isUndefined(this[ridKey]))   // no need to enable reporter if resource is not found
        return this;

    resrcAttrs = this.getResrcAttrs(ridKey);

    if (!resrcAttrs) {
        resrcAttrs = this.findResrcAttrs();
        this.setResrcAttrs(ridKey, resrcAttrs);
        resrcAttrs = this.getResrcAttrs(ridKey);
    }

    resrcAttrs.cancel = false;
    resrcAttrs.mute = true;
    pminMs = resrcAttrs.pmin * 1000;
    pmaxMs = resrcAttrs.pmax * 1000;

    // reporter place holder
    this.reporters[ridKey] = this.reporters[ridKey] || { minRep: null, maxRep: null, poller: null };
    resrcReporter = this.reporters[ridKey];

    resrcReporter.poller = setInterval(function () {
        self._checkAndReportResrc(ridKey, self.readResrc(ridKey));
    }, resrcAttrs.pintvl || 200);

    // mute is use to control the poller
    resrcReporter.minRep = setTimeout(function () {
        resrcAttrs.mute = false;
        self.report(ridKey, self.readResrc(ridKey));
    }, pminMs);

    resrcReporter.maxRep = setInterval(function () {
        self.report(ridKey, self.readResrc(ridKey));
        resrcAttrs.mute = true;
        resrcReporter.minRep = setTimeout(function () {
            resrcAttrs.mute = false;
            self.report(ridKey, self.readResrc(ridKey));
        }, pminMs);
    }, pmaxMs);

    return this;
};

IObject.prototype.disableResrcReporter = function (rid) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs,
        resrcReporter;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrcAttrs = this.getResrcAttrs(ridKey);
    resrcReporter = this.reporters[ridKey];
    // if resrcAttrs was set before, dont delete it.
    resrcAttrs.cancel = true;
    resrcAttrs.mute = true;

    clearTimeout(resrcReporter.minRep);
    clearInterval(resrcReporter.maxRep);
    clearInterval(resrcReporter.poller);

    resrcReporter.minRep = null;
    resrcReporter.maxRep = null;
    return this;
};

/********************************************/
/*** IObject Protected Methods            ***/
/********************************************/
IObject.prototype._checkAndReportResrc = function (rid, currentValue) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrcAttrs = this.getResrcAttrs(ridKey);
    if (_.isUndefined(resrcAttrs))  // no attrs were set, no need to report
        return this;

    if (resrcAttrs.cancel || resrcAttrs.mute)
        return this;

    if (this._isResrcNeedReport(ridKey, currentValue)) {
        this.report(ridKey, currentValue);
    }

    return this;
};

IObject.prototype._isResrcNeedReport = function (rid, currentValue) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrcAttrs,
        needRepport = false,
        lastReportedValue,
        gt,
        lt,
        step;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrcAttrs = this.getResrcAttrs(ridKey);

    if (!resrcAttrs)
        return needRepport;

    lastReportedValue = resrcAttrs.lastReportedValue;
    gt = resrcAttrs.gt;
    lt = resrcAttrs.lt;
    step = resrcAttrs.step;

    if (!_.isNumber(currentValue)) {
        needRepport = !_.isEqual(lastReportedValue, currentValue);
    } else {
        if (!_.isUndefined(gt) && !_.isNull(gt)) {
            if (currentValue > gt)
                needRepport = true;
        }

        if (!_.isUndefined(lt) && !_.isNull(lt)) {
            if (currentValue < lt)
                needRepport = true;
        }

        if (!_.isUndefined(step) && !_.isNull(step)) {
            if (Math.abs(currentValue - lastReportedValue) > step)
                needRepport = true;
        }
    }

    return needRepport;
};

module.exports = IObject;
