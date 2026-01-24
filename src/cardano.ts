import { PromiseClient, createPromiseClient } from "@connectrpc/connect";

import { createGrpcTransport } from "@sdk/grpcTransport";

import { PartialMessage } from "@bufbuild/protobuf";

import { Buffer } from "buffer";

import {
  sync,
  syncConnect,
  query,
  queryConnect,
  submit,
  submitConnect,
  watchConnect,
  watch,
  cardano
} from "@utxorpc/spec";

import {
  ClientBuilderOptions,
  GenericTipEvent,
  GenericUtxo,
  GenericTxEvent,
  GenericTxInMempoolEvent,
  GenericTxPredicate,
  metadataInterceptor,
} from "./common.ts";

export type ChainPoint = { slot: number | string; hash: string };
export type Utxo = GenericUtxo<query.TxoRef, cardano.TxOutput>;
export type TipEvent = GenericTipEvent<cardano.Block, ChainPoint>;
export type TxEvent = GenericTxEvent<cardano.Tx, cardano.Block, watch.BlockRef>;
export type TxPredicate = GenericTxPredicate<cardano.TxPattern>;
export type MempoolEvent = GenericTxInMempoolEvent<cardano.Tx>;
export type TxHash = Uint8Array;
export type TxCbor = Uint8Array;
export type Block = {
  parsedBlock: cardano.Block;
  nativeBytes: Uint8Array;
};

function toMempoolEvent(txInMempool: submit.TxInMempool): MempoolEvent {
  return {
    txoRef: txInMempool.ref,
    stage: txInMempool.stage,
    nativeBytes: txInMempool.nativeBytes,
    Tx:
      txInMempool.parsedState.case == "cardano"
        ? txInMempool.parsedState.value
        : undefined,
  };
}
function toTxEvent(response: watch.WatchTxResponse): TxEvent {
  switch (response.action.case) {
    case "apply":
    case "undo":
      if (response.action.value.chain.case !== "cardano") {
        throw new Error(`Unexpected tx chain response (expected "cardano", saw "${response.action.value.chain.case}")`);
      }
      if (response.action.value.block?.chain?.case !== "cardano") {
        throw new Error(`Unexpected block chain response (expected "cardano", saw "${response.action.value.block?.chain?.case ?? "<none>"}")`);
      }
      return {
        action: response.action.case,
        Tx: response.action.value.chain.value,
        Block: response.action.value.block.chain.value,
      }
    case "idle":
      return {
        action: "idle",
        BlockRef: response.action.value,
      }
    default:
      throw new Error("Unrecognized TX event");
  }
}

function toTxPredicate(predicate: TxPredicate): watch.TxPredicate {
  return new watch.TxPredicate({
    match: predicate.match ? new watch.AnyChainTxPattern({
      chain: {
        case: "cardano",
        value: predicate.match,
      }
    }) : undefined,
    not: predicate.not?.map(toTxPredicate),
    allOf: predicate.allOf?.map(toTxPredicate),
    anyOf: predicate.anyOf?.map(toTxPredicate),
  });
}

function anyChainToBlock(msg: sync.AnyChainBlock) {
  return msg.chain.case == "cardano" ? msg.chain.value : null;
}

function anyChainToBlockWithBytes(msg: sync.AnyChainBlock): Block | null {
  if (msg.chain.case == "cardano") {
    return {
      parsedBlock: msg.chain.value,
      nativeBytes: msg.nativeBytes
    };
  }
  return null;
}

function pointToBlockRef(p: ChainPoint) {
  return new sync.BlockRef({
    slot: BigInt(p.slot),
    hash: new Uint8Array(Buffer.from(p.hash, "hex")),
  });
}

function blockRefToPoint(r: sync.BlockRef) {
  return {
    slot: r.slot.toString(),
    hash: Buffer.from(r.hash).toString("hex"),
  };
}

function anyUtxoToChain(u: query.AnyUtxoData): Utxo {
  switch (u.parsedState.case) {
    case "cardano":
      return {
        txoRef: u.txoRef!,
        parsedValued: u.parsedState.value,
        nativeBytes: u.nativeBytes,
      };
    default:
      throw Error("source is not Cardano data");
  }
}

function anyParamsToChain(p: query.AnyChainParams): cardano.PParams {
  switch (p.params.case) {
    case "cardano":
      return p.params.value;
    default:
      throw Error("source is not Cardano data");
  }
}

