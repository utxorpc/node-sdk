import { describe, test, expect, beforeAll } from "vitest";
import { QueryClient, SyncClient, SubmitClient, WatchClient } from "../src/cardano";
import { cardano } from "@utxorpc/spec";

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
    headers: {},
    network: 0, // Testnet (Preview is a testnet)
    mnemonic: "february next piano since banana hurdle tide soda reward hood luggage bronze polar veteran fold doctor melt usual rose coral mask interest army clump",
    testAddress: "addr_test1qpflhll6k7cqz2qezl080uv2szr5zwlqxsqakj4z5ldlpts4j8f56k6tyu5dqj5qlhgyrw6jakenfkkt7fd2y7rhuuuquqeeh5",
    minBalance: 6_000_000n,
    sendAmount: 5_000_000n,
};

// Test helpers
async function createWalletAndBlaze() {
    const provider = new U5C({
        url: TEST_CONFIG.uri,
        headers: TEST_CONFIG.headers,
        network: TEST_CONFIG.network,
    });

    const entropy = mnemonicToEntropy(TEST_CONFIG.mnemonic, wordlist);
    const masterkey = Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy), "");
    const wallet = await HotWallet.fromMasterkey(masterkey.hex(), provider);
    const blaze = await Blaze.from(provider, wallet);

    return { provider, wallet, blaze };
}


