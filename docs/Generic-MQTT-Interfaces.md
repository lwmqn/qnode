### Generic MQTT Interfaces

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

4. `callback` (_Function_): `function (err, encMsg) {}`, will be called when the QoS handling completes, or at the next tick if QoS 0. An error occurs if client is disconnecting. `encMsg` is the encrypted message to publish out.


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

*************************************************

### .subscribe(topics[, options], callback)
This is a generic method to subscribe to a topic or topics listed in an array.

If you are using **mqtt-shepherd** as the LWMQN Server, it accepts the registered Client to subscribe to any topic (if authorized). In this case, the Server simply acts as an MQTT broker. The generic subscription is not allowed at the Server if the Client was not successfully registered.

**Arguments:**

1. `topics` (_String_ | _String[]_): The topic(s) to subscribe to.
2. `options` (_Object_): Option to subscribe with, including the property `qos` which is a QoS level of the subscription. `qos` is 0 by default.
3. `callback` (_Function_): `function (err, granted) {}`, will be called on suback, where `err` is a subscription error and `granted` is an array of objects formatted in `{ topic, qos }`. An error occurs if client is disconnecting.

**Returns:**

* (_Object_) qnode

**Examples:**

```js
qnode.subscribe('foo/bar/score', function (err, granted) {
    console.log(granted);   // [ { topic: 'foo/bar/score', qos: 0 } ]
});
```

*************************************************

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
