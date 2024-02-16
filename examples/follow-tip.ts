import { CardanoSyncClient } from "../";

async function test() {
  let client = new CardanoSyncClient({
    uri: "https://preview.utxorpc-v0.demeter.run",
    headers: {
      "dmtr-api-key": "dmtr_utxorpc10zrj5dglh53dn8lhgk4p2lffuuu7064j",
    },
  });

  let tip = client.followTip([
    {
      slot: 41396036,
      hash: "6ad7dd2589de22e9c18f341c66eff01ae7ca9a82726ac53e0b7bc8a628feb4d5",
    },
  ]);

  for await (const event of tip) {
    console.log(event);
  }
}

test().catch(console.error);
