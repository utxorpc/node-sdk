import {
  Interceptor,
  PromiseClient,
  createPromiseClient,
} from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";

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

export type GenericUtxo<Ref, Parsed> = {
  txoRef: Ref;
  parsedValued: Parsed | undefined;
  nativeBytes: Uint8Array | undefined;
};

export type ClientBuilderOptions = {
  uri: string;
  headers?: Record<string, string>;
};
