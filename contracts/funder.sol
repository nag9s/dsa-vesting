//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface TokenInterface {
    function balanceOf(address account) external view returns (uint);
    function delegate(address delegatee) external;
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface IndexInterface {
    function master() external view returns (address);
}

interface InstaVestingInterface {
    function vestingAmount() external view returns (uint);
}


contract InstaVestingFactory is Ownable {
    TokenInterface public constant token = TokenInterface(0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb);
    IndexInterface public constant instaIndex = IndexInterface(0x2971AdFa57b20E5a416aE5a708A8655A9c74f723);
    InstaVestingFactory public constant instaVestingFactory = InstaVestingFactory(0x3b05a5295Aa749D78858E33ECe3b97bB3Ef4F029);

    constructor (address _owner) public {
        transferOwnership(_owner);
    }

    /**
     * @dev Throws if the sender not is Master Address from InstaIndex or owner
    */
    modifier isOwner {
        require(_msgSender() == instaIndex.master() || owner() == _msgSender(), "caller is not the owner or master");
        _;
    }

    function fundVestingContracts(
        address[] memory vestings
    ) public {
        uint _length = vestings.length;

        for (uint i = 0; i < _length; i++) {
            uint256 balanceOf = token.balanceOf(vestings[i]);
            uint256 vestingAmount = InstaVestingInterface(vestings[i]).vestingAmount();
            require(token.transfer(vestings[i], (vestingAmount - balanceOf)), "VestingFunder::fundVestingContracts: insufficient balance");
        }
    }

    function withdraw(uint _amt) public isOwner {
        require(token.balanceOf(address(this)) >= _amt, 'VestingFunder::withdraw: insufficient balance');
        token.transfer(owner(), _amt);
    }
}
