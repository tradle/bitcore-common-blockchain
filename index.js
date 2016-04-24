'use strict';

var BaseService = require('./service');
var inherits = require('util').inherits;

var async = require('async');

var bitcore = require('bitcore-lib');

var Transaction = bitcore.Transaction;

var JSUtil = bitcore.util.js;
var $ = bitcore.util.preconditions;



/**
 * This service exposes a common-blockchain (https://github.com/common-blockchain/common-blockchain) interface
 *
 * @param {Object} options
 * @param {Node} options.node - A reference to the node
 */
var CommonBlockchainService = function (options) {
  var self = this;

  BaseService.call(self, options);

  self.addresses    = new Addresses     ({ parent: self });
  self.transactions = new Transactions  ({ parent: self });
  self.blocks       = new Blocks        ({ parent: self });
};

inherits(CommonBlockchainService, BaseService);

CommonBlockchainService.dependencies = [ 'address', 'db', 'bitcoind' ];


CommonBlockchainService.prototype.getAPIMethods = function () {
  return [
    [ 'addresses#summary',        this, this.addresses.summary,         1 ],
    [ 'addresses#transactions',   this, this.addresses.transactions,    2 ],
    [ 'addresses#unspents',       this, this.addresses.unspents,        1 ],

    [ 'transactions#get',         this, this.transactions.get,          1 ],
    [ 'transactions#summary',     this, this.transactions.summary,      1 ],
    [ 'transactions#unconfirmed', this, this.transactions.unconfirmed,  0 ],
    [ 'transactions#propagate',   this, this.transactions.propagate,    1 ],

    [ 'blocks#get',               this, this.blocks.get,                1 ],
    [ 'blocks#summary',           this, this.blocks.summary,            1 ],
    [ 'blocks#latest',            this, this.blocks.latest,             1 ],
    [ 'blocks#propagate',         this, this.blocks.propagate,          1 ]
  ]
};


/**
 * Exposes all the hooks as web-hooks
 *
 * @param app
 * @param express
 */
