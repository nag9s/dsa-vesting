const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  if (hre.network.name === "mainnet") {
    console.log(
      "\n\n Deploying Contracts to mainnet. Hit ctrl + c to abort"
    );
  }

  const VestingFactory = await ethers.getContractFactory("InstaVestingFactory");
  const factory = await VestingFactory.deploy();

  await factory.deployed();

  const Vesting = await ethers.getContractFactory("InstaTokenVesting");
  const vesting = await Vesting.deploy(factory.address);

  await vesting.deployed();

  console.log("Factory deployed to:", factory.address);
  console.log("Implementation deployed to:", vesting.address);

  // await factory.setImplementation(vesting.address)

  if (hre.network.name === "mainnet") {
    await hre.run("verify:verify", {
      address: vesting.address,
      constructorArguments: [factory.address]
    })

    await hre.run("verify:verify", {
      address: factory.address,
      constructorArguments: []
    })
  } else {
    console.log("Contracts deployed")
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
