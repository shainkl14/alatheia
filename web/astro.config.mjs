import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const midnightRoot = path.resolve(__dirname, 'node_modules/@midnight-ntwrk');
const midnightPackages = fs.existsSync(midnightRoot) ? fs.readdirSync(midnightRoot) : [];

/** Pin leaf packages to web/node_modules — avoids ../node_modules duplicates from ../contracts imports. */
const midnightAliases = Object.fromEntries(
  midnightPackages
    .filter((pkg) => pkg !== 'midnight-js-protocol')
    .map((pkg) => [`@midnight-ntwrk/${pkg}`, path.join(midnightRoot, pkg)]),
);

const devPort = Number(process.env.PORT) || 4321;

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [preact()],
  server: { port: devPort, host: '127.0.0.1' },
  vite: {
    define: {
      global: 'globalThis',
    },
    plugins: [wasm(), topLevelAwait()],
    resolve: {
      alias: {
        '@contracts': path.resolve(__dirname, '../contracts'),
        '@api': path.resolve(__dirname, '../api/src'),
        buffer: 'buffer/',
        ...midnightAliases,
      },
      dedupe: midnightPackages.map((pkg) => `@midnight-ntwrk/${pkg}`),
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
      mainFields: ['browser', 'module', 'main'],
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
        extensions: ['.js', '.cjs'],
        ignoreDynamicRequires: true,
      },
    },
    optimizeDeps: {
      include: [
        'buffer',
        '@midnight-ntwrk/compact-runtime',
        '@midnight-ntwrk/midnight-js-contracts',
        '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      ],
      esbuildOptions: {
        target: 'esnext',
        supported: { 'top-level-await': true },
        platform: 'browser',
        format: 'esm',
        define: { global: 'globalThis' },
        loader: { '.wasm': 'binary' },
      },
    },
  },
});
