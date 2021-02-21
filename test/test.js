const hre = require("hardhat");
const { expect } = require("chai");
const { ethers } = hre;

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
  let token, tokenVesting, factory, accounts, owner
  before(async function() {
    accounts = await ethers.getSigners();
    owner = accounts[0]
    
    const Token = await ethers.getContractFactory("MockToken");
    token = await Token.deploy("Token", "TKN");

    await token.deployed()

    await token.mint(owner.address, ethers.utils.parseEther("1000000"));

    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    tokenVesting = await TokenVesting.deploy();

    await tokenVesting.deployed()

    const Factory = await ethers.getContractFactory("VestingFactory");
    factory = await Factory.deploy(token.address, tokenVesting.address, owner.address);

    await factory.deployed()
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

    it("should create a vesting contract", async function() {
      const receipient = accounts[1];
      const now = new Date();
      now.setMinutes(now.getMinutes() + 2)

      const vestingStart = Math.round(now.getTime() / 1000)

      const aMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      const vestingEnd = Math.round(aMonth.getTime() / 1000)

      const tx = await factory.startVesting(
        receipient.address,
        owner.address,
        ethers.utils.parseEther("100"),
        vestingStart,
        vestingStart,
        vestingEnd
      )

      const receipt = await tx.wait()

      console.log(receipt.events)
    })
  })
})
