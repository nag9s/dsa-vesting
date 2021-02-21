// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  // const accounts = await ethers.getSigners();

  const owner = "0x0000000000000000000000000000000000000001";
  const token = "0x0000000000000000000000000000000000000002"

  const Vesting = await ethers.getContractFactory("TokenVesting");
  const vesting = await Vesting.deploy();

  await vesting.deployed();

  const VestingFactory = await ethers.getContractFactory("VestingFactory");
  const factory = await VestingFactory.deploy(token, vesting.address, owner);

  await factory.deployed();

  console.log("Factory deployed to:", factory.address);
  console.log("Implementation deployed to:", vesting.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
