import { BlockRef } from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_pb";
import { CardanoSyncClient } from "../";

let client = new CardanoSyncClient({
  uri: "https://preview.utxorpc-v0.demeter.run/",
  headers: {
    "dmtr-api-key": "dmtr_utxorpc1rutw90zm5ucx4lg9tj56nymnq5j98zlf",
  },
});

let next_token: any = {
  hash: new Uint8Array(
    Buffer.from(
      "125ff4eb8168a03e34ed003975ed95b8844b1e751274fd5ce1b5abd8ca5b9908",
      "hex"
    )
  ),
  index: BigInt(55194964),
};

async function crawlAll() {
  while (!!next_token) {
    console.log("start");
    let chunk = await client.inner.dumpHistory({
      startToken: next_token,
      maxItems: 10,
    });

    console.log(chunk.nextToken?.index);
    next_token = chunk.nextToken;
  }
}

crawlAll().then(console.log);