export class SyncClient {
  inner: PromiseClient<typeof syncConnect.SyncService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(syncConnect.SyncService, transport);
  }

  async *followTip(intersect?: ChainPoint[]): AsyncIterable<TipEvent> {
    const req = new sync.FollowTipRequest({
      intersect: intersect?.map((p) => pointToBlockRef(p)),
    });

    const res = this.inner.followTip(req);

    for await (const any of res) {
      switch (any.action.case) {
        case "apply":
          yield {
            action: "apply",
            block: anyChainToBlock(any.action.value)!,
            nativeBytes: any.action.value.nativeBytes,
          };
          break;
        case "undo":
          yield {
            action: "undo",
            block: anyChainToBlock(any.action.value)!,
            nativeBytes: any.action.value.nativeBytes
          };
          break;
        case "reset":
          yield {
            action: "reset",
            point: blockRefToPoint(any.action.value),
          };
      }
    }
  }

  async readTip(): Promise<ChainPoint> {
    const res = await this.inner.readTip({});
    return blockRefToPoint(res.tip!);
  }

  async fetchBlock(p: ChainPoint): Promise<Block> {
    const req = pointToBlockRef(p);
    const res = await this.inner.fetchBlock({ ref: [req] });
    return anyChainToBlockWithBytes(res.block[0])!;
  }

  async fetchHistory(p: ChainPoint | undefined, maxItems = 1): Promise<Block[]> {
    const req = new sync.DumpHistoryRequest({
      startToken: p ? new sync.BlockRef({
        slot: BigInt(p.slot),
        hash: Buffer.from(p.hash, "hex"),
      }) : undefined,
      maxItems: maxItems,
    });

    const res = await this.inner.dumpHistory(req);

    if (res.block.length === 0) {
      throw new Error("No block history found for the provided ChainPoint.");
    }

    return res.block
      .map(anyChainToBlockWithBytes)
      .filter((block): block is Block => block !== null);
  }
}

export class QueryClient {
  inner: PromiseClient<typeof queryConnect.QueryService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(queryConnect.QueryService, transport);
  }

  async readParams(): Promise<cardano.PParams> {
    const res = await this.inner.readParams({});
    return anyParamsToChain(res.values!);
  }

  async readUtxosByOutputRef(
    refs: { txHash: Uint8Array<ArrayBuffer>; outputIndex: number }[]
  ): Promise<Utxo[]> {
    const searchResponse = await this.inner.readUtxos({
      keys: refs.map((ref) => {
        return {
          hash: ref.txHash,
          index: ref.outputIndex,
        };
      }),
    });

    return searchResponse.items.map(anyUtxoToChain);
  }

  private async searchUtxosByMatch(
    pattern: PartialMessage<cardano.TxOutputPattern>
  ): Promise<Utxo[]> {
    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: { utxoPattern: { value: pattern, case: "cardano" } },
      },
    });

    return searchResponse.items.map(anyUtxoToChain);
  }

  async searchUtxosByAddress(address: Uint8Array<ArrayBuffer>): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        exactAddress: address,
      },
    });
  }

  async searchUtxosByPaymentPart(paymentPart: Uint8Array<ArrayBuffer>): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        paymentPart: paymentPart,
      },
    });
  }

  async searchUtxosByDelegationPart(
    delegationPart: Uint8Array<ArrayBuffer>
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        delegationPart: delegationPart,
      },
    });
  }

  async searchUtxosByAsset(
    policyId?: Uint8Array<ArrayBuffer>,
    name?: Uint8Array<ArrayBuffer>
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      asset: (policyId && name) ? { policyId: policyId, assetName: name } : policyId ? { policyId } : { assetName: name },
    });
  }

  async searchUtxosByAddressWithAsset(
    address: Uint8Array<ArrayBuffer>,
    policyId?: Uint8Array<ArrayBuffer>,
    name?: Uint8Array<ArrayBuffer>
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        exactAddress: address,
      },
      asset: (policyId && name) ? { policyId: policyId, assetName: name } : policyId ? { policyId } : { assetName: name },
    });
  }

  async searchUtxosByPaymentPartWithAsset(
    paymentPart: Uint8Array<ArrayBuffer>,
    policyId?: Uint8Array<ArrayBuffer>,
    name?: Uint8Array<ArrayBuffer>
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        paymentPart: paymentPart,
      },
      asset: (policyId && name) ? { policyId: policyId, assetName: name } : policyId ? { policyId } : { assetName: name },
    });
  }

  async searchUtxosByDelegationPartWithAsset(
    delegationPart: Uint8Array<ArrayBuffer>,
    policyId?: Uint8Array<ArrayBuffer>,
    name?: Uint8Array<ArrayBuffer>
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        delegationPart: delegationPart,
      },
      asset: (policyId && name) ? { policyId: policyId, assetName: name } : policyId ? { policyId } : { assetName: name },
    });
  }

  async readGenesis(): Promise<cardano.Genesis> {
    const res = await this.inner.readGenesis({});
    
    if (!res.config || res.config.case !== "cardano") {
      throw new Error("Genesis config is not Cardano data");
    }
    
    return res.config.value;
  }

  async readErasummary(): Promise<cardano.EraSummary[]> {
    const res = await this.inner.readEraSummary({});
    
    if (!res.summary || res.summary.case !== "cardano") {
      throw new Error("Era summary is not Cardano data");
    }
    
    return res.summary.value.summaries;
  }
}

