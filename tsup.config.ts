import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  outDir: 'dist',
  shims: true,
  dts: false,
  clean: true,
  sourcemap: false
});