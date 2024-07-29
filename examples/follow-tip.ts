import { CardanoSyncClient, CardanoQueryClient } from "../src/index.js";

async function test() {
  let syncClient = new CardanoSyncClient({
    uri: "http://localhost:50051",
  });

  let queryClient = new CardanoQueryClient({
    uri: "http://localhost:50051",
  });

  const params = await queryClient.readParams();
  console.log(params);


  const utxos = await queryClient.searchUtxosByAddress(Buffer.from("705c87cbca3a88cbfee6f6ad820acea99f484b4830fc632610f2a30146", "hex"));
  console.log(utxos.map((utxo) => {
    console.log(utxo.asOutput?.script);
  }));
  
  let tip = syncClient.followTip([
    {
      slot: 54131816,
      hash: "34c65aba4b299113a488b74e2efe3a3dd272d25b470d25f374b2c693d4386535",
    }
  ]);

  for await (const event of tip) {
    console.log((event as any).block.header.slot);
  }
}
test().catch(console.error);