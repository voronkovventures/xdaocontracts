import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";
const { deployContract } = waffle;

import XDAOArtifact from "../artifacts/contracts/xDAO.sol/xDAO.json";

import MinterArtifact from "../artifacts/contracts/Minter.sol/Minter.json";
import ServiceDaoArtifact from "../artifacts/contracts/ServiceDao.sol/ServiceDao.json";

import DacFactoryArtifact from "../artifacts/contracts/DacFactory.sol/DacFactory.json";
import DafFactoryArtifact from "../artifacts/contracts/DafFactory.sol/DafFactory.json";

import { DacFactory, DafFactory, Minter, ServiceDao, XDAO } from "../typechain";
import { BigNumber } from "@ethersproject/bignumber";

async function main() {
  const signers = await ethers.getSigners();

  const myAddress = await signers[0].getAddress();

  const xdao = (await deployContract(signers[0], XDAOArtifact)) as XDAO;

  const minter = (await deployContract(signers[0], MinterArtifact, [
    xdao.address,
  ])) as Minter;

  // TODO Teammates
  const serviceDao = (await deployContract(signers[0], ServiceDaoArtifact, [
    [
      "0x85718C5084C79682ae8704321b3cd3A2B49C8069",
      "0xf32Cdcb9508062a649B2d8822d2f690c7Ef93F89",
    ],
    "0x85718C5084C79682ae8704321b3cd3A2B49C8069",
  ])) as ServiceDao;

  const tx = await xdao.transfer(
    minter.address,
    BigNumber.from("140000000000000000000000000")
  );

  await tx.wait();

  const tx2 = await xdao.transfer(
    serviceDao.address,
    BigNumber.from("60000000000000000000000000")
  );

  await tx2.wait();

  const myBalance = await xdao.balanceOf(myAddress);

  const [minterBalance, serviceDaoBalance] = await Promise.all([
    xdao.balanceOf(minter.address),
    xdao.balanceOf(serviceDao.address),
  ]);

  const dacFactory = (await deployContract(signers[0], DacFactoryArtifact, [
    [
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", //  ETH
      "0x55d398326f99059fF775485246999027B3197955", //  BUSD-T
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", //  WBNB
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", //  USDC
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", //  DAI
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", //  BUSD
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", //  BTCB
      xdao.address,
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
      xdao.address,
    ],
  ])) as DafFactory;

  console.table({
    myBalance: +myBalance / 1e18,
    minterBalance: +minterBalance / 1e18,
    serviceDaoBalance: +serviceDaoBalance / 1e18,
    xdao: xdao.address,
    minter: minter.address,
    serviceDao: serviceDao.address,
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
