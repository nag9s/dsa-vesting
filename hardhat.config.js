require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");

require("dotenv").config();
const ALCHEMY_ID = process.env.ALCHEMY_ID;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

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
        blockNumber: 12070498,
      },
      blockGasLimit: 12000000,
    },
  },
};

