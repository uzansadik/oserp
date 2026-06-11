import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@oserp-community/inventory': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['./**/*.test.ts', './**/*.spec.ts'],
  },
});
