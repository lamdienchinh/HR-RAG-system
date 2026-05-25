import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)), override: false, quiet: true });

export interface AppConfig {
  readonly databaseUrl: string;
  readonly port: number;
  readonly webOrigins: readonly string[];
  readonly geminiApiKey: string | null;
  readonly geminiModel: string;
  readonly jwtSecret: string;
}

const readRequiredEnv = (name: string, fallback: string): string => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
};

const parseOrigins = (value: string): readonly string[] => {
  const configuredOrigins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return [...new Set([
    ...configuredOrigins,
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ])];
};

export const config: AppConfig = {
  databaseUrl: readRequiredEnv('DATABASE_URL', 'postgres://rag:rag@localhost:5432/rag_hr'),
  port: Number.parseInt(readRequiredEnv('API_PORT', '4000'), 10),
  webOrigins: parseOrigins(readRequiredEnv('WEB_ORIGIN', 'http://localhost:5174')),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  geminiModel: readRequiredEnv('GEMINI_MODEL', 'gemini-3.5-flash'),
  jwtSecret: readRequiredEnv('JWT_SECRET', 'dev-secret-change-me'),
};
