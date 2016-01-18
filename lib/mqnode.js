'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      network = require('network'),
      Q = require('q'),
      mqtt = require('mqtt'),
      mutils = require('./utils/mutils'),
      SmartObject = require('./smartobject'),
      IObject = require('./iobject');

var privateListeners = {},
    reqTimeout = 30000,
    lifeUpdater;

function MqttNode(clientId, devAttrs) {
    if (!_.isNil(clientId) && !_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    devAttrs = devAttrs || {};

    if (!_.isPlainObject(devAttrs))
        throw new TypeError('devAttrs should be an object.');

    EventEmitter.call(this);

    var self = this,
        transId = 0;

    this.clientId = clientId;
    this.lifetime = Math.floor(devAttrs.lifetime) || 86400;      // seconds
    this.ip = devAttrs.ip || null;
    this.mac = devAttrs.mac || null;
    this.version = devAttrs.version || '0.0.1';

    this.mc = null;     // mqtt client
    this.so = {         // smartobject default
        lwm2mServer: {
            shortServerId: null,
            lifetime: this.lifetime,
            defaultMinPeriod: 1,
            defaultMaxPeriod: 60,
            regUpdateTrigger: { exec:function ()  { self.pubRegister(); } }
        },
        device: {
            manuf: 'lwmqn',
            model: 'MQ1',
            reboot: { exec: function () { } },
            availPwrSrc: 0,
            pwrSrcVoltage: 5000,
            devType: 'generic',
            hwVer: 'v1',
            swVer: 'v1'},
        connMonitor: {
            ip: this.ip,
            routeIp: ''
        }
    };

    if (!this.ip || !this.mac) {
        network.get_active_interface(function(err, info) {
            if (err) {
                self.emit('error', err);
            } else {
                self.ip = self.ip || info.ip_address;
                self.mac = self.mac || info.mac_address;
            }
        });
    }

    this._tid = 0;
    this._repAttrs = {};
    this._tobjs = {};
    this._lfsecs = 0;
    this._upder = null;
    this._rpters = {};
    this._on = {};

    this.on('raw', function () {
        self._rawHdlr();
    });
    this.on('_request', function () {
        self._reqHdlr();
    });


    //----------- protected properties ---------------------
    var cId = _.toString(this.clientId);
    this._pubics = {};
    this._subics = {};
    _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
        self._pubics[intf] = intf + '/' + cId;
        self._subics[intf] = intf + '/response/' + cId;
    });
    this._pubics.response = 'response/' + cId;
    this._subics.request = 'request/' + cId;
    this._subics.announce = 'announce';

    this._nextTransId = function (intf) {
        function nextid() {
            transId = transId + 1;
            if (transId > 255)
                transId = 0;
            return transId;
        }

        if (!_.isNil(intf)) {
            var rspid = intf + ':rsp:' + transId;
            while (this.listenerCount(rspid) !== 0) {
                rspid = intf + ':rsp:' + nextid();
            }
            return transId;
        } else {
            return nextid();
        }
    };

    //-----------------------------------------------------
    this.encrypt = function (msg) {         // Overide at will
        return msg;
    };

    this.decrypt = function (msg) {         // Overide at will
        return msg;
    };
    //---------------- inner procedures -------------------
    this.on('_connected', function () {
        setTimeout(function () {
            self._connectedHandler();
        }, 600);
    });

    this.on('_request', this._requestMessageDispatcher);

    this.on('_reg_rsp', function (rsp) {
        if (rsp.status === 200 || rsp.status === 201) {
            self.emit('register_success', rsp);
            self._startLifeUpdater();
        } else {
            // [TODO] clear updater
            self.emit('register_fail', rsp);
        }
    });
    //-----------------------------------------------------

    // [TODO] bind default objects
        this._rspsToResolve = {};
}

util.inherits(MqttNode, EventEmitter);

MqttNode.prototype.initResrc = function (oid, iid, resrcs) {
    var self = this,
        okey = mutils.oidKey(oid);

    this.so[okey] = this.so[okey] || {};
    this.so[okey][iid] = this.so[okey][iid] || {};

    _.forEach(resrcs, function (r, rid) {
        var  rkey = mutils.ridKey(oid, rid);
        if (!_.isFunction(r)) {
            this.so[okey][iid][rkey] = r;
            if (_.isObject(r))
                r._isCb = _.isFunction(r.read) || _.isFunction(r.write) || _.isFunction(r.exec);
        }
    });

    return this;
};

MqttNode.prototype.getAttrs = function (oid, iid, rid) {
    var trg = this._target(oid, iid, rid),
        key = mutils.oidKey(oid),
        d4 = {
            pmin: this.so.lwm2mServer.defaultMinPeriod,
            pmax: this.so.lwm2mServer.defaultMaxPeriod,
            mute: true,
            cancel: true
        };

    if (!trg.exist)
        return null;

    if (trg.type === TTYPE.obj)
        key = key;
    else if (trg.type === TTYPE.inst)
        key = key + ':' + iid;
    else if (trg.type === TTYPE.rsc)
        key = key + ':' + iid + ':' + rid;

    this._repAttrs[key] = this._repAttrs[key] || d4;
    return this._repAttrs[key];
};

MqttNode.prototype.setAttrs = function (oid, iid, rid, attrs) {

};

// function M:setAttrs(...) -- args: oid, iid, rid, attrs
//     local argtbl = { ... }
//     local oid, key = argtbl[1], tostring(argtbl[1])
//     local iid, rid, tgtype, target, attrs

//     if (#argtbl == 4) then
//         iid, rid, attrs = argtbl[2], argtbl[3], argtbl[4]
//         key = key .. ':' .. iid .. ':' .. rid
//     elseif (#argtbl == 3) then
//         iid, attrs = argtbl[2], argtbl[3]
//         key = key .. ':' .. iid
//     elseif (#argtbl == 2) then
//         attrs = argtbl[2]
//     end

//     tgtype, target = self:_target(oid, iid, rid)
//     if (target == TAG.nfnd) then return false end
//     attrs.pmin = attrs.pmin or self.so[1][2]
//     attrs.pmax = attrs.pmax or self.so[1][3]
//     self._repAttrs[key] = attrs
//     return true
// end
var TTYPE = { root: 0, obj: 1, inst: 2, rsc: 3 };

MqttNode.prototype._target = function (oid, iid, rid) {
    var trg = {
        type: null,
        exist: this._has(oid, iid, rid)
    };

    if (!_.isNull(oid) && oid === '') {
        trg.type = TTYPE.root;
    } else if (!_.isNull(oid)) {
        trg.type = TTYPE.obj;
        if (!_.isNull(iid)) {
            trg.type = TTYPE.inst;
            if (!_.isNull(rid)) {
                trg.type = TTYPE.rsc;
            }
        }
    }

    return trg;
};

MqttNode.prototype._has = function (oid, iid, rid) {
    var okey = mutils.oidKey(oid), 
        has = false,
        rkey;

    if (arguments.length === 3) {
        rkey = mutils.ridKey(oid, rid);
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]) && !_.isUndefined(this.so[okey][iid][rid]);
    } else if (arguments.length === 2) {
        has = !_.isUndefined(this.so[okey]) && !_.isUndefined(this.so[okey][iid]);
    } else if (arguments.length === 1) {
        has = !_.isUndefined(this.so[okey]);
    }
    return has;
};

