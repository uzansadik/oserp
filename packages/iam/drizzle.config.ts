import 'dotenv'
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistance/schemas/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    table: 'iam_migrations',
    schema: 'public',
  },
  verbose: true,
  strict: true,
});
