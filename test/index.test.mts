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
    expect(params).toEqual({
      coinsPerUtxoByte: 4310n,
      maxTxSize: 16384n,
      minFeeCoefficient: 44n,
      minFeeConstant: 155381n,
      maxBlockBodySize: 90112n,
      maxBlockHeaderSize: 1100n,
      stakeKeyDeposit: 2000000n,
      poolDeposit: 500000000n,
      poolRetirementEpochBound: 0n,
      desiredNumberOfPools: 500n,
      minPoolCost: 170000000n,
      maxValueSize: 5000n,
      collateralPercentage: 150n,
      maxCollateralInputs: 3n,
      minCommitteeSize: 0,
      poolInfluence: {
        numerator: 5033165,
        denominator: 16777216
      },
      monetaryExpansion: {
        numerator: 6442451,
        denominator: 2147483648
      },
      treasuryExpansion: {
        numerator: 13421773,
        denominator: 67108864
      },
      protocolVersion: {
        major: 9,
        minor: 0
      },
      prices: {
        steps: {
          numerator: 721,
          denominator: 10000000
        },
        memory: {
          numerator: 577,
          denominator: 10000
        }
      },
      maxExecutionUnitsPerTransaction: {
        steps: 10000000000n,
        memory: 14000000n
      },
      maxExecutionUnitsPerBlock: {
        steps: 20000000000n,
        memory: 62000000n
      },
      minFeeScriptRefCostPerByte: {
        numerator: 15,
        denominator: 1
      },
      poolVotingThresholds: {
        thresholds: [
          { numerator: 51, denominator: 100 },
          { numerator: 51, denominator: 100 },
          { numerator: 51, denominator: 100 },
          { numerator: 51, denominator: 100 },
          { numerator: 51, denominator: 100 }
        ]
      },
      drepVotingThresholds: {
        thresholds: [
          { numerator: 67, denominator: 100 },
          { numerator: 67, denominator: 100 },
          { numerator: 3, denominator: 5 },
          { numerator: 3, denominator: 4 },
          { numerator: 3, denominator: 5 },
          { numerator: 67, denominator: 100 },
          { numerator: 67, denominator: 100 },
          { numerator: 67, denominator: 100 },
          { numerator: 3, denominator: 4 },
          { numerator: 67, denominator: 100 }
        ]
      },
      committeeTermLimit: 365n,
      governanceActionValidityPeriod: 30n,
      governanceActionDeposit: 100000000000n,
      drepDeposit: 500000000n,
      drepInactivityPeriod: 20n,
      costModels: expect.objectContaining({
        plutusV1: expect.objectContaining({
          values: expect.arrayContaining([100788n, 420n, 1n, 1n, 1000n])
        }),
        plutusV2: expect.objectContaining({
          values: expect.arrayContaining([100788n, 420n, 1n, 1n, 1000n])
        }),
        plutusV3: expect.objectContaining({
          values: expect.arrayContaining([100788n, 420n, 1n, 1n, 1000n])
        })
      })
    });
  });

  test("readUtxosByOutputRef", async () => {
    const utxo = await queryClient.readUtxosByOutputRef([
      {
        txHash: Buffer.from("9874bdf4ad47b2d30a2146fc4ba1f94859e58e772683e75001aca6e85de7690d", "hex"),
        outputIndex: 0,
      },
    ]);
    expect(Array.isArray(utxo)).toBe(true);
    expect(utxo).toHaveLength(1);
    expect(Buffer.from(utxo[0].nativeBytes!).toString("hex")).toEqual("82583900729c67d0de8cde3c0afc768fb0fcb1596e8cfcbf781b553efcd228813b7bb577937983e016d4e8429ff48cf386d6818883f9e88b62a804e01a05f5e100");
  });

  test("searchUtxosByAddress", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const addressBytes = Buffer.from(testAddress.toBytes(), 'hex');
    
    const utxo = await queryClient.searchUtxosByAddress(addressBytes);
    
    expect(Array.isArray(utxo)).toBe(true);
    
    // Convert expected address to base64 for comparison
    const expectedAddressBase64 = addressBytes.toString('base64');
    
    // If there are UTXOs, verify they belong to the searched address
    if (utxo.length > 0) {
      // Verify each UTXO belongs to the correct address
      utxo.forEach(u => {
        if (u.parsedValued) {
          const utxoAddressBase64 = Buffer.from(u.parsedValued.address).toString('base64');
          expect(utxoAddressBase64).toBe(expectedAddressBase64);
        }
      });
    }
    
    // This test requires at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });

  test("searchUtxosByPaymentPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    
    const utxo = await queryClient.searchUtxosByPaymentPart(Buffer.from(paymentCred!.hash, 'hex'));
    
    expect(Array.isArray(utxo)).toBe(true);
    
    // If there are UTXOs, verify they contain the expected payment credential
    if (utxo.length > 0) {
      // Verify each UTXO has the correct payment credential
      utxo.forEach(u => {
        if (u.parsedValued) {
          const utxoAddress = Core.Address.fromBytes(Buffer.from(u.parsedValued.address).toString('hex') as Core.HexBlob);
          const utxoPaymentCred = utxoAddress.getProps().paymentPart;
          expect(utxoPaymentCred?.hash).toBe(paymentCred!.hash);
        }
      });
    }
    
    // This test requires at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });
  test("searchUtxosByDelegationPart", async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    
    const utxo = await queryClient.searchUtxosByDelegationPart(Buffer.from(delegationCred!.hash, 'hex'));
    
    expect(Array.isArray(utxo)).toBe(true);
    
    // If there are UTXOs, verify they contain the expected delegation credential
    if (utxo.length > 0) {
      // Verify each UTXO has the correct delegation credential
      utxo.forEach(u => {
        if (u.parsedValued) {
          const utxoAddress = Core.Address.fromBytes(Buffer.from(u.parsedValued.address).toString('hex') as Core.HexBlob);
          const utxoDelegationCred = utxoAddress.getProps().delegationPart;
          expect(utxoDelegationCred?.hash).toBe(delegationCred!.hash);
        }
      });
    }
    
    // This test requires at least one UTXO
    expect(utxo.length).toBeGreaterThan(0);
  });

  test("searchUtxosByPolicyID", async () => {
    const policyId = Buffer.from("047e0f912c4260fe66ae271e5ae494dcd5f79635bbbb1386be195f4e", "hex");
    const utxo = await queryClient.searchUtxosByAsset(policyId, undefined);
    
    expect(Array.isArray(utxo)).toBe(true);

    // Convert policy ID to base64 for comparison
    const expectedPolicyIdBase64 = policyId.toString('base64');
    
    // If there are UTXOs, verify they contain the expected policy ID
    if (utxo.length > 0) {
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
    
    // The assetName parameter contains both policyId and asset name concatenated
    // First 28 bytes (56 hex chars) is the policy ID
    const expectedPolicyId = assetName.subarray(0, 28);
    const expectedAssetNameOnly = assetName.subarray(28);
    
    const expectedPolicyIdBase64 = expectedPolicyId.toString('base64');
    const expectedAssetNameBase64 = expectedAssetNameOnly.toString('base64');
    
    // If there are UTXOs, verify they contain the expected asset
    if (utxo.length > 0) {
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
    
    // Convert expected values to base64 for comparison
    const expectedAddressBase64 = addressBytes.toString('base64');
    const expectedPolicyIdBase64 = policyId.toString('base64');
    
    // Verify that if there are results, they match our address and contain the asset
    if (utxo.length > 0) {
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
      
      // Convert expected policy ID to base64 for comparison
      const expectedPolicyIdBase64 = policyId.toString('base64');
      
      // Verify that if there are results, they match our payment credential and contain the asset
      if (utxo.length > 0) {
        // Verify each UTXO belongs to an address with the correct payment credential and contains the policy ID
        utxo.forEach(u => {
          if (u.parsedValued) {
            // Verify the address has the correct payment credential
            const utxoAddress = Core.Address.fromBytes(Buffer.from(u.parsedValued.address).toString('hex') as Core.HexBlob);
            const utxoPaymentCred = utxoAddress.getProps().paymentPart;
            expect(utxoPaymentCred?.hash).toBe(paymentCred.hash);
            
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
      
      // Convert expected policy ID to base64 for comparison
      const expectedPolicyIdBase64 = policyId.toString('base64');
      
      // Verify that if there are results, they match our delegation credential and contain the asset
      if (utxo.length > 0) {
        // Verify each UTXO belongs to an address with the correct delegation credential and contains the policy ID
        utxo.forEach(u => {
          if (u.parsedValued) {
            // Verify the address has the correct delegation credential
            const utxoAddress = Core.Address.fromBytes(Buffer.from(u.parsedValued.address).toString('hex') as Core.HexBlob);
            const utxoDelegationCred = utxoAddress.getProps().delegationPart;
            expect(utxoDelegationCred?.hash).toBe(delegationCred.hash);
            
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
    const generator = syncClient.followTip([{
      slot: 84194200,
      hash: '6d1b288746ce3be63dcf68af9783282a0795c4d22eda4f5daef195f6034ccfc4'
    }]);
    const iterator = generator[Symbol.asyncIterator]();
    
    const block1 = await iterator.next();
    expect(block1).toStrictEqual({
      value: {
        action: 'reset',
        point: {
          slot: '84194200',
          hash: '6d1b288746ce3be63dcf68af9783282a0795c4d22eda4f5daef195f6034ccfc4'
        }
      },
      done: false
    });
    
    const block2 = await iterator.next();
    expect({ 
      body: block2.value?.block?.body?.toJson(), 
      header: block2.value?.block?.header?.toJson() 
    }).toEqual({
      body: {
        tx: expect.any(Array)
      },
      header: {
        slot: "84194236",
        hash: "YnWDAE3Iqov4xIvPAwBwxxKwhIOUOlTNWReYzsil+bA=",
        height: "3363968"
      }
    });
  });
  test("readTip", async () => {
    const tip = await syncClient.readTip();
    
    expect(typeof tip.slot).toBe('string');
    expect(typeof tip.hash).toBe('string');
    expect(Number(tip.slot)).toBeGreaterThan(1);
    expect(tip.hash.length).toBeGreaterThan(0);
  });
  test("fetchBlock", async () => {
    const block = await syncClient.fetchBlock({
      slot: 84194200,
      hash: '6d1b288746ce3be63dcf68af9783282a0795c4d22eda4f5daef195f6034ccfc4',
    });
    
    expect({ 
      body: block.body?.toJson(), 
      header: block.header?.toJson() 
    }).toEqual({
      body: {},
      header: {
        slot: "84194200",
        hash: "bRsoh0bOO+Y9z2ivl4MoKgeVxNIu2k9drvGV9gNMz8Q=",
        height: "3363967"
      }
    });
  });
  test("fetchHistory", async () => {
    const block = await syncClient.fetchHistory({
      slot: 84194200,
      hash: '6d1b288746ce3be63dcf68af9783282a0795c4d22eda4f5daef195f6034ccfc4',
    });
    
    expect({ 
      body: block.body?.toJson(), 
      header: block.header?.toJson() 
    }).toEqual({
      body: {},
      header: {
        slot: "84194200",
        hash: "bRsoh0bOO+Y9z2ivl4MoKgeVxNIu2k9drvGV9gNMz8Q=",
        height: "3363967"
      }
    });
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

  test("submitTx", async () => {
    const { wallet, blaze } = await createWalletAndBlaze();
    
    const balance = await wallet.getBalance();
    if (balance.coin() < TEST_CONFIG.minBalance) {
      throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
    }

    const tx = await blaze
      .newTransaction()
      .payLovelace(
        Core.Address.fromBech32(TEST_CONFIG.testAddress),
        TEST_CONFIG.sendAmount,
      )
      .complete();

    const signedTx = await blaze.signTransaction(tx);
    const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
    const txId = signedTx.getId();
    
    const serverRef = await submitClient.submitTx(txCbor);
    
    expect(serverRef instanceof Uint8Array).toBe(true);
    expect(serverRef.length).toBe(32);
    expect(Buffer.from(serverRef).toString('hex')).toBe(txId);
  });

  test("waitForTx", async () => {
    const { wallet, blaze } = await createWalletAndBlaze();
    
    const balance = await wallet.getBalance();
    if (balance.coin() < TEST_CONFIG.minBalance) {
      throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
    }

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
    
    const stages = submitClient.waitForTx(serverRef);
    const iterator = stages[Symbol.asyncIterator]();
    
    const { value: firstStage, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(typeof firstStage).toBe('number');
    expect(firstStage).toBeGreaterThanOrEqual(1);
  });

  describe("watchMempool", () => {
    test("watchMempoolForAddress", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
      }

      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const testAddressBytes = Buffer.from(testAddress.toBytes(), 'hex');
      
      const mempoolStream = submitClient.watchMempoolForAddress(testAddressBytes);
      const eventPromise = mempoolStream[Symbol.asyncIterator]().next();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txId = signedTx.getId();
      
      await submitClient.submitTx(Buffer.from(signedTx.toCbor(), 'hex'));
      
      const { value: event, done } = await eventPromise;
      
      expect(done).toBe(false);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
      expect(event.stage).toBeGreaterThanOrEqual(1);
    });

    test("watchMempoolForDelegationPart", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
      }
      
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const delegationCred = testAddress.getProps().delegationPart;
      
      if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
        throw new Error("Test address missing delegation credential");
      }
      
      const delegationPart = Buffer.from(delegationCred.hash, 'hex');
      
      const mempoolStream = submitClient.watchMempoolForDelegationPart(delegationPart);
      const eventPromise = mempoolStream[Symbol.asyncIterator]().next();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txId = signedTx.getId();
      
      await submitClient.submitTx(Buffer.from(signedTx.toCbor(), 'hex'));
      
      const { value: event, done } = await eventPromise;
      
      expect(done).toBe(false);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
      expect(event.stage).toBeGreaterThanOrEqual(1);
    });

    test("watchMempoolForPaymentPart", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
      }
      
      const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
      const paymentCred = testAddress.getProps().paymentPart;
      
      if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
        throw new Error("Test address missing payment credential");
      }
      
      const paymentPart = Buffer.from(paymentCred.hash, 'hex');
      
      const mempoolStream = submitClient.watchMempoolForPaymentPart(paymentPart);
      const eventPromise = mempoolStream[Symbol.asyncIterator]().next();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tx = await blaze
        .newTransaction()
        .payLovelace(testAddress, TEST_CONFIG.sendAmount)
        .complete();

      const signedTx = await blaze.signTransaction(tx);
      const txId = signedTx.getId();
      
      await submitClient.submitTx(Buffer.from(signedTx.toCbor(), 'hex'));
      
      const { value: event, done } = await eventPromise;
      
      expect(done).toBe(false);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
      expect(event.stage).toBeGreaterThanOrEqual(1);
    });

    test("watchMempoolForAsset", async () => {
      const { wallet, blaze } = await createWalletAndBlaze();
      
      const balance = await wallet.getBalance();
      if (balance.coin() < TEST_CONFIG.minBalance) {
        throw new Error(`Insufficient balance: ${balance.coin()} < ${TEST_CONFIG.minBalance}`);
      }
      
      const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
      const mempoolStream = submitClient.watchMempoolForAsset(policyId);
      const eventPromise = mempoolStream[Symbol.asyncIterator]().next();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tx = await blaze
        .newTransaction()
        .payLovelace(Core.Address.fromBech32(TEST_CONFIG.testAddress), TEST_CONFIG.sendAmount)
        .complete();
      
      const signedTx = await blaze.signTransaction(tx);
      const txCbor = Buffer.from(signedTx.toCbor(), 'hex');
      const txId = signedTx.getId();
      
      await submitClient.submitTx(txCbor);
      
      const { value: event, done } = await eventPromise;
      
      expect(done).toBe(false);
      expect(Buffer.from(event.txoRef).toString('hex')).toBe(txId);
      expect(event.stage).toBeGreaterThanOrEqual(1);
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

  test("watchTxForAddress", { timeout: 120000 }, async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const addressBytes = Buffer.from(testAddress.toBytes(), 'hex');
    
    const txStream = watchClient.watchTxForAddress(addressBytes);
    const iterator = txStream[Symbol.asyncIterator]();
    
    const { value: event, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(['apply', 'undo']).toContain(event.action);
    expect(event.Tx.hash.length).toBeGreaterThan(0);
    
    // Convert expected address to base64 for comparison
    const expectedAddressBase64 = addressBytes.toString('base64');
    
    // Verify the transaction involves the watched address
    if (event.Tx.outputs && event.Tx.outputs.length > 0) {
      // Check if any output is sent to the watched address
      const hasWatchedAddress = event.Tx.outputs.some((output: cardano.TxOutput) => {
        if (output.address) {
          // Convert Uint8Array to base64 string for comparison
          const outputAddressBase64 = Buffer.from(output.address).toString('base64');
          return outputAddressBase64 === expectedAddressBase64;
        }
        return false;
      });
      expect(hasWatchedAddress).toBe(true);
    }
  });

  test("watchTxForPaymentPart", { timeout: 120000 }, async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const paymentCred = testAddress.getProps().paymentPart;
    
    if (!paymentCred || paymentCred.type !== Core.CredentialType.KeyHash) {
      throw new Error("Test address missing payment credential");
    }
    
    const paymentPart = Buffer.from(paymentCred.hash, 'hex');
    
    const txStream = watchClient.watchTxForPaymentPart(paymentPart);
    const iterator = txStream[Symbol.asyncIterator]();
    
    const { value: event, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(['apply', 'undo']).toContain(event.action);
    expect(event.Tx.hash.length).toBeGreaterThan(0);
    
    // Verify the transaction involves addresses with the correct payment credential
    if (event.Tx.outputs && event.Tx.outputs.length > 0) {
      // Check if any output has the correct payment credential
      const hasCorrectPaymentCred = event.Tx.outputs.some((output: cardano.TxOutput) => {
        if (output.address) {
          const outputAddress = Core.Address.fromBytes(Buffer.from(output.address).toString('hex') as Core.HexBlob);
          const outputPaymentCred = outputAddress.getProps().paymentPart;
          return outputPaymentCred?.hash === paymentCred.hash;
        }
        return false;
      });
      expect(hasCorrectPaymentCred).toBe(true);
    }
  });

  test("watchTxForDelegationPart", { timeout: 120000 }, async () => {
    const testAddress = Core.Address.fromBech32(TEST_CONFIG.testAddress);
    const delegationCred = testAddress.getProps().delegationPart;
    
    if (!delegationCred || delegationCred.type !== Core.CredentialType.KeyHash) {
      throw new Error("Test address missing delegation credential");
    }
    
    const delegationPart = Buffer.from(delegationCred.hash, 'hex');
    
    const txStream = watchClient.watchTxForDelegationPart(delegationPart);
    const iterator = txStream[Symbol.asyncIterator]();
    
    const { value: event, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(['apply', 'undo']).toContain(event.action);
    expect(event.Tx.hash.length).toBeGreaterThan(0);
    
    // Verify the transaction involves addresses with the correct delegation credential
    if (event.Tx.outputs && event.Tx.outputs.length > 0) {
      // Check if any output has the correct delegation credential
      const hasCorrectDelegationCred = event.Tx.outputs.some((output: cardano.TxOutput) => {
        if (output.address) {
          const outputAddress = Core.Address.fromBytes(Buffer.from(output.address).toString('hex') as Core.HexBlob);
          const outputDelegationCred = outputAddress.getProps().delegationPart;
          return outputDelegationCred?.hash === delegationCred.hash;
        }
        return false;
      });
      expect(hasCorrectDelegationCred).toBe(true);
    }
  });

  test("watchTxForAsset", { timeout: 120000 }, async () => {
    // The assetName parameter contains both policyId and asset name concatenated
    const assetName = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0434e4354", "hex");
    const expectedPolicyId = assetName.subarray(0, 28);
    const expectedAssetNameOnly = assetName.subarray(28);
    
    const expectedPolicyIdBase64 = expectedPolicyId.toString('base64');
    const expectedAssetNameBase64 = expectedAssetNameOnly.toString('base64');
    
    const txStream = watchClient.watchTxForAsset(undefined, assetName);
    const iterator = txStream[Symbol.asyncIterator]();
    
    const { value: event, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(['apply', 'undo']).toContain(event.action);
    expect(event.Tx.hash.length).toBeGreaterThan(0);
    
    // Verify the transaction involves the expected asset
    if (event.Tx.outputs && event.Tx.outputs.length > 0) {
      // Verify outputs contain the expected asset
      event.Tx.outputs.forEach((output: cardano.TxOutput) => {
        if (output.assets) {
          // Check that at least one asset group contains our policy ID and asset name
          const hasExpectedAsset = output.assets.some((assetGroup: cardano.Multiasset) => {
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
          if (hasExpectedAsset) {
            expect(hasExpectedAsset).toBe(true);
          }
        }
      });
    }
  });

  test("watchTxForPolicyId", { timeout: 120000 }, async () => {
    const policyId = Buffer.from("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0", "hex");
    
    const txStream = watchClient.watchTxForAsset(policyId, undefined);
    const iterator = txStream[Symbol.asyncIterator]();
    
    const { value: event, done } = await iterator.next();
    
    expect(done).toBe(false);
    expect(['apply', 'undo']).toContain(event.action);
    expect(event.Tx.hash.length).toBeGreaterThan(0);
    
    // Convert policy ID to base64 for comparison
    const expectedPolicyIdBase64 = policyId.toString('base64');
    
    // Verify the transaction involves assets with the expected policy ID
    if (event.Tx.outputs && event.Tx.outputs.length > 0) {
      // Verify outputs contain assets with the searched policy ID
      event.Tx.outputs.forEach((output: cardano.TxOutput) => {
        if (output.assets) {
          // Check that at least one asset group has the expected policy ID
          const hasExpectedPolicy = output.assets.some((assetGroup: cardano.Multiasset) => {
            const assetPolicyIdBase64 = Buffer.from(assetGroup.policyId).toString('base64');
            return assetPolicyIdBase64 === expectedPolicyIdBase64;
          });
          if (hasExpectedPolicy) {
            expect(hasExpectedPolicy).toBe(true);
          }
        }
      });
    }
  });
});
