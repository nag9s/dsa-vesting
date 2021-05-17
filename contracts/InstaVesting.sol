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
    function updateRecipient(address _oldRecipient, address _newRecipient) external;
}

contract InstaTokenVesting is Initializable {
    using SafeMath for uint;

    event LogClaim(uint _claimAmount);
    event LogDelegate(address indexed _delegate);

    address public constant token = 0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb;
    address public immutable factory;
    address public delegator;
    address public recipient;

    uint256 public vestingAmount;
    uint32 public vestingBegin;
    uint32 public vestingCliff;
    uint32 public vestingEnd;

    uint32 public lastUpdate;

    uint32 public terminateTime;

    constructor(address factory_) {
        factory = factory_;
    }

    function initialize(
        address delegator_,
        address recipient_,
        uint256 vestingAmount_,
        uint32 vestingBegin_,
        uint32 vestingCliff_,
        uint32 vestingEnd_
    ) public initializer {
        require(vestingBegin_ >= block.timestamp, 'TokenVesting::initialize: vesting begin too early');
        require(vestingCliff_ >= vestingBegin_, 'TokenVesting::initialize: cliff is too early');
        require(vestingEnd_ > vestingCliff_, 'TokenVesting::initialize: end is too early');

        if (delegator_ != address(0)) delegator = delegator_;
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

    function updateDelegator(address delegator_) public {
        require(msg.sender == delegator || msg.sender == recipient, 'TokenVesting::setRecipient: unauthorized');
        delegator = delegator_;
    }

    function claim() public {
        require(block.timestamp >= vestingCliff, 'TokenVesting::claim: not time yet');
        require(terminateTime == 0, 'TokenVesting::claim: already terminated');
        uint amount;
        if (block.timestamp >= vestingEnd) {
            amount = TokenInterface(token).balanceOf(address(this));
        } else {
            amount = vestingAmount.mul(block.timestamp - lastUpdate).div(vestingEnd - vestingBegin);
            lastUpdate = uint32(block.timestamp);
        }
        require(TokenInterface(token).transfer(recipient, amount), "TokenVesting::claim: not-enough-token");
        emit LogClaim(amount);
    }

    function delegate(address delegatee_) public {
        require(msg.sender == recipient || msg.sender == delegator, 'TokenVesting::delegate: unauthorized');
        TokenInterface(token).delegate(delegatee_);
        emit LogDelegate(delegatee_);
    }

    function terminate() public {
        require(terminateTime == 0, 'TokenVesting::terminate: already terminated');
        require(msg.sender == factory, 'TokenVesting::terminate: unauthorized');

        claim();

        TokenInterface token_ = TokenInterface(token);
        uint amount = token_.balanceOf(address(this));
        token_.transfer(factory, amount);

        terminateTime = uint32(block.timestamp);
    }

}
