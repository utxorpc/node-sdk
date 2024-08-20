import {
  Interceptor,
  PromiseClient,
  createPromiseClient,
} from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";

import * as Cardano from "@utxorpc/spec/lib/utxorpc/v1alpha/cardano/cardano_pb.js";

import { SyncService } from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_connect.js";

import { QueryService } from "@utxorpc/spec/lib/utxorpc/v1alpha/query/query_connect.js";

import {
  AnyChainBlock,
  BlockRef,
  FollowTipRequest,
} from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_pb.js";
import { AnyChainParams, AnyUtxoData } from "@utxorpc/spec/lib/utxorpc/v1alpha/query/query_pb.js";

function metadataInterceptor(options?: ClientBuilderOptions): Interceptor {
  return (next) => async (req) => {
    if (!!options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) =>
        req.header.set(key, value)
      );
    }

    return await next(req);
  };
}

interface Chain<BlockT, PointT, UTxOT, PParamT> {
  anyChainToBlock(msg: AnyChainBlock): BlockT | null;
  pointToBlockRef(p: PointT): BlockRef;
  blockRefToPoint(r: BlockRef): PointT;
  anyUtxoToUnspentOutput(u: AnyUtxoData): UTxOT | null;
  anyPParamsToProtocolParameters(p: AnyChainParams): PParamT | null;
}

export type TipEvent<BlockT, PointT> =
  | { action: "apply"; block: BlockT }
  | { action: "undo"; block: BlockT }
  | { action: "reset"; point: PointT };

export type ClientBuilderOptions = {
  uri: string;
  headers?: Record<string, string>;
};

export class SyncClient<BlockT, PointT, UTxOT, PParamsT> {
  inner: PromiseClient<typeof SyncService>;
  chain: Chain<BlockT, PointT, UTxOT, PParamsT>;

  constructor(options: ClientBuilderOptions, chain: Chain<BlockT, PointT, UTxOT, PParamsT>) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(SyncService, transport);
    this.chain = chain;
  }

  async *followTip(
    intersect?: PointT[]
  ): AsyncIterable<TipEvent<BlockT, PointT>> {
    const req = new FollowTipRequest({
      intersect: intersect?.map((p) => this.chain.pointToBlockRef(p)),
    });

    const res = this.inner.followTip(req);

    for await (const any of res) {
      switch (any.action.case) {
        case "apply":
          yield {
            action: "apply",
            block: this.chain.anyChainToBlock(any.action.value)!,
          };
          break;
        case "undo":
          yield {
            action: "undo",
            block: this.chain.anyChainToBlock(any.action.value)!,
          };
          break;
        case "reset":
          yield {
            action: "reset",
            point: this.chain.blockRefToPoint(any.action.value),
          };
      }
    }
  }

  async fetchBlock(p: PointT): Promise<BlockT> {
    const req = this.chain.pointToBlockRef(p);
    const res = await this.inner.fetchBlock({ ref: [req] });
    return this.chain.anyChainToBlock(res.block[0])!;
  }
}

export class QueryClient<BlockT, PointT, UTxOT, PParamsT> {
  inner: PromiseClient<typeof QueryService>;
  chain: Chain<BlockT, PointT, UTxOT, PParamsT>;

  constructor(options: ClientBuilderOptions, chain: Chain<BlockT, PointT, UTxOT, PParamsT>) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(QueryService, transport);
    this.chain = chain;
  }

  async readParams() {
    const res = await this.inner.readParams({});
    if (res.values != null) {
      return this.chain.anyPParamsToProtocolParameters(res.values);
    }
    else {
      return null;
    }
  }

  async readUtxosByOutputRef(refs: { txHash: Uint8Array, outputIndex: number }[]): Promise<UTxOT[]> {
    const searchResponse = await this.inner.readUtxos({
      keys: refs.map((ref) => {
        return {
          hash: ref.txHash,
          index: ref.outputIndex
        };
      })
    });

    return searchResponse.items.map((item) => {
      return this.chain.anyUtxoToUnspentOutput(item);
    }).filter((item) => item != null) as UTxOT[];
  }

  async searchUtxosByAddress(address: Uint8Array): Promise<UTxOT[]> {
    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: {
          utxoPattern: {
            value: {
              address: {
                exactAddress: address
              }
            },
            case: "cardano"
          }
        }
      }
    });

    return searchResponse.items.map((item) => {
      return this.chain.anyUtxoToUnspentOutput(item);
    }).filter((item) => item != null) as UTxOT[];
  }

  async searchUtxosByAddressAsset(address: Uint8Array, policyId?: Uint8Array, unit?: Uint8Array): Promise<UTxOT[]> {

    if ((policyId && unit) || (!policyId && !unit)) {
      throw new Error("Exactly one of policyId or assetName must be provided.");
    }

    const predicate = policyId
      ? { policyId }
      : { assetName: unit };

    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: {
          utxoPattern: {
            value: {
              asset: predicate,
              address: {
                exactAddress: address
              }
            },
            case: "cardano"
          }
        }
      }
    });

    return searchResponse.items.map((item) => {
      return this.chain.anyUtxoToUnspentOutput(item);
    }).filter((item) => item != null) as UTxOT[];
  }

  async searchUtxosByAsset(policyId?: Uint8Array, unit?: Uint8Array): Promise<UTxOT[]> {

    if ((policyId && unit) || (!policyId && !unit)) {
      throw new Error("Exactly one of policyId or assetName must be provided.");
    }

    const predicate = policyId
      ? { policyId }
      : { assetName: unit };

    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: {
          utxoPattern: {
            value: {
              asset: predicate
            },
            case: "cardano"
          }
        }
      }
    });

    return searchResponse.items.map((item) => {
      return this.chain.anyUtxoToUnspentOutput(item);
    }).filter((item) => item != null) as UTxOT[];
  }
}

export type CardanoBlock = Cardano.Block;
export type CardanoPoint = { slot: number | string; hash: string };
export type CardanoUnspentOutput = Cardano.TxInput;
export type CardanoProtocolParameters = Cardano.PParams;

const CARDANO: Chain<CardanoBlock, CardanoPoint, CardanoUnspentOutput, CardanoProtocolParameters> = {
  anyChainToBlock(msg) {
    return msg.chain.case == "cardano" ? msg.chain.value : null;
  },
  pointToBlockRef(p) {
    return new BlockRef({
      index: BigInt(p.slot),
      hash: new Uint8Array(Buffer.from(p.hash, "hex")),
    });
  },
  blockRefToPoint(r) {
    return {
      slot: r.index.toString(),
      hash: Buffer.from(r.hash).toString("hex"),
    };
  },
  anyUtxoToUnspentOutput(u) {
    return u.parsedState.case == "cardano" ? {
      txHash: u.txoRef?.hash,
      outputIndex: u.txoRef?.index,
      asOutput: u.parsedState.value
    } as CardanoUnspentOutput : null;
  },
  anyPParamsToProtocolParameters(p) {
    return p?.params.value ?? null;
  }
};

export class CardanoSyncClient extends SyncClient<CardanoBlock, CardanoPoint, CardanoUnspentOutput, CardanoProtocolParameters> {
  constructor(options: ClientBuilderOptions) {
    super(options, CARDANO);
  }
}

export class CardanoQueryClient extends QueryClient<CardanoBlock, CardanoPoint, CardanoUnspentOutput, CardanoProtocolParameters> {
  constructor(options: ClientBuilderOptions) {
    super(options, CARDANO);
  }
}
