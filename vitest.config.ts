import { defineConfig } from 'vitest/config';

const stub = (name: string) => new URL(`./tests/stubs/${name}`, import.meta.url).pathname;

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { 'react-native': stub('react-native.tsx') } },
  test: { include: ['tests/**/*.test.{ts,tsx}'] },
});
