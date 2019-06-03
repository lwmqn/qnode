### Events


#### Event: 'registered'
Listener: `function () {}`
Fires when qnode is at its first time of registering to the LWMQN Server successfully. If qnode has registered before, only the 'login' event will be fired at each success of registration.

********************************************

#### Event: 'deregistered'
Listener: `function () {}`
Fires when qnode deregisters from the LWMQN Server successfully.

********************************************

#### Event: 'login'
Listener: `function () {}`
Fires when qnode connects and login to the Server successfully.

********************************************

#### Event: 'logout'
Listener: `function () {}`
Fires when qnode disconnects and logout from the Server successfully.

********************************************

#### Event: 'reconnect'
Listener: `function () {}`
Fires when qnode starts to reconnect to the Server.

********************************************

#### Event: 'offline'
Listener: `function () {}`
Fires when qnode loses its connection to the Server, e.g., the Server is down or qnode goes offline.

********************************************

#### Event: 'message'
Listener: `function (topic, message, packet) {}`
Fires when qnode receives a generic publish packet. You should have your own message listener if you'd like to subscribe to generic MQTT topics.
* `topic` (_String_): topic of the received packet
* `message` (_Buffer_ | _String_): payload of the received packet
* `packet` (_Object_): received packet, as defined in [mqtt-packet](https://github.com/mqttjs/mqtt-packet#publish)

********************************************

#### Event: 'error'
Listener: `function (err) {}`
* The low-layer errors from mqtt.js will propagate through this event.
* When invoking `connect()` or `close()` methods without a callback, the error occurring in these methods will be fired along with the `error` event instead.
* **Most importantly, if there is no `error` event listener attached on qnode, errors will be rethrown to crash your program.**

********************************************
