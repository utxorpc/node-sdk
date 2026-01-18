import { Interceptor } from "@connectrpc/connect";
import { submit } from "@utxorpc/spec";
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

export type GenericTxEvent<Tx, BlockRef> =
  | { action: "apply"; Tx: Tx | undefined }
  | { action: "undo"; Tx: Tx | undefined }
  | { action: "idle"; BlockRef: BlockRef };

export type GenericTxInMempoolEvent<Tx> = {
  stage: submit.Stage;
  txoRef: Uint8Array<ArrayBuffer>;
  nativeBytes: Uint8Array<ArrayBuffer>;
  Tx: Tx | undefined;
};

export type GenericUtxo<Ref, Parsed> = {
  txoRef: Ref;
  parsedValued: Parsed | undefined;
  nativeBytes: Uint8Array<ArrayBuffer> | undefined;
};

export type ClientBuilderOptions = {
  uri: string;
  headers?: Record<string, string>;
};
