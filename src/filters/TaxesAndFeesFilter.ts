import type { Filter } from '../pipeline/Filter';
import { requireFiniteNonNegative } from '../pipeline/errors';
import { withPricing, type ReservationContext } from '../pipeline/ReservationContext';

/** Filter 7 (letra): computes taxes, fuel surcharge, airport fee and the USD total (D3). */
export class TaxesAndFeesFilter implements Filter {
  readonly name = 'TaxesAndFees' as const;

  private readonly taxRate: number;
  private readonly airportFeeUSD: number;
  private readonly fuelSurchargeRate: number;

  constructor(taxRate: number, airportFeeUSD: number, fuelSurchargeRate: number) {
    this.taxRate = taxRate;
    this.airportFeeUSD = airportFeeUSD;
    this.fuelSurchargeRate = fuelSurchargeRate;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const classBasePriceUSD = requireFiniteNonNegative(ctx.pricing.classBasePriceUSD, 'pricing.classBasePriceUSD');
    const currentPriceUSD = requireFiniteNonNegative(ctx.pricing.currentPriceUSD, 'pricing.currentPriceUSD');
    const taxableBaseUSD = ctx.pricing.subtotalUSD ?? currentPriceUSD;

    const taxesUSD = taxableBaseUSD * this.taxRate;
    const fuelSurchargeUSD = classBasePriceUSD * this.fuelSurchargeRate;
    const totalUSD = taxableBaseUSD + taxesUSD + fuelSurchargeUSD + this.airportFeeUSD;

    return withPricing(ctx, {
      taxesUSD,
      fuelSurchargeUSD,
      airportFeeUSD: this.airportFeeUSD,
      totalUSD,
    });
  }
}
