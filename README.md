# dsl-vesting

forked from [Uniswap governance](https://github.com/Uniswap/governance/blob/master/contracts/TreasuryVester.sol)

### [Vesting Factory](https://github.com/Instadapp/dsa-vesting/blob/main/contracts/InstaVestingFactory.solhttps://github.com/Instadapp/dsa-vesting/blob/main/contracts/InstaVestingFactory.sol)
Vesting Factory deploys all the vesting contracts and has tokens in it and has mapping of all the `vesting` contracts with recipient. Vested Tokens are transferred to vesting contract whenever new vesting is listed.

[startVesting](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVestingFactory.sol#L52) starts a new vesting.

[startMultipleVesting](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVestingFactory.sol#L90) starts multiple vesting in single transaction.

[withdraw](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVestingFactory.sol#L120) withdraw ideal tokens from factory contract.


### [Vesting](https://github.com/Instadapp/dsa-vesting/blob/main/contracts/InstaVesting.sol)
Each recipient has their own Vesting contract which stores their tokens which are going to get free over the course of time defined.

[claim](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVesting.sol#L71) public function. Anyone can call. Sends the claimable tokens to recipient.

[delegate](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVesting.sol#L85) delegates the tokens to defined address. `delegator` & `recipient` address can define the delegatee.

[terminate](https://github.com/Instadapp/dsa-vesting/blob/7b4909894654040235b31c42906fd973a886f8ec/contracts/InstaVesting.sol#L91) to terminate the tokens vesting. Can be called by each vesting contract owner (to not use it keep the owner at address(0)).
