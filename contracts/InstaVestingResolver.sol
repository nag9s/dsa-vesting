//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface InstaVestingInferface {
    function owner() external view returns(address);
    function recipient() external view returns(address);
    function vestingAmount() external view returns(uint256);
    function vestingBegin() external view returns(uint32);
    function vestingCliff() external view returns(uint32);
    function vestingEnd() external view returns(uint32);
    function lastUpdate() external view returns(uint32);
    function terminateTime() external view returns(uint32);
}

interface InstaVestingFactoryInterface {
    function recipients(address) external view returns(address);
}

contract InstaTokenVestingResolver  {
    using SafeMath for uint256;

    TokenInterface public constant token = TokenInterface(0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb);
    InstaVestingFactoryInterface public constant factory = InstaVestingFactoryInterface(0x3730D9b06bc23fd2E2F84f1202a7e80815dd054a);

    struct VestingData {
        address recipient;
        address vesting;
        address owner;
        uint256 vestingAmount;
        uint256 vestingBegin;
        uint256 vestingCliff;
        uint256 vestingEnd;
        uint256 lastClaimed;
        uint256 terminatedTime;
        uint256 vestedAmount;
        uint256 unvestedAmount;
        uint256 claimedAmount;
        uint256 claimableAmount;
    }

    function getVestingByrecipient(address recipient) external view returns(VestingData memory vestingData) {
        address vestingAddr = factory.recipients(recipient);
        return getVesting(vestingAddr);
    }

    function getVesting(address vesting) public view returns(VestingData memory vestingData) {
        if (vesting == address(0)) return vestingData;
        InstaVestingInferface VestingContract = InstaVestingInferface(vesting);
        uint256 vestingBegin = uint256(VestingContract.vestingBegin());
        uint256 vestingEnd = uint256(VestingContract.vestingEnd());
        uint256 vestingCliff = uint256(VestingContract.vestingCliff());
        uint256 vestingAmount = VestingContract.vestingAmount();
        uint256 lastUpdate = uint256(VestingContract.lastUpdate());
        uint256 terminatedTime = uint256(VestingContract.terminateTime());

        
        uint256 claimedAmount;
        uint256 claimableAmount;
        uint256 vestedAmount;
        uint256 unvestedAmount;
        if (block.timestamp > vestingCliff) {
            uint256 timeNow = terminatedTime == 0 ? block.timestamp : terminatedTime;
            vestedAmount = vestingAmount.mul(timeNow - vestingBegin).div(vestingEnd - vestingBegin);
            unvestedAmount = vestingAmount.sub(vestedAmount);
            claimableAmount = vestingAmount.mul(timeNow - lastUpdate).div(vestingEnd - vestingBegin);
            claimedAmount = vestedAmount.mul(timeNow - vestingBegin).div(vestingEnd - vestingBegin);
        }

        vestingData = VestingData({
            recipient: VestingContract.recipient(),
            owner: VestingContract.owner(),
            vesting: vesting,
            vestingAmount: vestingAmount,
            vestingBegin: vestingBegin,
            vestingCliff: vestingCliff,
            vestingEnd: vestingEnd,
            lastClaimed: lastUpdate,
            terminatedTime: terminatedTime,
            vestedAmount: vestedAmount,
            unvestedAmount: unvestedAmount,
            claimedAmount: claimedAmount,
            claimableAmount: claimableAmount
        });
    }

}
