'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var async = require('async')
var bodyParser = require('body-parser')
var cbRouter = require('cb-express-router')
var bitcore = require('bitcore-lib')
var Block = bitcore.Block
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

  self.bitcoind = this.node.services.bitcoind
  self.addresses = new Addresses({ parent: self })
  self.transactions = new Transactions({ parent: self })
  self.blocks = new Blocks({ parent: self })
}

inherits(CommonBlockchainService, BaseService)

CommonBlockchainService.dependencies = [ 'bitcoind' ]

CommonBlockchainService.prototype.getAPIMethods = function () {
  return [
    [ 'addresses#summary', this, this.addresses.summary, 1 ],
    [ 'addresses#transactions', this, this.addresses.transactions, 2 ],
    [ 'addresses#unspents', this, this.addresses.unspents, 1 ],

    [ 'transactions#get', this, this.transactions.get, 1 ],
    [ 'transactions#summary', this, this.transactions.summary, 1 ],
    // [ 'transactions#unconfirmed', this, this.transactions.unconfirmed, 0 ],
    [ 'transactions#propagate', this, this.transactions.propagate, 1 ],

    [ 'blocks#get', this, this.blocks.get, 1 ],
    [ 'blocks#summary', this, this.blocks.summary, 1 ],
    [ 'blocks#latest', this, this.blocks.latest, 1 ],
    // [ 'blocks#propagate', this, this.blocks.propagate, 1 ]
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

  app.use(bodyParser.json()); // to support JSON-encoded bodies
  app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
  }))

  app.use(cbRouter(this, { validateResponse: false }))

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
  EventEmitter.call(this)
  this.parent = options.parent
  this.bitcoind = this.parent.bitcoind
}

inherits(CommonBlockchainMicroService, EventEmitter)

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
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  async.map(
    addresses,
    function (addr, reduce) {
      self.bitcoind.getAddressSummary(addr, { noTxList: true }, function (err, result) {
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
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  var options = {
    start: Transaction.NLOCKTIME_BLOCKHEIGHT_LIMIT,
    end: blockHeight || 0,
    queryMempool: true
  }

  self.bitcoind.getAddressHistory(addresses, options, function (err, result) {
    if (err) return callback(err)

    result = (result.items || []).map(function (item) {
      var tx = item.tx
      return {
        blockHeight: tx.height || item.height,
        blockId: tx.blockHash || item.blockHash,
        txId: tx.hash,
        // txId: reverseHex(tx.hash),
        txHex: tx.hex || tx.serialize(true /* unsafe */)
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
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!')

  var self = this

  self.bitcoind.getAddressUnspentOutputs(addresses, /* queryMempool = */ true, function (err, result) {
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
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!')

  var self = this

  async.map(
    txids,
    function (txid, reduce) {
      self.bitcoind.getDetailedTransaction(txid, /* queryMempool = */ true, function (err, tx) {
        if (!err && tx) {
          // getTransactionWithBlockInfo sometimes returns a bogus transaction
          // for transactions that don't exist
          if (tx.hash !== txid) err = new Error('transaction not found')
        }

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
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!')

  var self = this

  async.map(
    txids,
    function (txid, reduce) {
      self.bitcoind.getDetailedTransaction(txid, /* queryMempool = */ true, function (err, tx) {
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
// Transactions.prototype.unconfirmed = function (callback) {
//   throw new Error('NotImplementedException')
// }

/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param txs
 * @param callback
 */
Transactions.prototype.propagate = function (txs, callback) {
  $.checkArgument(Array.isArray(txs), 'Must provide an object from where to extract data')

  var self = this

  async.map(
    txs,
    function (tx, reduce) {
      self.bitcoind.sendTransaction(tx, reduce)
    },
    callback
  )
}

function Blocks (options) {
  var self = this
  CommonBlockchainMicroService.call(this, options)

  self.tip = null
  var height = self.bitcoind.height
  if (height) {
    loadTip(height)
  } else {
    this.once('tip', function () {
      self.emit('ready')
    })
  }

  this.bitcoind.on('tip', loadTip)

  // lazy calc tip summary

  function loadTip (height) {
    self.height = height
    self.bitcoind.getBlockHeader(height, function (err, header) {
      if (err || !header) return

      header.height = height
      self.tip = header
      self.tipSummary = self._getBlockSummary(self.tip)
      self.emit('tip', self.tip)
    })
  }
}

inherits(Blocks, CommonBlockchainMicroService)

/**
 * Returns blocks corresponding to the hashes supplied
 *
 * @param hashes
 * @param callback
 */
Blocks.prototype.get = function (hashes, callback) {
  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!')

  var self = this

  async.map(
    hashes,
    function (hash, reduce) {
      self.bitcoind.getBlock(hash, function (err, block) {
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
  var self = this

  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!')

  var self = this

  async.map(
    hashes,
    function (hash, reduce) {
      self.bitcoind.getBlockHeader(hash, function (err, header) {
        reduce(err, !err && self._getBlockSummary(header, hash))
      })
    },
    callback
  )
}

Blocks.prototype._getBlockSummary = function (header) {
  // header looks like:
  // {
  //   hash: result.hash,
  //   version: result.version,
  //   confirmations: result.confirmations,
  //   height: result.height,
  //   chainWork: result.chainwork,
  //   prevHash: result.previousblockhash,
  //   nextHash: result.nextblockhash,
  //   merkleRoot: result.merkleroot,
  //   time: result.time,
  //   medianTime: result.mediantime,
  //   nonce: result.nonce,
  //   bits: result.bits,
  //   difficulty: result.difficulty
  // };

  return {
    blockId: header.hash,
    prevBlockId: getId(header, 'prevHash'),
    merkleRootHash: getId(header, 'merkleRoot'),
    nonce: header.nonce,
    version: header.version,
    blockHeight: header.height,
    timestamp: header.time,
    // txCount: block.transactions.length
  }
}

/**
 * Returns the latest unconfirmed transactions (subjective to the node)
 *
 * @param callback
 */
Blocks.prototype.latest = function (callback) {
  var self = this
  if (!this.tipSummary) {
    return this.once('ready', this.latest.bind(this, callback))
  }

  process.nextTick(function () {
    callback(null, self.tipSummary)
  })
}

/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param block
 * @param callback
 */
// Blocks.prototype.propagate = function (block, callback) {
//   throw new Error('NotImplementedException')
// }

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

function reverseHex (str) {
  if (Buffer.isBuffer(str)) return Array.prototype.reverse.call(str).toString('hex')

  if (str.length % 2) str = '0' + str

  var arr = []
  while (str.length) {
    arr.push(str.slice(-2))
    str = str.slice(0, -2)
  }

  return arr.join('')
}

function getId (header, prop) {
  return header.toJSON ? reverseHex(header[prop]) : header[prop].toString('hex')
}

module.exports = CommonBlockchainService
