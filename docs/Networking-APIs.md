### Networking APIs

*************************************************
### .connect(url[, opts][, callback])
Connect and register to a LwMQN Server by the given `url`. When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired at each success of connection.

**Arguments:**

1. `url` (_String_): Url of LwMQN Server, e.g. `'mqtt://localhost'`, `'mqtt://192.168.0.100'`, `'mqtt://192.168.0.20:3000'`.
2. `opts` (_Object_): Optional. The connect options with possible properties given in the following table.

    | Property        | Type             | Default      | Description                                                     |
    |-----------------|------------------|--------------|-----------------------------------------------------------------|
    | username        | String           | none         | The username required by your broker, if any                    |
    | password        | String \| Buffer | none         | The password required by your broker, if any                    |
    | keepalive       | Number           | 10           | 10 seconds, set to 0 to disable                                 |
    | reconnectPeriod | Number           | 3000         | milliseconds, interval between two reconnections                |
    | connectTimeout  | Number           | 30000        | milliseconds, time to wait before a CONNACK is received         |

3. `callback` (_Function_): Optional. `function (err, rsp) {}` will be called when connects to a Server successfully. `rsp` is an object with a property `status` to tell the result of connection and registration.

    | rsp.status | Status              | Description                                                                        |
    |------------|---------------------|------------------------------------------------------------------------------------|
    | 200        | OK                  | qnode was registered before and the record is successfully renewed on the Server   |
    | 201        | Created             | qnode is a new Client registered to the Server successfully                        |
    | 400        | BadRequest          | Invalid parameter(s) for registration                                              |
    | 401        | Unauthorized        | The Server rejects this Client from joining the network                            |
    | 403        | Forbidden           | There is a duplicate Client exists (`clientId` or `mac` duplicates on the Server)  |
    | 408        | Timeout             | No response from the Server in 10 secs                                             |
    | 500        | InternalServerError | The Server has some trouble                                                        |

**Returns:**

* (_Object_): qnode

**Examples:**

* Connect without an account

```js
qnode.on('login', function () {
  console.log('Connected to the Server.')
})

// connect without an account
qnode.connect('mqtt://192.168.0.100', function (err, rsp) {
  if (!err) console.log(rsp) // { status: 201 }
})
```

* If an account is required

```js
qnode.connect('mqtt://192.168.0.100', {
  username: 'someone',
  password: 'somepassword'
}, function (err, rsp) {
  if (!err) console.log(rsp) // { status: 201 }
})
```

* Use the MQTT connection options other than defaults

```js
// use the MQTT connection options other than defaults
qnode.connect('mqtt://192.168.0.100', {
  keepalive: 30,
  reconnectPeriod: 5000
})
```

*************************************************
### .close([callback])
Disconnect from the Server. qnode will also fire a `'logout'` event if it is disconnected from the Server.

**Arguments:**

1. `callback` (_Function_): Optional. `function (err) {}` will be called when the Client is closed.

**Returns:**

* (_Object_): qnode

**Examples:**

```js
qnode.on('logout', function () {
  console.log('Disconnected from the Server.')
})

qnode.close()
```

*************************************************
### .register(callback)
Publish a registering request to the Server. **Every time you invoke connect(), qnode will do register to the Server as well.** When succeeds, qnode will fire a `'registered'` event and a `'login'` event at its first-time registration. If qnode has registered before, only the `'login'` event will be fired after each success of registration.

**Arguments:**

1. `callback` (_Function_): `function (err, rsp) {}`. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of registration. The descriptions of possible `rsp.status` are given in the following table.

    | rsp.status | Status              | Description                                                                           |
    |------------|---------------------|---------------------------------------------------------------------------------------|
    | 200        | OK                  | The Client was registered before and the record is successfully renewed on the Server |
    | 201        | Created             | Registration is successful for this new Client                                        |
    | 400        | BadRequest          | Invalid parameter(s) for registration                                                 |
    | 401        | Unauthorized        | The Server rejects this Client from joining the network                               |
    | 403        | Forbidden           | Client Id duplicates on the Server                                                    |
    | 408        | Timeout             | No response from the Server in 10 secs                                                |
    | 500        | InternalServerError | The Server has some trouble                                                           |

**Returns:**

* (_Object_): qnode

**Examples:**

```js
qnode.register(function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 201 }
})
```

*************************************************
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
  console.log('qnode has left from the network.')
})

qnode.deregister(function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 202 }
})
```

*************************************************
### .update(devAttrs, callback)
Set device attributes of the qnode, and qnode will automatically check what attributes have been changed and publish an update message to the Server.

**Arguments:**

1. `devAttrs` (_Object_): An object of device attributes. It is just like the `devAttrs` argument of [MqttNode constructor](#API_MqttNode), but any change of `clientId` and `mac` is not allowed. If you want to change either `clientId` or `mac`, please deregister qnode from the Server and then connect to the Server again.
2. `callback` (_Function_): `function (err, rsp) {}` will be called when updating procedure is done. An `err` occurs if qnode has no connection to a Server. `rsp` is a response object with a status code to tell the result of device attributes updating.

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
// this will set the ip on qnode and @lwmqn/qnode will publish the update of ip to the Server
qnode.update({
  ip: '192.168.0.211'
}, function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 204 }
})
```

*************************************************
### .checkout([duration, ]callback)

Publish a checkout message to inform the Server that this qnode is going to sleep. The Server will return a status code of 200 to acknowledge this checkout message. A `'logout'` event will be fired when it checks out successfully.

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
  console.log('qnode has logged out from the network.')
})

qnode.checkout(function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 200 }

  if (rsp.status === 200) {
    console.log('qnode has checked out from the network.')
    qnode.close() // close the connection.
                  // The Server will take this qnode as a sleeping Client
                  // but not an offline one.
  }
})
```

*************************************************
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
  console.log('qnode has logged in the network.')
})

if (qnode.isConnected()) {
  qnode.checkin(function (err, rsp) {
    console.log(err)
    console.log(rsp) // { status: 200 }
  })
} else {
  qnode.connect('mqtt://192.168.0.100', function (err, rsp) {
    console.log(err)
    if (!err && rsp.status === 200) {
      qnode.checkin(function (err, rsp) {
        console.log(err)
        console.log(rsp) // { status: 200 }
      })
    }
  })
}
```

*************************************************
### .notify(note, callback)
Publish a notification to the Server. The message `note` should be a well-formatted data object.

* Notice that **@lwmqn/qnode will automatically report notifications** to the Server if the Client is **observed** by the Server. Therefore, use this API when you do have to notify something to the Server aggressively in your application.
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
  console.log(err)
  console.log(rsp) // { status: 204 }
})

// pub an Object Instance
qnode.notify({
  oid: 'humidity',
  iid: 0,
  data: {
    sensorValue: 32,
    units: 'percent'
  }
}, function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 204 }
})

// pub something that the Server cannot recognize
qnode.notify({
  oid: 'foo',
  iid: 0,
  rid: 'bar',
  data: 200
}, function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 404 }, 404 NotFound
})

// pub something with invalid format
qnode.notify('Hello World', function (err, rsp) {
  console.log(err)
  console.log(rsp) // { status: 400 }, 400 BadRequest
})
```

*************************************************
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
  console.log(err)
  console.log(rsp) // { status: 200, data: 16 }, round-trip time is 16 ms
})
```

*************************************************
