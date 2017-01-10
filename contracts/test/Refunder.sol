pragma solidity ^0.4.4;

import "../PullPayment.sol";

contract Refunder is PullPayment {
    function refundIt(address dest) payable {
        asyncSend(dest, msg.value);
    }
}