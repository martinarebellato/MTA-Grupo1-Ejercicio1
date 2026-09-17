import type { SeatClass } from '../domain/flight';
import type { LoyaltyTier, PassengerType } from '../domain/passenger';

export interface PassengerValidationConfig {
  readonly enabled: boolean;
}

export interface FlightValidationConfig {
  readonly enabled: boolean;
}

export interface ExchangeRateConfig {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly retryDelayMs: number;
  readonly cacheTtlMs: number;
  readonly fallbackRates: Readonly<Record<string, number>>;
}

export interface BasePriceConfig {
  readonly enabled: boolean;
  readonly classMultipliers: Readonly<Record<SeatClass, number>>;
}

export interface LoyaltyDiscountConfig {
  readonly enabled: boolean;
  readonly tierDiscounts: Readonly<Record<LoyaltyTier, number>>;
}

export interface PassengerTypeAdjustmentConfig {
  readonly enabled: boolean;
  readonly discounts: Readonly<Record<PassengerType, number>>;
}

export interface TaxesAndFeesConfig {
  readonly enabled: boolean;
  readonly taxRate: number;
  readonly airportFeeUSD: number;
  readonly fuelSurchargeRate: number;
}

export interface PipelineConfig {
  readonly passengerValidation: PassengerValidationConfig;
  readonly flightValidation: FlightValidationConfig;
  readonly exchangeRate: ExchangeRateConfig;
  readonly basePrice: BasePriceConfig;
  readonly loyaltyDiscount: LoyaltyDiscountConfig;
  readonly passengerTypeAdjustment: PassengerTypeAdjustmentConfig;
  readonly taxesAndFees: TaxesAndFeesConfig;
}

export interface PartialPipelineConfig {
  readonly passengerValidation?: Partial<PassengerValidationConfig>;
  readonly flightValidation?: Partial<FlightValidationConfig>;
  readonly exchangeRate?: Partial<Omit<ExchangeRateConfig, 'fallbackRates'>> & {
    readonly fallbackRates?: Readonly<Record<string, number>>;
  };
  readonly basePrice?: Partial<Omit<BasePriceConfig, 'classMultipliers'>> & {
    readonly classMultipliers?: Partial<Record<SeatClass, number>>;
  };
  readonly loyaltyDiscount?: Partial<Omit<LoyaltyDiscountConfig, 'tierDiscounts'>> & {
    readonly tierDiscounts?: Partial<Record<LoyaltyTier, number>>;
  };
  readonly passengerTypeAdjustment?: Partial<Omit<PassengerTypeAdjustmentConfig, 'discounts'>> & {
    readonly discounts?: Partial<Record<PassengerType, number>>;
  };
  readonly taxesAndFees?: Partial<TaxesAndFeesConfig>;
}

export function mergePipelineConfig(base: PipelineConfig, partial: PartialPipelineConfig): PipelineConfig {
  return {
    passengerValidation: { ...base.passengerValidation, ...partial.passengerValidation },
    flightValidation: { ...base.flightValidation, ...partial.flightValidation },
    exchangeRate: {
      ...base.exchangeRate,
      ...partial.exchangeRate,
      fallbackRates: {
        ...base.exchangeRate.fallbackRates,
        ...partial.exchangeRate?.fallbackRates,
      },
    },
    basePrice: {
      ...base.basePrice,
      ...partial.basePrice,
      classMultipliers: {
        ...base.basePrice.classMultipliers,
        ...partial.basePrice?.classMultipliers,
      },
    },
    loyaltyDiscount: {
      ...base.loyaltyDiscount,
      ...partial.loyaltyDiscount,
      tierDiscounts: {
        ...base.loyaltyDiscount.tierDiscounts,
        ...partial.loyaltyDiscount?.tierDiscounts,
      },
    },
    passengerTypeAdjustment: {
      ...base.passengerTypeAdjustment,
      ...partial.passengerTypeAdjustment,
      discounts: {
        ...base.passengerTypeAdjustment.discounts,
        ...partial.passengerTypeAdjustment?.discounts,
      },
    },
    taxesAndFees: { ...base.taxesAndFees, ...partial.taxesAndFees },
  };
}
