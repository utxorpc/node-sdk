import {
  Interceptor,
  PromiseClient,
  createPromiseClient,
} from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { ChainSyncService } from "@utxorpc/sync-spec/utxorpc/sync/v1/sync_connect.js";

export type Options = {
  headers: Record<string, string>;
};

function buildHeaderInterceptor(options?: Options): Interceptor {
  return (next) => async (req) => {
    if (!!options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) =>
        req.header.set(key, value)
      );
    }

    return await next(req);
  };
}

export class CardanoClientV1Alpha {
  chainSync: PromiseClient<typeof ChainSyncService>;

  constructor(baseUrl: string, options?: Options) {
    let headerInterceptor = buildHeaderInterceptor(options);

    const transport = createGrpcTransport({
      httpVersion: "2",
      baseUrl,
      interceptors: [headerInterceptor],
    });

    this.chainSync = createPromiseClient(ChainSyncService, transport);
  }
}
