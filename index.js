'use strict'

var inherits = require('util').inherits

var async = require('async')
var cbRouter = require('cb-express-router')

var bitcore = require('bitcore-lib')
var BaseService = require('./service')

var Transaction = bitcore.Transaction

var JSUtil = bitcore.util.js
var $ = bitcore.util.preconditions

/**
 * This service exposes a common-blockchain (https://github.com/common-blockchain/common-blockchain) interface
 *
 * @param {Object} options
 * @param {Node} options.node - A reference to the node
 */
var CommonBlockchainService = function (options) {
  var self = this

  BaseService.call(self, options)

  self.addresses = new Addresses({ parent: self })
  self.transactions = new Transactions({ parent: self })
  self.blocks = new Blocks({ parent: self })
}

inherits(CommonBlockchainService, BaseService)

CommonBlockchainService.dependencies = [ 'address', 'db', 'bitcoind' ]

CommonBlockchainService.prototype.getAPIMethods = function () {
  return [
    [ 'addresses#summary', this, this.addresses.summary, 1 ],
    [ 'addresses#transactions', this, this.addresses.transactions, 2 ],
    [ 'addresses#unspents', this, this.addresses.unspents, 1 ],

    [ 'transactions#get', this, this.transactions.get, 1 ],
    [ 'transactions#summary', this, this.transactions.summary, 1 ],
    [ 'transactions#unconfirmed', this, this.transactions.unconfirmed, 0 ],
    [ 'transactions#propagate', this, this.transactions.propagate, 1 ],

    [ 'blocks#get', this, this.blocks.get, 1 ],
    [ 'blocks#summary', this, this.blocks.summary, 1 ],
    [ 'blocks#latest', this, this.blocks.latest, 1 ],
    [ 'blocks#propagate', this, this.blocks.propagate, 1 ]
  ]
}

/**
 * Exposes all the hooks as web-hooks
 *
 * @param app
 * @param express
 */
CommonBlockchainService.prototype.setupRoutes = function (app, express) {
  var self = this

  var bodyParser = require('body-parser')

  app.use(bodyParser.json()); // to support JSON-encoded bodies
  app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
  }))

  app.use(cbRouter(this))

  function extractAddresses (addrs) {
    if (!addrs) return null

    return addrs.split(',').filter(function (addr) {
      return bitcore.Address.isValid(addr)
    })
  }

  function extractHexs (txIds) {
    if (!txIds) return null

    return txIds.split(',').filter(function (txId) {
      return JSUtil.isHexa(txId)
    })
  }
}

CommonBlockchainService.prototype.getRoutePrefix = function () {
  return 'cb'
}

function CommonBlockchainMicroService (options) {
  this.parent = options.parent
}

function Addresses (options) {
  CommonBlockchainMicroService.call(this, options)
}

inherits(Addresses, CommonBlockchainMicroService)

/**
 * Gets summary for the address supplied
 *
 * @param addresses
 * @param callback
 */
Addresses.prototype.summary = function (addresses, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  async.map(
    addresses,
    function (addr, reduce) {
      self.parent.node.services.address.getAddressSummary(addr, { noTxList: true }, function (err, result) {
        reduce(err, !err && {
          address: addr,
          balance: result['balance'],
          totalReceived: result['totalReceived'],
          txCount: result['appearances']
        })
      })
    },
    callback
  )
}

/**
 * Lists all transactions' details for the addresses supplied
 *
 * @param addresses
 * @param blockHeight?
 * @param callback
 */
Addresses.prototype.transactions = function (addresses, blockHeight, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  var options = {
    start: Transaction.NLOCKTIME_MAX_VALUE,
    end: blockHeight || 0,
    queryMempool: false
  }

  self.parent.node.services.address.getAddressHistory(addresses, options, function (err, result) {
    if (err) return callback(err)

    result = (result.items || []).map(function (item) {
      var tx = item.tx
      return {
        blockHeight: item.height,
        blockId: tx.blockHash,
        txId: tx.id,
        txHex: tx.serialize( /* unsafe = */ true)
      }
    })

    callback(null, result)
  })
}

/**
 * Gets unspents outputs for the addresses supplied
 *
 * @param addresses
 * @param callback
 */
