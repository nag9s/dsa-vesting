require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config();
const ALCHEMY_ID = process.env.ALCHEMY_ID;

const { utils } = require("ethers");

const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: "0.7.3",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
        blockNumber: 12441069,
      },
      blockGasLimit: 12000000,
    },
    mainnet: {
      url: `https://eth.alchemyapi.io/v2/${ALCHEMY_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      timeout: 150000,
      gasPrice: parseInt(utils.parseUnits("25", "gwei"))
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN
  }
};

