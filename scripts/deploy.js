// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const VestingFactory = await ethers.getContractFactory("VestingFactory");
  const factory = await VestingFactory.deploy(token);

  await factory.deployed();

  const Vesting = await ethers.getContractFactory("TokenVesting");
  const vesting = await Vesting.deploy(factory.address);

  await vesting.deployed();

  console.log("Factory deployed to:", factory.address);
  console.log("Implementation deployed to:", vesting.address);

  await factory.setImplementation(vesting.address)


  await hre.run("verify:verify", {
    address: vesting.address,
    constructorArguments: []
  })

  await hre.run("verify:verify", {
    address: factory.address,
    constructorArguments: []
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
