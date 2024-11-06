<div align="center">
  <h1 style="font-size: 3em;">UTxORPC SDK | Node.js 🚀</h1>
  <h4>A gRPC interface for UTxO Blockchains in Node.js</h4>
</div>

<div align="center">

  ![Forks](https://img.shields.io/github/forks/utxorpc/node-sdk.svg?style=social) 
  ![Stars](https://img.shields.io/github/stars/utxorpc/node-sdk.svg?style=social) 
  ![Contributors](https://img.shields.io/github/contributors/utxorpc/node-sdk.svg) 
  ![Issues](https://img.shields.io/github/issues/utxorpc/node-sdk.svg) 
  ![Issues Closed](https://img.shields.io/github/issues-closed/utxorpc/node-sdk.svg) 
  <a href="https://www.npmjs.com/package/@utxorpc/sdk">
    <img src="https://img.shields.io/npm/v/@utxorpc/sdk.svg" alt="NPM Package">
  </a>
</div>

The `@utxorpc/sdk` provides a Node.js interface for interacting with UTxO-based blockchains via gRPC, making it easy to fetch blocks, follow chain tips, and more. This library is designed to help developers integrate blockchain data into their applications efficiently.

### ✨ Features

- **gRPC Communication**: Utilizes **gRPC** for efficient, low-latency communication with blockchain nodes.
- **SyncClient**: Stream real-time updates as new blocks are applied, undone, or when the chain resets.
- **QueryClient**: Retrieve UTxOs and other on-chain data.
- **SubmitClient**: Submit and monitor transactions.
- **WatchClient**: Watch for specific transactions or events related to addresses, assets, and more.

### 📦 Installation

To install the SDK, use the following command in your project:

```bash
npm i @utxorpc/sdk
```

### 💻 Usage

#### `CardanoSyncClient` Example

The following example demonstrates using `CardanoSyncClient` to connect to a UTxO RPC service, fetch block data, and follow chain tips in real-time.

```javascript
import { CardanoSyncClient } from "@utxorpc/sdk";

async function test() {
  let syncClient = new CardanoSyncClient({
    uri: "http://localhost:50051", // Replace with your UTxO RPC service URL
  });

  // Follow chain tips by fetching real-time block updates
  let tip = syncClient.followTip([
    {
      slot: 54131816, // Example slot number
      hash: "34c65aba4b299113a488b74e2efe3a3dd272d25b470d25f374b2c693d4386535", // Example block hash
    },
  ]);

  for await (const event of tip) {
    console.log(event); // handle each event however you want
  }
}

test().catch(console.error);
```

### Available Clients

The SDK includes multiple clients to perform various operations:

#### 1. SyncClient

- `followTip(intersect)`: Stream blockchain updates in real-time.
- `fetchBlock(point)`: Fetch a specific block using a slot and hash.
- `fetchHistory(start, maxItems)`: Fetch historical blocks up to `maxItems`.

#### 2. QueryClient

- `readParams()`: Retrieve blockchain parameters.
- `readUtxosByOutputRef(refs)`: Get UTxOs based on specific transaction references.
- `searchUtxosByAddress(address)`: Search UTxOs by address. This also has variants like Search Utxos by Assets and more.

#### 3. SubmitClient

- `submitTx(tx)`: Submit a transaction to the blockchain.
- `waitForTx(txHash)`: Wait for a transaction’s confirmation.
- `watchMempool()`: Watch the mempool. This also has variants like Watch Mempool for Address and more.

#### 4. WatchClient

- `watchTx(intersect)`: Watch specific transactions by chain points. This also has variants like Watch Tx for Address.


### 🤝 Contributing

Contributions are welcome! To contribute, please fork the repository and submit a pull request. For major changes, open an issue first to discuss your ideas.

### 💬 Join the Community

Want to discuss UTxO RPC or get involved with the community? Join the **TxPipe Discord**! There’s a dedicated channel for UTxO RPC where you can connect with other developers, share ideas, and get support.

👉 [Join the TxPipe Discord here!](https://discord.gg/nbkJdPnKHm) 💬
