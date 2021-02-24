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

    event LogVestingStarted(address indexed recipient, address indexed vesting, uint amount);
    event LogRecipient(address indexed _vesting, address indexed _old, address indexed _new);

    TokenInterface public immutable token;
    address public vestingImplementation;
    address public owner;

    mapping(address => address) public recipients;

    constructor(address token_, address owner_) {
        token = TokenInterface(token_);
        owner = owner_;
    }

    modifier isOwner() {
        require(msg.sender == owner, 'VestingFactory::startVesting: unauthorized');
        _;
    }

    function setImplementation(address _vestingImplementation) external isOwner {
        require(vestingImplementation == address(0), 'VestingFactory::startVesting: unauthorized');
        vestingImplementation = _vestingImplementation;
    }

    function startVesting(
        address recipient_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public isOwner {
        require(recipients[recipient_] == address(0), 'VestingFactory::startVesting: unauthorized');

        bytes32 salt = keccak256(abi.encode(recipient_, vestingAmount_, vestingBegin_, vestingCliff_, vestingEnd_));

        address vesting = vestingImplementation.cloneDeterministic(salt);

        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,uint256,uint256,uint256,uint256)",
            recipient_,
            vestingAmount_,
            vestingBegin_,
            vestingCliff_,
            vestingEnd_
        );

        (bool success,) = vesting.call(initData);
        // TODO: Add safe token transfer function here
        require(success, 'VestingFactory::startVesting: failed to initialize');

        token.transfer(vesting, vestingAmount_);

        recipients[recipient_] = vesting;

        emit LogVestingStarted(recipient_, vesting, vestingAmount_);
    }

    function updateRecipient(address _oldRecipient, address _newRecipient) public {
        address _vesting = recipients[_oldRecipient];
        require(msg.sender == _vesting, 'VestingFactory::startVesting: unauthorized');
        recipients[_newRecipient] = _vesting;
        delete recipients[_oldRecipient];
        emit LogRecipient(_vesting, _oldRecipient, _newRecipient);
    }

    function setOwner(address owner_) public isOwner {
        require(msg.sender == owner, 'VestingFactory::setOwner: unauthorized');
        owner = owner_;
    }

}
