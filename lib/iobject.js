'use strict';

var _ = require('lodash'),
    MDEFS = require('./defs/mdefs');

function IObject(oid, ridSets) {   // [TODO] prefer [ { rid: value }, { rid: value } ]
    var self = this,
        oidKey = MDEFS.getOidKey(oid);

    this.oid = _.isUndefined(oidKey) ? oid : oidKey;
    this.iid = null;
    this.attrs = undefined;     // attrs are used by observation
    this.owner = null;          // points to whom own this iObject

    this.resrcAttrs = {};       // this holds the attrs for each resource with rid as the key
    this.reporters = {};

    if (!_.isArray(ridSets))
        ridSets = [ ridSets ];

    ridSets.forEach(function (rset) {
        _.forEach(rset, function (rval, rkey) {
            var ridKey;

            if (!_.isNumber(rkey) && !_.isString(rkey))
                throw new TypeError('rid should be a number or a string');

            ridKey = MDEFS.getRidKey(oid, rkey);
            ridKey = _.isUndefined(ridKey) ? rkey : ridKey;
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
            ridNum = MDEFS.getRidNumber(self.oid, rid);
            ridNum = _.isUndefined(ridNum) ? rid : ridNum;

            dumped[ridNum] = self.readResrc(rid);
        }
    });


    return dumped;
};

IObject.prototype.readResrc = function (rid) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrc,
        currentVal;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrc = this[ridKey];

    if (_.isUndefined(resrc))
        return currentVal;

    if (_.isObject(resrc) && _.isFunction(resrc.read))
        currentVal = resrc.read();
    else
        currentVal = resrc;                             // [FIXME] resrc only supports values if it is an array

    if (!_.isUndefined(currentVal))
        this._checkAndReportResrc(ridKey, currentVal);  // if needed, this API will automatically report it

    return currentVal;
};

IObject.prototype.writeResrc = function (rid, data) {
    var ridKey = MDEFS.getRidKey(this.oid, rid),
        resrc,
        currentVal;

    ridKey = _.isUndefined(ridKey) ? rid : ridKey;
    resrc = this[ridKey];

    if (_.isUndefined(data))
        throw new TypeError('data should be given');

    if (_.isUndefined(resrc))
        return;

    if (_.isObject(resrc) && _.isFunction(resrc.write))
        currentVal = resrc.write(data);         // write should return wrote value
    else
        currentVal = this[ridKey] = data;

    this._checkAndReportResrc(ridKey, currentVal);

    return currentVal;
};

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
