'use strict';

const _ = require('lodash'),
      Q = require('q'),
      mutils = require('./utils/mutils');

function IObject(oid, resrcItems) {
    // resrcItems prefer: [ { rid: rvalue }, { rid: rvalue  } ]
    var self = this;

    this.oid = mutils.oidKey(oid);
    this.iid = null;
    this.attrs = undefined;         // attrs are used for observation
    this.so = null;                 // point to smart object who own this iObject

    this.resrcAttrs = {};           // hold the attrs for each resource with rid as the key
    this.reporters = {};

    if (!_.isArray(resrcItems))
        resrcItems = [ resrcItems ];

    resrcItems.forEach(function (rset) {
        if (!_.isPlainObject(rset))
            throw new TypeError('rset in resrcItems should be an object.');

        _.forEach(rset, function (rval, rid) {
            self.initResrc(rid, rval);
        });
    });
}

// initResrc(rid, value) or initResrc(rid, { read: readFn, write: writeFn })
// [TODO] initResrc(rid, { exec: fn })
IObject.prototype.initResrc = function (rid, value) {
    var ridKey = mutils.ridKey(this.oid, rid),
        isRWCallback = false;

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
            this[ridKey] = null;
            this[ridKey] = {
                read: value.read,
                write: value.write
            };
        } else {
            this[ridKey] = value;
        }
    } else {
        this[ridKey] = value;
    }

    return this;
};

IObject.prototype.readResrc = function (rid, callback) {
    var self = this,
        deferred = Q.defer(),
        ridKey = mutils.ridKey(this.oid, rid),
        resrc = this[ridKey];

    if (_.isUndefined(resrc)) {
        deferred.resolve(resrc);
    } else if (_.isObject(resrc) && _.isFunction(resrc.read)) {
        resrc.read(function (err, val) {
            if (err) {
                deferred.reject(err);
            } else {
                self._checkAndReportResrc(ridKey, val); // if needed, this API will automatically report it
                deferred.resolve(val);
            }
        });
    } else {
        this._checkAndReportResrc(ridKey, resrc);
         // [FIXME] resrc only supports primitive values if it is an array
        deferred.resolve(resrc);
    }

    return deferred.promise.nodeify(callback);

};  // value read, any type

IObject.prototype.writeResrc = function (rid, value, callback) {
    var self = this,
        deferred = Q.defer(),
        ridKey = mutils.ridKey(this.oid, rid),
        resrc = this[ridKey],
        rCntrl = mutils.getSpecificResrcChar(this.oid, rid),
        currentVal;

    if (_.isUndefined(value)) {
        deferred.reject(new TypeError('value should be given'));
    } else if (_.isUndefined(resrc)) {
        deferred.resolve(resrc);
    } else {

        if (_.isObject(resrc) && _.isFunction(resrc.write)) {
            resrc.write(value, function (err, val) {
                if (err) {
                    deferred.reject(err);
                } else {
                    self._checkAndReportResrc(ridKey, val); // if needed, this API will automatically report it
                    deferred.resolve(val);
                }
            });
        } else {
            if (rCntrl && !rCntrl.access.match(/W/g))
                deferred.reject(new TypeError('resource is unwritable'));

            // [FIXME] Do we need type checking?
            resrc = this[ridKey] = value;
            this._checkAndReportResrc(ridKey, resrc);
            deferred.resolve(resrc);
        }
    }

    return deferred.promise.nodeify(callback);
};  // value written, matched type

