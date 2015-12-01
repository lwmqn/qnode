'use strict';

var _ = require('lodash'),
    mutils = require('./utils/mutils'),
    SmartObject = require('./smartobject'),
    IObject = require('./iobject');

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

function buildTemplate(tId) {
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
}

module.exports = buildTemplate;