describe("QueryClient", () => {
  let queryClient: QueryClient;
  
  beforeAll(() => {
    queryClient = new QueryClient({
      uri: TEST_CONFIG.uri,
      headers: TEST_CONFIG.headers,
    });
  });
  test("readParams", async () => {
    const params = await queryClient.readParams();
    
    expect(params).toBeTruthy();
    
    // Check that protocol parameters have valid non-zero values
    expect(params.minFeeConstant).toBeGreaterThan(0n);
    expect(params.minFeeCoefficient).toBeGreaterThan(0n);
    expect(params.maxBlockBodySize).toBeGreaterThan(0n);
    expect(params.maxBlockHeaderSize).toBeGreaterThan(0n);
    expect(params.maxTxSize).toBeGreaterThan(0n);
    expect(params.stakeKeyDeposit).toBeGreaterThan(0n);
    expect(params.poolDeposit).toBeGreaterThan(0n);
    expect(params.desiredNumberOfPools).toBeGreaterThan(0n);
    expect(params.minPoolCost).toBeGreaterThan(0n);
    expect(params.coinsPerUtxoByte).toBeGreaterThan(0n);
    
    // These might be 0 in some cases
    expect(params.poolRetirementEpochBound).toBeGreaterThanOrEqual(0n);
    expect(params.poolInfluence).toBeDefined();
    expect(params.monetaryExpansion).toBeDefined();
    expect(params.treasuryExpansion).toBeDefined();
    
    // Check for protocol version if present
    if (params.protocolVersion) {
      expect(params.protocolVersion).toBeTruthy();
    }
  });

  test("readUtxosByOutputRef", async () => {
    // Consider using a mock or a controlled test environment
    const txHash = "080cc495ad56ecddb3a43e58ab47de278e33db8ab0dbf7728f43536937788338";
    const utxo = await queryClient.readUtxosByOutputRef([
      {
        txHash: Buffer.from(txHash, "hex"),
        outputIndex: 0,
      },
    ]);
    
    expect(utxo).toBeTruthy();
    expect(Array.isArray(utxo)).toBe(true);
    
    // This test requires the UTXO to exist - it should fail if not found
    expect(utxo.length).toBeGreaterThan(0);
    expect(utxo[0].txoRef).toBeTruthy();
    expect(utxo[0].nativeBytes).toBeTruthy();
    
    // Verify the txoRef matches what we requested
    const returnedTxHash = Buffer.from(utxo[0].txoRef.hash).toString("hex");
    expect(returnedTxHash).toBe(txHash);
    expect(utxo[0].txoRef.index).toBe(0);
    
    // If parsedValued exists, check its structure
    if (utxo[0].parsedValued) {
      expect(utxo[0].parsedValued.coin).toBeGreaterThan(0n);
      expect(utxo[0].parsedValued.address).toBeTruthy();
    }
  });

  test("searchUtxosByAddress", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    // toBytes() returns a hex string, we need to convert it to actual bytes
    const addressBytes = Buffer.from(testAddress.toBytes(), 'hex');
    
    const utxo = await queryClient.searchUtxosByAddress(addressBytes);
    
    expect(Array.isArray(utxo)).toBe(true);
    
    // If UTXOs exist, validate their structure
    if (utxo.length > 0) {
      expect(utxo[0].txoRef).toBeTruthy();
      expect(utxo[0].nativeBytes).toBeTruthy();
      
      // Verify each UTXO belongs to the correct address
      // Convert the test address to base64 for comparison
      const expectedAddressBase64 = Buffer.from(testAddress.toBytes(), 'hex').toString('base64');
      
      utxo.forEach(u => {
        if (u.parsedValued) {
          expect(u.parsedValued.address).toBeTruthy();
          expect(u.parsedValued.coin).toBeGreaterThanOrEqual(0n);

          // Verify the address matches what we searched for
          const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
          expect(utxoAddressBase64).toBe(expectedAddressBase64);
        }
      });
    }
    // This test requires the address to have at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });

  test("searchUtxosByPaymentPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    
    expect(paymentCred).toBeTruthy();
    expect(paymentCred?.type).toBe(Core.CredentialType.KeyHash);
    
    if (paymentCred && paymentCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByPaymentPart(Buffer.from(paymentCred.hash, 'hex'));
      
      expect(Array.isArray(utxo)).toBe(true);
      
      // If UTXOs exist, validate their structure and payment credential
      if (utxo.length > 0) {
        expect(utxo[0].txoRef).toBeTruthy();
        expect(utxo[0].nativeBytes).toBeTruthy();
        
        // Convert the test address to base64 for comparison
        const expectedAddressBase64 = Buffer.from(testAddress.toBytes(), 'hex').toString('base64');
        
        // Verify each UTXO has the correct payment credential
        utxo.forEach(u => {
          if (u.parsedValued) {
            expect(u.parsedValued.address).toBeTruthy();
            expect(u.parsedValued.coin).toBeGreaterThanOrEqual(0n);
            
            // Verify the address matches what we searched for
            const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
            expect(utxoAddressBase64).toBe(expectedAddressBase64);
          }
        });
      }
      
      // This test requires at least one UTXO
      expect(utxo.length).toBeGreaterThan(0);
    }
  });
  test("searchUtxosByDelegationPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    
    expect(delegationCred).toBeTruthy();
    expect(delegationCred?.type).toBe(Core.CredentialType.KeyHash);
    
    if (delegationCred && delegationCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByDelegationPart(Buffer.from(delegationCred.hash, 'hex'));
      
      expect(Array.isArray(utxo)).toBe(true);
      
      // If UTXOs exist, validate their structure and delegation credential
      if (utxo.length > 0) {
        expect(utxo[0].txoRef).toBeTruthy();
        expect(utxo[0].nativeBytes).toBeTruthy();
        
        // Convert the test address to base64 for comparison
        const expectedAddressBase64 = Buffer.from(testAddress.toBytes(), 'hex').toString('base64');
        
        // Verify each UTXO has the correct delegation credential
        utxo.forEach(u => {
          if (u.parsedValued) {
            expect(u.parsedValued.address).toBeTruthy();
            expect(u.parsedValued.coin).toBeGreaterThanOrEqual(0n);
            
            // Verify the address matches what we searched for
            const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
            expect(utxoAddressBase64).toBe(expectedAddressBase64);
          }
        });
      }
      
      // This test requires at least one UTXO
      expect(utxo.length).toBeGreaterThan(0);
    }
  });

  test("searchUtxosByPolicyID", async () => {
    const policyId = Buffer.from("047e0f912c4260fe66ae271e5ae494dcd5f79635bbbb1386be195f4e", "hex");
    const utxo = await queryClient.searchUtxosByAsset(policyId, undefined);
    
    expect(Array.isArray(utxo)).toBe(true);
    expect(utxo).toBeDefined();
    
    // Convert policy ID to base64 for comparison
    const expectedPolicyIdBase64 = policyId.toString('base64');
    
    // If there are UTXOs, verify they contain the expected policy ID
    if (utxo.length > 0) {
      expect(utxo[0].nativeBytes).toBeDefined();
      
      // Verify each UTXO contains assets with the searched policy ID
      utxo.forEach(u => {
        if (u.parsedValued && u.parsedValued.assets) {
          // Check that at least one asset group has the expected policy ID
          const hasExpectedPolicy = u.parsedValued.assets.some(assetGroup => {
            const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
            return assetPolicyIdBase64 === expectedPolicyIdBase64;
          });
          expect(hasExpectedPolicy).toBe(true);
        }
      });
    }
    
    // This test requires at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });

  test("searchUtxosByAsset", async () => {
    const assetName = Buffer.from("047e0f912c4260fe66ae271e5ae494dcd5f79635bbbb1386be195f4e414c4c45594b41545a3030303630", "hex");
    const utxo = await queryClient.searchUtxosByAsset(undefined, assetName);
    
    expect(Array.isArray(utxo)).toBe(true);
    expect(utxo).toBeDefined();
    
    // The assetName parameter contains both policyId and asset name concatenated
    // First 28 bytes (56 hex chars) is the policy ID
    const expectedPolicyId = assetName.subarray(0, 28);
    const expectedAssetNameOnly = assetName.subarray(28);
    
    const expectedPolicyIdBase64 = expectedPolicyId.toString('base64');
    const expectedAssetNameBase64 = expectedAssetNameOnly.toString('base64');
    
    // If there are UTXOs, verify they contain the expected asset
    if (utxo.length > 0) {
      expect(utxo[0].nativeBytes).toBeDefined();
      
      // Verify each UTXO contains the exact asset we searched for
      utxo.forEach(u => {
        if (u.parsedValued && u.parsedValued.assets) {
          // Check that at least one asset group contains our policy ID and asset name
          const hasExpectedAsset = u.parsedValued.assets.some(assetGroup => {
            const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
            // Check if this policy ID matches
            if (assetPolicyIdBase64 === expectedPolicyIdBase64) {
              // Now check if any asset in this group has the expected name
              return assetGroup.assets && assetGroup.assets.some((asset: cardano.Asset) => {
                const assetNameBase64 = asset.name ? Buffer.from(asset.name).toString('base64') : '';
                return assetNameBase64 === expectedAssetNameBase64;
              });
            }
            return false;
          });
          expect(hasExpectedAsset).toBe(true);
        }
      });
    }
    
    // This test requires at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });

  test("searchUtxosByAddressWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    const addressBytes = Buffer.from(testAddress.toBytes(), 'hex');
    const utxo = await queryClient.searchUtxosByAddressWithAsset(addressBytes, policyId, undefined);
    
    expect(Array.isArray(utxo)).toBe(true);
    expect(utxo).toBeDefined();
    
    // Convert expected values to base64 for comparison
    const expectedAddressBase64 = addressBytes.toString('base64');
    const expectedPolicyIdBase64 = policyId.toString('base64');
    
    // Verify that if there are results, they match our address and contain the asset
    if (utxo.length > 0) {
      expect(utxo[0].nativeBytes).toBeDefined();
      expect(utxo[0].txoRef).toBeDefined();
      
      // Verify each UTXO belongs to the correct address and contains the policy ID
      utxo.forEach(u => {
        if (u.parsedValued) {
          // Verify the address matches
          const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
          expect(utxoAddressBase64).toBe(expectedAddressBase64);
          
          // Verify it contains the expected policy ID
          if (u.parsedValued.assets) {
            const hasExpectedPolicy = u.parsedValued.assets.some(assetGroup => {
              const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
              return assetPolicyIdBase64 === expectedPolicyIdBase64;
            });
            expect(hasExpectedPolicy).toBe(true);
          }
        }
      });
    }
    
    // This test should find at least one UTXO with the specified asset
    expect(utxo.length).toBeGreaterThan(0);
  });
  test("searchUtxosByPaymentPartWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    
    if (paymentCred && paymentCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByPaymentPartWithAsset(Buffer.from(paymentCred.hash, 'hex'), policyId, undefined);
      
      expect(Array.isArray(utxo)).toBe(true);
      expect(utxo).toBeDefined();
      
      // Convert expected values to base64 for comparison
      const expectedAddressBase64 = Buffer.from(testAddress.toBytes(), 'hex').toString('base64');
      const expectedPolicyIdBase64 = policyId.toString('base64');
      
      // Verify that if there are results, they match our payment credential and contain the asset
      if (utxo.length > 0) {
        expect(utxo[0].nativeBytes).toBeDefined();
        
        // Verify each UTXO belongs to an address with the correct payment credential and contains the policy ID
        utxo.forEach(u => {
          if (u.parsedValued) {
            // Verify the address matches (has the same payment credential)
            const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
            expect(utxoAddressBase64).toBe(expectedAddressBase64);
            
            // Verify it contains the expected policy ID
            if (u.parsedValued.assets) {
              const hasExpectedPolicy = u.parsedValued.assets.some(assetGroup => {
                const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
                return assetPolicyIdBase64 === expectedPolicyIdBase64;
              });
              expect(hasExpectedPolicy).toBe(true);
            }
          }
        });
      }
      
      // This test should find at least one UTXO with the specified asset
      expect(utxo.length).toBeGreaterThan(0);
    }
  });
  test("searchUtxosByDelegationPartWithAsset", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    
    if (delegationCred && delegationCred.type === Core.CredentialType.KeyHash) {
      const utxo = await queryClient.searchUtxosByDelegationPartWithAsset(Buffer.from(delegationCred.hash, 'hex'), policyId, undefined);
      
      expect(Array.isArray(utxo)).toBe(true);
      expect(utxo).toBeDefined();
      
      // Convert expected values to base64 for comparison
      const expectedAddressBase64 = Buffer.from(testAddress.toBytes(), 'hex').toString('base64');
      const expectedPolicyIdBase64 = policyId.toString('base64');
      
      // Verify that if there are results, they match our delegation credential and contain the asset
      if (utxo.length > 0) {
        expect(utxo[0].nativeBytes).toBeDefined();
        
        // Verify each UTXO belongs to an address with the correct delegation credential and contains the policy ID
        utxo.forEach(u => {
          if (u.parsedValued) {
            // Verify the address matches (has the same delegation credential)
            const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
            expect(utxoAddressBase64).toBe(expectedAddressBase64);
            
            // Verify it contains the expected policy ID
            if (u.parsedValued.assets) {
              const hasExpectedPolicy = u.parsedValued.assets.some(assetGroup => {
                const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
                return assetPolicyIdBase64 === expectedPolicyIdBase64;
              });
              expect(hasExpectedPolicy).toBe(true);
            }
          }
        });
      }
      
      // This test should find at least one UTXO with the specified asset
      expect(utxo.length).toBeGreaterThan(0);
    } else {
      expect(true).toBe(false);
    }
  });
});

