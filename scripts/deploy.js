const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  let owner;
  if (hre.network.name === "mainnet") {
    console.log(
      "\n\n Deploying Contracts to mainnet. Hit ctrl + c to abort"
    );
    owner = "0xb1DC62EC38E6E3857a887210C38418E4A17Da5B2"
  } else if (hre.network.name === "kovan") {
    console.log(
      "\n\n Deploying Contracts to kovan. Hit ctrl + c to abort"
    );
    owner = "0x9F60699cE23f1Ab86Ec3e095b477Ff79d4f409AD"
  } else {
    owner = "0x9F60699cE23f1Ab86Ec3e095b477Ff79d4f409AD"
  }

  const VestingFactory = await ethers.getContractFactory("InstaVestingFactory");
  const factory = await VestingFactory.deploy(owner);

  await factory.deployed();

  const Vesting = await ethers.getContractFactory("InstaTokenVesting");
  const vesting = await Vesting.deploy(factory.address);

  await vesting.deployed();

  console.log("Factory deployed to:", factory.address);
  console.log("Implementation deployed to:", vesting.address);

  // await factory.setImplementation(vesting.address)

  if (hre.network.name === "mainnet" || hre.network.name === "kovan") {
    await hre.run("verify:verify", {
      address: vesting.address,
      constructorArguments: [factory.address]
    })

    await hre.run("verify:verify", {
      address: factory.address,
      constructorArguments: [owner]
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
