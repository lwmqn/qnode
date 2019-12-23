## Debug Messages

Like many node.js modules do, **lwmqn-qnode** utilizes [debug](https://www.npmjs.com/package/debug) module to print out messages that may help in debugging. The namespaces include `lwmqn-qnode`, `lwmqn-qnode:init`, `lwmqn-qnode:request`, and `lwmqn-qnode:msgHdlr`. The `lwmqn-qnode:request` logs requests that qnode sends to the Server, and `lwmqn-qnode:msgHdlr` logs the requests that comes from the Server.

If you like to print the debug messages, run your app.js with the DEBUG environment variable:

```sh
$ DEBUG=lwmqn-qnode* app.js          # use wildcard to print all lwmqn-qnode messages
$ DEBUG=lwmqn-qnode:msgHdlr app.js   # if you are only interested in lwmqn-qnode:msgHdlr messages
```

Example:

```sh
$ DEBUG=lwmqn-qnode* node client
  lwmqn-qnode:init Initialize lwm2mServer object, lifetime: 2000 +0ms
  ...
  lwmqn-qnode qnode created, clientId: test_node_01 +4ms
  lwmqn-qnode:init ip: 192.168.1.102, mac: 00:0c:29:ff:ed:7c, router ip: 192.168.1.1 +20ms
  lwmqn-qnode:init Local init done! Wait for LWMQN network establishment +0ms
  lwmqn-qnode Connect to broker +1s
  lwmqn-qnode:init LWMQN establishing stage 1: register, deregister, and ...
  lwmqn-qnode:request REQ --> register, transId: 1 +2ms
  lwmqn-qnode:msgHdlr REQ <-- ping, transId: 0 +14ms
  lwmqn-qnode:msgHdlr RSP --> ping, transId: 0 +0ms
  lwmqn-qnode:request RSP <-- register, transId: 1, status: 200 +1ms
  lwmqn-qnode:init LWMQN establishing stage 2: notify, update, ping, announce, ...
  lwmqn-qnode:init LWMQN establishing done! - Old client rejoined +0ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 1 +12ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 2 +0ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 3 +1ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 4 +0ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 5 +0ms
  lwmqn-qnode:msgHdlr REQ <-- read, transId: 6 +0ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 1, status: 205 +9ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 2, status: 205 +0ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 4, status: 205 +3ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 5, status: 205 +0ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 6, status: 205 +1ms
  lwmqn-qnode:msgHdlr RSP --> read, transId: 3, status: 205 +29ms
  ...
  lwmqn-qnode:msgHdlr REQ <-- writeAttrs, transId: 15 +6ms
  lwmqn-qnode:msgHdlr RSP --> writeAttrs, transId: 15, status: 204 +12ms
```
