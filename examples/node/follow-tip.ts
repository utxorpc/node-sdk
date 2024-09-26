import { submit } from "@utxorpc/spec";
import { SyncClient, QueryClient, Utxo, SubmitClient, WatchClient, ChainPoint } from "../../src/cardano";

async function test() {
  let syncClient = new SyncClient({
    uri: "https://preview.utxorpc-v0.demeter.run",
    headers: {
      "dmtr-api-key": "dmtr_utxorpc1vc0m93rynmltysttwm7ns9m3n5cklws6",
    }
  });

  let queryClient = new QueryClient({
    uri: "https://preview.utxorpc-v0.demeter.run",
    headers: {
      "dmtr-api-key": "dmtr_utxorpc1vc0m93rynmltysttwm7ns9m3n5cklws6",
    }
  });

  let submitClient = new SubmitClient({
    uri: "https://preview.utxorpc-v0.demeter.run",
    headers: {
      "dmtr-api-key": "dmtr_utxorpc1vc0m93rynmltysttwm7ns9m3n5cklws6",
    }
  });

  const watchClient = new WatchClient({
    uri: "https://preview.utxorpc-v0.demeter.run",
    headers: {
      "dmtr-api-key": "dmtr_utxorpc1vc0m93rynmltysttwm7ns9m3n5cklws6",
    }
  });

  const chainPoint: ChainPoint = 
    {
      slot: 60692700, // Adjust this value as necessary
      hash: "1113030bc4a8feb29b4f3e3928cd7193ee1b0ca49f35cf2af9cd881b86375d29", // Replace with the actual hash
    };

  // Fetch history for the provided ChainPoint
  try {
    const block = await syncClient.fetchHistory(chainPoint);
    console.log("Fetched Block:", JSON.stringify(block,null,2));
  } catch (error) {
    console.error("Error fetching block history:", error);
  }

  // Call watchTx
  // const asyncIterable = watchClient.watchTx(chainPoint);

  // try {
  //   for await (const response of asyncIterable) {
  //     console.log("Transaction Update:", response);

  //     if (response.action.case == "apply") {
  //       console.log(response.action.value.chain.value);
  //     }
  //     if (response.action.case == "undo") {
  //       console.log(response.action.value.chain.value);
  //     }
  //   }
  // } catch (error) {
  //   console.error("Error while watching transactions:", error);
  // }
  
  // watchmempool test

  // const tx = await submitClient.submitTx(
  //   Buffer.from(
  //     "84a300d901028182582033dd8b84c4d4d4018c6a0fd83bf892a6dbf6a95afa49f5872e1b4e5f67b25e5f01018282581d60916c769efc6e2a3339594818a1d0c3998c29e3a6303d8711de8567591a004c4b4082581d60916c769efc6e2a3339594818a1d0c3998c29e3a6303d8711de8567591b0000000252d052cc021a0002990da100d9010281825820526fa19e3694cda4f3c0d2fb2d2bb8768925eccc49a89d5f12b1972644ac769858403548d4bdb305c0081acd1d53dda37a87abf313e1a816ca25bae99acbca96a69118bd50cb2454aeda6992ad9320ef346b3aeb860fde057bc1b4d8e514eb3f7b01f5f6",
  //     "hex"
  //   )
  // )
  // console.log("Transaction Hash:", tx);
  // const asyncIterable = submitClient.watchMempoolForAddress(
  //     Buffer.from(
  //     "60916c769efc6e2a3339594818a1d0c3998c29e3a6303d8711de856759",
  //     "hex"
  //   )
  // );

  // try {
  //   for await (const response of asyncIterable) {
  //     console.log("Mempool Update:", response);
  //     if (response.tx) {
  //       console.log("Transaction:", response.tx);
  //     }
  //   }
  // } catch (error) {
  //   console.error("Error while watching mempool:", error);
  // }



  // const tx: any = await submitClient.readMempool();

  // console.log(tx);
  // const params = await queryClient.readParams();

  // console.log(params);

  // const utxos = await queryClient.searchUtxosByAddress(
  //   Buffer.from(
  //     "705c87cbca3a88cbfee6f6ad820acea99f484b4830fc632610f2a30146",
  //     "hex"
  //   )
  // );
  // console.log(
  //   utxos.map((utxo) => {
  //     console.log(utxo.parsedValued?.script);
  //   })
  // );

  // let tip = syncClient.followTip([
  //   {
  //     slot: 54131816,
  //     hash: "34c65aba4b299113a488b74e2efe3a3dd272d25b470d25f374b2c693d4386535",
  //   },
  // ]);

  // for await (const event of tip) {
  //   console.log(event);
  // }
}
test().catch(console.error);
