const DEFAULT_PORT = 3000;
const DEFAULT_EXCHANGE_API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';
const DEFAULT_LOG_LEVEL = 'info';

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export interface Env {
  readonly PORT: number;
  readonly EXCHANGE_API_BASE_URL: string;
  readonly LOG_LEVEL: string;
}

export const env: Env = {
  PORT: parsePort(process.env['PORT']),
  EXCHANGE_API_BASE_URL: process.env['EXCHANGE_API_BASE_URL'] ?? DEFAULT_EXCHANGE_API_BASE_URL,
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? DEFAULT_LOG_LEVEL,
};
