pragma solidity ^0.4.4;

import "PullPayment.sol";

/*
 * Modified from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/PullPayment.sol
 * Base contract supporting async send for pull payments.
 * Inherit from this contract and use asyncSend instead of send.
 */
contract PullPaymentGood is PullPayment {
    mapping(address => uint) private payments;

    // store sent amount as credit to be pulled, called by payer
    function asyncSend(address dest, uint amount) internal {
        payments[dest] += amount;
    }

    // withdraw accumulated balance, called by payee
    function withdrawPayments() returns (bool successful) {
        address payee = msg.sender;
        uint payment = payments[payee];

        if (payment == 0) throw;
        if (this.balance < payment) throw;

        payments[payee] = 0; // Before the transfer, that's good.
        if (!payee.call.gas(msg.gas - 9500).value(payment)()) {
            throw;
        }
        return true;
    }

    function getPaymentOf(address whom)
        constant public
        returns (uint amount) {
        return payments[whom];
    }
}