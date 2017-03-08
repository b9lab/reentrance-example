pragma solidity ^0.4.4;

import "./Owned.sol";

contract Mortal is Owned {
    function kill() fromOwner {
        selfdestruct(owner);
    }   
}