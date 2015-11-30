'use strict';

var util = require('util'),
    _ = require('lodash'),
    MDEFS = require('../defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID,
    RSPCODE = MDEFS.RSPCODE,
    CMD = MDEFS.CMD;

var mqUtils = {};

mqUtils.getOidEnum = function (oid) {
    if (!_.isNumber(oid) && !_.isString(oid))
        throw new TypeError('oid should be a number or a string.');

    var theOid = parseInt(oid),
        oidEnum;

    if (_.isNumber(theOid))
        oid = theOid;

    oidEnum = MDEFS.OID.get(oid);
    return oidEnum;
};

mqUtils.returnOidKey = function (oid) {
    var oidEnum = this.getOidEnum(oid),
        oidKey;

    if (oidEnum)
        oidKey = oidEnum.key;
    else
        oidKey = oid;       // if undefined, return itself

    return oidKey;
};

mqUtils.returnOidNumber = function (oid) {
    var oidEnum = this.getOidEnum(oid),
        oidNumber;

    if (oidEnum)
        oidNumber = oidEnum.value;
    else
        oidNumber = oid;    // if undefined, return itself

    return oidNumber;
};

mqUtils.getRidEnum = function (oid, rid) {
    var ridEnum,
        oidKey;

    if (_.isUndefined(rid)) {
        if (_.isUndefined(oid)) throw new Error('Bad arguments');

        rid = oid;
        oid = undefined;
    }

    if (!_.isUndefined(oid)) {           // searching in MDEFS.RIDOFOID
        if (_.isUndefined(rid))
            throw new Error('rid should be given');

        oidKey = this.returnOidKey(oid);
        ridEnum = MDEFS.RIDOFOID[oidKey];

        if (_.isUndefined(ridEnum))
            ridEnum = MDEFS.RID;
    } else {                            // searching in MDEFS.RID
        ridEnum = MDEFS.RID;
    }

    return ridEnum;
};

mqUtils.returnRidKey = function (oid, rid) {
    var ridEnum = this.getRidEnum(oid, rid),
        ridKey;

    if (ridEnum)
        ridKey = ridEnum.key;
    else
        ridKey = rid;       // if undefined, return itself

    return ridKey;
};

mqUtils.returnRidNumber = function (oid, rid) {
    var ridEnum = this.getRidEnum(oid, rid),
        ridNumber;

    if (ridEnum)
        ridNumber = ridEnum.value;
    else
        ridNumber = rid;    // if undefined, return itself

    return ridNumber;
};

mqUtils.getRidKey = function (oid, rid) {
    var ridEnum = this.getRidEnum(oid, rid);

    return _.isUndefined(ridEnum) ? undefined : ridEnum.get(rid).key;
};

mqUtils.getRidNumber = function (oid, rid) {
    var ridEnum = MDEFS._getRidEnum(oid, rid);
    return _.isUndefined(ridEnum) ? undefined : ridEnum.get(rid).value;
};

mqUtils.getResrcControl = function (oid, rid) {
    var oidKey = this.returnOidKey(oid),
        ridKey = this.returnRidKey(oid, rid),
        oidResrcCntls = MDEFS.RESOURCEOFOID[oidKey],
        resrcCntl;

    if (oidResrcCntls)
        resrcCntl = oidResrcCntls[ridKey];

    return resrcCntl;
};  // undefined / resrc cntrl

//-------------------------------------------
mqUtils.jsonify = function (str) {
    var obj;

    try {
        obj = JSON.parse(str);
    } catch (e) {
        return false;
    }
    return obj;
};

mqUtils.turnReqObjOfIds = function (reqObj) {
    _.forEach(reqObj, function (val, key) {
        var oidNum,
            ridNum;

        if (key === 'oid') {
            oidNum = MDEFS.getOidNumber(val);
            reqObj.oid = _.isUndefined(oidNum) ? val : oidNum;
        }

        if (key === 'rid') {
            ridNum = MDEFS.getRidNumber(val);
            reqObj.rid = _.isUndefined(ridNum) ? val : ridNum;
        }
    });

    return reqObj;
};

mqUtils.buildPathValuePairs = function (rootPath, obj) {
    var result = {};

    rootPath = mqUtils.returnPathInDotNotation(rootPath);

    if (_.isObject(obj)) {
        if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
            rootPath = rootPath + '.';

        _.forEach(obj, function (n, key) {
            if (_.isObject(n)) {
                var tmp = mqUtils.buildPathValuePairs(rootPath + key, n);
                _.assign(result, tmp);
            } else {
                result[rootPath + key] = n;
            }
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
};

mqUtils.returnPathInDotNotation = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')          // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);


    return path;
};

mqUtils.returnPathInSlashNotation = function (path) {
    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation

    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')          // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mqUtils.returnPathItemsInArray = function (path) {
    path = mqUtils.returnPathInSlashNotation(path);
    return path.split('/');
};

mqUtils.turnPathToReqArgs = function (path, clientId, data, callback) {
    var args,
        reqArgs = [],
        reqObj = {};

    reqArgs.push(clientId);

    path = mqUtils.returnPathInSlashNotation(path);
    args = path.split('/');

    if (args.length === 1) {
        reqObj.oid = args[0];
    } else if (args.length === 2) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
    } else if (args.length === 3) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
        reqObj.rid = args[2];
    } else {
        throw new Error('Bad path');
    }

    if (util.isFunction(data))
        callback = data;
    else
        reqObj.data = data;

    reqArgs.push(reqObj);

    if (util.isFunction(callback))
        reqArgs.push(callback);

    return reqArgs;
};

module.exports = mqUtils;
