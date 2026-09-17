import type { Filter } from '../pipeline/Filter';
import { requirePassenger, requireFiniteNonNegative } from '../pipeline/errors';
import { withPricing, type ReservationContext } from '../pipeline/ReservationContext';
import type { PassengerType } from '../domain/passenger';

/** Filter 6 (letra): applies the passenger-type discount on top of the current price (D4, D6). */
export class PassengerTypeAdjustmentFilter implements Filter {
  readonly name = 'PassengerTypeAdjustment' as const;

  private readonly discounts: Readonly<Record<PassengerType, number>>;

  constructor(discounts: Readonly<Record<PassengerType, number>>) {
    this.discounts = discounts;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const passenger = requirePassenger(ctx.passenger);
    const currentPriceUSD = requireFiniteNonNegative(ctx.pricing.currentPriceUSD, 'pricing.currentPriceUSD');
    const discountRate = this.discounts[passenger.passengerType];
    const passengerTypeDiscountUSD = currentPriceUSD * discountRate;
    const subtotalUSD = currentPriceUSD - passengerTypeDiscountUSD;

    return withPricing(ctx, {
      passengerTypeDiscountUSD,
      subtotalUSD,
      currentPriceUSD: subtotalUSD,
    });
  }
}
