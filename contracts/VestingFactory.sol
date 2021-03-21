//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/proxy/Clones.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface IndexInterface {
    function master() external view returns (address);
}

contract VestingFactory {
    using Clones for address;

    event LogVestingStarted(address indexed recipient, address indexed vesting, uint amount);
    event LogRecipient(address indexed _vesting, address indexed _old, address indexed _new);

    TokenInterface public immutable token;
    address public vestingImplementation;
    IndexInterface public constant instaIndex = IndexInterface(0x2971AdFa57b20E5a416aE5a708A8655A9c74f723);

    mapping(address => address) public recipients;

    constructor(address token_) {
        token = TokenInterface(token_);
    }

    /**
     * @dev Throws if the sender not is Master Address from InstaIndex
    */
    modifier isMaster {
        require(msg.sender == instaIndex.master(), "not-master");
        _;
    }

    function setImplementation(address _vestingImplementation) external isMaster {
        require(vestingImplementation == address(0), 'VestingFactory::startVesting: unauthorized');
        vestingImplementation = _vestingImplementation;
    }

    function startVesting(
        address recipient_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public isMaster {
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

        require(success, 'VestingFactory::startVesting: failed to initialize');

        token.transfer(vesting, vestingAmount_);

        recipients[recipient_] = vesting;

        emit LogVestingStarted(recipient_, vesting, vestingAmount_);
    }

    function startMultipleVesting(
        address[] memory recipients_,
        uint[] memory vestingAmounts_,
        uint[] memory vestingBegins_,
        uint[] memory vestingCliffs_,
        uint[] memory vestingEnds_
    ) public isMaster {
        uint _length = recipients_.length;
        require(vestingAmounts_.length == _length && vestingBegins_.length == _length && vestingCliffs_.length == _length && vestingEnds_.length == _length, "VestingFactory::startMultipleVesting: different lengths");
        for (uint i = 0; i < _length; i++) {
            startVesting(recipients_[i], vestingAmounts_[i], vestingBegins_[i], vestingCliffs_[i], vestingEnds_[i]);
        }
    }

    function updateRecipient(address _oldRecipient, address _newRecipient) public {
        address _vesting = recipients[_oldRecipient];
        require(msg.sender == _vesting, 'VestingFactory::startVesting: unauthorized');
        recipients[_newRecipient] = _vesting;
        delete recipients[_oldRecipient];
        emit LogRecipient(_vesting, _oldRecipient, _newRecipient);
    }

    function withdraw(uint _amt) public isMaster {
        token.transfer(instaIndex.master(), _amt);
    }

}
