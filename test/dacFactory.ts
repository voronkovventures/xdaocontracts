import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";

import DacFactoryArtifact from "../artifacts/contracts/DacFactory.sol/DacFactory.json";
import DacArtifact from "../artifacts/contracts/Dac.sol/Dac.json";

import { DacFactory } from "../typechain/DacFactory";

import { expect } from "chai";
import { BigNumber } from "@ethersproject/bignumber";

const { deployContract } = waffle;

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("DacFactory", () => {
  let dacFactory: DacFactory;

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    dacFactory = (await deployContract(signers[0], DacFactoryArtifact, [
      [WBNB],
    ])) as DacFactory;

    const initialCurrencies = await dacFactory.currencies(0);

    expect(initialCurrencies).to.equal(WBNB);
  });

  it("DacFactory Created", async () => {
    expect(await dacFactory.currencies(0)).to.equal(WBNB);
  });

  it("Dac created via DacFactory", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    let dacs = await dacFactory.getDacs();

    expect(dacs).to.be.an("array").that.is.empty;

    const dacInfo = {
      name: "EgorDac",
      symbol: "EDAC",
      currency: WBNB,
      teammates: [myAddress],
      totalSupply: 100e3,
      governanceTokensPrice: BigNumber.from(+"1e16" + ""),
      purchasePublic: false,
      halfToVote: false,
      votingDuration: 7200,
    };

    await dacFactory.create(
      dacInfo.name,
      dacInfo.symbol,
      dacInfo.currency,
      dacInfo.teammates,
      dacInfo.totalSupply,
      dacInfo.governanceTokensPrice,
      dacInfo.purchasePublic,
      dacInfo.halfToVote,
      dacInfo.votingDuration
    );

    dacs = await dacFactory.getDacs();

    expect(dacs.length).to.equal(1);

    const dacAddress = dacs[0];

    const dac = new ethers.Contract(dacAddress, DacArtifact.abi, signers[0]);

    const [
      name,
      symbol,
      currency,
      teammates,
      totalSupply,
      governanceTokensPrice,
      purchasePublic,
      halfToVote,
      votingDuration,
    ] = await Promise.all([
      dac.name(),
      dac.symbol(),
      dac.currency(),
      dac.getAllTeammates(),
      dac.totalSupply(),
      dac.governanceTokensPrice(),
      dac.purchasePublic(),
      dac.halfToVote(),
      dac.votingDuration(),
    ]);

    expect(name).to.equal(dacInfo.name);
    expect(symbol).to.equal(dacInfo.symbol);
    expect(currency).to.equal(dacInfo.currency);
    expect(teammates).to.deep.equal(dacInfo.teammates);
    expect(totalSupply).to.equal(dacInfo.totalSupply);
    expect(governanceTokensPrice).to.equal(dacInfo.governanceTokensPrice);
    expect(purchasePublic).to.equal(dacInfo.purchasePublic);
    expect(halfToVote).to.equal(dacInfo.halfToVote);
    expect(votingDuration).to.equal(dacInfo.votingDuration);
  });
});