Addresses.prototype.unspents = function (addresses, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  self.parent.node.services.address.getUnspentOutputs(addresses, /* queryMempool = */ false, function (err, result) {
    if (err) return callback(err)

    result = (result || []).map(function (unspent) {
      return {
        address: unspent.address,
        txId: unspent.txid,
        confirmations: unspent.confirmations,
        value: unspent.satoshis,
        vout: unspent.outputIndex
      }
    })

    callback(null, result)
  })
}

function Transactions (options) {
  CommonBlockchainMicroService.call(this, options)
}

inherits(Transactions, CommonBlockchainMicroService)

/**
 * Returns transactions corresponding to the ids supplied
 *
 * @param txids
 * @param callback
 */
Transactions.prototype.get = function (txids, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!')

  var self = this

  async.map(
    txids,
    function (txid, reduce) {
      self.parent.node.services.db.getTransactionWithBlockInfo(txid, /* queryMempool = */ false, function (err, tx) {
        reduce(err, !err && {
          txId: tx.hash,
          blockId: tx.__blockHash,
          blockHeight: tx.__height,
          txHex: tx.serialize( /* unsafe= */ true)
        })
      })
    },
    callback
  )
}

/**
 * Gets transactions' summaries
 *
 * @param txids
 * @param callback
 */
Transactions.prototype.summary = function (txids, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!')

  var self = this

  async.map(
    txids,
    function (txid, reduce) {
      self.parent.node.services.db.getTransactionWithBlockInfo(txid, /* queryMempool = */ false, function (err, tx) {
        if (err) return reduce(err)

        try {
          reduce(null, {
            txId: txid,
            blockId: tx.__blockHash,
            blockHeight: tx.__height,
          // TODO:
          // nInputs:          tx.inputs.length,
          // nOutputs:         tx.outputs.length,
          // totalInputValue:  tx.inputAmount,
          // totalOutputValue: tx.outputAmount
          })
        } catch (e) {
          return reduce(e)
        }
      })
    },
    callback
  )
}

/**
 * Returns the latest unconfirmed transactions (subjective to the node)
 *
 * @param callback
 */
Transactions.prototype.unconfirmed = function (callback) {
  throw 'NotImplementedException'
}

/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param txs
 * @param callback
 */
Transactions.prototype.propagate = function (txs, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txs), 'Must provide an object from where to extract data')

  var self = this

  async.map(
    txs,
    function (tx, reduce) {
      self.parent.node.services.db.sendTransaction(tx, reduce)
    },
    callback
  )
}

function Blocks (options) {
  CommonBlockchainMicroService.call(this, options)
}

inherits(Blocks, CommonBlockchainMicroService)

/**
 * Returns blocks corresponding to the hashes supplied
 *
 * @param hashes
 * @param callback
 */
Blocks.prototype.get = function (hashes, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!')

  var self = this

  async.map(
    hashes,
    function (hash, reduce) {
      self.parent.node.services.db.getBlock(hash, function (err, block) {
        reduce(err, !err && {
          blockId: block.id,
          blockHex: block.toString()
        })
      })
    },
    callback
  )
}

/**
 * Gets blocks' summaries
 *
 * @param hashes
 * @param callback
 */
Blocks.prototype.summary = function (hashes, callback) {
  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!')

  var self = this

  async.map(
    hashes,
    function (hash, reduce) {
      self.parent.node.services.db.getBlock(hash, function (err, block) {
        if (err) return reduce(err)

        var blockIndex = self.parent.node.services.bitcoind.getBlockIndex(hash)
        var blockSize = block.toString().length

        reduce(null, {
          blockId: block.id,
          prevBlockId: block.header.prevHash.toString('hex'),
          merkleRootHash: block.header.merkleRoot.toString('hex'),
          nonce: block.header.nonce,
          version: block.header.version,
          blockHeight: blockIndex.height,
          blockSize: blockSize,
          timestamp: block.header.timestamp,
          txCount: block.transactions.length
        })
      })
    },
    callback
  )
}

/**
 * Returns the latest unconfirmed transactions (subjective to the node)
 *
 * @param callback
 */
Blocks.prototype.latest = function (callback) {
  throw 'NotImplementedException'
}

/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param block
 * @param callback
 */
Blocks.prototype.propagate = function (block, callback) {
  throw 'NotImplementedException'
}

/**
 * Function which is called when module is first initialized
 */
CommonBlockchainService.prototype.start = function (done) {
  setImmediate(done)
}

/**
 * Function to be called when bitcore-node is stopped
 */
CommonBlockchainService.prototype.stop = function (done) {
  setImmediate(done)
}

module.exports = CommonBlockchainService
