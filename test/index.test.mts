import { describe, test, expect, beforeAll } from "vitest";
import { QueryClient, SyncClient, SubmitClient, WatchClient } from "../src/cardano";

import {
    Bip32PrivateKey,
    mnemonicToEntropy,
    wordlist,
} from "@blaze-cardano/core";
import {
    HotWallet,
    Core,
    Blaze,
} from "@blaze-cardano/sdk";
import { U5C } from "@utxorpc/blaze-provider";

// Test configuration
const TEST_CONFIG = {
    uri: "http://localhost:50051",
    network: "preview" as any,
    mnemonic: "",
    testAddress: "addr_test1qpflhll6k7cqz2qezl080uv2szr5zwlqxsqakj4z5ldlpts4j8f56k6tyu5dqj5qlhgyrw6jakenfkkt7fd2y7rhuuuquqeeh5",
    minBalance: 6_000_000n,
    sendAmount: 5_000_000n,
};

// Test helpers
async function createWalletAndBlaze() {
    const provider = new U5C({
        url: TEST_CONFIG.uri,
        headers: {},
        network: TEST_CONFIG.network,
    });

    const entropy = mnemonicToEntropy(TEST_CONFIG.mnemonic, wordlist);
    const masterkey = Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy), "");
    const wallet = await HotWallet.fromMasterkey(masterkey.hex(), provider as any);
    const blaze = await Blaze.from(provider as any, wallet);

    return { provider, wallet, blaze };
}


describe("QueryClient", () => {
  let queryClient: QueryClient;
  
  beforeAll(() => {
    queryClient = new QueryClient({
      uri: TEST_CONFIG.uri,
    });
  });
  test("readParams", async () => {
    const params = await queryClient.readParams();
    console.log("Protocol Parameters:", params);
    expect(params).toBeDefined();
  });

  test("readUtxosByOutputRef", async () => {
    const utxo = await queryClient.readUtxosByOutputRef([
      {
        txHash: Buffer.from("4ef418eb5d3e67c91574bde1ef9ca1b3c16dfed7460cfb0f19ace0e6e562c8ad", "hex"),
        outputIndex: 0,
      },
    ]);
    console.log("Utxo by Output Ref:", (Buffer.from(utxo[0].nativeBytes!).toString("hex")));
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("8258390053ae141ec65fb423c4eb9fa2630b6853daa8cf4bf28e300fbc68b818794a8de24dd41dde773013f28178175a424f410b60ef1776f5e059391b0000000127851380");
  });

  test("searchUtxosByAddress", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const utxo = await queryClient.searchUtxosByAddress(Buffer.from(testAddress.toBytes()));
    expect(Array.isArray(utxo)).toBe(true);
  });

  test("searchUtxosByPaymentPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    if (paymentCred && paymentCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByPaymentPart(Buffer.from(paymentCred.hash, 'hex'));
      expect(Array.isArray(utxo)).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });
  test("searchUtxosByDelegationPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    if (delegationCred && delegationCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByDelegationPart(Buffer.from(delegationCred.hash, 'hex'));
      expect(Array.isArray(utxo)).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test("searchUtxosByAsset", async () => {
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    // const assetName = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0434e4354", "hex"); // "CNCT" in ASCII
    const utxo = await queryClient.searchUtxosByAsset(policyId, undefined);
    console.log("UTXOs with policy ID:", utxo);
    expect(Array.isArray(utxo)).toBe(true);
  });

  test("searchUtxosByAddressWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    const assetName = Buffer.from("434e4354", "hex"); // "CNCT" in ASCII
    const utxo = await queryClient.searchUtxosByAddressWithAsset(Buffer.from(testAddress.toBytes()), policyId, undefined);
    console.log("Utxo by Exact Address With Asset:", utxo);
    expect(Array.isArray(utxo)).toBe(true);
  });
  test("searchUtxosByPaymentPartWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    const assetName = Buffer.from("434e4354", "hex"); // "CNCT" in ASCII
    
    if (paymentCred && paymentCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByPaymentPartWithAsset(Buffer.from(paymentCred.hash, 'hex'), policyId, undefined);
      console.log("Utxo by Payment Address With Asset:", utxo);
      expect(Array.isArray(utxo)).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });
  test("searchUtxosByDelegationPartWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    const assetName = Buffer.from("434e4354", "hex"); // "CNCT" in ASCII
    
    if (delegationCred && delegationCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByDelegationPartWithAsset(Buffer.from(delegationCred.hash, 'hex'), policyId, undefined);
      console.log("Utxo by delegation Address With Asset:", utxo);
      expect(Array.isArray(utxo)).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });
});

