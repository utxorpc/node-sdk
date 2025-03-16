import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['test/**/*.test.mts'],
  },
  resolve: {
    alias: {
      "@sdk/grpcTransport": path.resolve(__dirname, "./src/grpcTransport.node.ts"),
    },
  },
})
