import { describe, test, expect } from "vitest";
import { QueryClient, SyncClient } from "../src/cardano";

describe("QueryClient", () => {
  let queryClient = new QueryClient({
    uri: "http://localhost:50051",
  });
  test("readParams", async () => {
    const params = await queryClient.readParams();
    expect(params).toEqual({
      coinsPerUtxoByte: 0n,
      maxTxSize: 4096n,
      minFeeCoefficient: 0n,
      minFeeConstant: 0n,
      maxBlockBodySize: 0n,
      maxBlockHeaderSize: 2000000n,
      stakeKeyDeposit: 0n,
      poolDeposit: 0n,
      poolRetirementEpochBound: 0n,
      desiredNumberOfPools: 0n,
      minPoolCost: 0n,
      maxValueSize: 0n,
      collateralPercentage: 0n,
      maxCollateralInputs: 0n
    });
  });
  test("readUtxosByOutputRef", async () => {
    const utxo = await queryClient.readUtxosByOutputRef([
      {
        txHash: Buffer.from("8c1cb0c06b48dc4238775f81f3276634fbc243131323be95767055ef3d095515", "hex"),
        outputIndex: 0,
      },
    ]);
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("8282d818582583581c73d9939a59f42a1f3ca3b6aba56f82e52de28c70cbe36870cff5a197a10242182a001aaa7d769f1ac7145b00");
  });
  test("searchUtxosByAddress", async () => {
    const utxo = await queryClient.searchUtxosByAddress(Buffer.from("82d818582583581c73d9939a59f42a1f3ca3b6aba56f82e52de28c70cbe36870cff5a197a10242182a001aaa7d769f", "hex"));
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("8282d818582583581c73d9939a59f42a1f3ca3b6aba56f82e52de28c70cbe36870cff5a197a10242182a001aaa7d769f1ac7145b00");
  });
  test("searchUtxosByPaymentPart", async () => {
    const utxo = await queryClient.searchUtxosByPaymentPart(Buffer.from("c8c47610a36034aac6fc58848bdae5c278d994ff502c05455e3b3ee8", "hex"));
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("82583900c8c47610a36034aac6fc58848bdae5c278d994ff502c05455e3b3ee8f8ed3a0eea0ef835ffa7bbfcde55f7fe9d2cc5d55ea62cecb42bab3c1b00000002540be400");
  });
  test("searchUtxosByDelegationPart", async () => {
    const utxo = await queryClient.searchUtxosByDelegationPart(Buffer.from("f8ed3a0eea0ef835ffa7bbfcde55f7fe9d2cc5d55ea62cecb42bab3c", "hex"));
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("82583900c8c47610a36034aac6fc58848bdae5c278d994ff502c05455e3b3ee8f8ed3a0eea0ef835ffa7bbfcde55f7fe9d2cc5d55ea62cecb42bab3c1b00000002540be400");
  });
  test("searchUtxosByAsset", async () => {
    const utxo = await queryClient.searchUtxosByAsset();
    expect(utxo.length).toBe(0); // TODO: genesis has no custom assets, so we'd need to setup the tests for this
  });
  test("searchUtxosByAddressWithAsset", async () => {
    const utxo = await queryClient.searchUtxosByAddressWithAsset(Buffer.from("82d818582583581c73d9939a59f42a1f3ca3b6aba56f82e52de28c70cbe36870cff5a197a10242182a001aaa7d769f", "hex"));
    expect(utxo.length).toBe(0); // TODO: genesis has no custom assets, so we'd need to setup the tests for this
  });
  test("searchUtxosByPaymentPartWithAsset", async () => {
    const utxo = await queryClient.searchUtxosByPaymentPartWithAsset(Buffer.from("c8c47610a36034aac6fc58848bdae5c278d994ff502c05455e3b3ee8", "hex"));
    expect(utxo.length).toBe(0); // TODO: genesis has no custom assets, so we'd need to setup the tests for this
  });
  test("searchUtxosByDelegationPartWithAsset", async () => {
    const utxo = await queryClient.searchUtxosByDelegationPartWithAsset(Buffer.from("f8ed3a0eea0ef835ffa7bbfcde55f7fe9d2cc5d55ea62cecb42bab3c", "hex"));
    expect(utxo.length).toBe(0); // TODO: genesis has no custom assets, so we'd need to setup the tests for this
  });
});

describe("SyncClient", () => {
  let syncClient = new SyncClient({
    uri: "http://localhost:50051",
  });
  test("followTip", async () => {
    const generator = syncClient.followTip([{
      slot: 601,
      hash: 'f2158441116a89f567534577323deddc9b44422a06bebfde24b666292e4e3123',
    }]);
    const block1 = await (generator[Symbol.asyncIterator]()).next();
    expect(block1).toStrictEqual({
      value: {
        action: 'reset',
        point: {
          slot: '601',
          hash: 'f2158441116a89f567534577323deddc9b44422a06bebfde24b666292e4e3123'
        }
      },
      done: false
    });
    const block2 = await (generator[Symbol.asyncIterator]()).next();
    expect({ body: block2.value.block.body?.toJson(), header: block2.value.block.header?.toJson() }).toEqual({
      body: {
        // TODO: this is missing for some reason
        // tx: [],
      },
      header: {
        hash: "ENFFlzZi/rS1v86fbYRg+3xhAW9r7LzZ1MggN6m86rw=",
        slot: "602",
        height: "1",
      }
    })
  });
  test("readTip", async () => {
    const tip = await syncClient.readTip();
    expect(Number(tip.slot)).toBeGreaterThan(1)
  });
  test("fetchBlock", async () => {
    const block = await syncClient.fetchBlock({
      slot: 601,
      hash: 'f2158441116a89f567534577323deddc9b44422a06bebfde24b666292e4e3123',
    });
    expect({ body: block.body?.toJson(), header: block.header?.toJson() }).toEqual({
      body: {
        // TODO: this is missing for some reason
        // tx: [],
      },
      header: {
        hash: "DdxBJbBKFI8l/2ybtQaqSs/7xEkCBymZGP3vwHWYFiU=",
        slot: "601",
        // TODO: this is missing for some reason
        // height: "0",
      }
    })
  });
  test("fetchHistory", async () => {
    const block = await syncClient.fetchHistory({
      slot: 601,
      hash: 'f2158441116a89f567534577323deddc9b44422a06bebfde24b666292e4e3123',
    });
    expect({ body: block.body?.toJson(), header: block.header?.toJson() }).toEqual({
      body: {
        // TODO: this is missing for some reason
        // tx: [],
      },
      header: {
        hash: "DdxBJbBKFI8l/2ybtQaqSs/7xEkCBymZGP3vwHWYFiU=",
        slot: "601",
        // TODO: this is missing for some reason
        // height: "0",
      }
    })
  });
});

// TODO: test SubmitClient. It's hard since it's stateful, so we need to mock the backend
// TODO: test WatchClient. It's hard since it's stateful, so we need to mock the backend