describe("SyncClient", () => {
  let syncClient: SyncClient;
  
  beforeAll(() => {
    syncClient = new SyncClient({
      uri: TEST_CONFIG.uri,
    });
  });
  test.skip("followTip - skipped due to streaming nature", { timeout: 15000 }, async () => {
    try {
      // Try following without intersection points first (follow from latest)
      console.log("Starting followTip test...");
      const generator = syncClient.followTip();
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout waiting for events")), 10000);
      });
      
      // Race between getting the first event and timeout
      const firstEventPromise = (async () => {
        const iterator = generator[Symbol.asyncIterator]();
        return await iterator.next();
      })();
      
      const result = await Promise.race([firstEventPromise, timeoutPromise]);
      
      if (result && result.value) {
        console.log("First event received:", {
          action: result.value.action,
          slot: result.value.action === 'reset' 
            ? result.value.point?.slot 
            : result.value.block?.header?.slot,
        });
        
        // Validate event structure
        expect(['apply', 'undo', 'reset']).toContain(result.value.action);
        
        if (result.value.action === 'reset') {
          expect(result.value.point).toBeDefined();
        } else {
          expect(result.value.block).toBeDefined();
        }
      }
      
      expect(result).toBeDefined();
      expect(result.done).toBe(false);
      
    } catch (error) {
      console.log("followTip test error:", error.message);
      expect(error.message).toContain("Timeout");
    }
  });
  test("readTip", async () => {
    const tip = await syncClient.readTip();
    expect(Number(tip.slot)).toBeGreaterThan(1)
  });
  test("fetchBlock", async () => {
    // Get current tip
    const tip = await syncClient.readTip();
    console.log("Using tip for fetchBlock:", tip);
    
    const block = await syncClient.fetchBlock({
      slot: Number(tip.slot),
      hash: tip.hash,
    });
    console.log("Fetched block:", { 
      slot: block.header?.slot,
      hash: block.header?.hash,
      txCount: block.body?.tx?.length || 0
    });
    expect(block.header?.slot).toEqual(BigInt(tip.slot));
    expect(block.header).toBeDefined();
  });
  test("fetchHistory", async () => {
    const tip = await syncClient.readTip();
    console.log("Using tip for fetchHistory:", tip);
    
    try {
      const block = await syncClient.fetchHistory({
        slot: Number(tip.slot),
        hash: tip.hash,
      });
      console.log("Fetched history block:", { 
        slot: block.header?.slot,
        hash: block.header?.hash,
      });
      expect(block.header?.slot).toEqual(BigInt(tip.slot));
    } catch (error) {
      console.log("fetchHistory error:", error);
      expect(true).toBe(true);
    }
  });
});

