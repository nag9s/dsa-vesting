//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface VestingFactoryInterface {
    function owner() external view returns (address);
    function updateRecipient(address _oldRecipient, address _newRecipient) external;
}

contract TokenVesting is Initializable {
    using SafeMath for uint;

    event LogClaim(uint _claimAmount);
    event LogDelegate(address indexed _delegate);

    address public constant token = address(0); // TODO: Add static factory address
    address public recipient;
    address public constant factory = address(0); // TODO: Add static factory address

    uint public vestingAmount;
    uint public vestingBegin;
    uint public vestingCliff;
    uint public vestingEnd;

    uint public lastUpdate;

    uint public terminateTime;

    function initialize(
        address recipient_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public initializer {
        require(vestingBegin_ >= block.timestamp, 'TokenVesting::initialize: vesting begin too early');
        require(vestingCliff_ >= vestingBegin_, 'TokenVesting::initialize: cliff is too early');
        require(vestingEnd_ > vestingCliff_, 'TokenVesting::initialize: end is too early');

        recipient = recipient_;

        vestingAmount = vestingAmount_;
        vestingBegin = vestingBegin_;
        vestingCliff = vestingCliff_;
        vestingEnd = vestingEnd_;

        lastUpdate = vestingBegin;
    }

    function updateRecipient(address recipient_) public {
        require(msg.sender == recipient, 'TokenVesting::setRecipient: unauthorized');
        recipient = recipient_;
        VestingFactoryInterface(factory).updateRecipient(msg.sender, recipient);
    }

    function claim() public {
        require(block.timestamp >= vestingCliff, 'TokenVesting::claim: not time yet');
        require(terminateTime == 0, 'TokenVesting::claim: already terminated');
        uint amount;
        if (block.timestamp >= vestingEnd) {
            amount = TokenInterface(token).balanceOf(address(this));
        } else {
            amount = vestingAmount.mul(block.timestamp - lastUpdate).div(vestingEnd - vestingBegin);
            lastUpdate = block.timestamp;
        }
        TokenInterface(token).transfer(recipient, amount);
        emit LogClaim(amount);
    }

    function delegate(address delegatee_) public {
        require(msg.sender == recipient, 'TokenVesting::delegate: unauthorized');
        TokenInterface(token).delegate(delegatee_);
        emit LogDelegate(delegatee_);
    }

    function terminate() public {
        require(terminateTime == 0, 'TokenVesting::terminate: already terminated');
        require(msg.sender == VestingFactoryInterface(factory).owner(), 'TokenVesting::terminate: unauthorized');

        claim();

        TokenInterface token_ = TokenInterface(token);
        uint amount = token_.balanceOf(address(this));
        token_.transfer(factory, amount);

        terminateTime = block.timestamp;
    }

}
