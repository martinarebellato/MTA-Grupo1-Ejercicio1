export interface PricingBreakdown {
  readonly flightBasePriceUSD?: number;
  readonly classBasePriceUSD?: number;
  readonly currentPriceUSD?: number;
  readonly loyaltyDiscountUSD?: number;
  readonly passengerTypeDiscountUSD?: number;
  readonly subtotalUSD?: number;
  readonly taxesUSD?: number;
  readonly fuelSurchargeUSD?: number;
  readonly airportFeeUSD?: number;
  readonly totalUSD?: number;
}

export type ExchangeRateSource = 'api' | 'cache' | 'fallback-default' | 'fallback-usd';

export interface ExchangeMetadata {
  readonly baseCurrency: string;
  readonly targetCurrency: string;
  readonly rate: number;
  readonly source: ExchangeRateSource;
  readonly retrievedAt: Date;
  readonly originalPrice: number;
  readonly convertedPrice: number;
}
