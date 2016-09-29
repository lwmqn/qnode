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
6. [Message Encryption](#Encryption)
7. [Debug Messages](#Debug)

<a name="Overiew"></a>
## 1. Overview

Lightweight MQTT machine network [**LWMQN**](http://lwmqn.github.io) is an open source project that follows part of [**OMA LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

Here is a [**demo webapp**](https://github.com/lwmqn/lwmqn-demo) that shows a simple smart home application built with LWMQN.  
![LWMQN Network](https://github.com/lwmqn/documents/blob/master/media/lwmqn_net.png)

* **LWM2M-like Interfaces and Smart Object Model**
    - Not only has the LWM2M-like interfaces, LWMQN also utilizes the [IPSO Smart Object](http://www.ipso-alliance.org/) as its fundamental of resource organization, this leads to a comprehensive and consistent way in describing real-world gadgets.

* **mqtt-shepherd and mqtt-node libraries**
   - LWMQN project provides you with a server-side [**mqtt-shepherd**](https://github.com/lwmqn/mqtt-shepherd) library and a machine-side **mqtt-node** library to run your machine network with JavaScript and node.js. By these two libraries and node.js, you can have your own authentication, authorization and encryption subsystems to secure your network easily.

## LWMQN Client: mqtt-node

* This module, **mqtt-node**, is an implementation of LWMQN Client to be used at machine-side.  
* It is suitable for devices that can run node.js, such as [Linkit Smart 7688](http://home.labs.mediatek.com/hello7688/), [Raspberry Pi](https://www.raspberrypi.org/), [Beaglebone Black](http://beagleboard.org/BLACK), [Edison](http://www.intel.com/content/www/us/en/do-it-yourself/edison.html), and many more.  
* It uses [SmartObject](https://github.com/PeterEB/smartobject) class as its fundamental of resource organization on devices.
    - **smartobject** can help you create smart objects with IPSO data model, and it also provides a scheme to help you with abstracting your hardware into smart objects. You may also like to use **SmartObject** to create many plugins for your own hardware or modules, i.e., temperature sensor, humidity sensor, light controller.
    - Here is a [tutorial of how to plan resources](https://github.com/PeterEB/smartobject/blob/master/docs/resource_plan.md) with smartobject.

**Note**:  
* IPSO uses **_Object_**, **_Object Instance_** and **_Resource_** to describe the hierarchical structure of resources on a Client Device, where **oid**, **iid**, and **rid** are identifiers of them respectively to allocate resources on a Client Device.  
* An IPSO **_Object_** is like a Class, and an **_Object Instance_** is an entity of the Class. For example, when you have many 'temperature' sensors, you have to use an **iid** on each sensor (Object Instance) to distinguish one entity from the other.  

<br />

#### Acronyms and Abbreviations
* **Server**: LWMQN server  
* **Client** or **Client Device**: LWMQN client, which is a machine node in the network  
* **MqttNode**: Class exposed by `require('mqtt-node')`  
* **SmartObject**: Class exposed by `require('smartobject')`  
* **qnode**: Instance of MqttNode class  
* **so**: Instance of SmartObject class  

<br />

<a name="Features"></a>
## 2. Features

* Communication based on MQTT protocol and library [**mqtt.js**](https://www.npmjs.com/package/mqtt)  
* Resources structured in a hierarchical Smart-Object-style (IPSO)  
* LWM2M-like interfaces for Client/Server interaction  
* Auto handle many REQ/RSP things for you. All you have to do is to plan your _Resources_ well.  
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-node --save
  
<a name="Basic"></a>
## 4. Basic Usage

Here is a quick example to show you how to use **mqtt-node** and **smartobject** on your machine node:  

* **Step 1**: Import the modules and initialize two humidity sensors and one custom Object within the smart object `so`:
    ```js
    var MqttNode = require('mqtt-node'),
        SmartObject = require('smartobject');

    var so = new SmartObject();

    // Humidity sensor - the first instance
    so.init('humidity', 0, {    // oid = 'humidity', iid = 0
        sensorValue: 20,
        units: 'percent'
    });

    // Humidity sensor - the second instance
    so.init('humidity', 1, {    // oid = 'humidity', iid = 1
        sensorValue: 16,
        units: 'percent'
    });

    // A custom Object with two Resources: myResrc1 and myResrc2
    so.init('myObject', 0, {    // oid = 'myObject', iid = 0
        myResrc1: 20,
        myResrc2: 'hello world!'
    });
    ```
    - You can bundle your smart object into a plugin or a separated module, and then use it like:
    ```js
        var so = require('foo-ipso-temperature-plugin');
        // or
        var so = require('./hal/my_temp_sensor.js');
    ```

* **Step 2**: Create a qnode with a client id and your smart object. And have your 'ready' and 'registered' event listeners:  
    - **'ready'** event fires when the device is ready, but not yet remotely register to a Server.
    - **'registered'** event fires when registration procedure completes successfully, whicn means your device has joined the network and managed by the Server. After a success of registration, you can take the LWMQN Server as a simple MQTT broker. Your device can subscribe to any topic or publish any topic to the network (if authorized).
    ```js
    var qnode = new MqttNode('my_foo_client_id', so);

    qnode.on('ready', function () {
        // You can start to run your local app, such as showing the sensed value on an OLED monitor.
        // To interact with your Resources, simply use the handy APIs provided by SmartObject class.
    });

    qnode.on('registered', function () {
        // Your qnode is now in the netwrok. This event only fires at the first time of qnode registered to the Server.
    });

    qnode.on('login', function () {
        // Your qnode is now ready to accept remote requests from the Server. Don't worry about the 
        // REQ/RSP things, qnode itself will handle them for you.  
    });

    ```

* **Step 3**: Connect and register to a Sever, that's it!
    ```js
    qnode.connect('mqtt://192.168.0.2');
    ```

The following exmaple shows how to operate upon this qnode **at server-side** (please go to [mqtt-shepherd](https://github.com/simenkid/mqtt-shepherd) document for details):  

```js
var qnode = qserver.find('my_foo_client_id');   // find the registered device by its client id

if (qnode) {
    qnode.readReq('humidity/0/sensorValue', function (err, rsp) {
        if (!err) console.log(rsp);   // { status: 205, data: 20 }
    });

    qnode.readReq('myObject/0/myResrc2', function (err, rsp) {
        if (!err) console.log(rsp);   // { status: 205, data: 'hello world!' }
    });
}
```
  
<a name="APIs"></a>
## 5. APIs

* [new MqttNode()](#API_MqttNode)
* [getSmartObject()](#API_getSmartObject)
* [isConnected()](#API_isConnected)
* [setDevAttrs() ](#API_setDevAttrs) -- _**Deprecated**_
* LWMQN Interfaces
    * [connect()](#API_connect)
    * [close()](#API_close)
    * [register()](#API_register)
    * [deregister()](#API_deregister)
    * [update()](#API_update)
    * [checkout()](#API_checkout)
    * [checkin()](#API_checkin)
    * [notify()](#API_notify)
    * [ping()](#API_ping)
* Generic MQTT Interfaces
    * [publish()](#API_publish)
    * [subscribe()](#API_subscribe)
    * [unsubscribe()](#API_unsubscribe)
* Events
    * ['registered'](#EVT_registered), ['deregistered'](#EVT_deregistered)
    * ['login'](#EVT_login), ['logout'](#EVT_logout), ['offline'](#EVT_offline), ['reconnect'](#EVT_reconnect)
    * ['message'](#EVT_message)
    * ['error'](#EVT_error)

*************************************************

### MqttNode Class

Exposed by `require('mqtt-node')`  
  
*************************************************
<a name="API_MqttNode"></a>
### new MqttNode(clientId, so[, devAttrs])
Create an instance of `MqttNode` class.  
  
**Arguments:**  

1. `clientId` (_String_): It should be a string and should be unique in the network. If it is not unique, you will get an response of conflict when trying to connect to a LWMQN Server. Using mac address (with a prefix or suffix) as the `clientId` would be a good idea.  
2. `so` (_Object_): A smart object that maintains all _Resources_ on the device. This object should be an instance of the [SmartObject](https://github.com/PeterEB/smartobject) class.  
3. `devAttrs` (_Object_): Optional. An object to describe information about the device. The following table shows details of each property within `devAttrs` object.  

    | Property | Type   | Mandatory | Description                                                                            |  
    |----------|--------|-----------|----------------------------------------------------------------------------------------|  
    | lifetime | Number | optional  | Default is 86400 (unit: seconds).                                                      |  
    | version  | String | optional  | Minimum supported LWMQN version (this is not really functional at this moment).        |  
    | ip       | String | optional  | Device ip address. By default, mqtt-node itself will query this parameter from system. |  
  
**Returns:**  
  
* (_Object_): qnode

**Examples:**

```js
var MqttNode = require('mqtt-node');
var qnode = new MqttNode('my_foo_client_id', {
    lifetime: 21600,
    version: '0.0.2'
});
    
qnode.on('ready', function () {
    console.log(qnode.clientId);    // 'my_foo_client_id'
    console.log(qnode.lifetime);    // 21600
    console.log(qnode.ip);          // '192.168.0.99'
    console.log(qnode.mac);         // '00:0c:29:3e:1b:d2'
    console.log(qnode.version);     // '0.0.2'
});

// Do not change the device attributes with direct assigments, i.e., qnode.lifetime = 2000.

// Use qnode.update() to change attributes, and qnode will automatically check if it 
// needs to publish an update message to the Server.
```
  
********************************************
<a name="API_getSmartObject"></a>
### .getSmartObject()
Get the smart object used on this qnode. You can access its Resources with [read](https://github.com/PeterEB/smartobject#API_read)/[write](https://github.com/PeterEB/smartobject#API_write)/[exec](https://github.com/PeterEB/smartobject#API_exec) methods provieded by SmartObject class. Use these method to access you smart object, and qnode itself will check if it needs to report the changes to the Server according to the settings of obsevation.  

**Arguments:**  

1. _none_
  
**Returns:**  
  
* (_Object_): so

**Examples:**  
  
```js
var so = qnode.getSmartObject();
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
Checks if qnode is connected to a Server.  

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
### .setDevAttrs(devAttrs, callback) -- **_Deprecated_**
Set device attribues of the qnode, and qnode will automatically check if it needs to publish an update message to the Server.  
  
This API is deprecated, please use **[update()](#API_update)** instead.

*************************************************
### LWMQN Interfaces

<a name="API_connect"></a>
### .connect(url[, opts][, callback])
Connect and register to a LWMQN Server by the given `url`. When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired at each success of connection.  

**Arguments:**  

1. `url` (_String_): Url of LWMQN Server, e.g. `'mqtt://localhost'`, `'mqtt://192.168.0.100'`, `'mqtt://192.168.0.20:3000'`.
2. `opts` (_Object_): Optional. The connect options with possible properties given in the following table.

    | Property        | Type             | Default      | Description                                                     |
    |-----------------|------------------|--------------|-----------------------------------------------------------------|
    | username        | String           | none         | The username required by your broker, if any                    |
    | password        | String \| Buffer | none         | The password required by your broker, if any                    |
    | keepalive       | Number           | 10           | 10 seconds, set to 0 to disable                                 |
    | reconnectPeriod | Number           | 3000         | milliseconds, interval between two reconnections                |
    | connectTimeout  | Number           | 30000        | milliseconds, time to wait before a CONNACK is received         |

3. `callback` (_Function_): Optional. `function (err, rsp) {}` will be called when connects to a Server successfully. `rsp` is an object with a property `status` to tell the result of connection and registration.

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
qnode.on('login', function () {
    console.log('Connected to the Server.');
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
}, function (err, rsp) {
    if (!err)
        console.log(rsp);   // { status: 201 }
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
Disconnect from the Server. qnode will also fire a `'logout'` event if it is disconnected from the Server.  
  
**Arguments:**  

1. `callback` (_Function_): Optional. `function (err) {}` will be called when the Client is closed.  
  
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
### .register(callback)
Publish a registering request to the Server. **Every time you invoke connect(), qnode will do regiseter to the Server as well.** When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired after each success of registration.   
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp) {}`. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of registration. The descriptions of possible `rsp.status` are given in the following table.  
  
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
### .deregister(callback)
Publish a deregistering request to the Server for the Client to leave the network. The Server will remove the Client from the registry and returns a status code of 202 to the Client when succeeds, and qnode will fire a `'deregistered'` event as well.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp) {}` will be called when deregistering is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  
  
    | rsp.status | Status              | Description                                |
    |------------|---------------------|--------------------------------------------|
    | 202        | Deleted             | The Client was successfully deregistered   |
    | 404        | NotFound            | The Client is not found on the Server      |
    | 408        | Timeout             | No response from the Server in 10 secs     |
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
<a name="API_update"></a>
### .update(devAttrs, callback)
Set device attribues of the qnode, and qnode will automatically check what attributes have been changed and publish an update message to the Server.  

**Arguments:**
  
1. `devAttrs` (_Object_): An object of device attributes. It is just like the `devAttrs` argument of [MqttNode constructor](#API_MqttNode), but any change of `clientId` and `mac` is not allowed. If you want to change either `clientId` or `mac`, please deregister qnode from the Server and then connect to the Server again.
2. `callback` (_Function_): `function (err, rsp) {}` will be called when updating procedure is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of device attribues updating.

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
qnode.update({
    ip: '192.168.0.211'
}, function (err, rsp) {
    console.log(rsp);   // { status: 204 }
});
```

********************************************
<a name="API_checkout"></a>
### .checkout([duration, ]callback)

Publish a checkout message to inform the Server that this qnode is going to sleep. The Server will returns a status code of 200 to acknowledge this checkout message. A `'logout'` event will be fired when it checks out successfully.  

* After received a successful acknowledgement, qnode can then close its connection from the Server, power down, or even power off.  
* If qnode checks out with a given `duration` , for example 600 seconds, the Server knows this qnode is going to sleep and expects that this qnode will wake up and check in at 600 seconds later. If qnode does not then check in (within 2 seconds at that moment) or reconnect to the Server, the Server will take it as an offline Client.  
* If qnode checks out without the `duration`, the Server knows this qnode is going to sleep but has no idea about when it will wake up and check in again. The Server will always take it as a sleeping Client. (This is okay, since each time when the Server likes to send something to a sleeping Client, it will do a quick test to see if the Client is up.)  
* **NOTE**: After a success of checkout, qnode will not only stop reporting but also clear all the report settings. The Server should re-issue the observeReq(), when the Client goes online again, if needed.  

**Arguments:**  

1. `duration` (_Number_): Optional. How many seconds from now that this qnode will check in again.  
1. `callback` (_Function_): `function (err, rsp)` will be called when checkout is acknowledged. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of checkout.  
  
    | rsp.status | Status              | Description                                |
    |------------|---------------------|--------------------------------------------|
    | 200        | OK                  | The checkout message is acknowledged       |
    | 404        | NotFound            | The Client is not found on the Server      |
    | 408        | Timeout             | No response from the Server in 10 secs     |
    | 500        | InternalServerError | The Server has some trouble                |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.on('logout', function () {
    console.log('qnode has logged out from the network.');
});

qnode.checkout(function (err, rsp) {
    console.log(rsp);  // { status: 200 }

    if (rsp.status === 200) {
        console.log('qnode has checked out from the network.');

        qnode.close();  // close the connection.
                        // The Server will take this qnode as a sleeping Client
                        // but not an offline one.
    }
});
```
  
********************************************
<a name="API_checkin"></a>
### .checkin(callback)

Publish a checkin message to inform the Server that this qnode is up from sleep. The Server will returns a status code of 200 to acknowledge this checkin message and take this qnode as an online Client. After received a successful acknowledgement, qnode can do something and schedule another checkout later. A `'login'` event will be fired when the qnode checks in successfully.   
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called when checkin is acknowledged. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of deregistration.  

    | rsp.status | Status              | Description                                |
    |------------|---------------------|--------------------------------------------|
    | 200        | OK                  | The checkin message is acknowledged        |
    | 404        | NotFound            | The Client is not found on the Server      |
    | 408        | Timeout             | No response from the Server in 10 secs     |
    | 500        | InternalServerError | The Server has some trouble                |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.on('login', function () {
    console.log('qnode has logged in the network.');
});

if (qnode.isConnected()) {
    qnode.checkin(function (err, rsp) {
        console.log(rsp);  // { status: 200 }
    });
} else {
    qnode.connect('mqtt://192.168.0.100', function (err, rsp) {
        if (!err && rsp.status === 200) {
            qnode.checkin(function (err, rsp) {
                console.log(rsp);  // { status: 200 }
            });
        }
    });
}
```
  
********************************************
<a name="API_notify"></a>
### .notify(note, callback)
Publish a notificatoin to the Server. The message `note` should be a well-formatted data object.  

* Notice that **mqtt-node will automatically report notifications** to the Server if the Client is **observed** by the Server. Therefore, use this API when you do have to notify something to the Server aggressively in your application.  
* If you like to publish a Resource, `note` should be an object with fields of `oid`, `iid`, `rid` and `data`, where `data` is the Resource value.  
* If you like to publish an Object Instance, `note` should be an object with fields of `oid`, `iid` and `data` fields, where `data` is the Object Instance containing all its Resources.  

**Arguments:**  

1. `note` (_Object_): A Resource or an Object Instance you like to report to the Server.  
2. `callback` (_Function_): `function (err, rsp) {}` will be called when the acknowledgement is coming back from the Server.  
  
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
qnode.notify({
    oid: 'humidity',
    iid: 0,
    rid: 'sensorValue',
    data: 32
}, function (err, rsp) {
    console.log(rsp);   // { status: 204 }
});

// pub an Object Instance
qnode.notify({
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
qnode.notify({
    oid: 'foo',
    iid: 0,
    rid: 'bar',
    data: 200
}, function (err, rsp) {
    console.log(rsp);   // { status: 404 }, 404 NotFound
});

// pub something with invalid format
qnode.notify('Hello World', function (err, rsp) {
    console.log(rsp);   // { status: 400 }, 400 BadRequest
});
```
  
********************************************
<a name="API_ping"></a>
### .ping(callback)
Ping the Server.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp) {}` will be called upon receiving the response. An `err` occurs if qnode has no connection to the Server. `rsp` is a response object with a status code to tell the result of pinging. `rsp.data` is the approximate round-trip time in milliseconds.  
  
    | rsp.status | Status              | Description                                                     |
    |------------|---------------------|-----------------------------------------------------------------|
    | 200        | OK                  | Pinging is successful with `rsp.data` roundtrip time in ms      |
    | 408        | Timeout             | No response from the Server in 10 secs. `rsp.data` will be null |

**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.ping(function (err, rsp) {
    console.log(rsp);   // { status: 200, data: 16 }, round-trip time is 16 ms
});
```
  
*************************************************
### Generic MQTT Interfaces

<a name="API_publish"></a>
### .publish(topic, message[, options], callback)
This is a generic method to publish a message to a topic.  
  
If you are using **mqtt-shepherd** as the LWMQN Server, it accepts a registered Client to publish any message to any topic (if authorized). In this case, the Server simply acts as an MQTT broker. The publishment is not allowed at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_): Topic to publish to.
2. `message` (_String | Buffer_): Message to publish with.
3. `options` (_Object_): Optional. Option to publish with, including the properties shown in the following table.

    | Property | Type    | Default | Description |
    |----------|---------|---------|-------------|
    | `qos`    | Number  | 0       | QoS level   |
    | `retain` | Boolean | false   | Retain flag |

4. `callback` (_Function_): `function (err, encMsg) {}`, will be called when the QoS handling completes, or at the next tick if QoS 0. An error occurs if client is disconnecting. `encMsg` is the encryted message to publish out.

  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.publish('foo/bar/greet', 'Hello World!', function (err, encMsg) {
    if (err)
        console.log(err);
    else
        console.log(encMsg);    // 'Hello World!' if you don't implement the encryption
});
```
  
********************************************
<a name="API_subscribe"></a>
### .subscribe(topics[, options], callback)
This is a generic method to subscribe to a topic or topics listed in an array.  
  
If you are using **mqtt-shepherd** as the LWMQN Server, it accepts the registered Client to subscribe to any topic (if authorized). In this case, the Server simply acts as an MQTT broker. The generic subscription is not allowed at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topics` (_String_ | _String[]_): The topic(s) to subscribe to.  
2. `options` (_Object_): Option to subscribe with, including the property `qos` which is a QoS level of the subscription. `qos` is 0 by default.  
3. `callback` (_Function_): `function (err, granted) {}`, will be called on suback, where `err` is a subscrtiption error and `granted` is an array of objects formatted in `{ topic, qos }`. An error occurs if client is disconnecting.  
  
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
### .unsubscribe(topics, callback)
This is a generic method to unsubscribe from a topic or topics.  

If you are using **mqtt-shepherd** as the LWMQN Server, the generic unsubscription is not allowed at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_|_String[]_): Topic(s) to unsubscribe from.  
2. `callback` (_Function_): `function (err) {}`, will be called on unsuback. An error occurs if client is disconnecting.  
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.unsubscribe('foo/bar/score', function (err) {
    if (err)
        console.log(err);
});
```

********************************************
### Events

<a name="EVT_registered"></a>
#### Event: 'registered'  
Listener: `function () {}`  
Fires when qnode is at its first time of registering to the LWMQN Server successfully. If qnode has registered before, only the 'login' event will be fired at each success of registration.  

********************************************
<a name="EVT_deregistered"></a>
#### Event: 'deregistered'  
Listener: `function () {}`  
Fires when qnode deregisters from the LWMQN Server successfully.  

********************************************
<a name="EVT_login"></a>
#### Event: 'login'  
Listener: `function () {}`  
Fires when qnode connects and login to the Server successfully.  

********************************************
<a name="EVT_logout"></a>
#### Event: 'logout'  
Listener: `function () {}`  
Fires when qnode disconnects and logout from the Server successfully.  

********************************************
<a name="EVT_reconnect"></a>
#### Event: 'reconnect'  
Listener: `function () {}`  
Fires when qnode starts to reconnect to the Server.  

********************************************
<a name="EVT_offline"></a>
#### Event: 'offline'  
Listener: `function () {}`  
Fires when qnode loses its connection to the Server, e.g., the Server is down or qnode goes offline.  

********************************************
<a name="EVT_message"></a>
#### Event: 'message'  
Listener: `function (topic, message, packet) {}`  
Fires when qnode receives a generic publish packet. You should have your own message listener if you'd like to subscribe to generic MQTT topics.  
* `topic` (_String_): topic of the received packet
* `message` (_Buffer_ | _String_): payload of the received packet
* `packet` (_Object_): received packet, as defined in [mqtt-packet](https://github.com/mqttjs/mqtt-packet#publish)

********************************************
<a name="EVT_error"></a>
#### Event: 'error'
Listener: `function (err) {}`  
* The low-layer errors from mqtt.js will propagate through this event.
* When invoking `connect()` or `close()` methods without a callback, the error occurring in these methods will be fired along with the `error` event instead.
* **Most importantly, if there is no `error` event listener attached on qnode, errors will be rethrown to crash your program.**

********************************************
<a name="Encryption"></a>
## 6. Message Encryption  

By default, the qnode won't encrypt the message. You can override the encrypt() and decrypt() methods to implement your own message encryption and decryption. If you did, you should implement the encrypt() and decrypt() methods at your Server as well.  

***********************************************
### qnode.encrypt(msg, cb)
Method of encryption. Overridable.  

**Arguments:**  

1. `msg` (_String_ | _Buffer_): The outgoing message.  
2. `cb` (_Function_): `function (err, encrypted) {}`, the callback you should call and pass the encrypted message to it after encryption.  
  

***********************************************
### qnode.decrypt(msg, cb)
Method of decryption. Overridable.  

**Arguments:**  

1. `msg` (_Buffer_): The incoming message which is a raw buffer.  
2. `cb` (_Function_): `function (err, decrypted) {}`, the callback you should call and pass the decrypted message to it after decryption.  
  
***********************************************
**Encryption/Decryption Example:**  

```js
// In this example, I simply encrypt the message with a constant password 'mysecrete'.

qnode.encrypt = function (msg, callback) {
    var msgBuf = new Buffer(msg),
        cipher = crypto.createCipher('aes128', 'mysecrete'),
        encrypted = cipher.update(msgBuf, 'binary', 'base64');
    try {
        encrypted += cipher.final('base64');
        callback(null, encrypted);
    } catch (err) {
        callback(err);
    }
};

qnode.decrypt = function (msg, callback) {
    msg = msg.toString();
    var decipher = crypto.createDecipher('aes128', 'mypassword'),
        decrypted = decipher.update(msg, 'base64', 'utf8');

    try {
        decrypted += decipher.final('utf8');
        callback(null, decrypted);
    } catch (e) {
        // log 'decrytion fails'
        console.log('decrytion fails.');
        callback(e);
    }
};

```

********************************************
<a name="Debug"></a>
## 7. Debug Messages

Like many node.js modules do, **mqtt-node** utilizes [debug](https://www.npmjs.com/package/debug) module to print out messages that may help in debugging. The namespaces include `mqtt-node`, `mqtt-node:init`, `mqtt-node:request`, and `mqtt-node:msgHdlr`. The `mqtt-node:request` logs requests that qnode sends to the Server, and `mqtt-node:msgHdlr` logs the requests that comes from the Server.  

If you like to print the debug messages, run your app.js with the DEBUG environment varaible:

```sh
$ DEBUG=mqtt-node* app.js          # use wildcard to print all mqtt-node messages
$ DEBUG=mqtt-node:msgHdlr app.js   # if you are only interested in mqtt-node:msgHdlr messages
```

Example:

```sh
simen@ubuntu:~/develop/mqtt-node$ DEBUG=mqtt-node* node client
  mqtt-node:init Initialize lwm2mServer object, lifetime: 2000 +0ms
  ...
  mqtt-node qnode created, clientId: test_node_01 +4ms
  mqtt-node:init ip: 192.168.1.102, mac: 00:0c:29:ff:ed:7c, router ip: 192.168.1.1 +20ms
  mqtt-node:init Local init done! Wait for LWMQN network establishment +0ms
  mqtt-node Connect to broker +1s
  mqtt-node:init LWMQN establishing stage 1: register, deregister, and ...
  mqtt-node:request REQ --> register, transId: 1 +2ms
  mqtt-node:msgHdlr REQ <-- ping, transId: 0 +14ms
  mqtt-node:msgHdlr RSP --> ping, transId: 0 +0ms
  mqtt-node:request RSP <-- register, transId: 1, status: 200 +1ms
  mqtt-node:init LWMQN establishing stage 2: notify, update, ping, announce, ...
  mqtt-node:init LWMQN establishing done! - Old client rejoined +0ms
  mqtt-node:msgHdlr REQ <-- read, transId: 1 +12ms
  mqtt-node:msgHdlr REQ <-- read, transId: 2 +0ms
  mqtt-node:msgHdlr REQ <-- read, transId: 3 +1ms
  mqtt-node:msgHdlr REQ <-- read, transId: 4 +0ms
  mqtt-node:msgHdlr REQ <-- read, transId: 5 +0ms
  mqtt-node:msgHdlr REQ <-- read, transId: 6 +0ms
  mqtt-node:msgHdlr RSP --> read, transId: 1, status: 205 +9ms
  mqtt-node:msgHdlr RSP --> read, transId: 2, status: 205 +0ms
  mqtt-node:msgHdlr RSP --> read, transId: 4, status: 205 +3ms
  mqtt-node:msgHdlr RSP --> read, transId: 5, status: 205 +0ms
  mqtt-node:msgHdlr RSP --> read, transId: 6, status: 205 +1ms
  mqtt-node:msgHdlr RSP --> read, transId: 3, status: 205 +29ms
  ...
  mqtt-node:msgHdlr REQ <-- writeAttrs, transId: 15 +6ms
  mqtt-node:msgHdlr RSP --> writeAttrs, transId: 15, status: 204 +12ms
```