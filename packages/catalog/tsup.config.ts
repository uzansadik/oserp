import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,

  // Infrastructure bağımlılıkları bundle'a dahil edilmez;
  // tüketen uygulama kendi bağlamında sağlar.
  external: ['drizzle-orm', 'drizzle-orm/postgres-js', 'kafkajs', 'postgres', 'zod'],

  esbuildOptions(options) {
    options.banner = {
      js: '"use strict";',
    };
  },
});
