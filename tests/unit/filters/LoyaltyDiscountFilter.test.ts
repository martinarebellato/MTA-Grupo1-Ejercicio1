import { LoyaltyDiscountFilter } from '../../../src/filters/LoyaltyDiscountFilter';
import { CorruptContextError } from '../../../src/pipeline/errors';
import { withPricing } from '../../../src/pipeline/ReservationContext';
import { buildContext, buildPassenger } from '../../helpers/builders';

const tierDiscounts = { none: 0, bronze: 0.05, silver: 0.1, gold: 0.15 };

describe('LoyaltyDiscountFilter', () => {
  const filter = new LoyaltyDiscountFilter(tierDiscounts);

  it('applies no discount for tier none over 200', async () => {
    const ctx = withPricing(
      buildContext({ passenger: buildPassenger({ loyaltyTier: 'none' }) }),
      { currentPriceUSD: 200 },
    );
    const result = await filter.process(ctx);
    expect(result.pricing.currentPriceUSD).toBe(200);
    expect(result.pricing.loyaltyDiscountUSD).toBe(0);
  });

  it('applies 5% discount for bronze over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ loyaltyTier: 'bronze' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.currentPriceUSD).toBe(190);
  });

  it('applies 10% discount for silver over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ loyaltyTier: 'silver' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.currentPriceUSD).toBe(180);
  });

  it('applies 15% discount for gold over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ loyaltyTier: 'gold' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.currentPriceUSD).toBe(170);
    expect(result.pricing.loyaltyDiscountUSD).toBe(30);
  });

  it('throws CorruptContextError when passenger is null', async () => {
    const ctx = withPricing(buildContext({ passenger: null }), { currentPriceUSD: 200 });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });

  it('throws CorruptContextError when there is no previous price', async () => {
    const ctx = buildContext();
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });
});
