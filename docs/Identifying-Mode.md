## Identifying Mode

The machine node can show a sign, e.g. blinking a LED or buzzing, to let a user know where the machine is located. The qnode implementer can override the identify() method to provide this feature. The default implementation does nothing but always returns a InternalServerError(500) response to the Server which sends the identify command to this qnode.

***********************************************

### qnode.identify(cb)
Method of identify. Overridable.

**Arguments:**

1 `cb` (_Function_): `function (err) {}`, the callback you should call when qnode starts the identifying mode.

```js
// In this example, assume that ledDrive is a handle to control the LED.
qnode.identify = function (cb) {
    ledDriver.blink('led1', 10)  // starts to blink a LED to tell people where it is
    cb(null)
}
```
