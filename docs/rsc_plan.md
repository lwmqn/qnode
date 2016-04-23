## Resources Planning Tutorial

Use API `initResrc(oid, iid, resrcs)` to initialize your Resources, where `oid` and `iid` are the Object id and Object Instance id, respectively. `resrcs` is an object containing all Resources under this Object Instance. Each key in `resrcs` object should be an `rid` and each value is the corresponding Resource value. Resource value can be a simple primitive, such as a number, a string and a boolean. Here is an example: 
  
```js
// oid = 'temperature' tells mqtt-node that you have a temperature sensor Object
// iid = 0 tells mqtt-node to instantiate this sensor with an identifier of 0
qnode.initResrc('temperature', 0, {
    sensorValue: 20,
    units: 'cel'
});
```
  
You may think that the temperature is a time-varying value, and just giving it a number is definitely not a good idea. You developers have responsibility for making this sensor play correctly. Let me show you an example:
  
```js
qnode.initResrc('temperature', 0, {
    sensorValue: 20,
    units: 'cel'
});

// Assume that temperature value is just read from a particular analog pin  
// Here, I use setInterval() to poll the pin every 60 seconds and write the sensed value to the corresponding Resource
setInterval(function () {
    var analogVal = analogPin0.read();
    qnode.writeResrc('temperature', 0, 'sensorValue', analogVal);
}, 60*1000);
```
  
So far, polling seems just fine in this temperature sensing example. If the Server requests for the sensorValue of this Resource, **mqtt-node** will find out the latest value you updated and respond it back to the Server. The problem of polling is that the Server may not always get the newest value each time it requests for the sensorValue.  

A solution to this problem is to poll the sensor more frequently, e.g., every 100ms, this is what you may face if you are using a simple MQTT client on your device. I think you never want to do so to keep your device busy. This is where **mqtt-node** can help.  

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
  
Next, let's take a look at something really cool - an executable Resource. This kind of Resource allows you to remotely issue a procedure on the Device, for example, ask your Device to blink a LED for 10 times. You can define some useful and interesting remote procedure calls(RPCs) with executable Resources. To do so, give your Resource an object with the `exec` method. In this case, the Resource will be inherently an executable one, the Server will get a bad response of status 405(MethodNotAllow) with a special value of string `'\_exec\_'` when a Server is trying to remotely access (read/write) it. This means that read and write methods are meaningless to an executable Resource even if you do give an object with these two methods to the Resource.  

If the Resource is not an executable one, **mqtt-node** will respond a status 405(MethodNotAllow) with a special value of `'\_unexecutable\_'` when a Server is trying to remotely invoke it.  
  
It's time to show you an example. Assume that we have an executable Resource 'function(led, t)' on the Device to start blinking the `led` with `t` times.  
  
```js
function blinkLed(led, t) {
    // logic of blinking an led
}

qnode.initResrc('myObject', 0, {
    blink: {
        exec: function (led, t, cb) {
            blinkLed(led, t);       // invoke the procedure
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
        exec: function (led, t, cb) {
            if (typeof t !== 'number') {
                cb(400, null);
            } else {
                blinkLed(led, t);
                cb(204, 'blinking');
            }
        }
    }
});
```
  
An Executable Resource is a necessary if you like to do something complicated. Think of that how do you blink a certain led with arbitray times if you are just using general readable/writable Resources? That can be a pain in the ass. In addtion, the difference bewteen LWMQN and LWM2M on Executable Resources is that LWMQN allows an executable Resource to response data back to the Server and LWM2M just response status to the Server by definition. RPCs in LWMQN is more interactive. An Executable Resource is very powerful and it let your machines do more things and be more automatic. IoT is not just about reading something from or writing something to machines.  