Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Refunders', function(accounts) {

    var refunderTypes = [
        "RefunderGood",
        "RefunderBad"
    ];
    var owner, victim;

    before("should have proper accounts", function() {
        assert.isAtLeast(accounts.length, 1, "should have at least 1 account");
        owner = accounts[0];
        victim = accounts[1];
        return Extensions.makeSureAreUnlocked(
                [ owner, victim ])
            .then(function() {
                return Extensions.makeSureHasAtLeast(
                    owner,
                    [ victim ],
                    web3.toWei(1));
            })
            .then(function(txHashes) {
                return web3.eth.getTransactionReceiptMined(txHashes);
            });
    });

    refunderTypes.forEach(function(refunderType) {
        describe(refunderType, function() {
            var refunderTypeCopy = refunderType;
            var refunderName = refunderTypeCopy;
            var RefunderType;

            before("should prepare contract types", function() {
                // We have to do it here otherwise contracts are not defined
                switch(refunderTypeCopy) {
                    case "RefunderGood":
                        RefunderType = RefunderGood;
                        break;
                    case "RefunderBad":
                        RefunderType = RefunderBad;
                            break;
                }
            });

            describe("should work as expected when simple", function() {
                var refunder;

                beforeEach("should deploy a " + refunderName, function() {
                    return RefunderType.new({ from: owner })
                        .then(function(created) {
                            refunder = created;
                        });
                });

                beforeEach("should give to owner and victim", function() {
                    return Promise.all([
                            refunder.refundIt(owner, { from: owner, value: web3.toWei(1, "finney") }),
                            refunder.refundIt(victim, { from: owner, value: web3.toWei(2, "finney") })
                        ])
                        .then(function(txHashes) {
                            return web3.eth.getTransactionReceiptMined(txHashes);
                        })
                        .then(function(receipts) {
                            return Promise.all([
                                    web3.eth.getBalancePromise(refunder.address),
                                    refunder.getPaymentOf(owner),
                                    refunder.getPaymentOf(victim)
                                ]);
                        })
                        .then(function(payments) {
                            assert.strictEqual(
                                payments[0].toString(10),
                                web3.toWei(3, "finney").toString(10),
                                "should have received correct balance");
                            assert.strictEqual(
                                payments[1].toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have marked as received");
                            assert.strictEqual(
                                payments[2].toString(10),
                                web3.toWei(2, "finney").toString(10),
                                "should have marked as received");
                        });
                });

                it("should refund owner before victim", function() {
                    return refunder.withdrawPayments({ from: owner })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                web3.toWei(2, "finney").toString(10),
                                "should have diminished balance");
                            return refunder.withdrawPayments({ from: victim });
                        })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                "0",
                                "should have empty balance");
                        });
                });

                it("should refund victim before owner", function() {
                    return refunder.withdrawPayments({ from: victim })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have diminished balance");
                            return refunder.withdrawPayments({ from: owner });
                        })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                "0",
                                "should have empty balance");
                        });
                });
            });

            describe("should work as expected when attacked but attacker is last", function() {
                var refunder, attacker;

                beforeEach("should deploy a " + refunderName, function() {
                    return RefunderType.new({ from: owner })
                        .then(function(created) {
                            refunder = created;
                        });
                });

                beforeEach("should deploy an attacker", function() {
                    return Attacker.new(refunder.address, { from: owner })
                        .then(function (created) {
                            attacker = created;
                            return attacker.attacked();
                        })
                        .then(function(attacked) {
                            assert.strictEqual(attacked, refunder.address);
                        });
                });

                beforeEach("should give to attacker and victim", function() {
                    return Promise.all([
                            refunder.refundIt(attacker.address, { from: owner, value: web3.toWei(1, "finney") }),
                            refunder.refundIt(victim, { from: owner, value: web3.toWei(2, "finney") })
                        ])
                        .then(function(txHashes) {
                            return web3.eth.getTransactionReceiptMined(txHashes);
                        })
                        .then(function(receipts) {
                            return Promise.all([
                                    web3.eth.getBalancePromise(refunder.address),
                                    refunder.getPaymentOf(attacker.address),
                                    refunder.getPaymentOf(victim)
                                ]);
                        })
                        .then(function(payments) {
                            assert.strictEqual(
                                payments[0].toString(10),
                                web3.toWei(3, "finney").toString(10),
                                "should have received correct balance");
                            assert.strictEqual(
                                payments[1].toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have marked as received");
                            assert.strictEqual(
                                payments[2].toString(10),
                                web3.toWei(2, "finney").toString(10),
                                "should have marked as received");
                        });
                });

                it("should refund victim before attacker", function() {
                    return refunder.withdrawPayments({ from: victim })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have diminished balance");
                            return attacker.attack({ from: owner, gas: 3000000 });
                        })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                "0",
                                "should have empty balance");
                        });
                });
            });

            describe("should behave differently when attacker is first", function() {
                var refunder, attacker;
                var victimPayment = 205;

                before("should deploy a " + refunderName, function() {
                    return RefunderType.new({ from: owner })
                        .then(function(created) {
                            refunder = created;
                        });
                });

                before("should deploy an attacker", function() {
                    return Attacker.new(refunder.address, { from: owner })
                        .then(function (created) {
                            attacker = created;
                            return attacker.attacked();
                        })
                        .then(function(attacked) {
                            assert.strictEqual(attacked, refunder.address);
                        });
                });

                before("should give to attacker and victim", function() {
                    return Promise.all([
                            refunder.refundIt(attacker.address, { from: owner, value: web3.toWei(1, "finney") }),
                            refunder.refundIt(victim, { from: owner, value: web3.toWei(victimPayment, "finney") })
                        ])
                        .then(function(txHashes) {
                            return web3.eth.getTransactionReceiptMined(txHashes);
                        })
                        .then(function(receipts) {
                            return Promise.all([
                                    web3.eth.getBalancePromise(refunder.address),
                                    refunder.getPaymentOf(attacker.address),
                                    refunder.getPaymentOf(victim)
                                ]);
                        })
                        .then(function(payments) {
                            assert.strictEqual(
                                payments[0].toString(10),
                                web3.toWei(victimPayment + 1, "finney").toString(10),
                                "should have received correct balance");
                            assert.strictEqual(
                                payments[1].toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have marked as received");
                            assert.strictEqual(
                                payments[2].toString(10),
                                web3.toWei(victimPayment, "finney").toString(10),
                                "should have marked as received");
                        });
                });

                it("should resist attack", function() {
                    if (refunderName === "RefunderBad") {
                        this.skip();
                    }

                    return attacker.attack({ from: owner, gas: 3000000 })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                web3.toWei(victimPayment, "finney").toString(10),
                                "should have correct balance for victim");
                            return refunder.withdrawPayments({ from: victim });
                        })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                "0",
                                "should have empty balance");
                        });
                });

                it("should fail under attack", function() {
                    if (refunderName === "RefunderGood") {
                        this.skip();
                    }

                    return attacker.attack({ from: owner, gas: 3000000 })
                        .then(function(txHash) {
                            return web3.eth.getTransactionReceiptMined(txHash);
                        })
                        .then(function(receipt) {
                            // Not making too many tests...
                            assert.isBelow(receipt.gasUsed, 3000000, "should not have used all gas");
                            return web3.eth.getBalancePromise(refunder.address);
                        })
                        .then(function(balance) {
                            assert.strictEqual(
                                balance.toString(10),
                                web3.toWei(1, "finney").toString(10),
                                "should have drained more than supposed");
                        });
                });
            });
        });
    });
});
