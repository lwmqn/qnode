'use strict';

var _ = require('lodash'),
    Enum = require('enum'),
    MDEFS = require('./defs/mdefs'),
    SObject = require('./smartobject'),
    IObject = require('./iobject');

var commonOidResrcs = {
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

function buildTemplate(tId) {
    var oidKey = MDEFS.getOidKey(tId),
        devResrcs = commonOidResrcs.device,
        connResrcs = commonOidResrcs.connMonitor,
        tmpResrcs,
        resrcs = [],
        iobjs = [];

    if (_.isUndefined(oidKey) || _.isUndefined(templateOids[oidKey]))
        throw new Error('No such template: ' + tId);

    // build 'device' object
    _.forEach(devResrcs, function (rid) {
        var defaultVal = MDEFS.RESOURCEOFOID.device[rid].init;
        resrcs.push(_.set({}, rid, defaultVal));
    });

    iobjs.push(new IObject('device', resrcs));

    // build 'connMonitor' object
    resrcs = [];
    _.forEach(connResrcs, function (rid) {
        var defaultVal = MDEFS.RESOURCEOFOID.connMonitor[rid].init;
        resrcs.push(_.set({}, rid, defaultVal));
    });

    iobjs.push(new IObject('connMonitor', resrcs));

    // build template object
    resrcs = [];
    tmpResrcs = templateOids[oidKey];

    _.forEach(tmpResrcs, function (rid) {
        var defaultVal = MDEFS.RESOURCEOFOID[oidKey][rid].init;
        resrcs.push(_.set({}, rid, defaultVal));
    });

    iobjs.push(new IObject(oidKey, resrcs));

    return new SObject(`tmp_${oidKey}`, iobjs);
}

module.exports = buildTemplate;
