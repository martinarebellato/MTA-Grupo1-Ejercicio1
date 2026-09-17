import { z } from 'zod';

const percentage = z.number().min(0).max(1);
const nonNegative = z.number().min(0);

const passengerValidationSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const flightValidationSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const exchangeRateSchema = z
  .object({
    enabled: z.boolean().optional(),
    timeoutMs: z.number().int().positive().max(5000).optional(),
    maxAttempts: z.number().int().min(1).max(3).optional(),
    retryDelayMs: nonNegative.optional(),
    cacheTtlMs: nonNegative.optional(),
    fallbackRates: z.record(z.string(), z.number().positive()).optional(),
  })
  .strict();

const basePriceSchema = z
  .object({
    enabled: z.boolean().optional(),
    classMultipliers: z
      .object({
        economy: nonNegative.optional(),
        business: nonNegative.optional(),
        first: nonNegative.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const loyaltyDiscountSchema = z
  .object({
    enabled: z.boolean().optional(),
    tierDiscounts: z
      .object({
        none: percentage.optional(),
        bronze: percentage.optional(),
        silver: percentage.optional(),
        gold: percentage.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const passengerTypeAdjustmentSchema = z
  .object({
    enabled: z.boolean().optional(),
    discounts: z
      .object({
        child: percentage.optional(),
        adult: percentage.optional(),
        senior: percentage.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const taxesAndFeesSchema = z
  .object({
    enabled: z.boolean().optional(),
    taxRate: percentage.optional(),
    airportFeeUSD: nonNegative.optional(),
    fuelSurchargeRate: percentage.optional(),
  })
  .strict();

export const partialPipelineConfigSchema = z
  .object({
    passengerValidation: passengerValidationSchema.optional(),
    flightValidation: flightValidationSchema.optional(),
    exchangeRate: exchangeRateSchema.optional(),
    basePrice: basePriceSchema.optional(),
    loyaltyDiscount: loyaltyDiscountSchema.optional(),
    passengerTypeAdjustment: passengerTypeAdjustmentSchema.optional(),
    taxesAndFees: taxesAndFeesSchema.optional(),
  })
  .strict();

export type PartialPipelineConfigInput = z.infer<typeof partialPipelineConfigSchema>;
