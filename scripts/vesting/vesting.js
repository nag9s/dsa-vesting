const hre = require("hardhat");
const { ethers } = hre;

const fs = require('fs');
const { expect } = require("chai");

/*
 For mainnet: npx hardhat run scripts/vesting/vesting.js --network mainnet 
 For kovan: npx hardhat run scripts/vesting/vesting.js --network kovan 
 For mainnet fork: npx hardhat run scripts/vesting/vesting.js --network hardhat
*/


async function main() {
  const vestingConfig = JSON.parse(fs.readFileSync(`scripts/vesting/vestingRecipients.json`, { encoding: 'utf8' }))

  let vestingFactoryAddr;
  let factory;
  if (hre.network.name === "mainnet") {
    console.log(
      "\n\n Deploying Contracts to mainnet. Hit ctrl + c to abort"
    );
    vestingFactoryAddr = "" // TODO
    if (vestingFactoryAddr === "") throw new Error("Set 'vestingFactoryAddr'")
    factory = await ethers.getContractAt("InstaVestingFactory", vestingFactoryAddr);
  } else if (hre.network.name === "kovan") {
    console.log(
      "\n\n Deploying Contracts to kovan. Hit ctrl + c to abort"
    );
    vestingFactoryAddr = "0x9F60699cE23f1Ab86Ec3e095b477Ff79d4f409AD"

    factory = await ethers.getContractAt("InstaVestingFactory", vestingFactoryAddr);

  } else {
    const accounts = await ethers.getSigners();
    const owner = accounts[7]
    const VestingFactory = await ethers.getContractFactory("InstaVestingFactory");
    factory = await VestingFactory.deploy(owner.address);
    await factory.deployed();
  
    const Vesting = await ethers.getContractFactory("InstaTokenVesting");
    const vesting = await Vesting.deploy(factory.address);
  
    await vesting.deployed();
  
    console.log("Factory deployed to:", factory.address);
    console.log("Implementation deployed to:", vesting.address);
  
    await factory.connect(owner).setImplementation(vesting.address)
    console.log("Implementation deployed to:", vesting.address);

  }

  const length = vestingConfig.length

  const owners = [];
  const recipients = [];
  const vestingAmounts = [];
  const vestingBegins = [];
  const vestingCliffs = [];
  const vestingEnds = [];

  vestingConfig.forEach(a => {
    owners.push(a.owner)
    recipients.push(a.recipient)
    vestingAmounts.push(a.vestingAmount)
    vestingBegins.push(a.vestingBegin)
    vestingCliffs.push(a.vestingCliff)
    vestingEnds.push(a.vestingEnd)
  });

  expect(owners.length).to.be.eq(length)
  expect(recipients.length).to.be.eq(length)
  expect(vestingAmounts.length).to.be.eq(length)
  expect(vestingBegins.length).to.be.eq(length)
  expect(vestingCliffs.length).to.be.eq(length)
  expect(vestingEnds.length).to.be.eq(length)

  const tx = await factory.startMultipleVesting(owners, recipients, vestingAmounts, vestingBegins, vestingCliffs, vestingEnds)
  const txData = await tx.wait()

  console.log("Vesting contracts deployed!!!")
  console.log("Transaction hash: ", txData.transactionHash)

  const vestingContracts = {}

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const vestingContract = await factory.recipients(recipient)
    vestingContracts[recipient] = vestingContract;
  }

  fs.writeFileSync("./scripts/vesting/vestedContracts.json", JSON.stringify(vestingContracts, null, 2))

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
