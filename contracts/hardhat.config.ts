import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.5.12",
  // ここにローカル追加
  networks: {
    hardhat: {
      forking: {
        url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY!}`,
      },
      accounts: { mnemonic: process.env.MNEMONIC! },
    },
  },
};

export default config;

// blockNumber: 14052120,
