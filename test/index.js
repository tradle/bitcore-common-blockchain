'use strict'

var EventEmitter = require('events').EventEmitter
var should = require('chai').should()
var sinon = require('sinon')

var bitcoreLib = require('bitcore-lib')

var transactionData = require('./data/bitcoin-transactions.json')
// var blockData = require('./data/livenet-345003.json')
var blockData = require('./data/livenet-301321')

var CommonBlockchain = require('../')

var Networks = bitcoreLib.Networks
var Block = bitcoreLib.Block
var Transaction = bitcoreLib.Transaction

function newNode () {
  return {
    datadir: 'testdir',
    network: Networks.testnet,
    services: {
      bitcoind: new EventEmitter()
    }
  }
}

describe('Common Blockchain Interface', function () {
  // describe('@constructor', function () {
  //   // TODO

  // })

  // describe('#addresses.summary', function () {
  //   var node = newNode()
  //   var summary = {
  //     totalReceived: 3487110,
  //     totalSpent: 0,
  //     balance: 3487110,
  //     unconfirmedBalance: 0,
  //     appearances: 1,
  //     unconfirmedAppearances: 1,
  //     txids: [
  //       '9f183412de12a6c1943fc86c390174c1cde38d709217fdb59dcf540230fa58a6',
  //       '689e9f543fa4aa5b2daa3b5bb65f9a00ad5aa1a2e9e1fc4e11061d85f2aa9bc5'
  //     ]
  //   }

  //   var cbs = new CommonBlockchain({ node: node })
  //   node.services.bitcoind.getAddressSummary = sinon.stub().callsArgWith(2, null, summary)

  //   it('should return address summaries', function (done) {
  //     cbs.addresses.summary([ 'mpkDdnLq26djg17s6cYknjnysAm3QwRzu2' ], function (err, summary) {
  //       should.not.exist(err)

  //       summary[0].address.should.equal('mpkDdnLq26djg17s6cYknjnysAm3QwRzu2')
  //       summary[0].balance.should.equal(3487110)
  //       summary[0].totalReceived.should.equal(3487110)
  //       summary[0].txCount.should.equal(1)

  //       done()
  //     })
  //   })
  // })

  // describe('#addresses.transactions', function () {
  //   var node = newNode()
  //   var history = {
  //     totalCount: 1, // The total number of items within "start" and "end"
  //     items: [
  //       {
  //         addresses: {
  //           'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW': {
  //             inputIndexes: [],
  //             outputIndexes: [0]
  //           }
  //         },
  //         satoshis: 1000000000,
  //         height: 150, // the block height of the transaction
  //         confirmations: 3,
  //         timestamp: 1442948127, // in seconds
  //         fees: 191,
  //         tx: new Transaction(new Buffer(transactionData[1].hex, 'hex'))
  //       }
  //     ]
  //   }

  //   var cbs = new CommonBlockchain({ node: node })

  //   node.services.bitcoind.getAddressHistory = sinon.stub().callsArgWith(2, null, history)

  //   it('should return the transaction history for the specified addresses', function (done) {
  //     cbs.addresses.transactions([ 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW' ], null, function (err, txs) {
  //       should.not.exist(err)

  //       txs[0].txId.should.equal('47a34f835395b7e01e2ee757a301476e2c3f5f6a9245e655a1842f6db2368a58')
  //       txs[0].txHex.should.equal(transactionData[1].hex)
  //       txs[0].blockHeight.should.equal(150)
  //       // txs[0].blockId    .should.equal(3487110)

  //       done()
  //     })
  //   })
  // })

  // describe('#addresses.unspents', function () {
  //   var node = newNode()
  //   var unspentOuts = [
  //     {
  //       address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW',
  //       txid: '9d956c5d324a1c2b12133f3242deff264a9b9f61be701311373998681b8c1769',
  //       outputIndex: 1,
  //       height: 150,
  //       satoshis: 1000000000,
  //       script: '76a9140b2f0a0c31bfe0406b0ccc1381fdbe311946dadc88ac',
  //       confirmations: 3
  //     }
  //   ]

  //   var cbs = new CommonBlockchain({ node: node })

  //   node.services.bitcoind.getAddressUnspentOutputs = sinon.stub().callsArgWith(2, null, unspentOuts)

  //   it('should return unspents for specified addresses', function (done) {
  //     cbs.addresses.unspents([ 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW' ], function (err, txs) {
  //       should.not.exist(err)

  //       txs[0].txId.should.equal('9d956c5d324a1c2b12133f3242deff264a9b9f61be701311373998681b8c1769')
  //       txs[0].address.should.equal('mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW')
  //       txs[0].confirmations.should.equal(3)
  //       txs[0].value.should.equal(1000000000)
  //       txs[0].vout.should.equal(1)

  //       done()
  //     })
  //   })
  // })

  // describe('#transactions.get', function () {
  //   var node = newNode()
  //   var tx = new Transaction()

  //   var txHex = '0100000001a08ee59fcd5d86fa170abb6d925d62d5c5c476359681b70877c04f270c4ef246000000008a47304402203fb9b476bb0c37c9b9ed5784ebd67ae589492be11d4ae1612be29887e3e4ce750220741ef83781d1b3a5df8c66fa1957ad0398c733005310d7d9b1d8c2310ef4f74c0141046516ad02713e51ecf23ac9378f1069f9ae98e7de2f2edbf46b7836096e5dce95a05455cc87eaa1db64f39b0c63c0a23a3b8df1453dbd1c8317f967c65223cdf8ffffffff02b0a75fac000000001976a91484b45b9bf3add8f7a0f3daad305fdaf6b73441ea88ac20badc02000000001976a914809dc14496f99b6deb722cf46d89d22f4beb8efd88ac00000000'

  //   tx.fromString(txHex)

  //   var txId = tx.hash

  //   tx.__blockHash = '00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45'
  //   tx.__height = 314159
  //   tx.__timestamp = 1407292005

  //   var cbs = new CommonBlockchain({ node: node })

  //   it('should return transaction bodies', function (done) {
  //     node.services.bitcoind.getDetailedTransaction = sinon.stub().callsArgWith(2, null, tx)
  //     cbs.transactions.get([ txId ], function (err, txs) {
  //       should.not.exist(err)

  //       txs[0].txId.should.equal(txId)
  //       txs[0].txHex.should.equal(txHex)
  //       txs[0].blockId.should.equal('00000000000000001bb82a7f5973618cfd3185ba1ded04dd852a653f92a27c45')
  //       txs[0].blockHeight.should.equal(314159)

  //       done()
  //     })
  //   })
  // })

  // describe('#transactions.summary', function () {
  //   var node = newNode()
  //   var txBuffer = new Buffer('01000000016f95980911e01c2c664b3e78299527a47933aac61a515930a8fe0213d1ac9abe01000000da0047304402200e71cda1f71e087c018759ba3427eb968a9ea0b1decd24147f91544629b17b4f0220555ee111ed0fc0f751ffebf097bdf40da0154466eb044e72b6b3dcd5f06807fa01483045022100c86d6c8b417bff6cc3bbf4854c16bba0aaca957e8f73e19f37216e2b06bb7bf802205a37be2f57a83a1b5a8cc511dc61466c11e9ba053c363302e7b99674be6a49fc0147522102632178d046673c9729d828cfee388e121f497707f810c131e0d3fc0fe0bd66d62103a0951ec7d3a9da9de171617026442fcd30f34d66100fab539853b43f508787d452aeffffffff0240420f000000000017a9148a31d53a448c18996e81ce67811e5fb7da21e4468738c9d6f90000000017a9148ce5408cfeaddb7ccb2545ded41ef478109454848700000000', 'hex')
  //   var tx = new Transaction().fromBuffer(txBuffer)
  //   tx.__blockHash = '00000000000ec715852ea2ecae4dc8563f62d603c820f81ac284cd5be0a944d6'
  //   tx.__height = 530482
  //   tx.__timestamp = 1439559434000

  //   var txId = tx.hash
  //   var cbs = new CommonBlockchain({ node: node })

  //   it('should return transaction summaries', function (done) {
  //     node.services.bitcoind.getDetailedTransaction = sinon.stub().callsArgWith(2, null, tx)
  //     cbs.transactions.summary([ txId ], function (err, txs) {
  //       should.not.exist(err)

  //       txs[0].txId.should.equal(txId)
  //       txs[0].blockId.should.equal('00000000000ec715852ea2ecae4dc8563f62d603c820f81ac284cd5be0a944d6')
  //       txs[0].blockHeight.should.equal(530482)
  //       // txs[0].nInputs          .should.equal(0)
  //       // txs[0].nOutputs         .should.equal(0)
  //       // txs[0].totalInputValue  .should.equal(0)
  //       // txs[0].totalOutputValue .should.equal(0)

  //       done()
  //     })
  //   })
  // })

  describe('#blocks.get', function () {
    var node = newNode()
    var blockBuffer = new Buffer(blockData, 'hex')

    var block = Block.fromBuffer(blockBuffer)

    var cbs = new CommonBlockchain({ node: node })

    it('should return block bodies', function (done) {
      node.services.bitcoind.getBlock = sinon.stub().callsArgWith(1, null, block)
      cbs.blocks.get([ '000000000c9f25eb2565f81cdbe98aa692ccda81a3532cea1301a284b8f0cc0c' ], function (err, blocks) {
        should.not.exist(err)

        blocks[0].blockId.should.equal('000000000c9f25eb2565f81cdbe98aa692ccda81a3532cea1301a284b8f0cc0c')
        blocks[0].blockHex.should.equal(blockData)

        done()
      })
    })
  })

  describe('#blocks.summary', function () {
    var node = newNode()
    var blockBuffer = new Buffer(blockData, 'hex')

    var header = Block.fromBuffer(blockBuffer).header
    header.height = 10

    var cbs = new CommonBlockchain({ node: node })

    it('should return block summaries', function (done) {
      node.services.bitcoind.getBlockHeader = sinon.stub().callsArgWith(1, null, header)

      cbs.blocks.summary([ '000000000c9f25eb2565f81cdbe98aa692ccda81a3532cea1301a284b8f0cc0c' ], function (err, bs) {
        should.not.exist(err)

        bs[0].blockId.should.equal('000000000c9f25eb2565f81cdbe98aa692ccda81a3532cea1301a284b8f0cc0c')
        bs[0].prevBlockId.should.equal('000000006c840ca5ff4dadcfeb4fe14b3d90c144be0fe5b8d06b329b8f8f3855')
        bs[0].merkleRootHash.should.equal('70f719e112deef26cc9c955606e3c07e09441885d69ddd947ae66f4697f4400c')
        bs[0].nonce.should.equal(1810450624)
        bs[0].version.should.equal(2)
        bs[0].blockHeight.should.equal(10)
        // bs[0].blockSize.should.equal(232714)
        bs[0].timestamp.should.equal(1413392796)
        // bs[0].txCount.should.equal(182)

        done()
      })
    })
  })

  describe('#blocks.latest', function () {
    var node = newNode()
    var blockBuffer = new Buffer(blockData, 'hex')

    var block = Block.fromBuffer(blockBuffer)
    var header = block.header.toJSON()
    header.height = 10

    var cbs = new CommonBlockchain({ node: node })

    it('should return block summaries', function (done) {
      node.services.bitcoind.getBlockHeader = sinon.stub().callsArgWith(1, null, header)
      node.services.bitcoind.emit('tip', header.height)

      cbs.blocks.latest(function (err, header) {
        should.not.exist(err)

        header.blockId.should.equal('000000000c9f25eb2565f81cdbe98aa692ccda81a3532cea1301a284b8f0cc0c')
        header.prevBlockId.should.equal('000000006c840ca5ff4dadcfeb4fe14b3d90c144be0fe5b8d06b329b8f8f3855')
        header.merkleRootHash.should.equal('70f719e112deef26cc9c955606e3c07e09441885d69ddd947ae66f4697f4400c')
        header.nonce.should.equal(1810450624)
        header.version.should.equal(2)
        header.blockHeight.should.equal(10)
        // header.blockSize.should.equal(232714)
        header.timestamp.should.equal(1413392796)
        // b.txCount.should.equal(182)

        done()
      })
    })
  })
})
