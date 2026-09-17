import type { Filter } from '../pipeline/Filter';
import { requireFlight, requireFiniteNonNegative } from '../pipeline/errors';
import { withPricing, type ReservationContext } from '../pipeline/ReservationContext';
import type { SeatClass } from '../domain/flight';

/** Filter 4 (letra): computes the per-class base price from the flight's USD base price. */
export class BasePriceFilter implements Filter {
  readonly name = 'BasePrice' as const;

  private readonly classMultipliers: Readonly<Record<SeatClass, number>>;

  constructor(classMultipliers: Readonly<Record<SeatClass, number>>) {
    this.classMultipliers = classMultipliers;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const flight = requireFlight(ctx.flight);
    const basePriceUSD = requireFiniteNonNegative(flight.basePriceUSD, 'flight.basePriceUSD');
    const multiplier = this.classMultipliers[ctx.reservation.seatClass];
    const classBasePriceUSD = basePriceUSD * multiplier;

    return withPricing(ctx, {
      flightBasePriceUSD: basePriceUSD,
      classBasePriceUSD,
      currentPriceUSD: classBasePriceUSD,
    });
  }
}
