import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";

import DafArtifact from "../artifacts/contracts/Daf.sol/Daf.json";
import { Daf } from "../typechain/Daf";

import { expect } from "chai";
import { BigNumber } from "@ethersproject/bignumber";

const { deployContract } = waffle;

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("Daf", () => {
  let daf: Daf;

  const abiCoder = new ethers.utils.AbiCoder();

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const dafInfo = {
      name: "EgorDaf",
      symbol: "EDAF",
      currency: WBNB,
      creator: myAddress,
      totalSupply: 100e3,
      governanceTokensPrice: BigNumber.from(+"1e16" + ""),
      percentToVote: 51,
      limitToBuy: 10,
      votingDuration: 7200,
    };

    daf = (await deployContract(signers[0], DafArtifact, [
      dafInfo.name,
      dafInfo.symbol,
      [WBNB],
      dafInfo.currency,
      dafInfo.creator,
      dafInfo.totalSupply,
      dafInfo.governanceTokensPrice,
      dafInfo.percentToVote,
      dafInfo.limitToBuy,
      dafInfo.votingDuration,
    ])) as Daf;

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

  it("Buying Governance Tokens and Creating/Signing/Activating Voting", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    await expect(
      daf.createVoting(
        daf.address,
        ethers.utils.id("freezeMintableFrozen()").slice(0, 10),
        0,
        `Freeze Mintable Status`
      )
    ).to.be.reverted;

    expect(await daf.balanceOf(myAddress)).to.equal(0);

    // It doesn't matter how many tokens you enter as an argument, as long as you buy them with coins.
    // You will receive the maximum possible number of tokens based on your msg.value
    // Let's try to buy more than limit
    const limitToBuy = await daf.limitToBuy();

    await expect(
      daf.buyGovernanceTokens(11, {
        value: BigNumber.from(+(+limitToBuy + 1 + "e16") + ""),
      })
    ).to.be.reverted;

    await daf.buyGovernanceTokens(10, {
      value: BigNumber.from(+(limitToBuy + "e16") + ""),
    });

    expect(await daf.whitelist(myAddress)).to.equal(false);

    expect(await daf.balanceOf(myAddress))
      .to.equal(limitToBuy)
      .to.equal(10);

    expect(await daf.balanceOf(daf.address)).to.equal(100e3 - 10);

    expect(await daf.totalSupply()).to.equal(100e3);

    expect(await daf.getAllVotings()).to.be.an("array").that.is.empty;

    expect(await daf.mintableFrozen()).to.equal(false);

    await daf.createVoting(
      daf.address,
      ethers.utils.id("freezeMintableFrozen()").slice(0, 10),
      0,
      `Freeze Mintable Status`
    );

    expect(await daf.mintableFrozen()).to.equal(false);

    expect((await daf.getAllVotings()).length).to.equal(1);

    await daf.signVoting(0);

    expect(await daf.mintableFrozen()).to.equal(false);

    await daf.activateVoting(0);

    expect(await daf.mintableFrozen()).to.equal(true);
  });

  it("Freeze Voting Duration", async () => {
    expect(await daf.votingDurationFrozen()).to.equal(false);

    await daf.buyGovernanceTokens(1, { value: BigNumber.from(+"1e16" + "") });

    await daf.createVoting(
      daf.address,
      ethers.utils.id("freezeVotingDuration()").slice(0, 10),
      0,
      `Freeze Voting Duration`
    );

    await daf.signVoting(0);

    await daf.activateVoting(0);

    expect(await daf.votingDurationFrozen()).to.equal(true);

    expect(await daf.votingDuration()).to.equal(7200);

    await daf.createVoting(
      daf.address,
      ethers.utils.id("changeVotingDuration(uint256)").slice(0, 10) +
        abiCoder.encode(["uint256"], [86400]).slice(2),
      0,
      `Change Voting Duration to 24 hourrs`
    );

    await daf.signVoting(1);

    await expect(daf.activateVoting(1)).to.be.reverted;
  });

  it("Try to Mint without Mintable==true, then change Mintable to true, then Mint", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    expect(await daf.totalSupply()).to.equal(100000);
    expect(await daf.balanceOf(daf.address)).to.equal(100000);
    expect(await daf.mintable()).to.equal(false);

    await daf.buyGovernanceTokens(1, { value: BigNumber.from(+"1e16" + "") });

    expect(await daf.balanceOf(myAddress)).to.equal(1);

    await daf.createVoting(
      daf.address,
      ethers.utils.id("mint(uint256)").slice(0, 10) +
        abiCoder.encode(["uint256"], [100]).slice(2),
      0,
      `Mint 100 Tokens`
    );

    await daf.signVoting(0);

    await expect(daf.activateVoting(0)).to.be.reverted;

    await daf.createVoting(
      daf.address,
      ethers.utils.id("changeMintable(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change Mintable to True`
    );

    await daf.signVoting(1);

    await daf.activateVoting(1);

    expect(await daf.mintable()).to.equal(true);

    await daf.activateVoting(0);

    expect(await daf.totalSupply()).to.equal(100100);
    expect(await daf.balanceOf(myAddress)).to.equal(1);
    expect(await daf.balanceOf(daf.address)).to.equal(100100 - 1);
  });

  it("Allow my friend to buy tokens, then sign the voting together", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    expect(await daf.whitelist(myAddress)).to.equal(true);
    expect(await daf.whitelist(friend)).to.equal(false);

    await daf.buyGovernanceTokens(6, { value: BigNumber.from(+"6e16" + "") });

    expect(await daf.whitelist(myAddress)).to.equal(false);

    expect(await daf.getAllVotingsAddToWhitelist()).to.be.an("array").that.is
      .empty;

    await daf.connect(signers[1]).createVotingAddToWhitelist("1");

    expect((await daf.getAllVotingsAddToWhitelist()).length).to.equal(1);

    await daf.signVotingAddToWhitelist(0);

    await daf.activateVotingAddToWhitelist(0);

    expect(await daf.whitelist(friend)).to.equal(true);

    await daf
      .connect(signers[1])
      .buyGovernanceTokens(4, { value: BigNumber.from(+"4e16" + "") });

    expect(await daf.whitelist(friend)).to.equal(false);

    expect(await daf.burnableFrozen()).to.equal(false);

    await daf.createVoting(
      daf.address,
      ethers.utils.id("freezeBurnableFrozen()").slice(0, 10),
      0,
      `Freeze Burnable Status`
    );
    expect(await daf.burnableFrozen()).to.equal(false);

    await daf.connect(signers[1]).signVoting(0);

    expect(await daf.burnableFrozen()).to.equal(false);

    await expect(daf.activateVoting(0)).to.be.reverted;

    expect(await daf.burnableFrozen()).to.equal(false);

    await daf.signVoting(0);

    expect(await daf.burnableFrozen()).to.equal(false);

    await daf.activateVoting(0);

    expect(await daf.burnableFrozen()).to.equal(true);
  });

  it("Buy Governance Tokens for Coins", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    expect(await daf.balanceOf(daf.address))
      .to.equal(await daf.totalSupply())
      .to.equal(100e3);

    expect(await daf.balanceOf(myAddress)).to.equal(0);

    // It doesn't matter how many tokens you enter as an argument, as long as you buy them with coins.
    // You will receive the maximum possible number of tokens based on your msg.value
    await daf.buyGovernanceTokens(10, {
      value: BigNumber.from(+"1e17" + ""),
    });

    expect(await daf.balanceOf(daf.address)).to.equal(100e3 - 10);

    expect(await daf.balanceOf(myAddress)).to.equal(10);

    expect(await daf.totalSupply()).to.equal(100e3);
  });
});
