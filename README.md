mqtt-node
========================

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Basic Usage](#Basic)
5. [Resources Planning](#Resources)
6. [APIs](#APIs)
7. [Code Templates](#Templates) 

<a name="Overiew"></a>
## 1. Overview

The lightweight MQTT machine network ([**LWMQN**](https://simenkid.github.io/lwmqn)) is an architecture that follows part of [**LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

[**mqtt-shepherd**](https://github.com/simenkid/mqtt-shepherd) is an implementation of LWMQN Server and this module [**mqtt-node**](https://github.com/simenkid/mqtt-node) is an implementation of LWMQN Client on node.js. They are working together into an IoT machine network. This client module is suitable for devices that can run node.js, such as [Linkit Smart 7688](http://home.labs.mediatek.com/hello7688/), [Raspberry Pi](https://www.raspberrypi.org/), [Beaglebone Black](http://beagleboard.org/BLACK), [Edison](http://www.intel.com/content/www/us/en/do-it-yourself/edison.html) and many more.  

**mqtt-node** uses IPSO definitions as its fundamental of resource organizing on devices. This document also provides templates of many common devices defined by IPSO [**Smart Objects starter pack 1.0**](http://www.ipso-alliance.org/smart-object-guidelines/), i.e., temperature sensor, humidity sensor, light control. **mqtt-node** is trying to let you build the IoT peripheral machines with no pain.  

#### Acronym
* **MqttNode**: class exposed by `require('mqtt-node')`  
* **qnode**: instance of MqttNode class  
* **oid**: identifier of an Object  
* **iid**: identifier of an Object Instance  
* **rid**: indetifier of a Resource  

Note: IPSO uses _Object_, _Object Instance_ and _Resource_ to describe the hierarchical structure of resources on a Client Device. The oid, iid, and rid are identifiers of them respectively to allocate the resource on a device.  

<a name="Features"></a>
## 2. Features

* Communication based on MQTT protocol and library [**mqtt.js**](https://www.npmjs.com/package/mqtt)  
* Structuring the device resources in a hierarchical Smart-Object-style (IPSO)  
* Easy to create a Resource on a Client Device  
* LWM2M-like interfaces for Client/Server interaction 
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-node --save
  
<a name="Basic"></a>
## 4. Basic Usage

Client-side exmaple (here is how to use the `mqtt-node`):  

```js
var MqttNode = require('mqtt-node');

/********************************************/
/*** Client Device Initialzation          ***/
/********************************************/
var qnode = new MqttNode('my_foo_client_id');

// Initialize the Resource that follows the IPSO definition
// We have two humidity sensor here
// oid = 'humidity', iid = 0
qnode.initResrc('humidity', 0, {
    sensorValue: 20,
    units: 'percent'
});
// / oid = 'humidity', iid = 1
qnode.initResrc('humidity', 1, {
    sensorValue: 16,
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

// Coonect to the server with the default account of mqtt-shepherd
// Registration procedure 
qnode.connect('mqtt://192.168.0.2', {
    username: 'freebird',
    password: 'skynyrd'
});
```

Server-side example (please go to [mqtt-shepherd](https://github.com/simenkid/mqtt-shepherd) document for details):  

```js
var qnode = shepherd.findNode('my_foo_client_id');

qnode.readReq('humidity/0/sensorValue', function (err, rsp) {
    console.log(rsp.data);      // 20
});

qnode.readReq('myObject/0/myResrc2', function (err, rsp) {
    console.log(rsp.data);      // 'hello world!'
});
```
  
<a name="Resources"></a>
## 5. Resources Planning

The great benefit of using this module in your LWMQN Client design is that you almost need not tackle the requests/responses by yourself since **mqtt-node** has tackled many of them for you. All you have to do is to plan your Resources well. What Resources do you have on the Client Device? Which Resource is readable? Which Resource is writable? And which Resource is remotely executable? Once your Resources are initialized, **mqtt-node** itself will know how to respond to the requests from a LWMQN Server.  
</br>
Use API `initResrc(oid, iid, resrcs)` to initialize your Resources, where `oid` and `iid` are the Object id and Object Instance id, respectively. `resrcs` is an object containing all Resources under this Object Instance. Each key in `resrcs` object should be an `rid` and its corresponding value is the Resource value. Resource value can be a simple primitive, such as a number, a string and a boolean. Here is an example: 
  
```js
// oid = 'temperature' tells mqtt-node that you have a temperature sensor Object
// iid = 0 tells mqtt-node to instantiate this sensor with an identifier of 0
qnode.initResrc('temperature', 0, {
    sensorValue: 20,
    units: 'cel'
});
```
  
You may think that the temperature is a time-varying value, just giving it a number is definitely not a good idea. You developers have responsibility for making this sensor play correctly. Let me show you an example:
  
```js
qnode.initResrc('temperature', 0, {
    sensorValue: 20,
    units: 'cel'
});

// Assume that temperature value is just read from some analog pin
// Here, I poll the pin every 60 seconds and write the sensed value to the corresponding Resource
setInterval(function () {
    var analogVal = analogPin0.read();
    qnode.writeResrc('temperature', 0, 'sensorValue', analogVal);
}, 60*1000);
```
  
So far, polling seems just fine in this temperature sensing example. If the Server requests for the sensorValue of this Resource, **mqtt-node** will find out the latest value you updated and respond it back to the Server. The problem of polling is that the Server may not always get the newest value each time it requests for the sensorValue. A solution to this problem is to poll the sensor more frequently, e.g., every 100ms, this is what you may face if you are using a simple MQTT client on your device. I think you never want to do so to keep your device busy. This is where **mqtt-node** can help.  

**mqtt-node** allows a Resource value to be an object with `read` and `write` methods. You can tell **mqtt-node** how to read/write your Resource through this kind of object. Each time the Server requests for the Resource, **mqtt-node** will perform the read() method on that Resource to get its current value and respond the result to the Server immediately.  

It is very simple to use this scheme. The first thing you need to know is that the signature of `read` method is `function(cb)`, where `cb(err, value)` is an err-back function that you should call and pass the read value through its second argument when read operation accomplishes. If any error occurs, pass the error through the first argument. Let's go back to the previous example:
  
```js
qnode.initResrc('temperature', 0, {
    sensorValue: {
        read: function (cb) {
            var analogVal = analogPin0.read();
            cb(null, analogVal);
        }
    },
    units: 'cel'
});
```
  
See, it's simple. If you define this object with a read method, this Resource will be inherently readable.  
  
The pattern for a writable Resource is similar. The signature of `write` method is `function(value, cb)`, where `value` is the value to wirte to this Resource and `cb(err, value)` is an err-back function that you should call and pass the written value through its second argument. Example again:
  
```js
qnode.initResrc('actuation', 6, {
    onOff: {
        write: function (value, cb) {
            digitalPin2.write(value);

            var digitalVal = digitalPin2.read();
            cb(null, digitalVal);
        }
    }
});
```
  
Now, the written value will be automatically responded back to the Server along with a status code of 204(Changed). In this example, we only define the write method for the Resource, thus it is writable but not readable. If the Server is trying to request for this Resource, he will get a special value of string `'\_unreadable\_'` along with a status code of 405(MethodNotAllow).  

If this Resource is both readable and writable, you should give both of read and write methods to it:
  
```js
qnode.initResrc('actuation', 6, {
    onOff: {
        read: function () {
            var digitalVal = digitalPin2.read();
            cb(null, digitalVal);
        },
        write: function (value, cb) {
            digitalPin2.write(value);
            cb(null, digitalPin2.read());
        }
    }
});
```
  
Ok, good! You've not only learned how to read/write a Resource but also learned how to do the 'Access Control' on a Resource. If the Resource value is a primitive, **mqtt-node** will flow the access rules from IPSO specification. Section [Code Templates] lists out these rules for each Object. If your Resource value is a primitive and you don't want to follow the default access rules, you can wrap it up with the special object we've just introduced. See this example:
  
```js
var tempVal = 26;

qnode.initResrc('temperature', 0, {
    sensorValue: {
        read: function (cb) {
            cb(null, tempVal);
        }
    },
    units: 'cel'
});
```
  
Next, let's take a look at something really cool - an executable Resource. This kind of Resource allows you to remotely issue a procedure on the Device, for example, ask your Device to blink a LED for 10 times. You can define some useful and interesting remote procedure calls(RPCs) with executable Resources. To do so, give your Resource an object with the `exec` method. In this case, the Resource will be inherently an executable one, the Server will get a bad response of status 405(MethodNotAllow) with a special value of string `'\_exec\_'` when trying to remotely read/write it. This means that read and write methods are meaningless to an executable Resource even if you do give an object with these two methods to the Resource. If the Resource is not an executable one, **mqtt-node** will respond a status 405(MethodNotAllow) with a special value of `'\_unexecutable\_'` when the Server is trying to remotely invoke it.
  
It's time to show you an example. Assume that we have an executable Resource 'function(led, times)' on the Device to start blinking the `led` with `times` times.  
  
```js
function blinkLed(led, times) {
    // logic of blinking an led
}

qnode.initResrc('myObject', 0, {
    blink: {
        exec: function (led, times, cb) {
            blinkLed(led, times);   // invoke the procedure
            cb(null, 'blinking');   // cb(status, data), default status is 204(Changed)
                                    // data is something you want to respond to the Server
        }
    }
});
```
  
The signature of `exec` method is `function(...[, cb])`, the number of arguments depends on your own definition. The callback `cb(status, data)` is optional and should be called if you want to respond something back to the Server. If `cb` is not given or got called, **mqtt-node** will regard this execuation as a successful one and respond the default status 204(Changed) with an undefined data to the Server. Since **mqtt-node** doesn't know what your procudure is doing, developers must be responsible for creating the resulted response on their own.  

As mentioned in LWM2M specification, the Client should response a status code of 400(BadRequest) if it doesn't understand the argument in the payload. Let me show you an example:  
  
```js
qnode.initResrc('myObject', 0, {
    blink: {
        exec: function (led, times, cb) {
            if (typeof times !== 'number') {
                cb(400, null);
            } else {
                blinkLed(led, times);
                cb(204, 'blinking');
            }
        }
    }
});
```
  
Executable Resource is a necessary if you like to do something complicated. Think of that how do you blink a certain led with arbitray times if you are just using general readable/writable Resources? That can be a pain in the ass. In addtion, here is a difference bewteen LWMQN and LWM2M, which is that LWMQN allows an executable Resource to response data back to the Server and LWM2M just response status to the Server by definition. RPCs in LWMQN is more interactive. Executable Resource is very powerful and it is trying to let your machines do more things and be more automatic instead of just reading something from or writing something to them.  

<a name="APIs"></a>
## 6. APIs

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
Create a new instance of `MqttNode` class.  
  
**Arguments:**  

1. `clientId` (_String_): clientId should be a string and should be unique in the network. Using the mac address (along with a prefix or suffix) as the clientId would be a good idea.  
2. `devAttrs` (_Object_): This is an object to describe information about the device. The following table shows the details of each property within `devAttrs`.  
  
| Property | Type   | Mandatory | Description                     |  
|----------|--------|-----------|---------------------------------|  
| lifetime | Number | optional  | default is 86400. Unit: seconds |  
| ip       | String | required  | device ip address               |  
| mac      | String | required  | device mac address              |  
| version  | String | optional  | minimum supported LWMQN version |  
  
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
    console.log(qnode.lifetime);    // 21600
    console.log(qnode.ip);          // '192.168.0.99'
    console.log(qnode.mac);         // '00:0c:29:3e:1b:d2'
    console.log(qnode.version);     // 'v0.0.6'
    // use qnode.setDevAttrs() to change the device attributes will
    // automatically publish the update message to the Server.
```
  
********************************************
<a name="API_setDevAttrs"></a>
### .setDevAttrs(devAttrs)
Set the device attribues on qnode.  

**Arguments:**
  
1. `devAttrs` (_Object_): Device attributes.  
    It is just like the `devAttrs` in the arguments of MqttNode constructor, but any change of `clientId`, `mac` and unrecognized properties will be ignored. If you want to change either one of `clientId` and `mac`, please deregister the qnode from the Server and then re-register to it again. 
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
// this will set the ip on qnode and mqtt-node will publish the update of ip to the Server
qnode.setDevAttrs({
    ip: '192.168.0.211'
});
```
  
********************************************
<a name="API_initResrc"></a>
### .initResrc(oid, iid, resrcs)
Initialize the Resources on qnode.  

**Arguments:**  

1. `oid` (_String|Number_): Id of the Object that owns the Resources.  
    The `oid` can be an IPSO-defined or LWM2M-defined id in string or in number. Please refer to the [lwm2m-id](https://github.com/simenkid/lwm2m-id#5-table-of-identifiers) for all pre-defined ids. If `oid` is not a pre-defined identifer, LWMQN will regard it as a private one.  
2. `iid` (_String|Number_): Id of the Object Instance that owns the Resource.  
    It is common to use numbers to enumerate Object Instances, but using a string for the `iid` is okay too, e.g., 12, '12' and 'my_instance01' are all valid.  
3. `resrcs` (_Object_): An object with rid-value pairs to describe the Resources.  
    Each key represents the `rid` and each value is the Resource value. Resource value can be a primitive, an data object or object with specific methods, i.e. `read()`, `write()`, `exec()`. Please refer to section [Resources Planning](#Resources) for Resource initializing how-tos.
    </br>
  
**Returns:**  
  
* (_Object_): qnode

**Examples:**  

* Resource is a simple value:  
  
```js
/********************************************/
/*** Client Device Initialzation          ***/
/********************************************/
// use oid and rids in string
qnode.initResrc('humidity', 0, {
    sensorValue: 20,
    units: 'percent'
});
// use oid and rids in number
qnode.initResrc(3304, 0, {
    5700: 20,
    5701: 'percent'
});

// using string-numbers is ok too
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
  
* Resource value needs to be written through particular operations:  
  
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

            var currentVal = gpio.read('gpio06');
            cb(null, currentVal);
        }
    }
});
```
  
* Resource is executable (a procedure on the Client Device that can be remotely called):  
  
```js    
// The Resource is executable
qnode.initResrc('myLight', 0, {
    blink: {
        exec: function (t, cb) {
            blinkLed('led1', t);    // bink led1 for t times
            cb(204, null);          // the 2nd argument of cb is a response object
        }
    }
});

qnode.initResrc('myCounter', 0, {
    count: {
        exec: function (cb) {
            countSomething(function (err, sum) {
                // responds back the status 200(OK) and result to the Server
                cb(200, sum);
            });
        }
    }
});
```
  
********************************************
<a name="API_readResrc"></a>
### .readResrc(oid, iid, rid[, callback])
Read value from the allocated Resource.  
  
**Arguments:**  

1. `oid` (_String|Number_): Object id  
2. `iid` (_String|Number_): Object Instance id  
3. `rid` (_String|Number_): Resource id  
4. `callback` (_Function_): An err-fisrt callback `function(err, val)` to get the read value.  
    If the Resource is not a simple value and there has no `read` method been initialized for it, the `val` passes to the callback will be a string `_unreadable_`. For example, you are trying to read a write-only Resource which is initialized without a read method.
    If the Resource is an executable Resource, the `val` passes to the callback will be a string `_exec_`.
    If the allocated Resource is not found, an error will be passed to fisrt argument of the callback.  
  
**Returns:**  

* _none_

**Examples:**  
  
```js
qnode.readResrc('humidity', 0, 'sensorValue', function (err, val) {
    if (err)
        console.log(err);
    else
        console.log(val);   // 20
});

qnode.readResrc('humidity', 12, 'sensorValue', function (err, val) {
    if (err)
        console.log(err);   // if allocating Resource fails 
});

qnode.readResrc('mySensor', 0, 'sensorValue', function (err, val) {
    console.log(val);       // '_unreadable_' if the Resource cannot be read
});

qnode.readResrc('myLight', 0, 'blink', function (err, val) {
    console.log(val);       // '_exec_' if the Resource is executable which cannot be read from
});
```
  
********************************************
<a name="API_writeResrc"></a>
### .writeResrc(oid, iid, rid, value[, callback])
Write the value to the allocated Resource.  
  
**Arguments:**  

1. `oid` (_String|Number_): Object id  
2. `iid` (_String|Number_): Object Instance id  
3. `rid` (_String|Number_): Resource id  
3. `value` (_Depends_): The value to write to the allocated Resource.  
4. `callback` (_Function_): An err-fisrt callback `function(err, val)` to get the current value after the Resource been written.  
    If the Resource is not a simple value and there has no `write` method been initialized for it, the `val` passes to the callback will be a string `_unwritable_`.  
    If the allocated Resource is not found, an error will be passed to fisrt argument of the callback.  
  
**Returns:**  

* _none_

**Examples:**  
  
```js
qnode.writeResrc('humidity', 0, 'sensorValue', 80, function (err, val) {
    console.log(val);       // '_unwritable_'
});

qnode.writeResrc('humidity', 12, 'sensorValue', 80, function (err, val) {
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
Connects and registers to the LWMQN Server with the given url. If succeeds, qnode will fire a `ready` event.  
  
**Arguments:**  

1. `url` (_String_): Url of the LWMQN Server, e.g. `mqtt://localhost`, `mqtt://192.168.0.100`, `mqtt://192.168.0.20:3000`.  
2. `opts` (_Object_): The connect options with properties shown in the following table.  
  
| Property        | Type           | Default      | Description                                             |  
|-----------------|----------------|--------------|---------------------------------------------------------|  
| keepalive       | Number         | 10           | 10 seconds, set to 0 to disable                         |  
| reconnectPeriod | Number         | 1000         | milliseconds, interval between two reconnections        |  
| connectTimeout  | Number         | 30000        | milliseconds, time to wait before a CONNACK is received |  
| username        | String         | `'freebird'` | The username required by your broker, if any            |  
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
// you can use an encrypted password if the Server knows how to decrypt it
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
2. `callback` (_Function_): will be called when the Client is closed    
  
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
Publishes the registering request to the Server. The registration message will be automatically generated by the qnode. Everytime you invoke .connect() method, qnode always does the regisetring procedure to the Server.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will pass you the result of registration. `rsp` is a response object with status code. `rsp.status` of 200(Ok) indicates that the Client was registered before and the record is successfully renewed on the Server. `rsp.status` of 201(Created) indicates that this registration is successful for this whole new Client. `rsp.status` will be 408(Timeout) if response does not come back in 60 seconds. Please refer to [LWMQN Register Channel](#LWMQN_PAGE) for more info.
  
**Returns:**  

* (_Object_): qnode

**Examples:**  
  
```js
qnode.pubRegister(function (err, rsp) {
    console.log(rsp);  // { status: 201 }
});
```
  
********************************************
<a name="API_pubDeregister"></a>
### .pubDeregister([callback])
Publishes the deregistering request to the Server for the Client to leave the network. The deregistering message will be automatically generated by the qnode.  
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called when the deregistering process is done. `rsp.status` of 200(Ok) indicates that the Client was successfully deregistered, and 408 indicates a response timeout. Please refer to [LWMQN Deregister Channel](#LWMQN_PAGE) for more info.
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.pubDeregister(function (err, rsp) {
    console.log(rsp);  // { status: 200 }
});
```
  
********************************************
<a name="API_pubNotify"></a>
### .pubNotify(note[, callback])
Publishes the notificatoin to the Server. The message `note` should be a well-formatted data object. If you like to publish a Resource, `note` should be an object with `oid`, `iid`, `rid` and `data` fields, where `data` is the Resource value. If you like to publish an Object Instance, `note` should be an object with `oid`, `iid` and `data` fields, where `data` is the Object Instance containing all its Resources. Please refer to [LWMQN Notify Channel](#LWMQN_PAGE) for more info.  
It is noted that **mqtt-node** will automatically report notifications to the Server if the Client is 'observed' by the Server. This API is seldom been used unless you do have to notify something to the Server aggressively in your application.  

**Arguments:**  

1. `note` (_Object_): a Resource or an Instance you like to report to the Server.  
2. `callback` (_Function_): `function (err, rsp)` will be called when the acknowledgement is coming back from the Server. `rsp.status` of 204(Changed) indicates that the Server has got the notification.  
  
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
<a name="API_pingServer"></a>
### .pingServer([callback])
Ping the Server.
  
**Arguments:**  

1. `callback` (_Function_): `function (err, rsp)` will be called upon the response coming back. `rsp.status` of 200 indicates pinging is successful, and 408 indicates a response timeout. `rsp.data` is a number of the round trip times in milliseconds.
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.pingServer(function (err, rsp) {
    console.log(rsp);   // { status: 200, data: 17 }
});
```
  
********************************************
<a name="API_publish"></a>
### .publish(topic, message[, options][, callback])
This is a generic method to publish a message to a topic.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts a registered Client to publish any message to any topic. In this case, the Server simply acts as an MQTT broker. The publishment is not authorized at the Server if the Client was not successfully registered.  
  
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

* (_Object_) qnode

**Examples:**  
  
```js
qnode.publish('foo/bar/greet', 'Hello World!');
```
  
********************************************
<a name="API_subscribe"></a>
### .subscribe(topics[, options][, callback])
This is a generic method to subscribe to a topic or topics in an array.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the registered Client to subscribe to any topic. In this case, the Server simply acts as an MQTT broker. The generic subscription is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topics` (_String_|_String[]_): the topic(s) to subscribe to.  
2. `options` (_Object_): the option to subscribe with, including the property `qos` which is a Qos level of the subscription. `qos` is 0 by default.    
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
If you are using the `mqtt-shepherd` as the LWMQN Server, the generic unsubscription is not authorized at the Server if the Client was not successfully registered.  
  
**Arguments:**  

1. `topic` (_String_|_String[]_): the topic(s) to unsubscribe from.  
2. `callback` (_Function_): callback fired on unsuback  
  
**Returns:**  

* (_Object_) qnode

**Examples:**  
  
```js
qnode.unsubscribe('foo/bar/score');
```
..
********************************************
<br />
<a name="Templates"></a>
## 7. Code Templates

This document provides you with code templates of many IPSO-defined devices [(Smart Objects starter pack 1.0)](http://www.ipso-alliance.org/smart-object-guidelines/). Each code snippet also lists out the oid and every Resource characteristic in the Object with the format:  
> < rid number, access, data type { range or enum }, unit >
  
1. [Digital Input](#tmpl_digitalInput)
2. [Digital Output](#tmpl_digitalOutput)
3. [Analog Input](#tmpl_analogInput)
4. [Analog Output](#tmpl_analogOutput)
5. [Generic Sensor](#tmpl_genericSensor)
6. [Illuminance Sensor](#tmpl_illumSensor)
7. [Presence Sensor](#tmpl_presenceSensor)
8. [Temperature Sensor](#tmpl_temperature)
9. [Humidity Sensor](#tmpl_humidity)
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
// 01. Digital Input (oid = 3200 or 'dIn')
qnode.initResrc('dIn', 0, {
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
// 02. Digital Output (oid = 3201 or 'dOut')
qnode.initResrc('dOut', 0, {
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
// 03. Analog Input (oid = 3202 or 'aIn')
qnode.initResrc('aIn', 0, {
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
// 04. Analog Output (oid = 3203 or 'aOut')
qnode.initResrc('aOut', 0, {
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
// 05. Generic Sensor (oid = 3300 or 'generic')
qnode.initResrc('generic', 0, {
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
// 06. Illuminance Sensor (oid = 3301 or 'illuminance')
qnode.initResrc('illuminance', 0, {
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
// 07. Presence Sensor (oid = 3302 or 'presence')
qnode.initResrc('presence', 0, {
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
<a name="tmpl_temperature"></a>
### 08. Temperature Sensor
  
```js
// 08. Temperature Sensor (oid = 3303 or 'temperature')
qnode.initResrc('temperature', 0, {
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
<a name="tmpl_humidity"></a>
### 09. Humidity Sensor
  
```js
// 09. Humidity Sensor (oid = 3304 or 'humidity')
qnode.initResrc('humidity', 0, {
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
  