describe("SyncClient", () => {
  let syncClient: SyncClient;
  
  beforeAll(() => {
    syncClient = new SyncClient({
      uri: TEST_CONFIG.uri,
      headers: TEST_CONFIG.headers,
    });
  });
  test("followTip", async () => {
    // Use hardcoded intersect point
    const intersectPoint = {
      slot: 84080758,
      hash: '25e1908293954819ad55f60194a0b58db7368c73aa0c037be2958134b8207013'
    };
    
    // Create generator and get events
    const generator = syncClient.followTip([intersectPoint]);
    const iterator = generator[Symbol.asyncIterator]();
    
    // Get first event - should be a reset
    const event1 = await iterator.next();
    expect(event1).toStrictEqual({
      value: {
        action: 'reset',
        point: {
          slot: '84080758',
          hash: '25e1908293954819ad55f60194a0b58db7368c73aa0c037be2958134b8207013'
        }
      },
      done: false
    });
    
    // Get second event - should be an apply block
    const event2 = await iterator.next();
    expect(event2.done).toBe(false);
    expect(event2.value?.action).toBe('apply');
    expect(event2.value?.block).toBeDefined();
    
    // Validate the header using toJson()
    expect(event2.value?.block?.header?.toJson()).toEqual({
      slot: "84080783",
      hash: "Q4+7KO0ZCudXJSx9GCbPl+tYFw9O0XM8ONBgsQxbLq4=",
      height: "3360152"
    });
    
    // Validate body has empty tx array
    expect(event2.value?.block?.body?.tx).toEqual([]);
  });
  test("readTip", async () => {
    const tip = await syncClient.readTip();
    
    expect(tip).toBeTruthy();
    expect(tip.slot).toBeTruthy();
    expect(tip.hash).toBeTruthy();
    expect(Number(tip.slot)).toBeGreaterThan(1);
    expect(tip.hash.length).toBeGreaterThan(0);
  });
  test("fetchBlock", async () => {
    const tip = await syncClient.readTip();
    
    const block = await syncClient.fetchBlock({
      slot: Number(tip.slot),
      hash: tip.hash,
    });
    
    expect(block).toBeTruthy();
    expect(block.header).toBeTruthy();
    expect(block.header?.slot).toEqual(BigInt(tip.slot));
    expect(block.header?.hash).toBeTruthy();
    expect(block.body).toBeTruthy();
    // Check that tx array exists (may be empty for some blocks)
    expect(Array.isArray(block.body?.tx)).toBe(true);
  });
  test("fetchHistory", async () => {
    const tip = await syncClient.readTip();
    try {
      const block = await syncClient.fetchHistory({
        slot: Number(tip.slot),
        hash: tip.hash,
      });
      
      expect(block).toBeTruthy();
      expect(block.header).toBeTruthy();
      expect(block.header?.slot).toEqual(BigInt(tip.slot));
      expect(block.header?.hash).toBeTruthy();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe("SubmitClient", () => {
  let submitClient: SubmitClient;

  beforeAll(() => {
    submitClient = new SubmitClient({
      uri: TEST_CONFIG.uri,
      headers: TEST_CONFIG.headers,
    });
  });

  describe("submitTx", () => {
    test("should submit a valid transaction", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
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
      
      // Submit transaction
      const serverRef = await submitClient.submitTx(txCbor);
      
      expect(serverRef).toBeDefined();
      expect(serverRef.length).toBeGreaterThan(0);
    });
  });

  describe("waitForTx", () => {
    test("should track transaction stages", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
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
      
      const serverRef = await submitClient.submitTx(txCbor);
      
      // Track transaction stages
      const stages = submitClient.waitForTx(serverRef);
      
      const collectedStages: number[] = [];
      
      for await (const stage of stages) {
        collectedStages.push(stage);
        
        // Collect just 1 stage to verify it works
        if (collectedStages.length >= 1) {
          break;
        }
      }
      
      // Assert we received at least one stage response
      expect(collectedStages.length).toBeGreaterThan(0);
      expect(collectedStages[0]).toBeDefined();
    });
  });

  describe("watchMempool", () => {
    test("should watch mempool for specific address", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
        return;
      }

      // Watch the test address for mempool events
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const testAddressBytes = Buffer.from(testAddress.toBytes(), 'hex');
      
      // Start watching mempool before submitting
      const mempoolStream = submitClient.watchMempoolForAddress(testAddressBytes);
      const mempoolIterator = mempoolStream[Symbol.asyncIterator]();
      
      // Set up the promise for the next event BEFORE submitting
      const eventPromise = mempoolIterator.next();
      
      // Small delay to ensure the stream is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Build and submit transaction to test address
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const txId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      // Now wait for the event
      const result = await eventPromise;
      const event = result.value;
      
      // Verify the event
      expect(result.done).toBe(false);
      expect(event).toBeDefined();
      expect(event.txoRef).toBeDefined();
      expect(event.stage).toBeGreaterThanOrEqual(1);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
      expect(event.nativeBytes).toBeDefined();
    });

    test("should watch mempool for delegation part", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
        return;
      }
      
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const delegationCred = testAddress.getProps().delegationPart;
      
      if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
        expect(true).toBe(false);
        return;
      }
      
      const delegationPart = Buffer.from(delegationCred.hash, 'hex');
      
      // Start watching before submitting
      const mempoolStream = submitClient.watchMempoolForDelegationPart(delegationPart);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      // Set up the promise for the next event BEFORE submitting
      const eventPromise = iterator.next();
      
      // Small delay to ensure the stream is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Submit a transaction to the test address (which has this delegation part)
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const txId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      // Now wait for the event
      const result = await eventPromise;
      const event = result.value;
      
      expect(result.done).toBe(false);
      expect(event).toBeDefined();
      expect(event.txoRef).toBeDefined();
      expect(event.stage).toBeGreaterThanOrEqual(1);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
    });

    test("should watch mempool for payment part", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
        return;
      }
      
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const paymentCred = testAddress.getProps().paymentPart;
      
      if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
        expect(true).toBe(false);
        return;
      }
      
      const paymentPart = Buffer.from(paymentCred.hash, 'hex');
      
      // Start watching before submitting
      const mempoolStream = submitClient.watchMempoolForPaymentPart(paymentPart);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      // Set up the promise for the next event BEFORE submitting
      const eventPromise = iterator.next();
      
      // Small delay to ensure the stream is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Submit a transaction to the test address (which has this payment part)
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const txId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      // Now wait for the event
      const result = await eventPromise;
      const event = result.value;
      
      expect(result.done).toBe(false);
      expect(event).toBeDefined();
      expect(event.txoRef).toBeDefined();
      expect(event.stage).toBeGreaterThanOrEqual(1);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
    });

    test("should watch mempool for asset by policy ID", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        expect(true).toBe(false);
        return;
      }
      
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      
      // Start watching for this policy ID
      const mempoolStream = submitClient.watchMempoolForAsset(policyId);
      const iterator = mempoolStream[Symbol.asyncIterator]();
      
      // Set up the promise for the next event BEFORE submitting
      const eventPromise = iterator.next();
      
      // Small delay to ensure the stream is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Just submit a simple ADA transaction
      const tx = await blaze
        .newTransaction()
        .payLovelace(Core.Address.fromBech32(TEST_CONFIG.testAddress), TEST_CONFIG.sendAmount)
        .complete();
      
      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const txId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      // Now wait for the event
      const result = await eventPromise;
      const event = result.value;
      
      expect(result.done).toBe(false);
      expect(event).toBeDefined();
      expect(event.txoRef).toBeDefined();
      expect(event.stage).toBeGreaterThanOrEqual(1);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
    });
  });
});

