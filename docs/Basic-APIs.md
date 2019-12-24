## Basic APIs

Qnode is being exposed by `require('@lwmqn/qnode')`

* This class is for you to create a LwMQN Client on a machine that can run node.js, such as [Linkit Smart 7688](http://home.labs.mediatek.com/hello7688/), [Raspberry Pi](https://www.raspberrypi.org/), [Beaglebone Black](http://beagleboard.org/BLACK), [Edison](http://www.intel.com/content/www/us/en/do-it-yourself/edison.html), and many more.
* It uses [SmartObject](https://github.com/lwmqn/smartobject) class as its fundamental of resource organization on devices.

*************************************************

### new Qnode(clientId, so[, devAttrs])
Create an instance of `Qnode` class.

**Arguments:**

1. `clientId` (_String_): It should be a string and should be unique in the network. If it is not unique, you will get a forbidden response when trying to connect to a LwMQN Server. Using mac address (with a prefix or suffix) as the `clientId` would be a good idea.
2. `so` (_Object_): A smart object that maintains all _Resources_ on the device. This object should be an instance of the [SmartObject](https://github.com/PeterEB/smartobject) class.
3. `devAttrs` (_Object_): Optional. An object to describe information about the device. The following table shows details of each property within `devAttrs` object.

    | Property | Type   | Mandatory | Description                                                                            |
    |----------|--------|-----------|----------------------------------------------------------------------------------------|
    | lifetime | Number | optional  | Default is 86400 (unit: seconds).                                                      |
    | version  | String | optional  | Minimum supported LWMQN version (this is not really functional at this moment).        |
    | ip       | String | optional  | Device ip address. By default, @lwmqn/qnode itself will query this parameter from system. |

**Returns:**

* (_Object_): qnode

**Examples:**

```js
const Qnode = require('@lwmqn/qnode')
const qnode = new Qnode('my_foo_client_id', {
  lifetime: 21600,
  version: '0.0.2'
})

qnode.on('ready', function () {
  console.log(qnode.clientId)    // 'my_foo_client_id'
  console.log(qnode.lifetime)    // 21600
  console.log(qnode.ip)          // '192.168.0.99'
  console.log(qnode.mac)         // '00:0c:29:3e:1b:d2'
  console.log(qnode.version)     // '0.0.2'
})

// Do not change the device attributes with direct assignments, i.e., qnode.lifetime = 2000.

// Use qnode.update() to change attributes, and qnode will automatically check if it
// needs to publish an update message to the Server.
```

*************************************************

### .getSmartObject()
Get the smart object used on this qnode. You can access its Resources with [read](https://github.com/PeterEB/smartobject#API_read)/[write](https://github.com/PeterEB/smartobject#API_write)/[exec](https://github.com/PeterEB/smartobject#API_exec) methods provided by SmartObject class. Use these methods to access you smart object, and qnode itself will check if it needs to report the changes to the Server according to the settings of observation.

**Arguments:**

1. _none_

**Returns:**

* (_Object_): so

**Examples:**

```js
const so = qnode.getSmartObject()
so.read('humidity', 1, 'sensorValue', function (err, data) {
  if (!err) console.log(data) // 16
})

so.write('humidity', 0, 'sensorValue', 15.4, function (err, data) {
  if (!err) console.log(data) // 15.4
})
```

*************************************************

### .isConnected()
Checks if qnode is connected to a Server.

**Arguments:**

1. _none_

**Returns:**

* (_Boolean_): Returns `true` if it is connected, else `false`.

**Examples:**

```js
qnode.isConnected() // false
```

*************************************************

### .setDevAttrs(devAttrs, callback) -- **_Deprecated_**
Set device attributes of the qnode, and qnode will automatically check if it needs to publish an update message to the Server.

This API is deprecated, please use **[update()](#API_update)** instead.

*************************************************
