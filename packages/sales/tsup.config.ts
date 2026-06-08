import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/application/public/index.ts',
    'src/api/index.ts',
    'src/ui/index.ts',
    'src/contracts/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'es2024',
  external: ['dotenv', 'drizzle-orm', 'pg', 'fastify', 'zod'],
});
