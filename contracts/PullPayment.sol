pragma solidity ^0.4.4;

contract PullPayment {
    function asyncSend(address dest, uint amount) internal;
    function withdrawPayments() public returns (bool successful);
    function getPaymentOf(address whom) constant public returns (uint amount);
}