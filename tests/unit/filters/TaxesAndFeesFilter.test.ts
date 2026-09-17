import { TaxesAndFeesFilter } from '../../../src/filters/TaxesAndFeesFilter';
import { CorruptContextError } from '../../../src/pipeline/errors';
import { withPricing } from '../../../src/pipeline/ReservationContext';
import { buildContext } from '../../helpers/builders';

describe('TaxesAndFeesFilter', () => {
  const filter = new TaxesAndFeesFilter(0.12, 25, 0.08);

  it('P2: subtotal 170, classBase 200 -> taxes 20.40, fuel 16, fee 25, total 231.40', async () => {
    const ctx = withPricing(buildContext(), { classBasePriceUSD: 200, currentPriceUSD: 170, subtotalUSD: 170 });
    const result = await filter.process(ctx);
    expect(result.pricing.taxesUSD).toBeCloseTo(20.4, 10);
    expect(result.pricing.fuelSurchargeUSD).toBe(16);
    expect(result.pricing.airportFeeUSD).toBe(25);
    expect(result.pricing.totalUSD).toBeCloseTo(231.4, 10);
  });

  it('P3: subtotal 159.375, classBase 250 -> total 223.50', async () => {
    const ctx = withPricing(buildContext(), { classBasePriceUSD: 250, currentPriceUSD: 159.375, subtotalUSD: 159.375 });
    const result = await filter.process(ctx);
    expect(result.pricing.totalUSD).toBeCloseTo(223.5, 10);
  });

  it('uses currentPriceUSD as the taxable base when subtotalUSD is absent (F5/F6 disabled)', async () => {
    const ctx = withPricing(buildContext(), { classBasePriceUSD: 200, currentPriceUSD: 200 });
    const result = await filter.process(ctx);
    expect(result.pricing.taxesUSD).toBe(24);
    expect(result.pricing.totalUSD).toBe(265);
  });

  it('throws CorruptContextError when classBasePriceUSD is missing', async () => {
    const ctx = withPricing(buildContext(), { currentPriceUSD: 200 });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });

  it('throws CorruptContextError when currentPriceUSD is missing', async () => {
    const ctx = withPricing(buildContext(), { classBasePriceUSD: 200 });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });
});
