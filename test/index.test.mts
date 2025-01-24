import { vi, describe, test, expect } from "vitest";
import { QueryClient, SyncClient } from "../src/cardano";
import { createRouterTransport } from "@connectrpc/connect";
import {
  queryConnect,
} from "@utxorpc/spec";
import genesis from './shelley-genesis.json';

// const mockTransport = createRouterTransport(({ service }) => {
//   service(queryConnect.QueryService, {
//     readParams: () => ({ sentence: "I feel happy." } as any),
//   });
// });

// // vitest mock createPromiseClient in @connectrpc/connect to createRouterTransport
// vi.mock("@connectrpc/connect", () => ({
//   createPromiseClient: vi.fn().mockImplementation(() => mockTransport),
// }));


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
    console.log(utxo);
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("82583900c8c47610a36034aac6fc58848bdae5c278d994ff502c05455e3b3ee8f8ed3a0eea0ef835ffa7bbfcde55f7fe9d2cc5d55ea62cecb42bab3c1b00000002540be400");
  });
});

// test('foo', async () => {
  
//   let syncClient = new SyncClient({
//     uri: "http://localhost:50051",
//   });
//   console.log();
//   // for await (const event of syncClient.followTip([{
//   //   slot: 601,
//   //   hash: "f2158441116a89f567534577323deddc9b44422a06bebfde24b666292e4e3123",
//   // }])) {
//   //   console.log(event);
//   // }
//   // const params = await queryClient.readUtxosByOutputRef([
//   //   {
//   //     txHash: Buffer.from("a6ce90a9a5ef8ef73858effdae375ba50f302d3c6c8b587a15eaa8fa98ddf741", "hex"),
//   //     outputIndex: 0,
//   //   },
//   // ]);
//   // console.log(params);
//   // expect(1).toBe(1)
// })
