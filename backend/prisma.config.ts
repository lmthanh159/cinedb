import { existsSync } from 'node:fs';

import { defineConfig, env } from 'prisma/config';

const processWithEnvLoader = process as typeof process & {
  loadEnvFile?: (path?: string) => void;
};

if (existsSync('../.env')) {
  processWithEnvLoader.loadEnvFile?.('../.env');
}

if (existsSync('.env')) {
  processWithEnvLoader.loadEnvFile?.('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
});
