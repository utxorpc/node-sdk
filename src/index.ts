import {
  Interceptor,
  PromiseClient,
  createPromiseClient,
} from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";

import * as Cardano from "@utxorpc/spec/lib/utxorpc/v1alpha/cardano/cardano_pb.js";

import { ChainSyncService } from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_connect.js";

import {
  AnyChainBlock,
  BlockRef,
  FollowTipRequest,
} from "@utxorpc/spec/lib/utxorpc/v1alpha/sync/sync_pb.js";

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

interface Chain<BlockT, PointT> {
  anyChainToBlock(msg: AnyChainBlock): BlockT | null;
  pointToBlockRef(p: PointT): BlockRef;
  blockRefToPoint(r: BlockRef): PointT;
}

export type TipEvent<BlockT, PointT> =
  | { action: "apply"; block: BlockT }
  | { action: "undo"; block: BlockT }
  | { action: "reset"; point: PointT };

export type ClientBuilderOptions = {
  uri: string;
  headers: Record<string, string>;
};

export class SyncClient<BlockT, PointT> {
  inner: PromiseClient<typeof ChainSyncService>;
  chain: Chain<BlockT, PointT>;

  constructor(options: ClientBuilderOptions, chain: Chain<BlockT, PointT>) {
    let headerInterceptor = metadataInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl: options.uri,
      interceptors: [headerInterceptor],
    });

    this.inner = createPromiseClient(ChainSyncService, transport);
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
}

export type CardanoBlock = Cardano.Block;

export type CardanoPoint = { slot: number | string; hash: string };

const CARDANO: Chain<CardanoBlock, CardanoPoint> = {
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
};

export class CardanoSyncClient extends SyncClient<CardanoBlock, CardanoPoint> {
  constructor(options: ClientBuilderOptions) {
    super(options, CARDANO);
  }
}
