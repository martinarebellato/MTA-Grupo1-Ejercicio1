import type { PipelineConfig } from './pipelineConfig';

/**
 * Default pipeline configuration using the exact values from the exercise statement.
 * `fallbackRates` intentionally excludes JPY so the JL005 fixture (destination JP) exercises
 * the fallback-to-USD path when the exchange API is unavailable.
 */
export const defaultPipelineConfig: PipelineConfig = {
  passengerValidation: { enabled: true },
  flightValidation: { enabled: true },
  exchangeRate: {
    enabled: true,
    timeoutMs: 5000,
    maxAttempts: 3,
    retryDelayMs: 100,
    cacheTtlMs: 3_600_000,
    fallbackRates: {
      ARS: 1000,
      BRL: 5.4,
      EUR: 0.92,
      CLP: 950,
      UYU: 40,
      MXN: 18,
    },
  },
  basePrice: {
    enabled: true,
    classMultipliers: {
      economy: 1,
      business: 2.5,
      first: 4,
    },
  },
  loyaltyDiscount: {
    enabled: true,
    tierDiscounts: {
      none: 0,
      bronze: 0.05,
      silver: 0.1,
      gold: 0.15,
    },
  },
  passengerTypeAdjustment: {
    enabled: true,
    discounts: {
      child: 0.25,
      adult: 0,
      senior: 0.15,
    },
  },
  taxesAndFees: {
    enabled: true,
    taxRate: 0.12,
    airportFeeUSD: 25,
    fuelSurchargeRate: 0.08,
  },
};
