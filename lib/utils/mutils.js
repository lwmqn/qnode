'use strict';

var util = require('util'),
    Enum = require('enum'),
    _ = require('lodash'),
    lwm2mid = require('lwm2m-id');

var mutils = {};

var CMD = new Enum({
    'read': 0,
    'write': 1,
    'discover': 2,
    'writeAttrs': 3,
    'execute': 4,
    'observe': 5,
    'notify': 6,
    'unknown': 255
});

mutils.jsonify = function (str) {
    var obj;

    try {
        obj = JSON.parse(str);
    } catch (e) {
        return;
    }

    return obj;
};  // undefined/result

mutils.getCmd = function (cmdId) {
    return CMD.get(cmdId);
};

mutils.getOid = function (oid) {
    return lwm2mid.getOid(oid);
};

mutils.getRid = function (oid, rid) {
    return lwm2mid.getRid(oid, rid);
};

mutils.oidKey = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    return oidItem ? oidItem.key : oid;     // if undefined, return itself
};

mutils.oidNumber = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    return oidItem ? oidItem.value : oid;   // if undefined, return itself
};

mutils.ridKey = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    return ridItem ? ridItem.key : rid;     // if undefined, return itself
};

mutils.ridNumber = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    return ridItem ? ridItem.value : rid;   // if undefined, return itself
};

mutils.getSpecificResrcChar = function (oid, rid) {
    return lwm2mid.getSpecificResrcChar(oid, rid);
};  // undefined / resrc characteristic

mutils.dotPath = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')           // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mutils.slashPath = function (path) {
    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation

    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')           // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    return path;
};

module.exports = mutils;
