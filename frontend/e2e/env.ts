import process from 'node:process';

const TEST_SCHEMA = 'sakucampus_test';

export function getE2eEnv(): Record<string, string> {
  const databaseUrl = process.env.E2E_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL wajib diisi sebelum menjalankan Playwright');
  }

  const options = new URL(databaseUrl).searchParams.get('options') ?? '';

  if (!options.includes(`search_path=${TEST_SCHEMA}`)) {
    throw new Error(`E2E_DATABASE_URL harus memakai schema ${TEST_SCHEMA}`);
  }

  return {
    ENVIRONMENT: 'test',
    DATABASE_URL: databaseUrl,
    JWT_SECRET: process.env.E2E_JWT_SECRET ?? 'e2e-secret-with-at-least-thirty-two-characters',
    ACCESS_TOKEN_EXPIRE_MINUTES: '60',
    CORS_ORIGINS: 'http://127.0.0.1:5173',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_BOT_USERNAME: '',
    TELEGRAM_WEBHOOK_SECRET: 'e2e-webhook-secret-1234',
  };
}
