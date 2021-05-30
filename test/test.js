const hre = require("hardhat");
const { expect } = require("chai");
const { ethers, network } = hre;

describe("Factory", function() {
  let token, tokenVesting, factory, accounts, owner, ethereum, masterAddress, terminateOwner, factoryOwner
  before(async function() {
    masterAddress = "0xb1DC62EC38E6E3857a887210C38418E4A17Da5B2"
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ masterAddress ]
    })
    accounts = await ethers.getSigners();
    terminateOwner = accounts[7]
    factoryOwner = accounts[8]
    owner = ethers.provider.getSigner(masterAddress)
    
    token = await ethers.getContractAt("MockToken", "0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb");

    console.log("Token address:", token.address)

    const Factory = await ethers.getContractFactory("InstaVestingFactory");
    factory = await Factory.deploy(factoryOwner.address);

    await factory.deployed()

    console.log("Factory address:", factory.address)

    const TokenVesting = await ethers.getContractFactory("InstaTokenVesting");
    tokenVesting = await TokenVesting.deploy(factory.address);

    await tokenVesting.deployed()

    await token.connect(owner).transfer(factory.address, ethers.utils.parseEther("1000000"));

    await factory.connect(owner).setImplementation(tokenVesting.address);

    ethereum = network.provider
  })

  describe("basics", function() {
    it("should match deployed", async function() {
      const token_ = await factory.token();
      const impl_ = await factory.vestingImplementation();

      const token__ = await tokenVesting.token();
      const factory_ = await tokenVesting.factory();

      expect(token_).to.be.equal(token.address);
      expect(impl_).to.be.equal(tokenVesting.address);

      expect(token__).to.be.equal(token.address);
      expect(factory_).to.be.equal(factory.address);
    })

    let vesting, vestingStartTs, vestingCliffTs, vestingEndTs, vestingAmountBn
    it("should create a vesting contract", async function() {
      const receipient = accounts[1];
      const now = new Date();
      now.setMinutes(now.getMinutes() + 2)

      const vestingStart = Math.round(now.getTime() / 1000)

      const vestingCliff = Number(vestingStart) + 10

      const aMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      const vestingEnd = Math.round(aMonth.getTime() / 1000)
      const vestingAmount = ethers.utils.parseEther("100")

      const tx = await factory.connect(factoryOwner).startVesting(
        terminateOwner.address,
        receipient.address,
        vestingAmount,
        vestingStart,
        vestingCliff,
        vestingEnd
      )

      const receipt = await tx.wait()

      expect(tx).to.emit(factory, "LogVestingStarted")

      
      const deployedVesting = await factory.recipients(receipient.address)
      await token.connect(owner).transfer(deployedVesting, vestingAmount);
      
      const vesting_ = await ethers.getContractAt("InstaTokenVesting", deployedVesting)

      const token_ = await vesting_.token();
      const recipient_ = await vesting_.recipient();
      const factory_ = await vesting_.factory();
      const vestingAmount_ = await vesting_.vestingAmount();
      const vestingBalance_ = await token.balanceOf(deployedVesting);
      const vestingStart_ = await vesting_.vestingBegin();
      const vestingCliff_ = await vesting_.vestingCliff();
      const vestingEnd_ = await vesting_.vestingEnd();
      const owner_ = await vesting_.owner();
      
      vestingStartTs = vestingStart_;
      vestingCliffTs = vestingCliff_;
      vestingEndTs = vestingEnd_;
      vestingAmountBn = vestingAmount;
      vesting = vesting_;

      expect(token_).to.be.equal(token.address);
      expect(recipient_).to.be.equal(receipient.address);
      expect(owner_).to.be.equal(terminateOwner.address);
      expect(factory_).to.be.equal(factory.address);
      expect(vestingAmount_).to.be.equal(vestingAmount);
      expect(vestingBalance_).to.be.equal(vestingAmount_);
      expect(vestingStart_).to.be.equal(vestingStart);
      expect(vestingCliff_).to.be.equal(vestingCliff);
      expect(vestingEnd_).to.be.equal(vestingEnd);
    })

    it("recipient cannot claim before vesting start or cliff", async function () {
      const receipient = accounts[1];

      await expect(vesting.connect(receipient).claim()).to.be.revertedWith('TokenVesting::claim: not time yet');
    })

    it("recipient cannot claim before vesting cliff", async function() {
      const receipient = accounts[1];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingStartTs]);
      await ethereum.send("evm_mine", []);

      await expect(vesting.connect(receipient).claim()).to.be.revertedWith('TokenVesting::claim: not time yet');
    })

    it("recipient can claim at cliff", async function() {
      const receipient = accounts[1];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      expect(tx).to.emit(vesting, "LogClaim")

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.not.equal(0);
    })

    it("recipient can update recipient", async function() {
      const receipient = accounts[1];
      const newReceipient = accounts[2];

      const tx = await vesting.connect(receipient).updateRecipient(newReceipient.address)
      await tx.wait()

      expect(tx).to.emit(factory, "LogRecipient")

      const recipient_ = await vesting.recipient()
      expect(recipient_).to.be.equal(newReceipient.address)

      const vesting_ = await factory.recipients(newReceipient.address)
      expect(vesting_).to.be.equal(vesting.address)

      const vesting__ = await factory.recipients(receipient.address)
      expect(vesting__).to.be.not.equal(vesting.address)
    })

    it("recipient can claim after cliff", async function() {
      const receipient = accounts[2];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs + 36]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(vesting.address);
      expect(initBalance).to.be.not.equal(0);

      const initBalance_ = await token.balanceOf(receipient.address);
      expect(initBalance_).to.be.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(vesting.address);
      expect(finalBalance).to.be.lt(initBalance);

      const finalBalance_ = await token.balanceOf(receipient.address);
      expect(finalBalance_).to.be.gt(initBalance_);
    })

    it("recipient can claim after end", async function() {
      const receipient = accounts[2];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingEndTs + 1]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(vesting.address);
      expect(initBalance).to.be.not.equal(0);

      const initBalance_ = await token.balanceOf(receipient.address);
      expect(initBalance_).to.be.not.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(vesting.address);
      expect(finalBalance).to.be.equal(0);

      const finalBalance_ = await token.balanceOf(receipient.address);
      expect(finalBalance_).to.be.gt(initBalance_);
    })

    it("should create multiple vesting contracts", async function() {
      const receipient1 = accounts[3];
      const receipient2 = accounts[4];

      const receipients = [receipient1.address, receipient2.address]
      const owners = [terminateOwner.address, terminateOwner.address]

      const vestingStart = vestingEndTs + 10
      const vestingCliff = vestingStart + 20
      const vestingEnd = vestingCliff + 1440

      const vestingStarts = [vestingStart, vestingStart]
      const vestingCliffs = [vestingCliff, vestingCliff]
      const vestingEnds = [vestingEnd, vestingEnd]

      const vestingAmount1 = ethers.utils.parseEther("200")
      const vestingAmount2 = ethers.utils.parseEther("250")
      const vestingAmounts = [vestingAmount1, vestingAmount2]

      const tx = await factory.connect(owner).startMultipleVesting(
        owners,
        receipients,
        vestingAmounts,
        vestingStarts,
        vestingCliffs,
        vestingEnds
      )

      const receipt = await tx.wait()

      expect(tx).to.emit(factory, "LogVestingStarted")

      const deployedVesting = await factory.recipients(receipient1.address)
      const deployedVesting2 = await factory.recipients(receipient2.address)
      await token.connect(owner).transfer(deployedVesting, vestingAmount1);
      await token.connect(owner).transfer(deployedVesting2, vestingAmount2);


      const vesting_ = await ethers.getContractAt("InstaTokenVesting", deployedVesting)

      const token_ = await vesting_.token();
      const recipient_ = await vesting_.recipient();
      const factory_ = await vesting_.factory();
      const vestingAmount_ = await vesting_.vestingAmount();
      const vestingBalance_ = await token.balanceOf(deployedVesting);
      const vestingStart_ = await vesting_.vestingBegin();
      const vestingCliff_ = await vesting_.vestingCliff();
      const vestingEnd_ = await vesting_.vestingEnd();

      vestingStartTs = vestingStart_;
      vestingCliffTs = vestingCliff_;
      vestingEndTs = vestingEnd_;
      vestingAmountBn = vestingAmount1;
      vesting = vesting_;

      expect(token_).to.be.equal(token.address);
      expect(recipient_).to.be.equal(receipient1.address);
      expect(factory_).to.be.equal(factory.address);
      expect(vestingAmount_).to.be.equal(vestingAmount1);
      expect(vestingBalance_).to.be.equal(vestingAmount_);
      expect(vestingStart_).to.be.equal(vestingStart);
      expect(vestingCliff_).to.be.equal(vestingCliff);
      expect(vestingEnd_).to.be.equal(vestingEnd);
    })

    let balanceAfterCalim
    it("recipient can claim after cliff", async function() {
      const receipient = accounts[3];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs + 60]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.gt(initBalance);

      balanceAfterCalim = finalBalance
    })

    it("terminateOwner can terminate", async function() {
      const receipient = accounts[3];
      const to_ = accounts[9];

      const time = (vestingEndTs + vestingStartTs) / 2

      await ethereum.send("evm_setNextBlockTimestamp", [time]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(to_.address);

      const deployedVesting = await factory.recipients(receipient.address)
      const vesting_ = await ethers.getContractAt("InstaTokenVesting", deployedVesting)


      const tx = await vesting_.connect(terminateOwner).terminate()
      await tx.wait()

      const finalBalanceOfFactory = await token.balanceOf(terminateOwner.address);
      expect(finalBalanceOfFactory).to.be.gt(initBalance);

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.gt(balanceAfterCalim);

      const newTime = time + 25
      await ethereum.send("evm_setNextBlockTimestamp", [newTime]);
      await ethereum.send("evm_mine", []);

      await expect(vesting.connect(receipient).claim()).to.be.revertedWith('TokenVesting::claim: already terminated');
    })

    it("onwer can withdraw from factory", async function() {
      await token.connect(owner).transfer(factory.address, ethers.utils.parseEther("1000"));

      const initBalance = await token.balanceOf(factoryOwner.address)

      const tx = await factory.connect(owner).withdraw('100')
      await tx.wait()

      const finalBalance = await token.balanceOf(factoryOwner.address)
      expect(finalBalance).to.be.gt(initBalance)
    })
  })
})
