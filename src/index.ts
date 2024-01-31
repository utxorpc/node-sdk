import { PromiseClient, createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { ChainSyncService } from "@utxorpc/sync-spec/utxorpc/sync/v1/sync_connect.js";

export class CardanoClientV1Alpha {
  headers: Record<string, string>;
  chainSync: PromiseClient<typeof ChainSyncService>;

  constructor(baseUrl: string, options?: { headers: Record<string, string> }) {
    const transport = createGrpcTransport({ httpVersion: "2", baseUrl });
    this.headers = options?.headers || {};
    this.chainSync = createPromiseClient(ChainSyncService, transport);
  }
}
