## Debug Messages

Like many node.js modules do, **mqtt-node** utilizes [debug](https://www.npmjs.com/package/debug) module to print out messages that may help in debugging. The namespaces include `mqtt-node`, `mqtt-node:init`, `mqtt-node:request`, and `mqtt-node:msgHdlr`. The `mqtt-node:request` logs requests that qnode sends to the Server, and `mqtt-node:msgHdlr` logs the requests that comes from the Server.

If you like to print the debug messages, run your app.js with the DEBUG environment variable:

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