IObject.prototype.dump = function (callback) {  // dump data is orginized with ids in number
    var self = this,
        deferred = Q.defer(),
        excludeKeys = [ 'oid', 'iid', 'attrs', 'so', 'resrcAttrs', 'reporters' ],
        readAllProms = [],
        dumped = {};

    _.forOwn(this, function (n, ridKey) {
        var ridNum;

        if (!_.isFunction(n) && !_.includes(excludeKeys, ridKey)) {
            ridNum = mutils.ridNumber(self.oid, ridKey);
            readAllProms.push(
                self.readResrc(ridKey).then(function (val) {
                    dumped[ridNum] = val;
                    return val;
                })
            );
        }
    });

    Q.all(readAllProms).done(function () {
        deferred.resolve(dumped);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};  // { ridNum1: value1, ridNum2: value2, ridNum3: value3 }

// var rpc = 0; // only for test purpose
IObject.prototype.report = function (rid, value) {
    var ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs = this.getResrcAttrs(ridKey),
        notified = false;

    if (this.so) // {
        notified = this.so.notify(this.oid, this.iid, this.rid, value);
    // } else {  // only for test purpose
    //     console.log('report triggered ' + rpc++ );
    //     console.log(value);
    //     console.log(resrcAttrs.lastReportedValue);
    //     resrcAttrs.lastReportedValue = value;
    //     return 'ut_reported';
    // }

    if (resrcAttrs && notified)     // if that resource is really there, must update the lastReportValue after notified
        resrcAttrs.lastReportedValue = value;

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
    var attrs;

    if (!_.isUndefined(this.attrs) && !_.isNull(this.attrs)) {
        attrs = this.attrs;
    } else {
        if (!this.so)
            return;

        attrs = this.so.attrs[this.oid];
        if (_.isUndefined(attrs))
            attrs = this.so.attrs[this.oid] = _.cloneDeep(this.so.attrs.defaultAttrs);

        this.attrs = _.cloneDeep(attrs);
    }

    return this.attrs;
};

IObject.prototype.getResrcAttrs = function (rid) {
    var ridKey = mutils.ridKey(this.oid, rid);

    return this.resrcAttrs[ridKey];
};

IObject.prototype.setResrcAttrs = function (rid, attrs) {
    if (!_.isPlainObject(attrs))
        throw new TypeError('attrs should a plain object');

    var ridKey = mutils.ridKey(this.oid, rid);

    this.resrcAttrs[ridKey] = _.assign({ mute: true, cancel: true, lastReportedValue: null }, attrs);
    return this;
};

IObject.prototype.findResrcAttrs = function (rid) {
    var ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs;

    resrcAttrs = this.resrcAttrs[ridKey];

    if (_.isUndefined(resrcAttrs))
        resrcAttrs = this.findAttrs();

    this.resrcAttrs[ridKey] = _.cloneDeep(resrcAttrs);

    return this.resrcAttrs[ridKey];
};

IObject.prototype.removeResrcAttrs = function (rid) {
    var ridKey = mutils.ridKey(this.oid, rid);

    this.resrcAttrs[ridKey] = null;
    delete this.resrcAttrs[ridKey];
    return this;
};

IObject.prototype.enableResrcReporter = function (rid) {
    var self = this,
        ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs,
        resrcReporter,
        pminMs,
        pmaxMs;

    if (_.isUndefined(this[ridKey]))   // if resource is not found
        return false;

    resrcAttrs = this.getResrcAttrs(ridKey);

    if (!resrcAttrs) {
        resrcAttrs = this.findResrcAttrs(ridKey);
        // this.setResrcAttrs(ridKey, resrcAttrs);
        // resrcAttrs = this.getResrcAttrs(ridKey);
    }

    resrcAttrs.cancel = false;
    resrcAttrs.mute = true;
    pminMs = resrcAttrs.pmin * 1000 || 1000;
    pmaxMs = resrcAttrs.pmax * 1000 || 600000;

    // reporter place holder
    resrcReporter = this.reporters[ridKey] = this.reporters[ridKey] || { minRep: null, maxRep: null, poller: null };

    resrcReporter.poller = setInterval(function () {
        self.readResrc(ridKey);     // just read it, _checkAndReportResrc() will be invoked
    }, resrcAttrs.pintvl || 500);

    // mute is use to control the poller
    resrcReporter.minRep = setTimeout(function () {
        self.readResrc(ridKey).done(function (val) {
            resrcAttrs.mute = false;
            self.report(ridKey, val);
        });
    }, pminMs);

    resrcReporter.maxRep = setInterval(function () {
        resrcAttrs.mute = true;
        self.readResrc(ridKey).done(function (val) {
            self.report(ridKey, val);
        });
        
        resrcReporter.minRep = null;
        resrcReporter.minRep = setTimeout(function () {
            self.readResrc(ridKey).done(function (val) {
                resrcAttrs.mute = false;
                self.report(ridKey, val);
            });
        }, pminMs);
    }, pmaxMs);

    return true;
};

IObject.prototype.disableResrcReporter = function (rid) {
    var ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs = this.getResrcAttrs(ridKey),
        resrcReporter = this.reporters[ridKey];

    // if resrcAttrs was set before, dont delete it.
    resrcAttrs.cancel = true;
    resrcAttrs.mute = true;

    clearTimeout(resrcReporter.minRep);
    clearInterval(resrcReporter.maxRep);
    clearInterval(resrcReporter.poller);

    resrcReporter.minRep = null;
    resrcReporter.maxRep = null;
    resrcReporter.poller = null;
    return this;
};

/********************************************/
/*** IObject Protected Methods            ***/
/********************************************/
IObject.prototype._checkAndReportResrc = function (rid, currentValue) {
    var ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs = this.getResrcAttrs(ridKey);

    if (_.isUndefined(resrcAttrs))  // no attrs were set
        return false;

    if (resrcAttrs.cancel || resrcAttrs.mute)
        return false;

    if (this._isResrcNeedReport(ridKey, currentValue)) {
        this.report(ridKey, currentValue);
        return true;
    }

    return false;
};

IObject.prototype._isResrcNeedReport = function (rid, currentValue) {
    var ridKey = mutils.ridKey(this.oid, rid),
        resrcAttrs = this.getResrcAttrs(ridKey),
        needReport = false,
        lastReportedValue,
        gt,
        lt,
        step;

    if (!resrcAttrs)
        return false;

    // .report() has taclked the lastReportValue assigment
    lastReportedValue = resrcAttrs.lastReportedValue;
    gt = resrcAttrs.gt;
    lt = resrcAttrs.lt;
    step = resrcAttrs.step;

    if (!_.isNumber(currentValue)) {
        needReport = !_.isEqual(lastReportedValue, currentValue);
    } else {
        if (!_.isUndefined(gt) && !_.isNull(gt)) {
            if (currentValue > gt && lastReportedValue !== currentValue)
                needReport = true;
        }

        if (!_.isUndefined(lt) && !_.isNull(lt)) {
            if (currentValue < lt && lastReportedValue !== currentValue)
                needReport = true;
        }

        if (!_.isUndefined(step) && !_.isNull(step)) {
            if (Math.abs(currentValue - lastReportedValue) > step)
                needReport = true;
        }
    }

    return needReport;
};

module.exports = IObject;
