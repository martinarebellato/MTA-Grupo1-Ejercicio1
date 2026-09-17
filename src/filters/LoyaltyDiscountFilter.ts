import type { Filter } from '../pipeline/Filter';
import { requirePassenger, requireFiniteNonNegative } from '../pipeline/errors';
import { withPricing, type ReservationContext } from '../pipeline/ReservationContext';
import type { LoyaltyTier } from '../domain/passenger';

/** Filter 5 (letra): applies the loyalty tier discount on top of the current price (D4). */
export class LoyaltyDiscountFilter implements Filter {
  readonly name = 'LoyaltyDiscount' as const;

  private readonly tierDiscounts: Readonly<Record<LoyaltyTier, number>>;

  constructor(tierDiscounts: Readonly<Record<LoyaltyTier, number>>) {
    this.tierDiscounts = tierDiscounts;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const passenger = requirePassenger(ctx.passenger);
    const currentPriceUSD = requireFiniteNonNegative(ctx.pricing.currentPriceUSD, 'pricing.currentPriceUSD');
    const discountRate = this.tierDiscounts[passenger.loyaltyTier];
    const loyaltyDiscountUSD = currentPriceUSD * discountRate;

    return withPricing(ctx, {
      loyaltyDiscountUSD,
      currentPriceUSD: currentPriceUSD - loyaltyDiscountUSD,
    });
  }
}
