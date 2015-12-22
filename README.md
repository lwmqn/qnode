mqtt-node
===============
A client library for the light-wieght MQTT machine network.
***

## Table of Contents
1. Overview
2. Features
3. Installation
4. Basic Usage
5. APIs
- new MqttNode(clientId, devAttrs)
- setDevAttrs(devAttrs)
- initResrc(oid, [iid,] resrcs)
- (X) getAttrs(oid[, iid[, rid]])
- (X) setReportAttrs(oid[, iid[, rid]], attrs)
- readResrc(oid, iid, rid[, callback])
- writeResrc(oid, iid, rid, value[, callback])
- (X) enableReport(oid, iid, rid[, attrs])
- (X) disableReport(oid, iid, rid)
- connect(url[, opts])
- close(force[, callback])
- pubRegister([callback])
- pubDeregister([callback])
- (X) pubUpdate(devAttrs[, callback])
- pubNotify(data[, callback])
- (X) pubResponse(rsp[, callback])
- pingServer([callback])
- publish(topic, message[[, options], callback])

1. Overview
--------

The light-weight MQTT machine network (LWMQN) is an architecture that follows part of the LWM2M v1.0 specification to meet the minimum requirements of machine network management.

`mqtt-shepherd` is an implementation of the LWMQN Server and `mqtt-node` is an implementation of the LWMQN Client on node.js. They are working together into an IoT application framework. This client-side module `mqtt-node` is suitable for devices working with the embedded Linux and node.js, such as Linkit Smart 7688, Raspberry Pi and Beaglebone Black, .etc. 
The `mqtt-node` uses the IPSO definition as fundamental of the resource organizing on the device. It also provides templates of many common devices defined by the IPSO Smart Objects starter pack 1.0, i.e., presence sensor, temperature sensor, humidity sensor, light control and power control. The basic Objects like the Device Object and Server Object are ready. If you are going to build your own IoT application, consider trying `mqtt-node` on your device. It’s easy to use, you can build the device with no pain.

