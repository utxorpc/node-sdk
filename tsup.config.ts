import path from "path"
import { defineConfig } from "tsup"

export default defineConfig((options) => {
    const isBrowser = options.env?.NODE_ENV === 'browser'
    const rootDir = process.cwd()

    const alias = {
        '@sdk/grpcTransport': path.resolve(rootDir, isBrowser ? 'src/grpcTransport.web.ts' : 'src/grpcTransport.node.ts')
    }

    return {
        entry: ['src/index.ts'],
        splitting: false,
        clean: true,
        dts: {
            resolve: true,
            compilerOptions: {
                paths: {
                    "@sdk/*": ["./src/*"],
                    "@sdk/grpcTransport": ["./src/grpcTransport.node.ts", "./src/grpcTransport.web.ts"]
                }
            }
        },
        format: isBrowser ? ['esm'] : ['cjs', 'esm'],
        outDir: isBrowser ? 'lib/browser' : 'lib/node',
        define: {
            'process.env.NODE_ENV': JSON.stringify(options.env?.NODE_ENV || 'development')
        },
        alias,
        esbuildOptions(options) {
            options.alias = alias
            if (isBrowser) {
                options.mainFields = ['browser', 'module', 'main']
                options.define = {
                    ...options.define,
                    global: 'window' // Ensure `global` is available in the browser
                }
                options.inject = [path.resolve('node_modules/buffer/index.js')] // Inject the buffer polyfill
            } else {
                options.mainFields = ['module', 'main']
            }
        },
        noExternal: isBrowser ? ['@connectrpc/connect', '@connectrpc/connect-web', '@connectrpc/connect-node'] : [],
        sourcemap: true,
        tsconfig: path.resolve(rootDir, 'tsconfig.json'),
    }
})