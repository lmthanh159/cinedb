import { existsSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let environmentLoaded = false;

export function loadEnvironment() {
  if (environmentLoaded) {
    return;
  }

  const processWithEnvLoader = process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  };

  const candidates = ['../.env', '.env'];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      processWithEnvLoader.loadEnvFile?.(candidate);
    }
  }

  environmentLoaded = true;
}

export function getRequiredEnv(name: string) {
  loadEnvironment();

  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: getRequiredEnv('DATABASE_URL'),
  });

  return new PrismaClient({
    adapter,
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function toBigInt(value?: number | null) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return BigInt(Math.trunc(value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

