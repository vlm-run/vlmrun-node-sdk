import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['./src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    skipNodeModulesBundle: true,
    clean: true,
  },
  {
    entry: ['./src/index.ts'],
    format: ['cjs'],
    dts: true,
    sourcemap: false,
    skipNodeModulesBundle: false, // Bundle all dependencies
    outDir: './dist/bundled',
    outExtension: () => ({ js: '.bundle.js' }),
    clean: false,
    minify: true,
    target: 'node18',
  }
]);
