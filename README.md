mqtt-node
=========
A client library for a light-weight MQTT machine network.

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Basic Usage](#Basic)
5. [APIs](#APIs)   
6. [Templates](#Templates) 

1. Overview
--------

The light-weight MQTT machine network (**LWMQN**) is an architecture that follows part of the **LWM2M v1.0** specification to meet the minimum requirements of machine network management.

`mqtt-shepherd` is an implementation of the LWMQN Server and `mqtt-node` is an implementation of the LWMQN Client on node.js. They are working together into an IoT application framework. This client-side module `mqtt-node` is suitable for devices working with the embedded Linux and node.js, such as Linkit Smart 7688, Raspberry Pi and Beaglebone Black, .etc. 

The `mqtt-node` uses IPSO definitions as its fundamental of the resource organizing on the device. This document also provides templates of many common devices defined by the IPSO **Smart Objects starter pack 1.0**, i.e., temperature sensor, humidity sensor, light control. `mqtt-node` is trying to let you build the IoT machine network with no pain.  

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

Note: Object, Object Instance and Resource are used by the IPSO specification to describe the hierarchical structure of resources on a Client Device. The oid, iid, and rid are identifiers used to allocate the resource.  

2. Features
--------
* Communication based on the MQTT protocol and the client library [mqtt.js](https://www.npmjs.com/package/dissolve)
* Structuring the device resources in a hierarchical Smart-Object-style defined by IPSO
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
1. [V new MqttNode()](#API_MqttNode)
2. [V setDevAttrs()](#API_setDevAttrs)
3. [V initResrc()](#API_initResrc)
4. [V readResrc()](#API_readResrc)
5. [V writeResrc()](#API_writeResrc)
6. [V connect()](#API_connect)
7. [V close()](#API_close)
8. [V pubRegister()](#API_pubRegister)
9. [V pubDeregister()](#API_pubDeregister)
10. [V pubNotify()](#API_pubNotify)
11. [V pingServer()](#API_pingServer)
12. [V publish()](#API_publish)  
13. [V subscribe()](#API_subscribe)  
14. [V unsubscribe()](#API_unsubscribe)  

*****
### MqttNode Class
Exposed by `require('mqtt-node')`
<br />

###<a name="API_MqttNode"></a>
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

**Returns:** (_Object_) qnode

**Examples:**

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

<br />
### .initResrc(oid, [iid,] resrcs)
Initialize the Resources on qnode.    

**Arguments:**  

1. `oid` (_String|Number_): Id of the Object that owns the Resource.  
    The `oid` can be an IPSO-defined or LWM2M-defined id in string or in number. Please refer to the [lwm2m-id](https://www.npmjs.com/package/lwm2m-id) module for all defined ids.  
2. `iid` (_String|Number_): Id of the Object Instance that owns the Resource.    
    If `iid` is not given, qnode will automatically create an Object Instance and assign a number for it. It is common to use numbers to enumerate the instances, but using a string for the `iid` is okay too, e.g., 'my_instance01'.  
3. `resrcs` (_Object_): An object in rid-value paris to describe the Resources.  
    Each key represents the `rid` and each value is the value of the Resource. The value of Resource can be a   primitive value, such as a number, a string, and a boolean. The value of a Resource can be an object with `read` or `write` methods if reading value from or writing value to the Resource is not a simple value assignment, i.e., reading value from a gpio, reading value from a database, reading value from a file. In addition, the value of a Resource can be an object with a `exec` method if the Resource is typed as an executable one.  


**Returns:** (_Object_): qnode

**Examples:**  

Resource is a simple value:  
  
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
```
  
<br />
Resource value is got from particular operations:  
  
```javascript
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
  
<br />
Resource value needs to be written by particular operations:  
  
```javascript
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
  
<br />
Resource is executable (a procedure on the Client Device):  
  
```javascript    
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
  
<br />
### .setDevAttrs(devAttrs)
Set the device attribues on qnode.  

**Arguments:**
  
1. `devAttrs` (_Object_): Device attributes.  
    It is just like the `devAttrs` in the arguments of MqttNode constructor, but any change of `clientId`, `mac` and unrecognized properties will be ignored. If you want to change either one of `clientId` and `mac`, please deregister the qnode from the Server and then re-register it to the Server. 

**Returns:** (_Object_): qnode

**Examples:**  
  
```javascript
// this will publish the update of ip address to the Server
qnode.setDevAttrs({
    ip: '192.168.0.211'
});
```
  
<br />
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
  
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
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
  
<br />
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
  
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
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
  
<br />
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
| password        | String|Buffer | `'skynyrd'`  | the password required by your broker, if any            |    
  
**Returns:** (_Object_): qnode

**Examples:**  
  
```javascript
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
  
<br />
### .close([force,] [callback])
Disconnects from the Server. qnode will fire a `close` event if it is disconnected.       
  
**Arguments:**  

1. `force` (_Boolean_): `true` will close the client right away, without waiting for the in-flight messages to be acked. This parameter is optional.  
2. `callback` (_Function_): will be called when the client is closed    
 
**Returns:** (_Object_): qnode

**Examples:**  
  
```javascript
qnode.on('close', function () {
    console.log('Disconnected from the Server.');
});

qnode.close();
```
  
<br />
### .pubRegister([callback])
Publishes the registering message to the Server. The message of registration will be automatically generated by the qnode. Everytime you invoke the .connect() method, qnode always does the regisetring procedure to the Server.  
The qnode fires a `response` event when it received the response of registration from the Server.        
  
**Arguments:**  

1. `callback` (_Function_): will be called when the registering message is published.   
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.on('response', function (rsp) {
    if (rsp.type === 'register')
        console.log(rsp);
});

qnode.pubRegister();
```
  
<br />
### .pubDeregister([callback])
Publishes the deregistering message to the Server for leaving the network. The message will be automatically generated by the qnode.
The qnode fires a `response` event when it received the response of deregistration from the Server.     
     
  
**Arguments:**  

1. `callback` (_Function_): will be called when the deregistering message is published.  
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.on('response', function (rsp) {
    if (rsp.type === 'deregister')
        console.log(rsp);
});

qnode.pubDeregister();
```
  
<br />
### .pubNotify(data[, callback])
Publishes the notificatoin to the Server. The message should be a well-formatted data object.
The qnode fires a `response` event when it received the acknownledgement from the Server.     
     
  
**Arguments:**  

1. `data` (_Object_):  
2. `callback` (_Function_): will be called when the notification is published.  
  
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
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
  
<br />
### .pingServer([callback])
Publishes the ping message to the Server.
The qnode fires a `response` event when it received the response from the Server.     
     
  
**Arguments:**  

1. `callback` (_Function_): will be called when the ping message is published.  
  
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.on('response', function (rsp) {
    if (rsp.type === 'ping')
        console.log(rsp);
});

// pub a Resource
qnode.pingServer();
```
  
<br />
### .publish(topic, message[, options][, callback])
This is a generic method to publish a message to a topic.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to publish any message to any topic. In this case, the Server simply acts as an MQTT broker. The generic publishment is not authorized at the Server if the Client was not successfully registered. 
  
**Arguments:**  

1. `topic` (_String_): the topic to publish to.  
2. `message` (_String|Buffer_): the message to publish.
3. `options` (_Object_): the option to publish with, including the properties shown below    

| Property | Type    | Default | Description |
|----------|---------|---------|-------------|
| `qos`    | Number  | 0       | QoS level   |
| `retain` | Boolean | false   | Retain flag |

4. `callback` (_Function_): will be called when the QoS handling completes, or at the next tick if QoS 0.
  
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.publish('foo/bar/greet', 'Hello World!');
```
  
<br />
### .subscribe(topic[, options][, callback])
This is a generic method to subscribe to a topic.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to subscribe to any topic. In this case, the Server simply acts as an MQTT broker. The generic subscription is not authorized at the Server if the Client was not successfully registered. 
  
**Arguments:**  

1. `topic` (_String_): the topic to subscribe to.  
2. `options` (_Object_): the option to subscribe with, including the property `qos` which is a Qos level of the subscription. `qos` is 0 by default.    
3. `callback` (_Function_): `function (err, granted)` callback will be called on suback, where
    `err` is a subscrtiption error
    `granted` is an arrary of objects formatted in `{ topic, qos }`    
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.subscribe('foo/bar/score');
```
  
<br />
### .unsubscribe(topic[, callback])
This is a generic method to unsubscribe a topic from the broker.  
If you are using the `mqtt-shepherd` as the LWMQN Server, it accepts the Client to unsubscribe any topic. In this case, the Server simply acts as an MQTT broker. The generic unsubscription is not authorized at the Server if the Client was not successfully registered. 
  
**Arguments:**  

1. `topic` (_String_): the topic to unsubscribe.  
3. `callback` (_Function_): callback fired on unsuback
 
**Returns:** (_Promise_): promise

**Examples:**  
  
```javascript
qnode.unsubscribe('foo/bar/score');
```

