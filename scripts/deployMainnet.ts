import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";
const { deployContract } = waffle;

import DacFactoryArtifact from "../artifacts/contracts/DacFactory.sol/DacFactory.json";
import DafFactoryArtifact from "../artifacts/contracts/DafFactory.sol/DafFactory.json";

import { DacFactory, DafFactory } from "../typechain";

async function main() {
  const signers = await ethers.getSigners();

  const dacFactory = (await deployContract(signers[0], DacFactoryArtifact, [
    [
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", //  ETH
      "0x55d398326f99059fF775485246999027B3197955", //  BUSD-T
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", //  WBNB
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", //  USDC
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", //  DAI
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", //  BUSD
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", //  BTCB
    ],
  ])) as DacFactory;

  const dafFactory = (await deployContract(signers[0], DafFactoryArtifact, [
    [
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", //  ETH
      "0x55d398326f99059fF775485246999027B3197955", //  BUSD-T
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", //  WBNB
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", //  USDC
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", //  DAI
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", //  BUSD
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", //  BTCB
    ],
  ])) as DafFactory;

  console.table({
    dacFactory: dacFactory.address,
    dafFactory: dafFactory.address,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
