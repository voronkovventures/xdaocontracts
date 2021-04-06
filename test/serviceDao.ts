import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";

import ServiceDaoArtifact from "../artifacts/contracts/ServiceDao.sol/ServiceDao.json";
import { ServiceDao } from "../typechain/ServiceDao";

import { expect } from "chai";

const { deployContract } = waffle;

describe("Service DAO", () => {
  let dac: ServiceDao;

  const abiCoder = new ethers.utils.AbiCoder();

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const goldenShare = await signers[2].getAddress();

    const dacInfo = {
      teammates: [myAddress, goldenShare],
      goldenShare: goldenShare,
    };

    dac = (await deployContract(signers[0], ServiceDaoArtifact, [
      dacInfo.teammates,
      dacInfo.goldenShare,
    ])) as ServiceDao;

    const [teammates, goldenShareAddress] = await Promise.all([
      dac.getAllTeammates(),
      dac.goldenShare(),
    ]);

    expect(teammates).to.deep.equal(dacInfo.teammates);
    expect(goldenShareAddress).to.equal(dacInfo.goldenShare);
  });

  it("Create Voting, Sign it and Activate – Add Teammate", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    const goldenShare = await signers[2].getAddress();

    expect((await dac.getAllTeammates()).length).to.equal(2);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(goldenShare);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("addTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [friend]).slice(2),
      0,
      `Add ${friend}`
    );

    await dac.signVoting(0);

    await expect(dac.activateVoting(0)).to.be.reverted;

    await dac.connect(signers[2]).signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(3);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(goldenShare);
    expect(await dac.teammates(2)).to.equal(friend);
  });

  it("Remove Teammate", async () => {
    const signers = await ethers.getSigners();

    const myAddress = await signers[0].getAddress();

    const friend = await signers[1].getAddress();

    const goldenShare = await signers[2].getAddress();

    await dac.createVoting(
      dac.address,
      ethers.utils.id("addTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [friend]).slice(2),
      0,
      `Add ${friend}`
    );

    await dac.signVoting(0);

    await dac.connect(signers[2]).signVoting(0);

    await dac.activateVoting(0);

    expect((await dac.getAllTeammates()).length).to.equal(3);
    expect(await dac.teammates(0)).to.equal(myAddress);
    expect(await dac.teammates(1)).to.equal(goldenShare);
    expect(await dac.teammates(2)).to.equal(friend);

    await dac.createVoting(
      dac.address,
      ethers.utils.id("removeTeammate(address)").slice(0, 10) +
        abiCoder.encode(["address"], [myAddress]).slice(2),
      0,
      `Remove ${myAddress}`
    );

    await dac.signVoting(1);
    await dac.connect(signers[2]).signVoting(1);

    await dac.activateVoting(1);

    expect((await dac.getAllTeammates()).length).to.equal(2);
    expect(await dac.teammates(0)).to.equal(friend);
    expect(await dac.teammates(1)).to.equal(goldenShare);
  });
});
