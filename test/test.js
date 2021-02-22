const hre = require("hardhat");
const { expect } = require("chai");
const { ethers, network } = hre;

// describe("Greeter", function() {
//   it("Should return the new greeting once it's changed", async function() {
//     const Greeter = await ethers.getContractFactory("Greeter");
//     const greeter = await Greeter.deploy("Hello, world!");
    
//     await greeter.deployed();
//     expect(await greeter.greet()).to.equal("Hello, world!");

//     await greeter.setGreeting("Hola, mundo!");
//     expect(await greeter.greet()).to.equal("Hola, mundo!");
//   });
// });

describe("Factory", function() {
  let token, tokenVesting, factory, accounts, owner, ethereum
  before(async function() {
    accounts = await ethers.getSigners();
    owner = accounts[0]
    
    const Token = await ethers.getContractFactory("MockToken");
    token = await Token.deploy("Token", "TKN");

    await token.deployed()

    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    tokenVesting = await TokenVesting.deploy();

    await tokenVesting.deployed()

    const Factory = await ethers.getContractFactory("VestingFactory");
    factory = await Factory.deploy(token.address, tokenVesting.address, owner.address);

    await factory.deployed()

    await token.mint(factory.address, ethers.utils.parseEther("1000000"));

    ethereum = network.provider
  })

  describe("basics", function() {
    it("should match deployed", async function() {
      const token_ = await factory.token();
      const impl_ = await factory.vestingImplementation();
      const owner_ = await factory.owner();

      expect(token_).to.be.equal(token.address);
      expect(impl_).to.be.equal(tokenVesting.address);
      expect(owner_).to.be.equal(owner.address);
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

      const tx = await factory.startVesting(
        receipient.address,
        owner.address,
        vestingAmount,
        vestingStart,
        vestingCliff,
        vestingEnd
      )

      const receipt = await tx.wait()

      expect(tx).to.emit(factory, "VestingStarted")

      const deployedVesting = await factory.recipients(receipient.address)

      const vesting_ = await ethers.getContractAt("TokenVesting", deployedVesting)

      const token_ = await vesting_.token();
      const recipient_ = await vesting_.recipient();
      const owner_ = await vesting_.owner();
      const factory_ = await vesting_.factory();
      const vestingAmount_ = await vesting_.vestingAmount();
      const vestingBalance_ = await token.balanceOf(deployedVesting);
      const vestingStart_ = await vesting_.vestingBegin();
      const vestingCliff_ = await vesting_.vestingCliff();
      const vestingEnd_ = await vesting_.vestingEnd();

      vestingStartTs = vestingStart_;
      vestingCliffTs = vestingCliff_;
      vestingEndTs = vestingEnd_;
      vestingAmountBn = vestingAmount;
      vesting = vesting_;

      expect(token_).to.be.equal(token.address);
      expect(recipient_).to.be.equal(receipient.address);
      expect(owner_).to.be.equal(owner.address);
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

      await ethereum.send("evm_setNextBlockTimestamp", [vestingStartTs.toNumber()]);
      await ethereum.send("evm_mine", []);

      await expect(vesting.connect(receipient).claim()).to.be.revertedWith('TokenVesting::claim: not time yet');
    })

    it("recipient can claim at cliff", async function() {
      const receipient = accounts[1];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs.toNumber()]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.not.equal(0);
    })

    it("recipient can claim after cliff", async function() {
      const receipient = accounts[1];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs.toNumber() + 34]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.not.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.gt(initBalance);
    })

    it("recipient can claim after end", async function() {
      const receipient = accounts[1];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingEndTs.toNumber() + 1]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.not.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.equal(vestingAmountBn);
    })

    it("should create another vesting contract", async function() {
      const receipient = accounts[2];

      const vestingStart = vestingEndTs.toNumber() + 10
      const vestingCliff = vestingStart + 20
      const vestingEnd = vestingCliff + 1440

      const vestingAmount = ethers.utils.parseEther("200")

      const tx = await factory.startVesting(
        receipient.address,
        owner.address,
        vestingAmount,
        vestingStart,
        vestingCliff,
        vestingEnd
      )

      const receipt = await tx.wait()

      expect(tx).to.emit(factory, "VestingStarted")

      const deployedVesting = await factory.recipients(receipient.address)

      const vesting_ = await ethers.getContractAt("TokenVesting", deployedVesting)

      const token_ = await vesting_.token();
      const recipient_ = await vesting_.recipient();
      const owner_ = await vesting_.owner();
      const factory_ = await vesting_.factory();
      const vestingAmount_ = await vesting_.vestingAmount();
      const vestingBalance_ = await token.balanceOf(deployedVesting);
      const vestingStart_ = await vesting_.vestingBegin();
      const vestingCliff_ = await vesting_.vestingCliff();
      const vestingEnd_ = await vesting_.vestingEnd();

      vestingStartTs = vestingStart_;
      vestingCliffTs = vestingCliff_;
      vestingEndTs = vestingEnd_;
      vestingAmountBn = vestingAmount;
      vesting = vesting_;

      expect(token_).to.be.equal(token.address);
      expect(recipient_).to.be.equal(receipient.address);
      expect(owner_).to.be.equal(owner.address);
      expect(factory_).to.be.equal(factory.address);
      expect(vestingAmount_).to.be.equal(vestingAmount);
      expect(vestingBalance_).to.be.equal(vestingAmount_);
      expect(vestingStart_).to.be.equal(vestingStart);
      expect(vestingCliff_).to.be.equal(vestingCliff);
      expect(vestingEnd_).to.be.equal(vestingEnd);
    })

    let balanceAfterCalim
    it("recipient can claim after cliff", async function() {
      const receipient = accounts[2];

      await ethereum.send("evm_setNextBlockTimestamp", [vestingCliffTs.toNumber() + 60]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(receipient.address);
      expect(initBalance).to.be.equal(0);

      const tx = await vesting.connect(receipient).claim()
      await tx.wait()

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.gt(initBalance);

      balanceAfterCalim = finalBalance
    })

    it("owner can terminate", async function() {
      const receipient = accounts[2];

      const time = (vestingEndTs.toNumber() + vestingStartTs.toNumber()) / 2

      await ethereum.send("evm_setNextBlockTimestamp", [time]);
      await ethereum.send("evm_mine", []);

      const initBalance = await token.balanceOf(factory.address);

      const tx = await vesting.connect(owner).terminate()
      await tx.wait()

      const finalBalanceOfFactory = await token.balanceOf(factory.address);
      expect(finalBalanceOfFactory).to.be.gt(initBalance);

      const finalBalance = await token.balanceOf(receipient.address);
      expect(finalBalance).to.be.gt(balanceAfterCalim);

      const newTime = time + 25
      await ethereum.send("evm_setNextBlockTimestamp", [newTime]);
      await ethereum.send("evm_mine", []);

      await expect(vesting.connect(receipient).claim()).to.be.revertedWith('TokenVesting::claim: already terminated');
    })
  })
})
