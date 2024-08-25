import {
  Interceptor,
  PromiseClient,
  createPromiseClient,
} from "@connectrpc/connect";

import { createGrpcTransport } from "@connectrpc/connect-node";

import { PartialMessage } from "@bufbuild/protobuf";

import * as query from "@utxorpc/spec/lib/utxorpc/v1alpha/query/query_pb.js";
import * as cardano from "@utxorpc/spec/lib/utxorpc/v1alpha/cardano/cardano_pb.js";

import { SyncService } from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_connect.js";
import { QueryService } from "@utxorpc/spec/lib/utxorpc/v1alpha/query/query_connect.js";

import {
  AnyChainBlock,
  BlockRef,
  FollowTipRequest,
} from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_pb.js";

import {
  ClientBuilderOptions,
  metadataInterceptor,
  GenericTipEvent,
  GenericUtxo,
} from "./common.js";

export type ChainPoint = { slot: number | string; hash: string };
export type Utxo = GenericUtxo<query.TxoRef, cardano.TxOutput>;
export type TipEvent = GenericTipEvent<cardano.Block, ChainPoint>;

function anyChainToBlock(msg) {
  return msg.chain.case == "cardano" ? msg.chain.value : null;
}

function pointToBlockRef(p: ChainPoint) {
  return new BlockRef({
    index: BigInt(p.slot),
    hash: new Uint8Array(Buffer.from(p.hash, "hex")),
  });
}

function blockRefToPoint(r) {
  return {
    slot: r.index.toString(),
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
  inner: PromiseClient<typeof SyncService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(SyncService, transport);
  }

  async *followTip(intersect?: ChainPoint[]): AsyncIterable<TipEvent> {
    const req = new FollowTipRequest({
      intersect: intersect?.map((p) => pointToBlockRef(p)),
    });

    const res = this.inner.followTip(req);

    for await (const any of res) {
      switch (any.action.case) {
        case "apply":
          yield {
            action: "apply",
            block: anyChainToBlock(any.action.value)!,
          };
          break;
        case "undo":
          yield {
            action: "undo",
            block: anyChainToBlock(any.action.value)!,
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

  async fetchBlock(p: ChainPoint): Promise<cardano.Block> {
    const req = pointToBlockRef(p);
    const res = await this.inner.fetchBlock({ ref: [req] });
    return anyChainToBlock(res.block[0])!;
  }
}

export class QueryClient {
  inner: PromiseClient<typeof QueryService>;

  constructor(options: ClientBuilderOptions) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(QueryService, transport);
  }

  async readParams(): Promise<cardano.PParams> {
    const res = await this.inner.readParams({});
    return anyParamsToChain(res.values!);
  }

  async readUtxosByOutputRef(
    refs: { txHash: Uint8Array; outputIndex: number }[]
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

  async searchUtxosByAddress(address: Uint8Array): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      address: {
        exactAddress: address,
      },
    });
  }

  async searchUtxosByAsset(
    policyId?: Uint8Array,
    name?: Uint8Array
  ): Promise<Utxo[]> {
    return this.searchUtxosByMatch({
      asset: policyId ? { policyId } : { assetName: name },
    });
  }
}
