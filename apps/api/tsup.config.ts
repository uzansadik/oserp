import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/migrate.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'es2022',
  external: ['fastify', 'pg', 'drizzle-orm', '@oserp-community/iam'],
});
