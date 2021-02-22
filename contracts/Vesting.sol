//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

contract TokenVesting is Initializable {
    using SafeMath for uint;

    address public token;
    address public recipient;
    address public owner;
    address public factory;

    uint public vestingAmount;
    uint public vestingBegin;
    uint public vestingCliff;
    uint public vestingEnd;

    uint public lastUpdate;

    bool public isActive;

    function initialize(
        address token_,
        address recipient_,
        address owner_,
        address factory_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public initializer {
        require(owner_ != address(0), 'TokenVesting::initialize: invalid address');
        require(vestingBegin_ >= block.timestamp, 'TokenVesting::initialize: vesting begin too early');
        require(vestingCliff_ >= vestingBegin_, 'TokenVesting::initialize: cliff is too early');
        require(vestingEnd_ > vestingCliff_, 'TokenVesting::initialize: end is too early');

        token = token_;
        recipient = recipient_;
        owner = owner_;
        factory = factory_;

        vestingAmount = vestingAmount_;
        vestingBegin = vestingBegin_;
        vestingCliff = vestingCliff_;
        vestingEnd = vestingEnd_;

        lastUpdate = vestingBegin;

        isActive = true;
    }

    function setRecipient(address recipient_) public {
        require(msg.sender == recipient, 'TokenVesting::setRecipient: unauthorized');
        recipient = recipient_;
    }

    function claim() public {
        require(block.timestamp >= vestingCliff, 'TokenVesting::claim: not time yet');
        require(isActive, 'TokenVesting::claim: already terminated');
        uint amount;
        if (block.timestamp >= vestingEnd) {
            amount = TokenInterface(token).balanceOf(address(this));
        } else {
            amount = vestingAmount.mul(block.timestamp - lastUpdate).div(vestingEnd - vestingBegin);
            lastUpdate = block.timestamp;
        }
        TokenInterface(token).transfer(recipient, amount);
    }

    function delegate(address delegatee_) public {
        require(msg.sender == recipient, 'TokenVesting::delegate: unauthorized');
        TokenInterface(token).delegate(delegatee_);
    }

    function terminate() public {
        require(isActive, 'TokenVesting::terminate: already terminated');
        require(msg.sender == owner, 'TokenVesting::terminate: unauthorized');

        claim();

        TokenInterface token_ = TokenInterface(token);
        uint amount = token_.balanceOf(address(this));
        token_.transfer(factory, amount);

        isActive = false;
    }
}
