import { CardanoSyncClient } from "../src/index.js";

async function test() {
  let client = new CardanoSyncClient({
    uri: "http://localhost:50051",
  });

  let tip = client.followTip([
    {
      slot: 54131816,
      hash: "34c65aba4b299113a488b74e2efe3a3dd272d25b470d25f374b2c693d4386535",
    },
  ]);

  for await (const event of tip) {
    console.log(event);
  }
}
test().catch(console.error);