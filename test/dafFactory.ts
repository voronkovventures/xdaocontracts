import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";

import DafFactoryArtifact from "../artifacts/contracts/DafFactory.sol/DafFactory.json";
import DafArtifact from "../artifacts/contracts/Daf.sol/Daf.json";

import { DafFactory } from "../typechain/DafFactory";

import { expect } from "chai";
import { BigNumber } from "@ethersproject/bignumber";

const { deployContract } = waffle;

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("DafFactory", () => {
  let dafFactory: DafFactory;

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    dafFactory = (await deployContract(signers[0], DafFactoryArtifact, [
      [WBNB],
    ])) as DafFactory;

    const initialCurrencies = await dafFactory.currencies(0);

    expect(initialCurrencies).to.equal(WBNB);
  });

  it("DafFactory Created", async () => {
    expect(await dafFactory.currencies(0)).to.equal(WBNB);
  });

  it("Daf created via DafFactory", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    let dafs = await dafFactory.getDafs();

    expect(dafs).to.be.an("array").that.is.empty;

    const dafInfo = {
      name: "EgorDaf",
      symbol: "EDAF",
      currency: WBNB,
      totalSupply: 100e3,
      governanceTokensPrice: BigNumber.from(+"1e16" + ""),
      percentToVote: 51,
      limitToBuy: 10,
      votingDuration: 7200,
    };

    await dafFactory.create(
      dafInfo.name,
      dafInfo.symbol,
      dafInfo.currency,
      dafInfo.totalSupply,
      dafInfo.governanceTokensPrice,
      dafInfo.percentToVote,
      dafInfo.limitToBuy,
      dafInfo.votingDuration
    );

    dafs = await dafFactory.getDafs();

    expect(dafs.length).to.equal(1);

    const dafAddress = dafs[0];

    const daf = new ethers.Contract(dafAddress, DafArtifact.abi, signers[0]);

    const [
      name,
      symbol,
      currency,
      isWhitelisted,
      totalSupply,
      governanceTokensPrice,
      percentToVote,
      limitToBuy,
      votingDuration,
    ] = await Promise.all([
      daf.name(),
      daf.symbol(),
      daf.currency(),
      daf.whitelist(myAddress),
      daf.totalSupply(),
      daf.governanceTokensPrice(),
      daf.percentToVote(),
      daf.limitToBuy(),
      daf.votingDuration(),
    ]);

    expect(name).to.equal(dafInfo.name);
    expect(symbol).to.equal(dafInfo.symbol);
    expect(currency).to.equal(dafInfo.currency);
    expect(isWhitelisted).to.equal(true);
    expect(totalSupply).to.equal(dafInfo.totalSupply);
    expect(governanceTokensPrice).to.equal(dafInfo.governanceTokensPrice);
    expect(percentToVote).to.equal(dafInfo.percentToVote);
    expect(limitToBuy).to.equal(dafInfo.limitToBuy);
    expect(votingDuration).to.equal(dafInfo.votingDuration);
  });
});