CommonBlockchainService.prototype.setupRoutes = function (app, express) {
  var self = this;

  var bodyParser = require('body-parser');

  app.use(bodyParser.json());       // to support JSON-encoded bodies
  app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
    extended: true
  }));

  function extractAddresses(addrs) {
    if (!addrs) return null;

    return addrs.split(',').filter(function (addr) {
      return bitcore.Address.isValid(addr);
    });
  }

  function extractHexs(txIds) {
    if (!txIds) return null;

    return txIds.split(',').filter(function (txId) {
      return JSUtil.isHexa(txId);
    });
  }


  //
  // addresses#summary
  //
  app.get('/addresses/summary/:addrs', function (req, res) {
    var addrs = extractAddresses(req.params.addrs);

    if (!addrs || addrs.length === 0)
      return res.status(404).send('Sorry, we cannot find that addresses!\n' + JSON.stringify(req.params.addrs)).end();

    self.addresses.summary(addrs, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });


  //
  // addresses#transactions
  //
  app.get('/addresses/transactions/:addrs', function (req, res) {
    var addrs = extractAddresses(req.params.addrs);

    if (!addrs || addrs.length === 0)
      return res.status(404).send('Sorry, we cannot find that addresses!\n' + JSON.stringify(req.params.addrs)).end();

    self.addresses.transactions(addrs, req.query.blockHeight, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });

  //
  // addresses#unspents
  //
  app.get('/addresses/unspents/:addrs', function (req, res) {
    var addrs = extractAddresses(req.params.addrs);

    if (!addrs || addrs.length === 0)
      return res.status(404).send('Sorry, we cannot find that addresses!\n' + JSON.stringify(req.params.addrs)).end();

    self.addresses.unspents(addrs, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });


  //
  // transactions#get
  //
  app.get('/transactions/get/:txIds', function (req, res) {
    var txIds = extractHexs(req.params.txIds);

    if (!txIds || txIds.length === 0)
      return res.status(404).send('Sorry, we cannot find that transactions!\n' + JSON.stringify(req.params.txIds)).end();

    self.transactions.get(txIds, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });

  //
  // transactions#summary
  //
  app.get('/transactions/summary/:txIds', function (req, res) {
    var txIds = extractHexs(req.params.txIds);

    if (!txIds || txIds.length === 0)
      return res.status(404).send('Sorry, we cannot find that transactions!\n' + JSON.stringify(req.params.txIds)).end();

    self.transactions.summary(txIds, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });

  //
  // transactions#unconfirmed (TODO)
  //

  //
  // transactions#propagate
  //
  app.post('/transactions/propagate', function (req, res) {
    var hex = req.body.hex;

    if (!hex)
      return res.status(400).send('No TX hex found!\n' + JSON.stringify(req.body)).end();

    self.transactions.propagate([ hex ], function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });


  //
  // blocks#get
  //
  app.get('/blocks/get/:hashes', function (req, res) {
    var hashes = extractHexs(req.params.hashes);

    if (!hashes || hashes.length === 0)
      return res.status(404).send('Sorry, we cannot find that blocks!\n' + JSON.stringify(req.params.hashes)).end();

    self.blocks.get(hashes, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });

  //
  // blocks#summary
  //
  app.get('/blocks/get/:hashes', function (req, res) {
    var hashes = extractHexs(req.params.hashes);

    if (!hashes || hashes.length === 0)
      return res.status(404).send('Sorry, we cannot find that blocks!\n' + JSON.stringify(req.params.hashes)).end();

    self.blocks.summary(hashes, function (err, result) {
      if (!err)
        res.json(result);
      else
        res.status(500).send('Sorry, something blew up!\n' + err);

      res.end();
    });
  });

  //
  // blocks#latest (TODO)
  //

  //
  // blocks#propagate (TODO)
  //

};

CommonBlockchainService.prototype.getRoutePrefix = function () {
  return 'cb';
};


function CommonBlockchainMicroService(options) {
  this.parent = options.parent;
}


function Addresses(options) {
  CommonBlockchainMicroService.call(this, options)
}

inherits(Addresses, CommonBlockchainMicroService);


/**
 * Gets summary for the address supplied
 *
 * @param addresses
 * @param callback
 */
Addresses.prototype.summary = function (addresses, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!');

  var self = this;

  async.map(
    addresses,
    function (addr, callback) {
      self.parent.node.services.address.getAddressSummary(addr, { noTxList: true }, function (err, result) {
        if (!err) {
          callback(err, {
            address:        addr,
            balance:        result['balance'],
            totalReceived:  result['totalReceived'],
            txCount:        result['appearances']
          })
        } else {
          callback(err, result);
        }
      })
    },
    callback
  );
};

/**
 * Lists all transactions' details for the addresses supplied
 *
 * @param addresses
 * @param blockHeight?
 * @param callback
 */
Addresses.prototype.transactions = function (addresses, blockHeight, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!');

  var self = this;

  var options = {
    start:  Transaction.NLOCKTIME_MAX_VALUE,
    end:    blockHeight || 0,
    queryMempool: false
  };

  self.parent.node.services.address.getAddressHistory(addresses, options, function (err, result) {
    if (!err) {
      async.map(
        result['items'] || [], function (item, reduce) {
          var tx = item.tx;

          reduce(null, {
            blockHeight:  item.height,
            blockId:      tx.blockHash,
            txId:         tx.id,
            txHex:        tx.serialize(/* unsafe = */ true)
          });
        },
        callback
      );
    } else {
      callback(err, result);
    }
  })
};


/**
 * Gets unspents outputs for the addresses supplied
 *
 * @param addresses
 * @param callback
 */
Addresses.prototype.unspents = function (addresses, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(addresses), 'Must provide an array of addresses!');

  var self = this;

  self.parent.node.services.address.getUnspentOutputs(addresses, /* queryMempool = */ false, function (err, result) {
    if (!err) {
      async.map(
        result || [], function (unspent, reduce) {
          reduce(err, {
            address:        unspent.address,
            txId:           unspent.txid,
            confirmations:  unspent.confirmations,
            value:          unspent.satoshis,
            vout:           unspent.outputIndex
          })
        },
        callback
      );
    } else {
      callback(err, result);
    }
  })
};


function Transactions(options) {
  CommonBlockchainMicroService.call(this, options)
}

inherits(Transactions, CommonBlockchainMicroService);

/**
 * Returns transactions corresponding to the ids supplied
 *
 * @param txids
 * @param callback
 */
Transactions.prototype.get = function (txids, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!');

  var self = this;

  async.map(
    txids,
    function (txid, reduce) {
      self.parent.node.services.db.getTransactionWithBlockInfo(txid, /* queryMempool = */ false, function (err, tx) {
        if (!err) {
          reduce(err, {
            txId:         tx.hash,
            blockId:      tx.__blockHash,
            blockHeight:  tx.__height,
            txHex:        tx.serialize(/* unsafe= */ true)
          });
        } else {
          reduce(err, tx);
        }
      })
    },
    callback
  );
};


/**
 * Gets transactions' summaries
 *
 * @param txids
 * @param callback
 */
Transactions.prototype.summary = function (txids, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txids), 'Must provide an array of tx-ids!');

  var self = this;

  async.map(
    txids,
    function (txid, reduce) {
      self.parent.node.services.db.getTransactionWithBlockInfo(txid, /* queryMempool = */ false, function (err, tx) {
        if (!err) {

          var tx0 = undefined;
          try {
            tx0 = {
              txId:             txid,
              blockId:          tx.__blockHash,
              blockHeight:      tx.__height,
              // nInputs:          tx.inputs.length,
              // nOutputs:         tx.outputs.length,
              // totalInputValue:  tx.inputAmount,
              // totalOutputValue: tx.outputAmount
            };
          } catch (e) {
            reduce(e)
          }

          if (tx0)
            reduce(err, tx0);
        } else {
          reduce(err, tx);
        }
      })
    },
    callback
  );
};


/**
 * Returns the latest unconfirmed transactions (subjective to the node)
 *
 * @param callback
 */
Transactions.prototype.unconfirmed = function (callback) {
  throw "NotImplementedException";
};


/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param txs
 * @param callback
 */
Transactions.prototype.propagate = function (txs, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(txs), 'Must provide an object from where to extract data');

  var self = this;

  async.map(
    txs,
    function (tx, reduce) {
      self.parent.node.services.db.sendTransaction(tx, reduce)
    },
    callback
  );
};


function Blocks(options) {
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
  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!');

  var self = this;

  async.map(
    hashes,
    function (hash, reduce) {
      self.parent.node.services.db.getBlock(hash, function (err, block) {
        if (!err) {
          reduce(err, {
            blockId:  block.id,
            blockHex: block.toString()
          });
        } else {
          reduce(err, block);
        }
      })
    },
    callback
  );
};


/**
 * Gets blocks' summaries
 *
 * @param hashes
 * @param callback
 */
Blocks.prototype.summary = function (hashes, callback) {

  // TODO: Replace with `typeforce`
  $.checkArgument(Array.isArray(hashes), 'Must provide an array of block-hashes!');

  var self = this;

  async.map(
    hashes,
    function (hash, reduce) {
      self.parent.node.services.db.getBlock(hash, function (err, block) {
        if (!err) {
          var blockIndex  = self.parent.node.services.bitcoind.getBlockIndex(hash);
          var blockSize   = block.toString().length;

          reduce(err, {
            blockId:          block.id,
            prevBlockId:      block.header.prevHash.toString('hex'),
            merkleRootHash:   block.header.merkleRoot.toString('hex'),
            nonce:            block.header.nonce,
            version:          block.header.version,
            blockHeight:      blockIndex.height,
            blockSize:        blockSize,
            timestamp:        block.header.timestamp,
            txCount:          block.transactions.length
          });
        } else {
          reduce(err, block);
        }
      })
    },
    callback
  );
};


/**
 * Returns the latest unconfirmed transactions (subjective to the node)
 *
 * @param callback
 */
Blocks.prototype.latest = function (callback) {
  throw "NotImplementedException";
};


/**
 * Propagates supplied transactions (in bitcoin-protocol format) to the blockchain
 *
 * @param block
 * @param callback
 */
Blocks.prototype.propagate = function (block, callback) {
  throw "NotImplementedException";
};


/**
 * Function which is called when module is first initialized
 */
CommonBlockchainService.prototype.start = function(done) {
  setImmediate(done);
};

/**
 * Function to be called when bitcore-node is stopped
 */
CommonBlockchainService.prototype.stop = function(done) {
  setImmediate(done);
};

module.exports = CommonBlockchainService;