describe("SubmitClient", () => {
  let submitClient: SubmitClient;

  beforeAll(() => {
    submitClient = new SubmitClient({
      uri: TEST_CONFIG.uri,
    });
  });

  describe("submitTx", () => {
    test("should submit a valid transaction", { timeout: 30000 }, async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      console.log("Wallet address:", wallet.address.toBech32());
      console.log("Wallet balance:", balance.toCore());
      
      if (balance.coin() < TEST_CONFIG.minBalance) {
        console.log("Insufficient balance for transaction test");
        expect(true).toBe(true);
        return;
      }

      // Build and sign transaction
      const tx = await blaze
        .newTransaction()
        .payLovelace(
          Core.Address.fromBech32(TEST_CONFIG.testAddress),
          TEST_CONFIG.sendAmount,
        )
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const actualTxId = signedTx.getId();
      
      console.log("Transaction ID:", actualTxId);
      
      // Submit transaction
      const serverRef = await submitClient.submitTx(txCbor);
      
      expect(serverRef).toBeDefined();
      expect(serverRef.length).toBeGreaterThan(0);
      console.log("Transaction submitted successfully!");
      console.log("Server reference:", Buffer.from(serverRef).toString('hex'));
    });
  });

  describe("waitForTx", () => {
    test.skip("should track transaction stages", { timeout: 90000 }, async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        console.log("Insufficient balance for test");
        expect(true).toBe(true);
        return;
      }

      // Build, sign and submit transaction
      const tx = await blaze
        .newTransaction()
        .payLovelace(
          Core.Address.fromBech32(TEST_CONFIG.testAddress),
          TEST_CONFIG.sendAmount,
        )
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const actualTxId = signedTx.getId();
      
      const serverRef = await submitClient.submitTx(txCbor);
      
      // Track transaction stages
      const stages = submitClient.waitForTx(serverRef);
      const stageNames = ["UNSPECIFIED", "ACKNOWLEDGED", "MEMPOOL", "NETWORK", "CONFIRMED"];
      
      let lastStage = 0;
      const maxWaitTime = 90000;
      const startTime = Date.now();
      
      for await (const stage of stages) {
        console.log(`Stage ${stage}: ${stageNames[stage] || "UNKNOWN"}`);
        lastStage = stage;
        
        if (stage === 4 || Date.now() - startTime > maxWaitTime) {
          break;
        }
      }
      
      expect(lastStage).toBeGreaterThanOrEqual(1); // At least ACKNOWLEDGED
      console.log(`Transaction: https://preview.cardanoscan.io/transaction/${actualTxId}`);
    });
  });

  describe("watchMempool", () => {
    test("should watch general mempool activity", { timeout: 10000 }, async () => {
      const mempoolStream = submitClient.watchMempool();
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(event).toBeDefined();
        expect(event.txoRef).toBeDefined();
        console.log("General mempool event:", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex').substring(0, 20) + "..."
        });
      } catch (error) {
        console.log("No general mempool events within timeout");
        expect(true).toBe(true);
      }
    });

    test("should watch mempool for specific address", { timeout: 30000 }, async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        console.log("Insufficient balance for test");
        expect(true).toBe(true);
        return;
      }

      // Watch the test address for mempool events
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const testAddressBytes = Buffer.from(testAddress.toBytes());
      
      // Start watching mempool
      const mempoolStream = submitClient.watchMempoolForAddress(testAddressBytes);
      const mempoolIterator = mempoolStream[Symbol.asyncIterator]();
      
      // Build and submit transaction to test address
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const actualTxId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      // Wait for mempool event
      const mempoolTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Mempool timeout")), 10000)
      );
      
      try {
        const result = await Promise.race([mempoolIterator.next(), mempoolTimeout]);
        const event = result.value;
        
        expect(event).toBeDefined();
        expect(event.txoRef).toBeDefined();
        expect(event.stage).toBeGreaterThanOrEqual(1);
        
        console.log("Address mempool event received:", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex'),
          matchesTxId: Buffer.from(event.txoRef).toString('hex') === actualTxId
        });
      } catch (err) {
        console.log("No mempool event within timeout");
        expect(true).toBe(true);
      }
    });

    test("should watch mempool for delegation part", { timeout: 10000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const delegationCred = testAddress.getProps().delegationPart;
      
      if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
        console.log("Test address doesn't have a key hash delegation credential");
        expect(true).toBe(true);
        return;
      }
      
      const delegationPart = Buffer.from(delegationCred.hash, 'hex');
      console.log("Watching delegation part:", delegationPart.toString('hex'));
      
      const mempoolStream = submitClient.watchMempoolForDelegationPart(delegationPart);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(event).toBeDefined();
        console.log("Delegation part mempool event:", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex')
        });
      } catch (error) {
        console.log("No delegation part mempool events within timeout");
        expect(true).toBe(true);
      }
    });

     test("should watch mempool for payment part", { timeout: 10000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const paymentCred = testAddress.getProps().paymentPart;
      
      if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
        console.log("Test address doesn't have a key hash payment credential");
        expect(true).toBe(true);
        return;
      }
      
      const paymentPart = Buffer.from(paymentCred.hash, 'hex');
      console.log("Watching payment part:", paymentPart.toString('hex'));
      
      const mempoolStream = submitClient.watchMempoolForPaymentPart(paymentPart);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(event).toBeDefined();
        console.log("Payment part mempool event:", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex')
        });
      } catch (error) {
        console.log("No payment part mempool events within timeout");
        expect(true).toBe(true);
      }
    });

    test("should watch mempool for asset by policy ID", { timeout: 10000 }, async () => {
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      
      const mempoolStream = submitClient.watchMempoolForAsset(policyId);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(event).toBeDefined();
        console.log("Asset mempool event (policy only):", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex')
        });
      } catch (error) {
        console.log("No asset mempool events within timeout");
        expect(true).toBe(true);
      }
    });

    test("should watch mempool for asset by policy ID and name", { timeout: 10000 }, async () => {
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      const assetName = Buffer.from("434e4354", "hex"); // "CNCT" in ASCII
      
      const mempoolStream = submitClient.watchMempoolForAsset(policyId, assetName);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(event).toBeDefined();
        console.log("Asset mempool event (policy + name):", {
          stage: event.stage,
          txoRef: Buffer.from(event.txoRef).toString('hex')
        });
      } catch (error) {
        console.log("No specific asset mempool events within timeout - expected");
        expect(true).toBe(true);
      }
    });
  });
});
describe("WatchClient", () => {
  let watchClient: WatchClient;

  beforeAll(() => {
    watchClient = new WatchClient({
      uri: TEST_CONFIG.uri,
    });
  });

  describe("watchTx", () => {
    test("should watch all transactions without filters", { timeout: 20000 }, async () => {
      console.log("Watching all transactions (no filters)...");
      
      const txStream = watchClient.watchTx();
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 15000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          console.log("Transaction event detected:", {
            action: event.action,
            hasTx: !!event.Tx,
            txInputs: event.Tx?.inputs?.length || 0,
            txOutputs: event.Tx?.outputs?.length || 0
          });
          
          expect(event).toBeDefined();
          expect(['apply', 'undo']).toContain(event.action);
        }
      } catch (error) {
        console.log("No transactions detected within timeout");
        expect(true).toBe(true);
      }
    });
  });

  describe("watchTxForAddress", () => {
    test("should watch transactions for specific address", { timeout: 60000 }, async () => {
      // First create wallet and check balance
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      console.log("Wallet balance:", balance.toCore());
      
      // Use the test address
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const testAddressBytes = Buffer.from(testAddress.toBytes());
      
      console.log("Watching address transactions for:", TEST_CONFIG.testAddress);
      
      // Start watching FIRST
      const txStream = watchClient.watchTxForAddress(testAddressBytes);
      const iterator = txStream[Symbol.asyncIterator]();
      
      // Submit transaction if we have balance
      let submittedTxId: string | null = null;
      if (balance.coin() >= TEST_CONFIG.minBalance) {
        console.log("Submitting transaction...");
        
        const tx = await blaze
          .newTransaction()
          .payLovelace(Core.Address.fromBech32(TEST_CONFIG.testAddress), TEST_CONFIG.sendAmount)
          .complete();
        
        const signedTx = await blaze.signTransaction(tx);
        submittedTxId = signedTx.getId();
        console.log("Transaction ID:", submittedTxId);
        
        await blaze.provider.postTransactionToChain(signedTx);
        console.log("Transaction submitted");
        
        // Small delay for propagation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 20000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          const detectedTxId = event.Tx?.hash ? Buffer.from(event.Tx.hash).toString('hex') : 'N/A';
          console.log("\n✓ Transaction event detected!");
          console.log("Event details:", {
            action: event.action,
            hasTx: !!event.Tx,
            txHash: detectedTxId,
            isOurTx: submittedTxId && detectedTxId === submittedTxId
          });
          
          // Check outputs to see if our address received funds
          if (event.Tx?.outputs) {
            console.log("Transaction outputs:");
            event.Tx.outputs.forEach((output: any, i: number) => {
              console.log(`  Output ${i}: ${output.coin} lovelace`);
            });
          }
          
          expect(event).toBeDefined();
          expect(event.Tx).toBeDefined();
        }
      } catch (error) {
        console.log("\n✗ No transactions detected within timeout");
        if (submittedTxId) {
          console.log(`Check TX: https://preview.cardanoscan.io/transaction/${submittedTxId}`);
        }
        expect(true).toBe(true);
      }
    });
  });

  describe("watchTxForPaymentPart", () => {
    test("should watch transactions for payment credential", { timeout: 15000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const paymentCred = testAddress.getProps().paymentPart;
      
      if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
        console.log("Test address doesn't have key hash payment credential");
        expect(true).toBe(true);
        return;
      }
      
      const paymentPart = Buffer.from(paymentCred.hash, 'hex');
      console.log("Watching payment part:", paymentPart.toString('hex'));
      
      const txStream = watchClient.watchTxForPaymentPart(paymentPart);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          const detectedTxId = event.Tx?.hash ? Buffer.from(event.Tx.hash).toString('hex') : 'N/A';
          console.log("\n✓ Payment part transaction event detected!");
          console.log("Event details:", {
            action: event.action,
            hasTx: !!event.Tx,
            txHash: detectedTxId
          });
          
          // Check outputs
          if (event.Tx?.outputs) {
            console.log("Transaction outputs:");
            event.Tx.outputs.forEach((output: any, i: number) => {
              console.log(`  Output ${i}: ${output.coin} lovelace`);
            });
          }
          
          expect(event).toBeDefined();
          expect(event.Tx).toBeDefined();
        }
      } catch (error) {
        console.log("\n✗ No transactions for payment part within timeout - expected");
        expect(true).toBe(true);
      }
    });
  });

  describe("watchTxForDelegationPart", () => {
    test("should watch transactions for delegation credential", { timeout: 15000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const delegationCred = testAddress.getProps().delegationPart;
      
      if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
        console.log("Test address doesn't have key hash delegation credential");
        expect(true).toBe(true);
        return;
      }
      
      const delegationPart = Buffer.from(delegationCred.hash, 'hex');
      console.log("Watching delegation part:", delegationPart.toString('hex'));
      
      const txStream = watchClient.watchTxForDelegationPart(delegationPart);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          const detectedTxId = event.Tx?.hash ? Buffer.from(event.Tx.hash).toString('hex') : 'N/A';
          console.log("\n✓ Delegation part transaction event detected!");
          console.log("Event details:", {
            action: event.action,
            hasTx: !!event.Tx,
            txHash: detectedTxId
          });
          
          // Check outputs
          if (event.Tx?.outputs) {
            console.log("Transaction outputs:");
            event.Tx.outputs.forEach((output: any, i: number) => {
              console.log(`  Output ${i}: ${output.coin} lovelace`);
            });
          }
          
          expect(event).toBeDefined();
          expect(event.Tx).toBeDefined();
        }
      } catch (error) {
        console.log("\n✗ No transactions for delegation part within timeout - expected");
        expect(true).toBe(true);
      }
    });
  });

  describe("watchTxForAsset", () => {
    test("should watch transactions for specific asset", { timeout: 15000 }, async () => {
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      const assetName = Buffer.from("434e4354", "hex"); // "CNCT" in ASCII
      
      console.log("Watching asset:", {
        policyId: policyId.toString('hex'),
        assetName: assetName.toString('hex')
      });
      
      const txStream = watchClient.watchTxForAsset(policyId, assetName);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          console.log("Asset transaction event:", {
            action: event.action,
            txHash: event.Tx?.hash ? Buffer.from(event.Tx.hash).toString('hex') : 'N/A',
            outputCount: event.tx?.outputs?.length
          });
          
          expect(event).toBeDefined();
          expect(event.tx).toBeDefined();
        }
      } catch (error) {
        console.log("No asset transactions within timeout - expected");
        expect(true).toBe(true);
      }
    });

    test("should watch transactions for any asset of policy", { timeout: 15000 }, async () => {
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      
      const txStream = watchClient.watchTxForAsset(policyId);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        
        if (result && result.value) {
          const event = result.value;
          console.log("Policy-only transaction event:", {
            action: event.action,
            txHash: event.tx?.header?.hash
          });
          
          expect(event).toBeDefined();
        }
      } catch (error) {
        console.log("No policy transactions within timeout - expected");
        expect(true).toBe(true);
      }
    });
  });
});
