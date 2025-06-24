import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['test/**/*.test.mts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      "@sdk/grpcTransport": path.resolve(__dirname, "./src/grpcTransport.node.ts"),
      "@blaze-cardano/core": path.resolve(__dirname, "./test/node_modules/@blaze-cardano/core"),
      "@blaze-cardano/sdk": path.resolve(__dirname, "./test/node_modules/@blaze-cardano/sdk"),
      "@utxorpc/blaze-provider": path.resolve(__dirname, "./test/node_modules/@utxorpc/blaze-provider"),
    },
  },
})
