![LWMQN Network](https://raw.githubusercontent.com/lwmqn/qnode/master/docs/images/lwmqn.png)

<div align="center">

**@lwmqn/qnode** is a client machine node for the lightweight MQTT machine network (LWMQN)

[![NPM version](https://img.shields.io/npm/v/@lwmqn/qnode.svg?style=flat-square)](https://www.npmjs.com/package/@lwmqn/qnode)
[![NPM downloads](https://img.shields.io/npm/dm/@lwmqn/qnode.svg?style=flat-square)](https://www.npmjs.com/package/@lwmqn/qnode)
[![Travis branch](https://img.shields.io/travis/lwmqn/qnode/master.svg?maxAge=2592000&style=flat-square)](https://travis-ci.org/lwmqn/qnode)
[![Gitter](https://img.shields.io/gitter/room/lwmqn/Lobby.svg?style=flat-square)](https://gitter.im/lwmqn/Lobby)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
![pr-welcoming-image](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)

</div>

-------

## What is LWMQN

Lightweight Message Queuing Network ([**LwMQN**](http://lwmqn.github.io)) is an open source project that follows part of [**OMA LwM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.

### Server-side and Client-side Libraries:
   - LwMQN project provides you with this machine-side **@lwmqn/qnode** library and a server-side [**@lwmqn/shepherd**](https://github.com/lwmqn/shepherd) library to build your machine network with JavaScript and node.js easily.

* Server-side library: [**@lwmqn/shepherd**](https://github.com/lwmqn/shepherd)
* Client-side library: **@lwmqn/qnode** (this module)
* [**A simple demo webapp**](https://github.com/lwmqn/demo)

### Features

* Communication based on MQTT protocol and [mqtt.js](https://www.npmjs.com/package/mqtt) client.
* Hierarchical Smart Object data model ([IPSO](http://www.ipso-alliance.org/)), which leads to a comprehensive and consistent way in describing real-world gadgets.
* LWM2M-like interfaces for Client/Server interaction.
* Auto handles many REQ/RSP things for you. All you have to do is to plan your _Resources_ well.

### Understanding Smart Objects and the IPSO Model

![IPSO Model](https://raw.githubusercontent.com/lwmqn/qnode/master/docs/images/ipso_model.png)

### Acronyms and Abbreviations

* **Server**: LWMQN server
* **Client** or **Client Device**: LWMQN client, which is a machine node in the network
* **Qnode**: Class exposed by `require('@lwmqn/qnode')`
* **SmartObject**: Class exposed by `require('@lwmqn/smartobject')`
* **qnode**: Instance of Qnode class
* **so**: Instance of SmartObject class

-------

## Installation

Currently [Node.js 8.x LTS](https://nodejs.org/en/about/releases/) or higher is required.

```bash
$ npm install @lwmqn/qnode
$ npm install @lwmqn/smartobject
```

### Compabitility table


| Qnode versions /<br>Node.js versions | 8.x<br>LTS | 10.x<br>LTS | 11.x | 12.x<br>LTS | 13.x |
|--------------------------------------|------------|-------------|------|-------------|------|
| v0.10.0 | ✔ | ✔ | ✔ | ✔ | ✘ |

-------

## Basic Usage


Here is a quick example, with two humidity sensors and one custom object, which shows how to use **@lwmqn/qnode** and **@lwmqn/smartobject** on your client machine.

```js
const Qnode = require('@lwmqn/qnode')
const SmartObject = require('@lwmqn/smartobject')

const so = new SmartObject()

// Humidity sensor - the first instance
so.init('humidity', 0, { // oid = 'humidity', iid = 0
  sensorValue: 20,
  units: 'percent'
})

// Humidity sensor - the second instance
so.init('humidity', 1, { // oid = 'humidity', iid = 1
  sensorValue: 16,
  units: 'percent'
})

// A custom Object with two Resources: myResrc1 and myResrc2
so.init('myObject', 0, { // oid = 'myObject', iid = 0
  myResrc1: 20,
  myResrc2: 'hello world!'
})

// Create a qnode with a client id and your smart object. And attach your 'ready' and 'registered' event listeners
const qnode = new Qnode('my_foo_client_id', so)

qnode.on('ready', function () {
  // The ready event fires when the device is ready, but not yet remotely register to a Server.
  // You can start to run your local app, such as showing the sensed value on an OLED monitor.
  // To interact with your Resources, simply use the handy APIs provided by SmartObject class.
})

qnode.on('registered', function () {
  // The event fires when registration procedure completes successfully, which means your device
  // has joined the network and managed by the Server. After a success of registration, you can
  // take the LWMQN Server as a simple MQTT broker. Your device can subscribe to any topic or
  // publish any topic to the network (if authorized).
})

qnode.on('login', function () {
  // Your qnode is now ready to accept remote requests from the Server. Don't worry about the
  // REQ/RSP things, qnode itself will handle them for you.
})

// Connect and register to a Server, that's it!
qnode.connect('mqtt://192.168.0.2')
```

The following example shows how to operate upon this qnode **at server-side** (please go to [mqtt-shepherd](https://github.com/lwmqn/shepherd/wiki#Major) document for details):

```js
const qnode = qserver.find('my_foo_client_id') // find the registered device by its client id

if (qnode) {
  qnode.readReq('humidity/0/sensorValue', function (err, rsp) {
    if (!err) console.log(rsp) // { status: 205, data: 20 }
  })

  qnode.readReq('myObject/0/myResrc2', function (err, rsp) {
    if (!err) console.log(rsp) // { status: 205, data: 'hello world!' }
  })
}
```

-------

## Documentation
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Basic-APIs.md"><code><b>Basic APIs</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Networking-APIs.md"><code><b>Networking APIs</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Generic-MQTT-Interfaces.md"><code><b>Generic MQTT Interfaces</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Events.md"><code><b>Events</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Message-Encryption.md"><code><b>Message Encryption</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Identifying-Mode.md"><code><b>Identifying Mode</b></code></a>
* <a href="https://github.com/lwmqn/qnode/blob/master/docs/Debug-Messages.md"><code><b>Debug messages</b></code></a>

-------

## License

Licensed under [MIT](https://github.com/lwmqn/qnode/blob/master/LICENSE).

