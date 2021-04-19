import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";

import DacArtifact from "../artifacts/contracts/Dac.sol/Dac.json";
import { Dac } from "../typechain/Dac";

import { expect } from "chai";
import { BigNumber } from "@ethersproject/bignumber";

const { deployContract } = waffle;

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("Dac", () => {
  let dac: Dac;

  const abiCoder = new ethers.utils.AbiCoder();

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

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

    dac = (await deployContract(signers[0], DacArtifact, [
      dacInfo.name,
      dacInfo.symbol,
      dacInfo.currency,
      dacInfo.teammates,
      dacInfo.totalSupply,
      dacInfo.governanceTokensPrice,
      dacInfo.purchasePublic,
      dacInfo.halfToVote,
      dacInfo.votingDuration,
    ])) as Dac;

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

  it("Create Voting, Sign it and Activate – Change Purchase Public to True", async () => {
    expect(await dac.purchasePublic()).to.equal(false);

    expect(await dac.getAllVotings()).to.be.an("array").that.is.empty;

    await dac.createVoting(
      dac.address,
      ethers.utils.id("changePurchasePublic(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change PurchasePublic to True`
    );

    expect(await dac.purchasePublic()).to.equal(false);

    expect((await dac.getAllVotings()).length).to.equal(1);

    await dac.signVoting(0);

    expect(await dac.purchasePublic()).to.equal(false);

    await dac.activateVoting(0);

    expect(await dac.purchasePublic()).to.equal(true);
  });

  it("Freeze Purchase Public", async () => {
    expect(await dac.purchaseRuleFrozen()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("freezePurchaseRuleFrozen()").slice(0, 10),
      0,
      `Freeze PurchasePublic`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect(await dac.purchaseRuleFrozen()).to.equal(true);

    expect(await dac.purchasePublic()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("changePurchasePublic(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change PurchasePublic to True`
    );

    await dac.signVoting(1);

    await expect(dac.activateVoting(1)).to.be.reverted;
  });

  it("Try to Mint without Mintable==true, then change Mintable to true, then Mint", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    expect(await dac.totalSupply()).to.equal(100000);
    expect(await dac.balanceOf(dac.address)).to.equal(100000);
    expect(await dac.mintable()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("mint(uint256)").slice(0, 10) +
        abiCoder.encode(["uint256"], [100]).slice(2),
      0,
      `Mint 100 Tokens`
    );

    await dac.signVoting(0);

    await expect(dac.activateVoting(0)).to.be.reverted;

    await dac.createVoting(
      dac.address,
      ethers.utils.id("changeMintable(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change Mintable to True`
    );

    await dac.signVoting(1);

    await dac.activateVoting(1);

    expect(await dac.mintable()).to.equal(true);

    await dac.activateVoting(0);

    expect(await dac.totalSupply()).to.equal(100100);
    expect(await dac.balanceOf(myAddress)).to.equal(0);
    expect(await dac.balanceOf(dac.address)).to.equal(100100);
  });

  it("Add Teammate, then sign the voting together", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    expect((await dac.getAllTeammates()).length).to.equal(1);
    expect(await dac.teammates(0)).to.equal(myAddress);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("addTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [friend]).slice(2),
      0,
      `Add ${friend}`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(2);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(friend);

    expect(await dac.burnableFrozen()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("freezeBurnableFrozen()").slice(0, 10),
      0,
      `Freeze Burnable Status`
    );
    expect(await dac.burnableFrozen()).to.equal(false);

    await dac.signVoting(1);

    expect(await dac.burnableFrozen()).to.equal(false);

    await expect(dac.activateVoting(1)).to.be.reverted;

    expect(await dac.burnableFrozen()).to.equal(false);

    await dac.connect(signers[1]).signVoting(1);

    expect(await dac.burnableFrozen()).to.equal(false);

    await dac.activateVoting(1);

    expect(await dac.burnableFrozen()).to.equal(true);
  });

  it("Remove Teammate", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    expect((await dac.getAllTeammates()).length).to.equal(1);
    expect(await dac.teammates(0)).to.equal(myAddress);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("addTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [friend]).slice(2),
      0,
      `Add ${friend}`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(2);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(friend);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("removeTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [myAddress]).slice(2),
      0,
      `Remove ${myAddress}`
    );

    await dac.signVoting(1);
    await dac.connect(signers[1]).signVoting(1);

    await dac.activateVoting(1);

    expect((await dac.getAllTeammates()).length).to.equal(1);
    expect(await dac.teammates(0)).to.equal(friend);
  });

  it("Transfer of Rights", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    expect((await dac.getAllTeammates()).length).to.equal(1);
    expect(await dac.teammates(0)).to.equal(myAddress);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("transferOfRights(address,address)").slice(0, 10) +
        abiCoder.encode(["address", "address"], [myAddress, friend]).slice(2),
      0,
      `Transfer to ${friend}`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(1);
    // expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(0)).to.equal(friend);
  });

  it("Buy Governance Tokens for Coins", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    expect(await dac.balanceOf(dac.address))
      .to.equal(await dac.totalSupply())
      .to.equal(100e3);

    expect(await dac.balanceOf(myAddress)).to.equal(0);

    // It doesn't matter how many tokens you enter as an argument, as long as you buy them with coins.
    // You will receive the maximum possible number of tokens based on your msg.value
    await dac.buyGovernanceTokens(10, {
      value: BigNumber.from(+"1e17" + ""),
    });

    expect(await dac.balanceOf(dac.address)).to.equal(100e3 - 10);

    expect(await dac.balanceOf(myAddress)).to.equal(10);

    expect(await dac.totalSupply()).to.equal(100e3);
  });

  it("Burn Governance Tokens", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    expect(await dac.balanceOf(dac.address))
      .to.equal(await dac.totalSupply())
      .to.equal(100e3);

    expect(await dac.balanceOf(myAddress)).to.equal(0);

    // It doesn't matter how many tokens you enter as an argument, as long as you buy them with coins.
    // You will receive the maximum possible number of tokens based on your msg.value
    await dac.buyGovernanceTokens(10, {
      value: BigNumber.from(+"1e17" + ""),
    });

    expect(await dac.balanceOf(dac.address)).to.equal(100e3 - 10);

    expect(await dac.balanceOf(myAddress)).to.equal(10);

    expect(await dac.totalSupply()).to.equal(100e3);

    expect(await dac.burnable()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("changeBurnable(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change Burnable to true`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect(await dac.burnable()).to.equal(true);

    expect(await dac.teammates(0)).to.equal(myAddress);

    await dac.burnGovernanceTokens([]);

    expect(await dac.getAllTeammates()).to.be.an("array").that.is.empty;

    expect(await dac.balanceOf(myAddress)).to.equal(0);

    expect(await dac.totalSupply()).to.equal(100e3 - 10);
  });

  it("Burn Governance Tokens With Two Teammates", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    await dac.createVoting(
      dac.address,
      ethers.utils.id("addTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [friend]).slice(2),
      0,
      `Add ${friend}`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(2);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(friend);

    expect(await dac.balanceOf(dac.address))
      .to.equal(await dac.totalSupply())
      .to.equal(100e3);

    expect(await dac.balanceOf(myAddress)).to.equal(0);

    // It doesn't matter how many tokens you enter as an argument, as long as you buy them with coins.
    // You will receive the maximum possible number of tokens based on your msg.value
    await dac.buyGovernanceTokens(10, {
      value: BigNumber.from(+"1e17" + ""),
    });

    await dac.connect(signers[1]).buyGovernanceTokens(10, {
      value: BigNumber.from(+"1e17" + ""),
    });

    expect(await dac.balanceOf(dac.address)).to.equal(100e3 - 20);

    expect(await dac.balanceOf(myAddress)).to.equal(10);

    expect(await dac.balanceOf(friend)).to.equal(10);

    expect(await dac.totalSupply()).to.equal(100e3);

    expect(await dac.burnable()).to.equal(false);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("changeBurnable(bool)").slice(0, 10) +
        abiCoder.encode(["bool"], [true]).slice(2),
      0,
      `Change Burnable to true`
    );

    await dac.signVoting(1);
    await dac.connect(signers[1]).signVoting(1);

    await dac.activateVoting(1);

    expect(await dac.burnable()).to.equal(true);

    expect(await dac.teammates(0)).to.equal(myAddress);

    await dac.burnGovernanceTokens([]);

    // expect(await dac.getAllTeammates()).to.be.an("array").that.is.empty;

    expect(await dac.balanceOf(myAddress)).to.equal(0);

    expect(await dac.totalSupply()).to.equal(100e3 - 10);
  });

  it("Remove Myself", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    await dac.createVoting(
      dac.address,
      ethers.utils.id("removeTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [myAddress]).slice(2),
      0,
      `Remove ${myAddress}`
    );

    await dac.signVoting(0);

    await dac.activateVoting(0);
  });
});
