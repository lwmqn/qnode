mqtt-node
========================
Client node of lightweight MQTT machine network (LWMQN)  
  
[![NPM](https://nodei.co/npm/mqtt-node.png?downloads=true)](https://nodei.co/npm/mqtt-node/)  

[![Travis branch](https://img.shields.io/travis/lwmqn/mqtt-node/master.svg?maxAge=2592000)](https://travis-ci.org/lwmqn/mqtt-node)
[![npm](https://img.shields.io/npm/v/mqtt-node.svg?maxAge=2592000)](https://www.npmjs.com/package/mqtt-node)
[![npm](https://img.shields.io/npm/l/mqtt-node.svg?maxAge=2592000)](https://www.npmjs.com/package/mqtt-node)
  
## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Basic Usage](#Basic)
5. [APIs and Events](#APIs)

<a name="Overiew"></a>
## 1. Overview

Lightweight MQTT machine network [**LWMQN**](http://lwmqn.github.io) is an architecture that follows part of [**OMA LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

* This module, **mqtt-node**, is an implementation of LWMQN Client to be used at machine-side.  
* [**mqtt-shepherd** (LWMQN Server)](https://github.com/simenkid/mqtt-shepherd) and **mqtt-node** are working together to form an IoT machine network.  
* **mqtt-node** is suitable for devices that can run node.js, such as [Linkit Smart 7688](http://home.labs.mediatek.com/hello7688/), [Raspberry Pi](https://www.raspberrypi.org/), [Beaglebone Black](http://beagleboard.org/BLACK), [Edison](http://www.intel.com/content/www/us/en/do-it-yourself/edison.html), and many more.  
* This module uses [smartobject](https://github.com/PeterEB/smartobject) as its fundamental of resource organizing on devices. **smartobject** can help you create smart objects with IPSO data model, and it also provides a scheme to help you abstract your hardware into smart objects. You may like to use **smartobject** to create many plugins for your own hardware or modules, i.e., temperature sensor, humidity sensor, light control.  
* **mqtt-node** is trying to let you build IoT peripheral machines with less pain.  

**Note**:  
* IPSO uses **_Object_**, **_Object Instance_** and **_Resource_** to describe the hierarchical structure of resources on a Client Device, where oid, iid, and rid are identifiers of them respectively to allocate resources on a Client Device.  
* An IPSO **_Object_** is like a Class, and an **_Object Instance_** is an entity of the Class. For example, when you have many 'temperature' sensors, you have to use an iid on each Object Instance to distinguish one entity from the other.  

<br />

#### Acronyms and Abbreviations
* **Server**: LWMQN server
* **Client** or **Client Device**: LWMQN client, which is a machine node in the network
* **MqttNode**: class exposed by `require('mqtt-node')`  
* **qnode**: instance of MqttNode class  
* **oid**: identifier of an Object  
* **iid**: identifier of an Object Instance  
* **rid**: indetifier of a Resource  

<a name="Features"></a>
## 2. Features

* Communication based on MQTT protocol and library [**mqtt.js**](https://www.npmjs.com/package/mqtt)  
* Resources structured in a hierarchical Smart-Object-style (IPSO)  
* LWM2M-like interfaces for Client/Server interaction  
* Handle many REQ/RSP things for you. All you have to do is plan your _Resources_ well.  
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-node --save
  
<a name="Basic"></a>
## 4. Basic Usage

* Client-side exmaple (here is how you use `mqtt-node` on a machine node):  

```js
var SmartObject = require('smartobject');
var MqttNode = require('mqtt-node');

/*********************************************/
/*** Smart Object: Resources Initialzation ***/
/*********************************************/
// Initialize Resources that follow IPSO definition
var so = new SmartObject();

// We have two humidity sensors here
so.init('humidity', 0, {    // oid = 'humidity', iid = 0
    sensorValue: 20,
    units: 'percent'
});

so.init('humidity', 1, {    // oid = 'humidity', iid = 1
    sensorValue: 16,
    units: 'percent'
});

// Initialize a custom Resource
so.init('myObject', 0, {    // oid = 'myObject', iid = 0
    myResrc1: 20,
    myResrc2: 'hello world!'
});

// If the Resouces have been bundle into a plugin or a separated module, you can require and 
// use it directly, like:  
//     var so = require('foo-ipso-temperature-plugin');
// or, var so = require('./hal/my_temp_sensor.js');

/*********************************************/
/*** Client Device Initialzation           ***/
/*********************************************/
// Instantiate a machine node with your smart object
var qnode = new MqttNode('my_foo_client_id', so);

qnode.on('ready', function () {
    // Device is ready now, but not remotely register to a LWMQN server yet.  

    // You can start to run your application, such as temperature sensing and display the
    // sensed value with a small OLED monitor on the device. To interact with your resources,
    // simply use the APIs provided by SmartObject class. It's handy and convenient.  
});

qnode.on('registered', function () {
    // If the registration procedure completes successfully, 'registered' will be fired.  
    // Now your device has joined a network, and managed by a LWMQN server.  
    // This event only fires once 

    // Device is now ready to accept some remote requests from the server (qnode itself will 
    // handle with those requests and make the response, so don't worry about the REQ/RSP things).  

    // Your device can also subscribe to any topic it is interested in, or publish any topic
    // to the network. After a successful registration, you can take the LWMQN as a simple 
    // MQTT broker.  
});

qnode.on('login', function () {
    // Each time qnode successfully connects to a LWMQN server, 'login' event will be fired.  
});

qnode.on('logout', function () {
    // Each time qnode disconnects from a LWMQN server, 'logout' event will be fired.  
});

// Connect and register to a LWMQN Server
qnode.connect('mqtt://192.168.0.2');
```

* Server-side example (please go to [mqtt-shepherd](https://github.com/simenkid/mqtt-shepherd) document for details):  

```js
var qnode = qserver.find('my_foo_client_id');   // find the registered device by its client id

if (qnode) {
    qnode.readReq('humidity/0/sensorValue', function (err, rsp) {
        if (!err)
            console.log(rsp.data);      // 20
    });

    qnode.readReq('myObject/0/myResrc2', function (err, rsp) {
        if (!err)
            console.log(rsp.data);      // 'hello world!'
    });
}
```
  
<a name="APIs"></a>
## 5. APIs

* [new MqttNode()](#API_MqttNode)
* [getSmartObject()](#API_getSmartObject)
* [isConnected()](#API_isConnected)
* [setDevAttrs()](#API_setDevAttrs)
* LWMQN Interface
    * [connect()](#API_connect)
    * [close()](#API_close)
    * [register()](#API_register)
    * [deregister()](#API_deregister)
    * [checkout()](#API_checkout)
    * [checkin()](#API_checkin)
    * [notify()](#API_notify)
    * [ping()](#API_ping)
* MQTT Interface
    * [publish()](#API_publish)
    * [subscribe()](#API_subscribe)
    * [unsubscribe()](#API_unsubscribe)

*************************************************

### MqttNode Class

Exposed by `require('mqtt-node')`  
  
<br />

*************************************************
<a name="API_MqttNode"></a>
### new MqttNode(clientId, so[, devAttrs])
Create an instance of `MqttNode` class.  
  
**Arguments:**  

1. `clientId` (_String_): It should be a string and should be unique in the network. If it is not unique, you will get an response of conflict when trying to connect to a LWMQN server. Using mac address (with a prefix or suffix) as the `clientId` would be a good idea.  
2. `so` (_Object_): A smart object that maintains all _Resources_ on the device. This object should be an instance of the [SmartObject](https://github.com/PeterEB/smartobject) class.  
3. `devAttrs` (_Object_): Optional. An object to describe information about the device. The following table shows details of each property within `devAttrs` object.  

| Property | Type   | Mandatory | Description                                                                            |  
|----------|--------|-----------|----------------------------------------------------------------------------------------|  
| lifetime | Number | optional  | Default is 86400. Unit: seconds                                                        |  
| version  | String | optional  | Minimum supported LWMQN version (this is not really functional at this moment)         |  
| ip       | String | optional  | Device ip address. By default, mqtt-node itself will query this parameter from system  |  
  
**Returns:**  
  
* (_Object_): qnode

**Examples:**

```js
var MqttNode = require('mqtt-node');
var qnode = new MqttNode('my_foo_client_id', {
    lifetime: 21600,
    version: 'v0.0.2'
});
    
qnode.on('ready', function () {
    console.log(qnode.clientId);    // 'my_foo_client_id'
    console.log(qnode.lifetime);    // 21600
    console.log(qnode.ip);          // '192.168.0.99'
    console.log(qnode.mac);         // '00:0c:29:3e:1b:d2'
    console.log(qnode.version);     // 'v0.0.2'
});

// Do not change the device attributes with direct assigments, 
// i.e., qnode.lifetime = 2000.

// Use qnode.setDevAttrs() to change attributes, and qnode will automatically check 
// if it needs to publish an update message to the server.
```
  
********************************************
<a name="API_getSmartObject"></a>
### .getSmartObject()
Get the smart object on this qnode.  

**Arguments:**  

1. _none_
  
**Returns:**  
  
* (_Object_): so

**Examples:**  
  
```js
var so = qnode.getSmartObject();

// after got the so, you can access its Resources with few convenient methods
so.read('humidity', 1, 'sensorValue', function (err, data) {
    if (!err)
        console.log(data);  // 16
});

so.write('humidity', 0, 'sensorValue', 15.4, function (err, data) {
    if (!err)
        console.log(data);  // 15.4
});
```
  
********************************************
<a name="API_isConnected"></a>
### .isConnected()
Checks if qnode is connected to a server.  

**Arguments:**  

1. _none_
  
**Returns:**  
  
* (_Boolean_): Returns `true` if it is connected, else `false`.  

**Examples:**  
  
```js
qnode.isConnected();    // false
```
  
********************************************
<a name="API_setDevAttrs"></a>
### .setDevAttrs(devAttrs[, callback])
Set device attribues of the qnode, and qnode will automatically check if it needs to publish an update message to the server (if registered and connected).  

**Arguments:**
  
1. `devAttrs` (_Object_): An object of device attributes. It is just like the `devAttrs` argument of MqttNode constructor, but any change of `clientId` and `mac` is not allowed. If you want to change either `clientId` or `mac`, please deregister qnode from the server and then re-connect to the server. Any change of the device attributes will be published with an update message to the server.  
2. `callback` (_Function_): Optional. `function (err, rsp)` will be called when updating procedure is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of device attribues updating.  

| rsp.status | Status Code         | Description                                                                        |
|------------|---------------------|------------------------------------------------------------------------------------|
| 204        | Changed             | The Server accepted this update message successfully                               |
| 400        | BadRequest          | There is an unrecognized attribute in the update message                           |
| 405        | MethodNotAllowed    | If you are trying to change either `clientId` or `mac`, you will get this response |
| 408        | Timeout             | No response from the Server in 10 secs                                             |
| 500        | InternalServerError | The Server has some trouble                                                        |

**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
// this will set the ip on qnode and mqtt-node will publish the update of ip to the Server
qnode.setDevAttrs({
    ip: '192.168.0.211'
}, function (err, rsp) {
    console.log(rsp);   // { status: 204 }
});
```
  
********************************************
<a name="API_connect"></a>
### .connect(url[, opts][, callback])
Connect and register to a LWMQN Server with the given `url`. When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired after each successful connection.  

**Arguments:**  

1. `url` (_String_): Url of the LWMQN Server, e.g. `'mqtt://localhost'`, `'mqtt://192.168.0.100'`, `'mqtt://192.168.0.20:3000'`.  
2. `opts` (_Object_): Optional. The connect options with possible properties given in the following table.  

| Property        | Type             | Default      | Description                                                     |
|-----------------|------------------|--------------|-----------------------------------------------------------------|
| username        | String           | none         | The username required by your broker, if any                    |
| password        | String \| Buffer | none         | The password required by your broker, if any                    |
| keepalive       | Number           | 10           | 10 seconds, set to 0 to disable                                 |
| reconnectPeriod | Number           | 3000         | milliseconds, interval between two reconnections                |
| connectTimeout  | Number           | 30000        | milliseconds, time to wait before a CONNACK is received         |

3. `callback` (_Function_): Optional. `function (err, rsp)` will be called when connects to a Server successfully. `rsp` is an object with a property `status` to tell the result of connection and registration.  

| rsp.status | Status              | Description                                                                      |
|------------|---------------------|----------------------------------------------------------------------------------|
| 200        | OK                  | qnode was registered before and the record is successfully renewed on the Server |
| 201        | Created             | qnode is a new Client registered to the Server successfully                      |
| 400        | BadRequest          | Invalid paramter(s) for registration                                             |
| 408        | Timeout             | No response from the Server in 10 secs                                           |
| 409        | Conflict            | There is a duplicate Client exists (`clientId` or `mac` conflicts)               |
| 500        | InternalServerError | The Server has some trouble                                                      |
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
* Connect without an account  
  
```js
qnode.on('logout', function () {
    console.log('Disconnected from the Server.');
});

// connect without an account
qnode.connect('mqtt://192.168.0.100', function (err, rsp) {
    if (!err)
        console.log(rsp);   // { status: 201 }
});
```
  
* If an account is required  
  
```js
qnode.connect('mqtt://192.168.0.100', {
    username: 'someone',
    password: 'somepassword'
});
```

* Use the MQTT connection options other than defaults  
  
```js
// use the MQTT connection options other than defaults
    qnode.connect('mqtt://192.168.0.100', {
        keepalive: 30,
        reconnectPeriod: 5000
    });
```
  
********************************************
<a name="API_close"></a>
### .close([callback])
Disconnect from the Server. qnode will also fire a `'logout'` event if it is disconnected.  
  
**Arguments:**  

1. `callback` (_Function_): Will be called when the Client is closed.  
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
qnode.on('logout', function () {
    console.log('Disconnected from the Server.');
});

qnode.close();
```
  
********************************************
<a name="API_register"></a>
### .register([callback])
Publish a registering request to the Server. Every time you invoke connect(), qnode will do regiseter to the Server as well. When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired after each success of registration.   
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)`. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of registration. The descriptions of possible `rsp.status` are given in the following table.  
  
| rsp.status | Status              | Description                                                                           |
|------------|---------------------|---------------------------------------------------------------------------------------|
| 200        | OK                  | The Client was registered before and the record is successfully renewed on the Server |
| 201        | Created             | Registration is successful for this new Client                                        |
| 400        | BadRequest          | Invalid paramter(s) for registration                                                  |
| 408        | Timeout             | No response from the Server in 10 secs                                                |
| 409        | Conflict            | Client Id conflicts                                                                   |
| 500        | InternalServerError | The Server has some trouble                                                           |

**Returns:**  

* (_Object_): qnode

**Examples:**  

```js
qnode.register(function (err, rsp) {
    console.log(rsp);  // { status: 201 }
});
```
  
********************************************
<a name="API_deregister"></a>
### .deregister([callback])
Publish a deregistering request to the Server for the Client to leave the network. The Server will remove the Client from the registry and returns a status code of 202 to the Client when succeeds, and a `'deregistered'` event will also be fired.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called when deregistering is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  
  
| rsp.status | Status              | Description                                |
|------------|---------------------|--------------------------------------------|
| 202        | Deleted             | The Client was successfully deregistered   |
| 404        | NotFound            | The Client is not found on the Server      |
| 408        | Timeout             | No response from the Server in 60 secs     |
| 500        | InternalServerError | The Server has some trouble                |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.on('deregistered', function () {
    console.log('qnode has left from the network.');
});

qnode.deregister(function (err, rsp) {
    console.log(rsp);  // { status: 202 }
});
```
  
********************************************
<a name="API_checkout"></a>
### .checkout([duration, ][callback])
Publish a checkout request to tell the Server that qnode is going to sleep. The Server will returns a status code of 200 to acknowledge this checkout. After a successful acknowledgement, qnode can then close its connection from the Server and even power down. 
  
**NOTICE**: After checkout, qnode will not only stop reporting but also clear all report settings. The Server should re-issue the observeReq() if needed.  

**Arguments:**  

1. `duration` (_Function_): `function (err, rsp)` will be called when deregistering is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  
1. `callback` (_Function_): `function (err, rsp)` will be called when deregistering is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  
  
| rsp.status | Status              | Description                                |
|------------|---------------------|--------------------------------------------|
| 200        | OK                  | The Client was successfully deregistered   |
| 404        | NotFound            | The Client is not found on the Server      |
| 408        | Timeout             | No response from the Server in 60 secs     |
| 500        | InternalServerError | The Server has some trouble                |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.on('deregistered', function () {
    console.log('qnode has left from the network.');
});

qnode.deregister(function (err, rsp) {
    console.log(rsp);  // { status: 202 }
});
```
  
********************************************
<a name="API_checkin"></a>
### .checkin([callback]) [TODO]
Publish a deregistering request to the Server for the Client to leave the network. The Server will remove the Client from the registry and returns a status code of 202 to the Client when succeeds, and a `'deregistered'` event will also be fired.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called when deregistering is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  
  
| rsp.status | Status              | Description                                |
|------------|---------------------|--------------------------------------------|
| 202        | Deleted             | The Client was successfully deregistered   |
| 404        | NotFound            | The Client is not found on the Server      |
| 408        | Timeout             | No response from the Server in 60 secs     |
| 500        | InternalServerError | The Server has some trouble                |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.on('deregistered', function () {
    console.log('qnode has left from the network.');
});

qnode.deregister(function (err, rsp) {
    console.log(rsp);  // { status: 202 }
});
```
  
********************************************
<a name="API_notify"></a>
### .notify(note[, callback])
Publish a notificatoin to the Server. The message `note` should be a well-formatted data object.  

* Notice that **mqtt-node** will automatically report notifications to the Server if the Client is **observed** by the Server. Therefore, use this API when you do have to notify something to the Server aggressively in your application.  
* If you like to publish a Resource, `note` should be an object with fields of `oid`, `iid`, `rid` and `data`, where `data` is the Resource value.  
* If you like to publish an Object Instance, `note` should be an object with fields of `oid`, `iid` and `data` fields, where `data` is the Object Instance containing all its Resources. Please refer to [LWMQN Notify Channel](#LWMQN_PAGE) for more info.  

**Arguments:**  

1. `note` (_Object_): A Resource or an Object Instance you like to report to the Server.  
2. `callback` (_Function_): `function (err, rsp)` will be called when the acknowledgement is coming back from the Server.  
  
| rsp.status | Status              | Description                                                  |
|------------|---------------------|--------------------------------------------------------------|
| 204        | Changed             | The Server has got the notification                          |
| 400        | BadRequest          | Invalid parameters, e.g., oid or iid is not given            |
| 404        | NotFound            | The notified Object Instance or Resource cannot be allocated |
| 500        | InternalServerError | The Server has some trouble                                  |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
// pub a Resource
qnode.pubNotify({
    oid: 'humidity',
    iid: 0,
    rid: 'sensorValue',
    data: 32
}, function (err, rsp) {
    console.log(rsp);   // { status: 204 }
});

// pub an Object Instance
qnode.pubNotify({
    oid: 'humidity',
    iid: 0,
    data: {
        sensorValue: 32,
        units: 'percent'
    }
}, function (err, rsp) {
    console.log(rsp);   // { status: 204 }
});

// pub something that the Server cannot recognize
qnode.pubNotify({
    oid: 'foo',
    iid: 0,
    rid: 'bar',
    data: 200
}, function (err, rsp) {
    console.log(rsp);   // { status: 404 }, 404 NotFound
});

// pub something with invalid format
qnode.pubNotify('Hello World', function (err, rsp) {
    console.log(rsp);   // { status: 400 }, 400 BadRequest
});
```
  
********************************************
<a name="API_ping"></a>
### .ping([callback])
Ping the Server.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called upon receiving the response. An `err` occurs if qnode has no connection to the Server. `rsp` is a response object with a status code to tell the result of pinging. `rsp.data` is the approximate round trip time in milliseconds.  
  
| rsp.status | Status              | Description                                                     |
|------------|---------------------|-----------------------------------------------------------------|
| 200        | OK                  | Pinging is successful with `rsp.data` roundtrip time in ms      |
| 408        | Timeout             | No response from the Server in 60 secs. `rsp.data` will be null |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.pingServer(function (err, rsp) {
    console.log(rsp);   // { status: 200, data: 16 }, 16ms
});
```
  
********************************************
<a name="API_publish"></a>
### .publish(topic, message[, options][, callback])
This is a generic method to publish a message to a topic.  
  
If you are using **mqtt-shepherd** as the LWMQN Server, it accepts a registered Client to publish any message to any topic. In this case, the Server simply acts as an MQTT broker. The publishment is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_): Topic to publish to.  
2. `message` (_String | Buffer_): Message to publish.  
3. `options` (_Object_): Option to publish with, including the properties shown in the following table.  
4. `callback` (_Function_): Will be called when the QoS handling completes, or at the next tick if QoS 0.  
  
| Property | Type    | Default | Description |
|----------|---------|---------|-------------|
| `qos`    | Number  | 0       | QoS level   |
| `retain` | Boolean | false   | Retain flag |
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.publish('foo/bar/greet', 'Hello World!');
```
  
********************************************
<a name="API_subscribe"></a>
### .subscribe(topics[, options][, callback])
This is a generic method to subscribe to a topic or topics listed in an array.  
  
If you are using **mqtt-shepherd** as the LWMQN Server, it accepts the registered Client to subscribe to any topic. In this case, the Server simply acts as an MQTT broker. The generic subscription is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topics` (_String_ | _String[]_): The topic(s) to subscribe to.  
2. `options` (_Object_): Option to subscribe with, including the property `qos` which is a Qos level of the subscription. `qos` is 0 by default.  
3. `callback` (_Function_): `function (err, granted)` callback will be called on suback, where `err` is a subscrtiption error and `granted` is an array of objects formatted in `{ topic, qos }`  
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.subscribe('foo/bar/score', function (err, granted) {
    console.log(granted);   // [ { topic: 'foo/bar/score', qos: 0 } ]
});
```
  
********************************************
<a name="API_unsubscribe"></a>
### .unsubscribe(topics[, callback])
This is a generic method to unsubscribe from a topic or topics.  

If you are using **mqtt-shepherd** as the LWMQN Server, the generic unsubscription is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_|_String[]_): Topic(s) to unsubscribe from.  
2. `callback` (_Function_): Callback will be fired on unsuback  
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.unsubscribe('foo/bar/score');
```
  
