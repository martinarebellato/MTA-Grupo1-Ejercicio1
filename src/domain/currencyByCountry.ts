/**
 * Country (ISO 3166-1 alpha-2, plus the literal "EU" used by the exercise statement) → currency
 * (ISO 4217) map. Eurozone countries all resolve to EUR.
 */
const COUNTRY_TO_CURRENCY: Readonly<Record<string, string>> = {
  AR: 'ARS',
  BR: 'BRL',
  US: 'USD',
  CL: 'CLP',
  UY: 'UYU',
  MX: 'MXN',
  CO: 'COP',
  PE: 'PEN',
  GB: 'GBP',
  JP: 'JPY',
  EU: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  HR: 'EUR',
};

export function currencyForCountry(countryCode: string): string | null {
  const normalized = countryCode.toUpperCase();
  return COUNTRY_TO_CURRENCY[normalized] ?? null;
}
