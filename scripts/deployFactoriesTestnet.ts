import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";
const { deployContract } = waffle;

import DacFactoryArtifact from "../artifacts/contracts/DacFactory.sol/DacFactory.json";
import { DacFactory } from "../typechain/DacFactory";

import DafFactoryArtifact from "../artifacts/contracts/DafFactory.sol/DafFactory.json";
import { DafFactory } from "../typechain/DafFactory";

async function main() {
  const signers = await ethers.getSigners();

  const dacFactory = (await deployContract(signers[0], DacFactoryArtifact, [
    ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"],
  ])) as DacFactory;

  const dafFactory = (await deployContract(signers[0], DafFactoryArtifact, [
    ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"],
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