To learn more about:
1. [IPSO](https://www.npmjs.com/package/dissolve) 
2. [LWMQN](https://www.npmjs.com/package/dissolve) 
3. [mqtt-shepherd](https://www.npmjs.com/package/dissolve)

#### Acronym
* **MqttNode**: the class exposed by `require('mqtt-node')`
* **qnode**: the instance of the MqttNode class
* **oid**: identifier of an Object
* **iid**: identifier of an Object Instance
* **rid**: indetifier of a Resource
(Object, Object Instance and Resource are used by the IPSO specification to describe the hierarchical structure of resources on a Client Device. The oid, iid, and rid are identifers used to allocate the resource.)

2. Features
--------
* Communication based on the MQTT protocol and the client library [mqtt.js](https://www.npmjs.com/package/dissolve)
* Structuring the device resources in a hierarchical Smart-Object-style defined by the IPSO
* Easy to create a Resource on the Client Device
* LWM2M-like interfaces

3. Installation
--------
> $ npm install mqtt-node --save

4. Basic Usage
--------
Client-side exmaple:
```javascript
var MqttNode = require('mqtt-node');

/********************************************/
/*** Client Device Initialzation          ***/
/********************************************/
var qnode = new MqttNode('my_foo_client_id');

// Initialize the Resource that follows the IPSO definition
// oid = 'humidSensor', iid = 0
qnode.initResrc('humidSensor', 0, {
    sensorValue: 20,
    units: 'percent'
});

// Initialize a custom Resource
qnode.initResrc('myObject', 0, {
    myResrc1: 20,
    myResrc2: 'hello world!'
});

qnode.on('ready', function () {
    // If the registration procedure completes successfully, 'ready' will be fired
    // do you work here
});

qnode.connect('mqtt://192.168.0.2', {
    username: 'freebird',
    password: 'skynyrd'
});

```

Server-side example:
```javascript
var qnode = shepherd.findNode('my_foo_client_id');

qnode.readReq('humidSensor/0/sensorValue').then(function (rsp) {
    console.log(rsp.data);      // 20
}).fail(function (err) {
    console.log(err);
}).done();

qnode.readReq('myObject/0/myResrc2').done(function (rsp) {
    console.log(rsp.data);      // 'hello world!'
});

```

5. APIs
--------

### MqttNode Class
Exposed by `require('mqtt-node')`

### new MqttNode(clientId, devAttrs)
Create a new instance of the `MqttNode` class.
**Arguments:**
1.	`clientId` (String, required): The clientId should be a string and should be unique in the network. It is suggested to use the mac address (with a prefix or a suffix) as the clientId.
2.	`devAttrs` (Object): This is an object of device attributes describing the basic information about the device, i.e., `lifetime`, `ip`, `mac` and `version`.

| Property | Type   | Mandatory | Description                     |
|----------|--------|-----------|---------------------------------|
| lifetime | Number | optional  | seconds                         |
| ip       | String | required  | ip address of the Client        |
| mac      | String | required  | mac address of the Client       |
| version  | String | optional  | Minimum supported LWMQN version |

**Returns:**
	(Object): Returns the qnode

**Example:**
```javascript
var MqttNode = require('mqtt-node');
var qnode = new MqttNode('my_foo_client_id', {
    lifetime: 21600,
    ip: '192.168.0.99',
    mac: '00:0c:29:3e:1b:d2',
    version: 'v0.0.6'
});
    
console.log(qnode.clientId);    // 'my_foo_client_id'
console.log(qnode.lifetime);    // 108000
console.log(qnode.ip);          // '192.168.0.99'
console.log(qnode.mac);         // '00:0c:29:3e:1b:d2'
console.log(qnode.version);     // 'v0.0.6'
// use .setDevAttrs() to change the device attributes or qnode won't 
// automatically publish the update message to the Server.
```

### .initResrc(oid, [iid,] resrcs)
Initialize the Resources on qnode. 

The oid can be a IPSO-defined or lwm2m-defined object id, and it can be in number or string. If the oid is existing and iid is not given, a new Instance will be created. If If the oid is existing and iid is also given, if the iid is existing, throw error. Else create a new Instance according to the given iid.

**Arguments:**
1. `oid` (String|Number): Id of the Object that owns the Resource. The `oid` can be an IPSO-defined or LWM2M-defined id in string or in number. Please refer to the [lwm2m-id](https://www.npmjs.com/package/lwm2m-id) module for all defined ids.
2. `iid` (String|Number): Id of the Object Instance that owns the Resource. If `iid` is not given, qnode will automatically assign a number for it. It is common to use numbers to enumerate the instances, but using a string for the `iid` is okay too, e.g., 'my_instance01'.
3. `resrcs`: An object in rid-value paris to describe the Resources. Each key represents the `rid` and each value is the value of the Resource. The value of Resource can be a primitive value, such as a number, a string, and a boolean. The value of a Resource can be an object with `read` or `write` methods if reading value from or writing value to the Resource is not a simple value assignment, i.e., reading value from a gpio, reading value from a database, reading value from a file. In addition, the value of a Resource can be an object with a `exec` method if the Resource is typed as an executable one.

**Returns:**
	(Object): Returns the qnode

**Example:**
```javascript
/********************************************/
/*** Client Device Initialzation          ***/
/********************************************/

// use oid and rids in string
qnode.initResrc('humidSensor', 0, {
    sensorValue: 20,
    units: 'percent'
});

// use oid and rids in number
qnode.initResrc(3304, 0, {
    5700: 20,
    5701: 'percent'
});

// using numbers in string will be ok
qnode.initResrc('3304', 0, {
    '5700': 20,
    '5701': 'percent'
});

// reading sensed value from an analog interface
qnode.initResrc('mySensor', 0, {
    sensorValue: {
        read: function (cb) {
            // assume readSensor() is an asynchronous function or a callback-style function
            readSensor('aio0', function (val) {
                cb(null, val);
            });
        }
        // if write method is not given, this Resource will be considered as unwritable
    }
});

qnode.initResrc('mySensor', 0, {
    sensorValue: {
        read: function (cb) {
            // if the callback of readSensor() is also in err-first style
            readSensor('aio0', cb);
        }
    }
});

qnode.initResrc('mySensor', 0, {
    sensorValue: {
        read: function (cb) {
            // assume readSensor() is a synchronous function
            try {
                var val = readSensor('aio0');
                cb(null, val);
            } catch (err) {
                cb(err);
            }
        }
    }
});

// writing a value to a digital interface
qnode.initResrc('mySwitch', 0, {
    onOff: {
        // if read method is not given, this Resource will be considered as unreadable
        read: function (cb) {
            // do the read procedure
        },
        write: function (val, cb) {
            gpio.write('gpio06', val);

            var written = gpio.read('gpio06');
            cb(null, written);
        }
    }
});

// The Resource is executable
qnode.initResrc('myLight', 0, {
    blink: {
        read: function (cb) {
            blinkLed('led1', 10);       // bink led1 for 10 times
            cb(null, { status: 200 });  // the 2nd argument of cb is a response object
        }
    }
});

qnode.initResrc('myCounter', 0, {
    count: {
        read: function (cb) {
            countSomething(function (err, sum) {
                // responds back the status and some data
                cb(null, { status: 200, data: sum });
            });
        }
    }
});
```

### .setDevAttrs(devAttrs)
Set the device attribues on qnode.

**Arguments:**
1. `devAttrs` (Object): It is just like the `devAttrs` in the arguments of constructor MqttNode, but any change of the properties `clientId` and `mac` will be ignored. If you want to change either one of them, please deregister the qnode from the Server and then re-register it to the Server. If the devAttrs is an empty object or any of the given properties is equal to the current value, the qnode will not publish the update message.

**Returns:**
	(Object): Returns the qnode

**Example:**
```javascript
    // this will publish the update of ip address to the Server
    qnode.setDevAttrs({
        ip: '192.168.0.211'
    });
```

### .readResrc(oid, iid, rid[, callback])
Set the parameters of the report settings of the allocated target.

**Arguments:**
1. `rpAttrs` (Object): It is just like the `devAttrs` in the arguments of constructor MqttNode, but any change of the properties `clientId` and `mac` will be ignored. If you want to change either one of them, please deregister the qnode from the Server and then re-register it to the Server. If the devAttrs is an empty object or any of the given properties is equal to the current value, the qnode will not publish the update message.

**Returns:**
	(Object): Returns the qnode

**Example:**
```javascript
    qnode.setDevAttrs({
        ip: '192.168.0.211'
    });
```
