mqtt-node
========================

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Basic Usage](#Basic)
5. [APIs](#APIs)
6. [Code Templates](#Templates) 

<a name="Overiew"></a>
## 1. Overview

The light-weight MQTT machine network ([**LWMQN**](https://www.www.com)) is an architecture that follows part of the [**LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

[`mqtt-shepherd`](https://www.npmjs.com/package/mqtt-shepherd) is an implementation of the LWMQN Server and [`mqtt-node`](https://www.npmjs.com/package/mqtt-node) is an implementation of the LWMQN Client on node.js. They are working together into an IoT application framework. This client-side module `mqtt-node` is suitable for devices working with the embedded Linux and node.js, such as Linkit Smart 7688, Raspberry Pi and Beaglebone Black, .etc.  

The `mqtt-node` uses IPSO definitions as its fundamental of the resource organizing on the device. This document also provides templates of many common devices defined by the IPSO [**Smart Objects starter pack 1.0**](http://www.ipso-alliance.org/smart-object-guidelines/), i.e., temperature sensor, humidity sensor, light control. `mqtt-node` is trying to let you build the IoT peripheral machines with no pain.  

#### Acronym
* **MqttNode**: the class exposed by `require('mqtt-node')`  
* **qnode**: the instance of the MqttNode class  
* **oid**: identifier of an Object  
* **iid**: identifier of an Object Instance  
* **rid**: indetifier of a Resource  

Note: Object, Object Instance and Resource are used by the IPSO specification to describe the hierarchical structure of resources on a Client Device. The oid, iid, and rid are identifiers used to allocate the resource.  

<a name="Features"></a>
## 2. Features

* Communication based on the MQTT protocol and the client library [mqtt.js](https://www.npmjs.com/package/mqtt)  
* Structuring the device resources in a hierarchical Smart-Object-style defined by IPSO  
* Easy to create a Resource on the Client Device  
* LWM2M-like interfaces  
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-node --save
  
<a name="Basic"></a>
## 4. Basic Usage

Client-side exmaple (here is how you are using the `mqtt-node`):  

```js
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

Server-side example (please go to the `mqtt-shepherd` document for details):  

```js
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
  
<a name="APIs"></a>
## 5. APIs

* [new MqttNode()](#API_MqttNode)
* [setDevAttrs()](#API_setDevAttrs)
* [initResrc()](#API_initResrc)
* [readResrc()](#API_readResrc)
* [writeResrc()](#API_writeResrc)
* [connect()](#API_connect)
* [close()](#API_close)
* [pubRegister()](#API_pubRegister)
* [pubDeregister()](#API_pubDeregister)
* [pubNotify()](#API_pubNotify)
* [pingServer()](#API_pingServer)
* [publish()](#API_publish)
* [subscribe()](#API_subscribe)
* [unsubscribe()](#API_unsubscribe)  

*************************************************

### MqttNode Class
Exposed by `require('mqtt-node')`  
  
<a name="API_MqttNode"></a>
### new MqttNode(clientId, devAttrs)
Create a new instance of the `MqttNode` class.  
  
**Arguments:**  

1. `clientId` (_String_, _required_): The clientId should be a string and should be unique in the network.  
    It is suggested to use the mac address (with a prefix or a suffix) as the clientId.
2. `devAttrs` (_Object_): This is an object of device attributes describing the information about the device.  
    The following table shows the details of each property within `devAttrs`.  
    
  
| Property | Type   | Mandatory | Description                     |  
|----------|--------|-----------|---------------------------------|  
| lifetime | Number | optional  | seconds                         |  
| ip       | String | required  | ip address of the Client        |  
| mac      | String | required  | mac address of the Client       |  
| version  | String | optional  | Minimum supported LWMQN version |  
  
**Returns:**  
  
* (_Object_) qnode

**Examples:**

```js
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
  
********************************************
<a name="API_initResrc"></a>
### .initResrc(oid, [iid,] resrcs)
Initialize the Resources on qnode.  

**Arguments:**  

1. `oid` (_String|Number_): Id of the Object that owns the Resource.  
    The `oid` can be an IPSO-defined or LWM2M-defined id in string or in number. Please refer to the [lwm2m-id](https://www.npmjs.com/package/lwm2m-id) module for all defined ids.  
2. `iid` (_String|Number_): Id of the Object Instance that owns the Resource.    
    If `iid` is not given, qnode will automatically create an Object Instance and assign a number for it. It is common to use numbers to enumerate the instances, but using a string for the `iid` is okay too, e.g., 'my_instance01'.  
3. `resrcs` (_Object_): An object in rid-value paris to describe the Resources.  
    Each key represents the `rid` and each value is the value of the Resource. The value of Resource can be a   primitive value, such as a number, a string, and a boolean. The value of a Resource can be an object with `read` or `write` methods if reading value from or writing value to the Resource is not a simple value assignment, i.e., reading value from a gpio, reading value from a database, reading value from a file. In addition, the value of a Resource can be an object with a `exec` method if the Resource is typed as an executable one.  
  
**Returns:**  
  
* (_Object_): qnode

**Examples:**  

* Resource is a simple value:  
  
```js
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
```
  
* Resource value is got from particular operations:  
  
```js
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
```
  
* Resource value needs to be written by particular operations:  
  
```js
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
```
  
* Resource is executable (a procedure on the Client Device):  
  
```js    
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
  
********************************************
<a name="API_setDevAttrs"></a>
### .setDevAttrs(devAttrs)
Set the device attribues on qnode.  

**Arguments:**
  
1. `devAttrs` (_Object_): Device attributes.  
    It is just like the `devAttrs` in the arguments of MqttNode constructor, but any change of `clientId`, `mac` and unrecognized properties will be ignored. If you want to change either one of `clientId` and `mac`, please deregister the qnode from the Server and then re-register it to the Server. 
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
// this will publish the update of ip address to the Server
qnode.setDevAttrs({
    ip: '192.168.0.211'
});
```
  
********************************************
<a name="API_readResrc"></a>
### .readResrc(oid, iid, rid[, callback])
Read the value from the allocated Resource.  
  
**Arguments:**  

1. `oid` (_String|Number_): Id of the Object to allocate the Resource.  
2. `iid` (_String|Number_): Id of the Object Instance to allocate the Resource.
3. `rid` (_String|Number_): Id of the Resource to be allocated.        
3. `callback` (_Function_): An err-fisrt callback `function(err, val)` to get the read value.  
    If the Resource is not a simple value and there has not a `read` method been initialized for it, in this case, the `val` passes to the callback will be a string `_unreadable_`. For example, you are trying to read a write-only Resource which is initialized without a read method.
    If the Resource is an executable resource, the `val` passes to the callback will be a string `_exec_`.
    If the allocated Resource is not found, an error object will be passed to fisrt argument of the callback. **** Promise is supported! ****  
  
**Returns:**  

* (_Promise_): promise

**Examples:**  
  
```js
qnode.readResrc('humidSensor', 0, 'sensorValue', function (err, val) {
    if (err)
        console.log(err);
    else
        console.log(val);   // 20
});

qnode.readResrc('humidSensor', 12, 'sensorValue', function (err, val) {
    if (err)
        console.log(err);   // if allocating Resource fails 
});

qnode.readResrc('mySensor', 0, 'sensorValue', function (err, val) {
    console.log(val);       // '_unreadable_' if the Resource cannot be read
});

qnode.readResrc('myLight', 0, 'blink', function (err, val) {
    console.log(val);       // '_exec_' if the Resource is executable
});
```
  
********************************************
<a name="API_writeResrc"></a>
### .writeResrc(oid, iid, rid, value[, callback])
Write the value to the allocated Resource.  
  
**Arguments:**  

1. `oid` (_String|Number_): Id of the Object to allocate the Resource.  
2. `iid` (_String|Number_): Id of the Object Instance to allocate the Resource.
3. `rid` (_String|Number_): Id of the Resource to be allocated.
3. `value` (_Depends_): The value to write to the allocated Resource.        
4. `callback` (_Function_): An err-fisrt callback `function(err, val)` to get the read value.  
    If the Resource is not a simple value and there has not a `write` method been initialized for it, in this case, the `val` passes to the callback will be a string `_unwritable_`. For example, you are trying to write a value to an executable Resource or a read-only Resource which is initialized without a write method.
    If the allocated Resource is not found, an error object will be passed to fisrt argument of the callback. **** Promise is supported! ****  
  
**Returns:**  

* (_Promise_): promise

**Examples:**  
  
```js
qnode.writeResrc('humidSensor', 0, 'sensorValue', 80, function (err, val) {
    console.log(val);   // '_unwritable_'
});

qnode.writeResrc('humidSensor', 12, 'sensorValue', 80, function (err, val) {
    if (err)
        console.log(err);   // if the Resource does not exist
});

qnode.writeResrc('mySwitch', 0, 'onOff', 1, function (err, val) {
    console.log(val);       // 1
});
```
  
********************************************
<a name="API_connect"></a>
### .connect(url[, opts])
Connects to the LWMQN Server with the given url and tries to register to the Server. If the procedure of connection and registration succeeds, qnode will fire a `ready` event.       
  
**Arguments:**  

1. `url` (_String_): Url of the LWMQN Server, e.g. `mqtt://localhost`, `mqtt://192.168.0.100:1883`.  
2. `opts` (_Object_): The connect options with properties shown in the following table.  
  
| Property        | Type          | Default      | Description                                             |  
|-----------------|---------------|--------------|---------------------------------------------------------|  
| keepalive       | Number        | 10           | 10 seconds, set to 0 to disable                         |  
| reconnectPeriod | Number        | 1000         | milliseconds, interval between two reconnections        |  
| connectTimeout  | Number        | 30000        | milliseconds, time to wait before a CONNACK is received |  
| username        | String        | `'freebird'` | The username required by your broker, if any            |  
| password        | String\|Buffer | `'skynyrd'`  | the password required by your broker, if any            |    
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
qnode.on('ready', function () {
    // do your work here
});

// use default account
qnode.connect('mqtt://192.168.0.100');

// use your own account
// you can encrypt the password if the Server knows how to decrypt it
qnode.connect('mqtt://192.168.0.100', {
    username: 'someone',
    password: 'somepassword'
});

// use the MQTT connection options other than defaults
qnode.connect('mqtt://192.168.0.100', {
    keepalive: 30,
    reconnectPeriod: 5000
});
```
  
********************************************
<a name="API_close"></a>
### .close([force,] [callback])
Disconnects from the Server. qnode will fire a `close` event if it is disconnected.       
  
**Arguments:**  

1. `force` (_Boolean_): `true` will close the client right away, without waiting for the in-flight messages to be acked. This parameter is optional.  
2. `callback` (_Function_): will be called when the client is closed    
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
qnode.on('close', function () {
    console.log('Disconnected from the Server.');
});

qnode.close();
```
  
********************************************
<a name="API_pubRegister"></a>
### .pubRegister([callback])
Publishes the registering message to the Server. The message of registration will be automatically generated by the qnode. Everytime you invoke the .connect() method, qnode always does the regisetring procedure to the Server.  
The qnode fires a `response` event when it received the response of registration from the Server.  
  
**Arguments:**  

1. `callback` (_Function_): will be called when the registering message is published.  
  
**Returns:**  

* (_Promise_): promise

**Examples:**  
  
```js
qnode.on('response', function (rsp) {
    if (rsp.type === 'register')
        console.log(rsp);
});

qnode.pubRegister();
```
  
********************************************
<a name="API_pubDeregister"></a>
### .pubDeregister([callback])
Publishes the deregistering message to the Server for leaving the network. The message will be automatically generated by the qnode.
The qnode fires a `response` event when it received the response of deregistration from the Server.     
     
  
**Arguments:**  

1. `callback` (_Function_): will be called when the deregistering message is published.  
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.on('response', function (rsp) {
    if (rsp.type === 'deregister')
        console.log(rsp);
});

qnode.pubDeregister();
```
  
********************************************
<a name="API_pubNotify"></a>
### .pubNotify(data[, callback])
Publishes the notificatoin to the Server. The message should be a well-formatted data object.
The qnode fires a `response` event when it received the acknownledgement from the Server.     
  
**Arguments:**  

1. `data` (_Object_):  
2. `callback` (_Function_): will be called when the notification is published.  
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.on('response', function (rsp) {
    if (rsp.type === 'notify')
        console.log(rsp);
});

// pub a Resource
qnode.pubNotify({
    oid: humidSensor,
    iid: 0,
    rid: 'sensorValue',
    data: 32
});

// pub an Object Instance
qnode.pubNotify({
    oid: humidSensor,
    iid: 0,
    data: {
        sensorValue: 32,
        units: 'percent'
    }
});
```
  
********************************************
<a name="API_pingServer"></a>
### .pingServer([callback])
Publishes the ping message to the Server.
The qnode fires a `response` event when it received the response from the Server.  
  
**Arguments:**  

1. `callback` (_Function_): will be called when the ping message is published.  
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.on('response', function (rsp) {
    if (rsp.type === 'ping')
        console.log(rsp);
});

// pub a Resource
qnode.pingServer();
```
  
********************************************
<a name="API_publish"></a>
### .publish(topic, message[, options][, callback])
This is a generic method to publish a message to a topic.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to publish any message to any topic. In this case, the Server simply acts as an MQTT broker. The generic publishment is not authorized at the Server if the Client was not successfully registered. 
  
**Arguments:**  

1. `topic` (_String_): the topic to publish to.  
2. `message` (_String|Buffer_): the message to publish.
3. `options` (_Object_): the option to publish with, including the properties shown in the following table.
4. `callback` (_Function_): will be called when the QoS handling completes, or at the next tick if QoS 0.
  
| Property | Type    | Default | Description |
|----------|---------|---------|-------------|
| `qos`    | Number  | 0       | QoS level   |
| `retain` | Boolean | false   | Retain flag |
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.publish('foo/bar/greet', 'Hello World!');
```
  
********************************************
<a name="API_subscribe"></a>
### .subscribe(topic[, options][, callback])
This is a generic method to subscribe to a topic.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to subscribe to any topic. In this case, the Server simply acts as an MQTT broker. The generic subscription is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_): the topic to subscribe to.  
2. `options` (_Object_): the option to subscribe with, including the property `qos` which is a Qos level of the subscription. `qos` is 0 by default.    
3. `callback` (_Function_): `function (err, granted)` callback will be called on suback, where
    `err` is a subscrtiption error
    `granted` is an arrary of objects formatted in `{ topic, qos }`    
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.subscribe('foo/bar/score');
```
  
********************************************
<a name="API_unsubscribe"></a>
### .unsubscribe(topic[, callback])
This is a generic method to unsubscribe a topic from the broker.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to unsubscribe any topic. In this case, the Server simply acts as an MQTT broker. The generic unsubscription is not authorized at the Server if the Client was not successfully registered. 
  
**Arguments:**  

1. `topic` (_String_): the topic to unsubscribe.  
2. `callback` (_Function_): callback fired on unsuback  
  
**Returns:**  

* (_Promise_) promise

**Examples:**  
  
```js
qnode.unsubscribe('foo/bar/score');
```
..
********************************************
<br />
<a name="Templates"></a>
## 6. Code Templates

This document provides you with many code templates of common devices defined by the IPSO [**Smart Objects starter pack 1.0**](http://www.ipso-alliance.org/smart-object-guidelines/).  Each code snippet also lists out the oid and every Resource characteristic in the Object with the format:  
> < rid number, access, data type { range or enum }, unit >
  
1. [Digital Input](#tmpl_digitalInput)
2. [Digital Output](#tmpl_digitalOutput)
3. [Analog Input](#tmpl_analogInput)
4. [Analog Output](#tmpl_analogOutput)
5. [Generic Sensor](#tmpl_genericSensor)
6. [Illuminance Sensor](#tmpl_illumSensor)
7. [Presence Sensor](#tmpl_presenceSensor)
8. [Temperature Sensor](#tmpl_tempSensor)
9. [Humidity Sensor](#tmpl_humidSensor)
10. [Power Measurement](#tmpl_pwrMea)
11. [Actuation](#tmpl_actuation)
12. [Set Point](#tmpl_setPoint)  
13. [Load Control](#tmpl_loadCtrl)  
14. [Light Control](#tmpl_lightCtrl) 
15. [Power Control](#tmpl_pwrCtrl)
16. [Accelerometer](#tmpl_accelerometer)
17. [Magnetometer](#tmpl_magnetometer) 
18. [Barometer](#tmpl_barometer)     
  
********************************************
<a name="tmpl_digitalInput"></a>
### 01. Digital Input
  
```js
// 01. Digital Input (oid = 3200 or 'digitalInput')
qnode.initResrc('digitalInput', 0, {
    dInState: {                     // < rid = 5500, R, Boolean >
        read: function (cb) {}
    },
    // counter: ,                   // < rid = 5501,  R, Integer >
    // dInPolarity: ,               // < rid = 5502, RW, Boolean >
    // debouncePeriod: ,            // < rid = 5503, RW, Integer, ms >
    // edgeSelection: ,             // < rid = 5504, RW, Integer { 1: fall, 2: rise, 3: both } >
    // counterReset: ,              // < rid = 5505,  E, Opaque >
    // appType: ,                   // < rid = 5750, RW, String >
    // sensorType:                  // < rid = 5751,  R, String >
});
```
  
********************************************
<a name="tmpl_digitalOutput"></a>
### 02. Digital Output
  
```js
// 02. Digital Output (oid = 3201 or 'digitalOutput')
qnode.initResrc('digitalOutput', 0, {
    dOutState: {                    // < rid = 5550, RW, Boolean >
        read: function (cb) {},
        write: function (cb) {}
    },
    // dOutpolarity: ,              // < rid = 5551, RW, Boolean { 0: normal, 1: reversed } >
    // appType:                     // < rid = 5750, RW, String >
});
```
  
********************************************
<a name="tmpl_analogInput"></a>
### 03. Analog Input
  
```js
// 03. Analog Input (oid = 3202 or 'analogInput')
qnode.initResrc('analogInput', 0, {
    aInCurrValue: {                 // < rid = 5600, R, Float >
        read: function (cb) {}
    },
    // minMeaValue: ,               // < rid = 5601,  R, Float >
    // maxMeaValue: ,               // < rid = 5602,  R, Float >
    // minRangeValue: ,             // < rid = 5603,  R, Float >
    // maxRangeValue: ,             // < rid = 5604,  R, Float >
    // resetMinMaxMeaValues: ,      // < rid = 5605,  E, Opaque >
    // appType: ,                   // < rid = 5750, RW, String >
    // sensorType:                  // < rid = 5751,  R, String >
});
```
  
********************************************
<a name="tmpl_analogOutput"></a>
### 04. Analog Output
  
```js
// 04. Analog Output (oid = 3203 or 'analogOutput')
qnode.initResrc('analogOutput', 0, {
    aOutCurrValue: {                // < rid = 5650, RW, Float >
        read: function (cb) {},
        write: function (cb) {}
    },
    // minRangeValue: ,             // < rid = 5603,  R, Float >
    // maxRangeValue: ,             // < rid = 5604,  R, Float >
    // appType:                     // < rid = 5750, RW, String >
});
```
  
********************************************
<a name="tmpl_genericSensor"></a>
### 05. Generic Sensor
  
```js
// 05. Generic Sensor (oid = 3300 or 'genericSensor')
qnode.initResrc('genericSensor', 0, {
    sensorValue: {                  // < rid = 5700, R, Float >
        read: function (cb) {}
    },
    // units: ,                     // < rid = 5701,  R, String >
    // minMeaValue: ,               // < rid = 5601,  R, Float >
    // maxMeaValue: ,               // < rid = 5602,  R, Float >
    // minRangeValue: ,             // < rid = 5603,  R, Float >
    // maxRangeValue: ,             // < rid = 5604,  R, Float >
    // resetMinMaxMeaValues: ,      // < rid = 5605,  E, Opaque >
    // appType: ,                   // < rid = 5750, RW, String >
    // sensorType:                  // < rid = 5751,  R, String >
});
```
  
********************************************
<a name="tmpl_illumSensor"></a>
### 06. Illuminance Sensor
  
```js
// 06. Illuminance Sensor (oid = 3301 or 'illumSensor')
qnode.initResrc('illumSensor', 0, {
    sensorValue: {                  // < rid = 5700, R, Float >
        read: function (cb) {}
    },
    // units: ,                     // < rid = 5701, R, String >
    // minMeaValue: ,               // < rid = 5601, R, Float >
    // maxMeaValue: ,               // < rid = 5602, R, Float >
    // minRangeValue: ,             // < rid = 5603, R, Float >
    // maxRangeValue: ,             // < rid = 5604, R, Float >
    // resetMinMaxMeaValues:        // < rid = 5605, E, Opaque >
});
```
  
********************************************
<a name="tmpl_presenceSensor"></a>
### 07. Presence Sensor
  
```js
// 07. Presence Sensor (oid = 3302 or 'presenceSensor')
qnode.initResrc('presenceSensor', 0, {
    dInState: {                     // < rid = 5500, R, Boolean >
        read: function (cb) {}
    },
    // counter: ,                   // < rid = 5501,  R, Integer >
    // counterReset: ,              // < rid = 5505,  E, Opaque >
    // sensorType: ,                // < rid = 5751,  R, String >
    // busyToClearDelay: ,          // < rid = 5903, RW, Integer, ms >
    // clearToBusyDelay:            // < rid = 5904  RW, Integer, ms >
});
```
  
********************************************
<a name="tmpl_tempSensor"></a>
### 08. Temperature Sensor
  
```js
// 08. Temperature Sensor (oid = 3303 or 'tempSensor')
qnode.initResrc('tempSensor', 0, {
    sensorValue: {                  // < rid = 5700, R, Float >
        read: function (cb) {}
    },
    // units: ,                     // < rid = 5701, R, String >
    // minMeaValue: ,               // < rid = 5601, R, Float >
    // maxMeaValue: ,               // < rid = 5602, R, Float >
    // minRangeValue: ,             // < rid = 5603, R, Float >
    // maxRangeValue: ,             // < rid = 5604, R, Float >
    // resetMinMaxMeaValues:        // < rid = 5605, E, Opaque >
});
```
  
********************************************
<a name="tmpl_humidSensor"></a>
### 09. Humidity Sensor
  
```js
// 09. Humidity Sensor (oid = 3304 or 'humidSensor')
qnode.initResrc('humidSensor', 0, {
    sensorValue: {                  // < rid = 5700, R, Float >
        read: function (cb) {}
    },
    // units: ,                     // < rid = 5701, R, String >
    // minMeaValue: ,               // < rid = 5601, R, Float >
    // maxMeaValue: ,               // < rid = 5602, R, Float >
    // minRangeValue: ,             // < rid = 5603, R, Float >
    // maxRangeValue: ,             // < rid = 5604, R, Float >
    // resetMinMaxMeaValues:        // < rid = 5605, E, Opaque >
});
```
  
********************************************
<a name="tmpl_pwrMea"></a>
### 10. Power Measurement
  
```js
// 10. Power Measurement (oid = 3305 or 'pwrMea')
qnode.initResrc('pwrMea', 0, {
    instActivePwr: {                // < rid = 5800, R, Float, Wh >
        read: function (cb) {}
    },
    // minMeaActivePwr: ,           // < rid = 5801,  R, Float, W >
    // maxMeaActivePwr: ,           // < rid = 5802,  R, Float, W >
    // minRangeActivePwr: ,         // < rid = 5803,  R, Float, W >
    // maxRangeActivePwr: ,         // < rid = 5804,  R, Float, W >
    // cumulActivePwr: ,            // < rid = 5805,  R, Float, Wh >
    // activePwrCal: ,              // < rid = 5806,  W, Float, W >
    // instReactivePwr: ,           // < rid = 5810,  R, Float, VAR >
    // minMeaReactivePwr: ,         // < rid = 5811,  R, Float, VAR >
    // maxMeaReactivePwr: ,         // < rid = 5812,  R, Float, VAR >
    // minRangeReactivePwr: ,       // < rid = 5813,  R, Float, VAR >
    // maxRangeReactivePwr: ,       // < rid = 5814,  R, Float, VAR >
    // resetMinMaxMeaValues: ,      // < rid = 5605,  E, Opaque >
    // cumulReactivePwr: ,          // < rid = 5815,  R, Float, VARh >
    // reactivePwrCal: ,            // < rid = 5816,  W, Float, VAR >
    // pwrFactor: ,                 // < rid = 5820,  R, Float >
    // currCal: ,                   // < rid = 5821, RW, Float >
    // resetCumulEnergy: ,          // < rid = 5822,  E, Opaque >
});
```
  
********************************************
<a name="tmpl_actuation"></a>
### 11. Actuation
  
```js
// 11. Actuation (oid = 3306 or 'actuation')
qnode.initResrc('actuation', 0, {
    onOff: {                        // < rid = 5850, RW, Boolean { 0: off, 1: on } >
        read: function (cb) {},
        write: function (cb) {}
    },
    // dimmer: ,                    // < rid = 5851, RW, Integer { 0 ~ 100 }, % >
    // onTime: ,                    // < rid = 5852, RW, Integer, s >
    // mstateOut: ,                 // < rid = 5853, RW, String >
    // appType:                     // < rid = 5750, RW, String >
});
```
  
********************************************
<a name="tmpl_setPoint"></a>
### 12. Set Point
  
```js
// 12. Set Point (oid = 3308 or 'setPoint')
qnode.initResrc('setPoint', 0, {
    setPointValue: {                // < rid = 5900, RW, Float >
        read: function (cb) {},
        write: function (cb) {}
    },
    // colour: ,                    // < rid = 5706, RW, String >
    // units: ,                     // < rid = 5701,  R, String >
    // appType:                     // < rid = 5750, RW, String >
});
```
  
********************************************
<a name="tmpl_loadCtrl"></a>
### 13. Load Control
  
```js
// 13. Load Control (oid = 3310 or 'loadCtrl')
qnode.initResrc('loadCtrl', 0, {
    eventId: {                      // < rid = 5823, RW, String >
        read: function (cb) {},
        write: function (cb) {}
    },
    startTime: {                    // < rid = 5824, RW, Time >
        read: function (cb) {},
        write: function (cb) {}
    },
    durationInMin: {                // < rid = 5825, RW, Integer, min >
        read: function (cb) {},
        write: function (cb) {}
    },
    // criticalLevel: ,             // < rid = 5826, RW, Integer { 0: normal, 1: warning, 2: danger, 3: fatal } >
    // avgLoadAdjPct: ,             // < rid = 5827, RW, Integer { 0 ~ 100 }, % >
    // dutyCycle:                   // < rid = 5828, RW, Interger { 0 ~ 100 }, % >
});
```
  
********************************************
<a name="tmpl_lightCtrl"></a>
### 14. Light Control
  
```js
// 14. Light Control (oid = 3311 or 'lightCtrl')
qnode.initResrc('lightCtrl', 0, {
    onOff: {                        // < rid = 5850, RW, Boolean { 0: off, 1: on } >
        read: function (cb) {},
        write: function (cb) {}
    },
    // dimmer: ,                    // < rid = 5851, RW, Integer { 0 ~ 100 }, %  >
    // colour: ,                    // < rid = 5706, RW, String >
    // units: ,                     // < rid = 5701,  R, String >
    // onTime: ,                    // < rid = 5852, RW, Integer, s >
    // cumulActivePwr: ,            // < rid = 5805,  R, Float, Wh >
    // pwrFactor:                   // < rid = 5820,  R, Float >
});
```
  
********************************************
<a name="tmpl_pwrCtrl"></a>
### 15. Power Control
  
```js
// 15. Power Control (oid = 3312 or 'pwrCtrl')
qnode.initResrc('pwrCtrl', 0, {
    onOff: {                        // < rid = 5850, RW, Boolean { 0: off, 1: on } >
        read: function (cb) {},
        write: function (cb) {}
    },
    // dimmer: ,                    // < rid = 5851, RW, Integer { 0 ~ 100 }, % >
    // onTime: ,                    // < rid = 5852, RW, Integer, s >
    // cumulActivePwr: ,            // < rid = 5805,  R, Float, Wh >
    // pwrFactor:                   // < rid = 5820,  R, Float >
});
```
  
********************************************
<a name="tmpl_accelerometer"></a>
### 16. Accelerometer

```js
// 16. Accelerometer (oid = 3313 or 'accelerometer')
qnode.initResrc('accelerometer', 0, {
    xValue: {                       // < rid = 5702, R, Float >
        read: function (cb) {}
    },
    // yValue: ,                    // < rid = 5703, R, Float >
    // zValue: ,                    // < rid = 5704, R, Float >
    // units: ,                     // < rid = 5701, R, String >
    // minRangeValue: ,             // < rid = 5603, R, Float >
    // maxRangeValue:               // < rid = 5604, R, Float >
});
```
  
********************************************
<a name="tmpl_magnetometer"></a>
### 17. Magnetometer
  
```js
// 17. Magnetometer (oid = 3314 or 'magnetometer')
qnode.initResrc('magnetometer', 0, {
    xValue: {                       // < rid = 5702, R, Float >
        read: function (cb) {}
    },
    // yValue: ,                    // < rid = 5703, R, Float >
    // zValue: ,                    // < rid = 5704, R, Float >
    // units:,                      // < rid = 5701, R, String >
    // compassDir:                  // < rid = 5705, R, Float { 0 ~ 360 }, deg >
});
```
  
********************************************
<a name="tmpl_barometer"></a>
### 18. Barometer
  
```js
// 18. Barometer (oid = 3315 or 'barometer')
qnode.initResrc('barometer', 0, {
    sensorValue: {                  // < rid = 5700, R, Float >
        read: function (cb) {}
    },
    // units: ,                     // < rid = 5701, R, String >
    // minMeaValue: ,               // < rid = 5601, R, Float >
    // maxMeaValue: ,               // < rid = 5602, R, Float >
    // minRangeValue: ,             // < rid = 5603, R, Float >
    // maxRangeValue: ,             // < rid = 5604, R, Float >
    // resetMinMaxMeaValues:        // < rid = 5605, E, Opaque >
});
```
  