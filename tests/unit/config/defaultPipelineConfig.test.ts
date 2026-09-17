import { defaultPipelineConfig } from '../../../src/config/defaultPipelineConfig';

describe('defaultPipelineConfig', () => {
  it('matches the class multipliers from the exercise statement', () => {
    expect(defaultPipelineConfig.basePrice.classMultipliers).toEqual({
      economy: 1,
      business: 2.5,
      first: 4,
    });
  });

  it('matches the loyalty tier discounts from the exercise statement', () => {
    expect(defaultPipelineConfig.loyaltyDiscount.tierDiscounts).toEqual({
      none: 0,
      bronze: 0.05,
      silver: 0.1,
      gold: 0.15,
    });
  });

  it('matches the passenger type discounts from the exercise statement', () => {
    expect(defaultPipelineConfig.passengerTypeAdjustment.discounts).toEqual({
      child: 0.25,
      adult: 0,
      senior: 0.15,
    });
  });

  it('matches the taxes and fees from the exercise statement', () => {
    expect(defaultPipelineConfig.taxesAndFees.taxRate).toBe(0.12);
    expect(defaultPipelineConfig.taxesAndFees.airportFeeUSD).toBe(25);
    expect(defaultPipelineConfig.taxesAndFees.fuelSurchargeRate).toBe(0.08);
  });

  it('matches the exchange rate retry/timeout/cache defaults', () => {
    expect(defaultPipelineConfig.exchangeRate.timeoutMs).toBe(5000);
    expect(defaultPipelineConfig.exchangeRate.maxAttempts).toBe(3);
    expect(defaultPipelineConfig.exchangeRate.cacheTtlMs).toBe(3_600_000);
  });

  it('excludes JPY from the default fallback rates table', () => {
    expect(defaultPipelineConfig.exchangeRate.fallbackRates['JPY']).toBeUndefined();
    expect(defaultPipelineConfig.exchangeRate.fallbackRates['ARS']).toBeDefined();
  });

  it('has every filter enabled by default', () => {
    expect(defaultPipelineConfig.passengerValidation.enabled).toBe(true);
    expect(defaultPipelineConfig.flightValidation.enabled).toBe(true);
    expect(defaultPipelineConfig.exchangeRate.enabled).toBe(true);
    expect(defaultPipelineConfig.basePrice.enabled).toBe(true);
    expect(defaultPipelineConfig.loyaltyDiscount.enabled).toBe(true);
    expect(defaultPipelineConfig.passengerTypeAdjustment.enabled).toBe(true);
    expect(defaultPipelineConfig.taxesAndFees.enabled).toBe(true);
  });
});
