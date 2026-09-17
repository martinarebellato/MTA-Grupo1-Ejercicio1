import { PassengerTypeAdjustmentFilter } from '../../../src/filters/PassengerTypeAdjustmentFilter';
import { CorruptContextError } from '../../../src/pipeline/errors';
import { withPricing } from '../../../src/pipeline/ReservationContext';
import { buildContext, buildPassenger } from '../../helpers/builders';

const discounts = { child: 0.25, adult: 0, senior: 0.15 };

describe('PassengerTypeAdjustmentFilter', () => {
  const filter = new PassengerTypeAdjustmentFilter(discounts);

  it('applies 25% discount for a child over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ passengerType: 'child' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.subtotalUSD).toBe(150);
    expect(result.pricing.currentPriceUSD).toBe(150);
  });

  it('applies 15% discount for a senior over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ passengerType: 'senior' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.subtotalUSD).toBe(170);
  });

  it('applies no discount for an adult over 200', async () => {
    const ctx = withPricing(buildContext({ passenger: buildPassenger({ passengerType: 'adult' }) }), {
      currentPriceUSD: 200,
    });
    const result = await filter.process(ctx);
    expect(result.pricing.subtotalUSD).toBe(200);
    expect(result.pricing.passengerTypeDiscountUSD).toBe(0);
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
