import { partialPipelineConfigSchema } from '../../../src/http/schemas/pipelineConfig.schema';

describe('partialPipelineConfigSchema', () => {
  it('accepts a valid partial config touching a single nested field', () => {
    const result = partialPipelineConfigSchema.safeParse({ taxesAndFees: { taxRate: 0.2 } });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(partialPipelineConfigSchema.safeParse({}).success).toBe(true);
  });

  it('rejects exchangeRate.timeoutMs greater than 5000', () => {
    const result = partialPipelineConfigSchema.safeParse({ exchangeRate: { timeoutMs: 10000 } });
    expect(result.success).toBe(false);
  });

  it('rejects exchangeRate.maxAttempts outside 1-3', () => {
    expect(partialPipelineConfigSchema.safeParse({ exchangeRate: { maxAttempts: 0 } }).success).toBe(false);
    expect(partialPipelineConfigSchema.safeParse({ exchangeRate: { maxAttempts: 4 } }).success).toBe(false);
  });

  it('rejects percentages outside [0,1]', () => {
    expect(partialPipelineConfigSchema.safeParse({ taxesAndFees: { taxRate: 1.5 } }).success).toBe(false);
    expect(partialPipelineConfigSchema.safeParse({ taxesAndFees: { taxRate: -0.1 } }).success).toBe(false);
    expect(
      partialPipelineConfigSchema.safeParse({ loyaltyDiscount: { tierDiscounts: { gold: 1.2 } } }).success,
    ).toBe(false);
    expect(
      partialPipelineConfigSchema.safeParse({ passengerTypeAdjustment: { discounts: { child: -0.1 } } }).success,
    ).toBe(false);
  });

  it('rejects negative monetary amounts', () => {
    expect(partialPipelineConfigSchema.safeParse({ taxesAndFees: { airportFeeUSD: -25 } }).success).toBe(false);
    expect(
      partialPipelineConfigSchema.safeParse({ basePrice: { classMultipliers: { economy: -1 } } }).success,
    ).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = partialPipelineConfigSchema.safeParse({ notARealFilter: { enabled: true } });
    expect(result.success).toBe(false);
  });

  it('rejects unknown nested keys', () => {
    const result = partialPipelineConfigSchema.safeParse({ taxesAndFees: { notAField: 1 } });
    expect(result.success).toBe(false);
  });
});
