import { mergePipelineConfig } from '../../../src/config/pipelineConfig';
import { defaultPipelineConfig } from '../../../src/config/defaultPipelineConfig';

describe('mergePipelineConfig', () => {
  it('does not mutate the base config', () => {
    const before = JSON.parse(JSON.stringify(defaultPipelineConfig)) as unknown;
    mergePipelineConfig(defaultPipelineConfig, { taxesAndFees: { taxRate: 0.2 } });
    expect(defaultPipelineConfig).toEqual(before);
  });

  it('updates a single nested field while preserving the rest of that filter config', () => {
    const merged = mergePipelineConfig(defaultPipelineConfig, { taxesAndFees: { taxRate: 0.2 } });
    expect(merged.taxesAndFees.taxRate).toBe(0.2);
    expect(merged.taxesAndFees.airportFeeUSD).toBe(defaultPipelineConfig.taxesAndFees.airportFeeUSD);
    expect(merged.taxesAndFees.fuelSurchargeRate).toBe(defaultPipelineConfig.taxesAndFees.fuelSurchargeRate);
  });

  it('deep-merges nested record fields like fallbackRates without dropping existing entries', () => {
    const merged = mergePipelineConfig(defaultPipelineConfig, {
      exchangeRate: { fallbackRates: { JPY: 150 } },
    });
    expect(merged.exchangeRate.fallbackRates['JPY']).toBe(150);
    expect(merged.exchangeRate.fallbackRates['ARS']).toBe(defaultPipelineConfig.exchangeRate.fallbackRates['ARS']);
  });

  it('deep-merges classMultipliers without dropping other classes', () => {
    const merged = mergePipelineConfig(defaultPipelineConfig, {
      basePrice: { classMultipliers: { business: 3 } },
    });
    expect(merged.basePrice.classMultipliers.business).toBe(3);
    expect(merged.basePrice.classMultipliers.economy).toBe(defaultPipelineConfig.basePrice.classMultipliers.economy);
    expect(merged.basePrice.classMultipliers.first).toBe(defaultPipelineConfig.basePrice.classMultipliers.first);
  });

  it('leaves untouched filters exactly as they were', () => {
    const merged = mergePipelineConfig(defaultPipelineConfig, { loyaltyDiscount: { enabled: false } });
    expect(merged.passengerValidation).toEqual(defaultPipelineConfig.passengerValidation);
    expect(merged.flightValidation).toEqual(defaultPipelineConfig.flightValidation);
    expect(merged.loyaltyDiscount.enabled).toBe(false);
  });

  it('supports an empty partial (no-op merge)', () => {
    const merged = mergePipelineConfig(defaultPipelineConfig, {});
    expect(merged).toEqual(defaultPipelineConfig);
  });
});
