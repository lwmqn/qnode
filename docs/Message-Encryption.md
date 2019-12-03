## Message Encryption

By default, the qnode won't encrypt the message. You can override the encrypt() and decrypt() methods to implement your own message encryption and decryption. If you did, you should implement the encrypt() and decrypt() methods at your Server as well.


***********************************************

### qnode.encrypt(msg, cb)
Method of encryption. Overridable.

**Arguments:**

1. `msg` (_String_ | _Buffer_): The outgoing message.
2. `cb` (_Function_): `function (err, encrypted) {}`, the callback you should call and pass the encrypted message to it after encryption.


***********************************************

### qnode.decrypt(msg, cb)
Method of decryption. Overridable.

**Arguments:**

1. `msg` (_Buffer_): The incoming message which is a raw buffer.
2. `cb` (_Function_): `function (err, decrypted) {}`, the callback you should call and pass the decrypted message to it after decryption.

<br />

***********************************************

**Encryption/Decryption Example:**

```js
// In this example, I simply encrypt the message with a constant password 'mysecrete'.

qnode.encrypt = function (msg, callback) {
    var msgBuf = new Buffer(msg),
        cipher = crypto.createCipher('aes128', 'mysecrete'),
        encrypted = cipher.update(msgBuf, 'binary', 'base64')
    try {
        encrypted += cipher.final('base64')
        callback(null, encrypted)
    } catch (err) {
        callback(err)
    }
}

qnode.decrypt = function (msg, callback) {
    msg = msg.toString()
    var decipher = crypto.createDecipher('aes128', 'mypassword'),
        decrypted = decipher.update(msg, 'base64', 'utf8')

    try {
        decrypted += decipher.final('utf8')
        callback(null, decrypted)
    } catch (e) {
        // log 'decrytion fails'
        console.log('decrytion fails.')
        callback(e)
    }
};

```
