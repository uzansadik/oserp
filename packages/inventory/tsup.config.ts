import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/domain/index.ts',
    'src/application/index.ts',
    'src/api/index.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    'drizzle-orm',
    'drizzle-orm/postgres-js',
    'kafkajs',
    'postgres',
    'pg',
    'zod',
    'fastify',
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use strict";',
    };
  },
});
