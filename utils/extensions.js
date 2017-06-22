const Http = require('http');
const Promise = require("bluebird");

module.exports = {
    init: function(web3, assert) {

        web3.eth.getTransactionReceiptMined = function(txnHash, interval) {
            let transactionReceiptAsync;
            interval = interval ? interval : 500;
            tryAgain = () => web3.eth.getTransactionReceiptPromise(txnHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(interval).then(tryAgain));

            if (Array.isArray(txnHash)) {
                const promises = [];
                txnHash.forEach(function(oneTxHash, index) {
                    promises.push(web3.eth.getTransactionReceiptMined(oneTxHash, interval));
                });
                return Promise.all(promises);
            } else {
                return new Promise(function(resolve, reject) {
                    transactionReceiptAsync(txnHash, resolve, reject);
                });
            }
        };

        web3.miner = web3.miner ? web3.miner : {};
        web3.miner.start = web3.miner.start ? web3.miner.start : function(count) {
            const params = JSON.stringify({
                "jsonrpc": "2.0",
                "method": "miner_start",
                "params": [ count ],
                "id": 74
            });

            const options = {
                hostname: "localhost",
                port: 8545,
                method: "POST"
            };

            const req = Http.request(options);
            req.write(params);
            req.end();
        };

        web3.miner.stop = web3.miner.stop ? web3.miner.stop : function() {
            const params = JSON.stringify({
                "jsonrpc": "2.0",
                "method": "miner_stop",
                "params": [],
                "id": 74
            });

            const options = {
                hostname: "localhost",
                port: 8545,
                method: "POST"
            };

            const req = Http.request(options);
            req.write(params);
            req.end();
        };

        assert.isTxHash = function(txnHash, message) {
            assert(typeof txnHash === "string",
                'expected ' + txnHash + ' to be a string',
                'expected ' + txnHash + ' to not be a string');
            assert(txnHash.length === 66,
                'expected ' + txnHash + ' to be a 66 character transaction hash (0x...)',
                'expected ' + txnHash + ' to not be a 66 character transaction hash (0x...)');

            // Convert txnHash to a number. Make sure it's not zero.
            // Controversial: Technically there is that edge case where
            // all zeroes could be a valid address. But: This catches all
            // those cases where Ethereum returns 0x0000... if something fails.
            const number = web3.toBigNumber(txnHash, 16);
            assert(number.equals(0) === false,
                'expected address #{txnHash} to not be zero',
                'you shouldn\'t ever see this.');
        };

    },

    sequentialPromise: function(promiseArray) {
        const result = promiseArray.reduce(
            (reduced, promise, index) => {
                reduced.results.push(undefined);
                return {
                    chain: reduced.chain
                        .then(() => promise)
                        .then(result => reduced.results[ index ] = result),
                    results: reduced.results
                };
            },
            {
                chain: Promise.resolve(),
                results: []
            });
        return result.chain.then(() => result.results);
    },

    expectedExceptionPromise: function(action, gasToUse, timeOut) {
        timeOut = timeOut ? timeOut : 5000;
        const promise = new Promise(function(resolve, reject) {
            try {
                resolve(action());
            } catch (e) {
                reject(e);
            }
        })
            .then(function(txnHash) {
                assert.isTxHash(txnHash, "it should have thrown");
                return web3.eth.getTransactionReceiptMined(txnHash);
            })
            .then(function(receipt) {
                // We are in Geth
                assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
            })
            .catch(function(e) {
                if ((e + "").indexOf("invalid JUMP") > -1 || (e + "").indexOf("out of gas") > -1) {
                    // We are in TestRPC
                } else if ((e + "").indexOf("please check your gas amount") > -1) {
                    // We are in Geth for a deployment
                } else {
                    throw e;
                }
            });

        return promise;
    },

    makeSureHasAtLeast: function(richAccount, recipients, wei) {
        return recipients.reduce(
            (promise, recipient) => promise
                .then(() => web3.eth.getBalancePromise(recipient))
                .then(balance => {
                    if (balance.lessThan(wei)) {
                        return web3.eth.sendTransactionPromise({
                            from: richAccount,
                            to: recipient,
                            value: wei
                        });
                    }
                }),
            Promise.resolve());
    },

    makeSureAreUnlocked: function(accounts) {
        return accounts.reduce(
            (promise, account) => promise
                .then(() => web3.eth.signPromise(
                    account,
                    "0x0000000000000000000000000000000000000000000000000000000000000000"))
                .catch(error => {
                    if (error.message == "account is locked") {
                        throw Error("account " + account + " at index " + index + " is locked");
                    } else {
                        throw error;
                    }
                }),
            Promise.resolve());
    }

};