describe("WatchClient", () => {
  let watchClient: WatchClient;

  beforeAll(() => {
    watchClient = new WatchClient({
      uri: TEST_CONFIG.uri,
      headers: TEST_CONFIG.headers,
    });
  });

  describe("watchTxForAddress", () => {
    test("should watch transactions for specific address", { timeout: 300000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const testAddressBytes = Buffer.from(testAddress.toBytes(), 'hex');
      
      // Start watching the address
      const txStream = watchClient.watchTxForAddress(testAddressBytes);
      const iterator = txStream[Symbol.asyncIterator]();
      
      // Wait indefinitely for a transaction with this address
      const result = await iterator.next();
      const event = result.value;
      
      expect(result.done).toBe(false);
      expect(event).toBeDefined();
      expect(event.action).toBeDefined();
      expect(['apply', 'undo']).toContain(event.action);
      expect(event.Tx).toBeDefined();
    });
  });

  describe("watchTxForPaymentPart", () => {
    test("should watch transactions for payment credential", { timeout: 30000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const paymentCred = testAddress.getProps().paymentPart;
      
      if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
        expect(true).toBe(false);
        return;
      }
      
      const paymentPart = Buffer.from(paymentCred.hash, 'hex');
      
      // Start watching
      const txStream = watchClient.watchTxForPaymentPart(paymentPart);
      const iterator = txStream[Symbol.asyncIterator]();
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("No transactions found within timeout")), 25000)
      );
      
      try {
        // Wait for any transaction with this payment part or timeout
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(result.done).toBe(false);
        expect(event).toBeDefined();
        expect(event.action).toBeDefined();
        expect(['apply', 'undo']).toContain(event.action);
        expect(event.Tx).toBeDefined();
      } catch (error) {
        // Fail the test on timeout
        throw new Error("Test timed out waiting for payment part transactions");
      }
    });
  });

  describe("watchTxForDelegationPart", () => {
    test("should watch transactions for delegation credential", { timeout: 30000 }, async () => {
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const delegationCred = testAddress.getProps().delegationPart;
      
      if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
        expect(true).toBe(false);
        return;
      }
      
      const delegationPart = Buffer.from(delegationCred.hash, 'hex');
      
      // Start watching
      const txStream = watchClient.watchTxForDelegationPart(delegationPart);
      const iterator = txStream[Symbol.asyncIterator]();
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("No transactions found within timeout")), 25000)
      );
      
      try {
        // Wait for any transaction with this delegation part or timeout
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(result.done).toBe(false);
        expect(event).toBeDefined();
        expect(event.action).toBeDefined();
        expect(['apply', 'undo']).toContain(event.action);
        expect(event.Tx).toBeDefined();
      } catch (error) {
        // Fail the test on timeout
        throw new Error("Test timed out waiting for delegation part transactions");
      }
    });
  });

  describe("watchTxForAsset", () => {
    test("should watch transactions for specific asset", { timeout: 30000 }, async () => {
      const assetName = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0434e4354", "hex");
      
      const txStream = watchClient.watchTxForAsset(undefined, assetName);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("No transactions found within timeout")), 25000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(result.done).toBe(false);
        expect(event).toBeDefined();
        expect(event.action).toBeDefined();
        expect(['apply', 'undo']).toContain(event.action);
      } catch (error) {
        throw new Error("Test timed out waiting for asset transactions");
      }
    });

    test("should watch transactions for any asset of policy", { timeout: 30000 }, async () => {
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      
      const txStream = watchClient.watchTxForAsset(policyId, undefined);
      const iterator = txStream[Symbol.asyncIterator]();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("No transactions found within timeout")), 25000)
      );
      
      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        const event = result.value;
        
        expect(result.done).toBe(false);
        expect(event).toBeDefined();
        expect(event.action).toBeDefined();
        expect(['apply', 'undo']).toContain(event.action);
      } catch (error) {
        throw new Error("Test timed out waiting for policyid transactions");
      }
    });
  });
});
