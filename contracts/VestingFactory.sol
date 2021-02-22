//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/proxy/Clones.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

contract VestingFactory {
    using Clones for address;

    TokenInterface public immutable token;
    address public immutable vestingImplementation;
    address public owner;

    mapping(address => address) public recipients;

    event VestingStarted(address indexed recipient, address indexed vesting, uint amount);

    constructor(address token_, address implementation_, address owner_) {
        token = TokenInterface(token_);
        vestingImplementation = implementation_;
        owner = owner_;
    }

    function startVesting(
        address recipient_,
        address owner_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public {
        require(msg.sender == owner, 'VestingFactory::startVesting: unauthorized');

        bytes32 salt = keccak256(abi.encode(recipient_, vestingAmount_, vestingBegin_, vestingCliff_, vestingEnd_));

        address vesting = vestingImplementation.cloneDeterministic(salt);

        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,address,address,address,uint256,uint256,uint256,uint256)",
            address(token),
            recipient_,
            owner_,
            address(this),
            vestingAmount_,
            vestingBegin_,
            vestingCliff_,
            vestingEnd_
        );

        (bool success,) = vesting.call(initData);
        require(success, 'VestingFactory::startVesting: failed to initialize');

        token.transfer(vesting, vestingAmount_);

        recipients[recipient_] = vesting;

        emit VestingStarted(recipient_, vesting, vestingAmount_);
    }

    function setOwner(address owner_) public {
        require(msg.sender == owner, 'VestingFactory::setOwner: unauthorized');
        owner = owner_;
    }
}
