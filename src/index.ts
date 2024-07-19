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
import { AnyUtxoData, SearchUtxosResponse } from "@utxorpc/spec/lib/utxorpc/v1alpha/query/query_pb.js";

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

interface Chain<BlockT, PointT, UTxOT> {
  anyChainToBlock(msg: AnyChainBlock): BlockT | null;
  pointToBlockRef(p: PointT): BlockRef;
  blockRefToPoint(r: BlockRef): PointT;
  anyUtxoToUnspentOutput(u: AnyUtxoData): UTxOT | null;
}

export type TipEvent<BlockT, PointT> =
  | { action: "apply"; block: BlockT }
  | { action: "undo"; block: BlockT }
  | { action: "reset"; point: PointT };

export type ClientBuilderOptions = {
  uri: string;
  headers?: Record<string, string>;
};

export class SyncClient<BlockT, PointT, UTxOT> {
  inner: PromiseClient<typeof SyncService>;
  queryClient: PromiseClient<typeof QueryService>;
  chain: Chain<BlockT, PointT, UTxOT>;

  constructor(options: ClientBuilderOptions, chain: Chain<BlockT, PointT, UTxOT>) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(SyncService, transport);
    this.queryClient = createPromiseClient(QueryService, transport);
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

export class QueryClient<BlockT, PointT, UTxOT> {
  inner: PromiseClient<typeof QueryService>;
  chain: Chain<BlockT, PointT, UTxOT>;

  constructor(options: ClientBuilderOptions, chain: Chain<BlockT, PointT, UTxOT>) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(QueryService, transport);
    this.chain = chain;
  }

  async getUtxoByOutputRef(refs: {txHash: Uint8Array, outputIndex: number}[]): Promise<UTxOT[] | null> {
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

  async getUtxosByAddress(address: Uint8Array): Promise<UTxOT[]> {
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

  async getUtxosByAddressAsset(address: Uint8Array, policyId: Uint8Array, assetName: Uint8Array): Promise<UTxOT[]> {
    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: {
          utxoPattern: {
            value: {
              asset: {
                policyId,
                // assetName - commented because currently dolos returns conflicting criteria when both assetName and policyId are set
              },
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

  async getUtxosByNft(policyId: Uint8Array, assetName: Uint8Array): Promise<UTxOT[]> {
    const searchResponse = await this.inner.searchUtxos({
      predicate: {
        match: {
          utxoPattern: {
            value: {
              asset: {
                policyId,
                // assetName - commented because currently dolos returns conflicting criteria when both assetName and policyId are set
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
}

export type CardanoBlock = Cardano.Block;
export type CardanoPoint = { slot: number | string; hash: string };
export type CardanoUnspentOutput = Cardano.TxInput;

const CARDANO: Chain<CardanoBlock, CardanoPoint, CardanoUnspentOutput> = {
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
  }
};

export class CardanoSyncClient extends SyncClient<CardanoBlock, CardanoPoint, CardanoUnspentOutput> {
  constructor(options: ClientBuilderOptions) {
    super(options, CARDANO);
  }
}

export class CardanoQueryClient extends QueryClient<CardanoBlock, CardanoPoint, CardanoUnspentOutput> {
  constructor(options: ClientBuilderOptions) {
    super(options, CARDANO);
  }
}