export class SubmitClient {
  inner: PromiseClient<typeof submitConnect.SubmitService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(submitConnect.SubmitService, transport);
  }

  async submitTx(tx: TxCbor): Promise<TxHash> {
    const res = await this.inner.submitTx({
      tx: { type: { case: "raw", value: tx } },
    });

    return res.ref;
  }

  async evalTx(tx: TxCbor): Promise<submit.EvalTxResponse> {
    const res = await this.inner.evalTx({
      tx: { type: { case: "raw", value: tx } },
    });
    
    return res;
  }

  async *waitForTx(txHash: TxHash): AsyncIterable<submit.Stage> {
    const updates = this.inner.waitForTx({
      ref: [txHash],
    });

    for await (const change of updates) {
      yield change.stage;
    }
  }

  async *watchMempoolByMatch(
    pattern: PartialMessage<cardano.TxPattern>
  ): AsyncIterable<MempoolEvent> {
    const stream = this.inner.watchMempool({
      predicate: {
        match: { chain: { value: pattern, case: "cardano" } },
      },
    });

    for await (const response of stream) {
      if (response.tx) {
        yield toMempoolEvent(response.tx);
      }
    }
  }

  async *watchMempool(): AsyncIterable<MempoolEvent> {
    yield* this.watchMempoolByMatch({});
  }

  async *watchMempoolForAddress(
    address: Uint8Array<ArrayBuffer>
  ): AsyncIterable<MempoolEvent> {
    yield* this.watchMempoolByMatch({
      hasAddress: { exactAddress: address },
    });
  }

  async *watchMempoolForPaymentPart(
    paymentPart: Uint8Array<ArrayBuffer>
  ): AsyncIterable<MempoolEvent> {
    yield* this.watchMempoolByMatch({
      hasAddress: { paymentPart: paymentPart },
    });
  }

  async *watchMempoolForDelegationPart(
    delegationPart: Uint8Array<ArrayBuffer>
  ): AsyncIterable<MempoolEvent> {
    yield* this.watchMempoolByMatch({
      hasAddress: { delegationPart: delegationPart },
    });
  }

  async *watchMempoolForAsset(
    policyId?: Uint8Array<ArrayBuffer>,
    assetName?: Uint8Array<ArrayBuffer>
  ): AsyncIterable<MempoolEvent> {
    yield* this.watchMempoolByMatch({
      movesAsset: { policyId, assetName },
    });
  }
}

export class WatchClient {
  inner: PromiseClient<typeof watchConnect.WatchService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(watchConnect.WatchService, transport);
  }

  async *watchTxByPredicate(
    predicate: TxPredicate,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const request: watch.WatchTxRequest = new watch.WatchTxRequest({
      intersect: intersect ? intersect.map(pointToBlockRef) : [],
      predicate: toTxPredicate(predicate),
    });

    const stream = this.inner.watchTx(request);

    for await (const response of stream) {
      yield toTxEvent(response);
    }
  }

  async *watchTxByMatch(
    pattern: PartialMessage<cardano.TxPattern>,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const predicate = { match: pattern }
    yield* this.watchTxByPredicate(predicate, intersect);
  }

  async *watchTx(intersect?: ChainPoint[]): AsyncIterable<TxEvent> {
    const pattern = {};
    yield* this.watchTxByMatch(pattern, intersect);
  }

  async *watchTxForAddress(
    address: Uint8Array<ArrayBuffer>,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const pattern = { hasAddress: { exactAddress: address } };
    yield* this.watchTxByMatch(pattern, intersect);
  }

  async *watchTxForPaymentPart(
    paymentPart: Uint8Array<ArrayBuffer>,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const pattern = { hasAddress: { paymentPart } };
    yield* this.watchTxByMatch(pattern, intersect);
  }

  async *watchTxForDelegationPart(
    delegationPart: Uint8Array<ArrayBuffer>,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const pattern = { hasAddress: { delegationPart } };
    yield* this.watchTxByMatch(pattern, intersect);
  }

  async *watchTxForAsset(
    policyId?: Uint8Array<ArrayBuffer>,
    assetName?: Uint8Array<ArrayBuffer>,
    intersect?: ChainPoint[]
  ): AsyncIterable<TxEvent> {
    const pattern = { movesAsset: { policyId, assetName } };
    yield* this.watchTxByMatch(pattern, intersect);
  }
}
