import { Buffer } from "node:buffer";
import { CardanoSyncClient, CardanoQueryClient } from "npm:@utxorpc/sdk";

async function test() {
  let syncClient = new CardanoSyncClient({
    uri: "http://localhost:50051",
  });

  let queryClient = new CardanoQueryClient({
    uri: "http://localhost:50051",
  });

   const params = await queryClient.readParams();

   console.log(params);

   const utxos = await queryClient.searchUtxosByAddress(
     Buffer.from(
       "705c87cbca3a88cbfee6f6ad820acea99f484b4830fc632610f2a30146",
       "hex"
     )
   );
   console.log(
     utxos.map((utxo) => {
       console.log(utxo.parsedValued?.script);
     })
   );

  let tip = syncClient.followTip([
    {
      slot: 62085439,
      hash: "6783d7569edf4b861313714274d3ba99383371d40f4253273392b581239d5db6",
    },
  ]);

  for await (const event of tip) {
    console.log(event);
  }
}
test().catch(console.error);
