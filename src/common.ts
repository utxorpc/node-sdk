import { Interceptor } from "@connectrpc/connect";

export function metadataInterceptor(
  options?: ClientBuilderOptions
): Interceptor {
  return (next) => async (req) => {
    if (!!options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) =>
        req.header.set(key, value)
      );
    }

    return await next(req);
  };
}

export type GenericTipEvent<Block, Point> =
  | { action: "apply"; block: Block }
  | { action: "undo"; block: Block }
  | { action: "reset"; point: Point };

export type GenericTxEvent<Tx> =
  | { action: "apply"; Tx: Tx }
  | { action: "undo"; Tx: Tx };

export enum GenericMempoolStage {
  UNSPECIFIED = 0,
  ACKNOWLEDGED = 1,
  MEMPOOL = 2,
  NETWORK = 3,
  CONFIRMED = 4,
}

export type GenericTxInMempoolEvent<Tx> =
  | {
      stage: GenericMempoolStage.UNSPECIFIED;
      txoRef: Uint8Array;
      nativeBytes: Uint8Array;
      Tx: Tx | undefined;
    }
  | {
      stage: GenericMempoolStage.ACKNOWLEDGED;
      txoRef: Uint8Array;
      nativeBytes: Uint8Array;
      Tx: Tx | undefined;
    }
  | {
      stage: GenericMempoolStage.MEMPOOL;
      txoRef: Uint8Array;
      nativeBytes: Uint8Array;
      Tx: Tx | undefined;
    }
  | {
      stage: GenericMempoolStage.NETWORK;
      txoRef: Uint8Array;
      nativeBytes: Uint8Array;
      Tx: Tx | undefined
    }
  | {
      stage: GenericMempoolStage.CONFIRMED;
      txoRef: Uint8Array;
      nativeBytes: Uint8Array;
      Tx: Tx | undefined;
    };

export type GenericUtxo<Ref, Parsed> = {
  txoRef: Ref;
  parsedValued: Parsed | undefined;
  nativeBytes: Uint8Array | undefined;
};

export type ClientBuilderOptions = {
  uri: string;
  headers?: Record<string, string>;
};
