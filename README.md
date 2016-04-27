# bitcore-common-blockchain

[common-blockchain](https://github.com/common-blockchain/common-blockchain) service for [bitcore-node](https://github.com/bitpay/bitcore-node)

# Install

```bash
bitcore-node install bitcore-common-blockchain
```

# Usage

Use [cb-http-client](https://github.com/common-blockchain/cb-http-client) with the [common-blockchain](https://github.com/common-blockchain/common-blockchain) API against a bitcore node running this service.

```js
// assuming you have a local bitcore-node with its web server running on port 3001 (the default bitcore-node port):
var Blockchain = require('cb-http-client')
var blockchain = new Blockchain('http://127.0.0.1:3001/cb')
blockchain.addresses.transactions(['mpNDUWcDcZw1Teo3LFHvr8usNdwDLKdTaY'], function (err, txs) {
  // i want to do bad things to txs 
})
```
