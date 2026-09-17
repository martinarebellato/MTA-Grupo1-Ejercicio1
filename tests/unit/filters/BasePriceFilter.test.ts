import { BasePriceFilter } from '../../../src/filters/BasePriceFilter';
import { CorruptContextError } from '../../../src/pipeline/errors';
import { buildContext, buildFlight, buildReservation } from '../../helpers/builders';

const multipliers = { economy: 1, business: 2.5, first: 4 };

describe('BasePriceFilter', () => {
  const filter = new BasePriceFilter(multipliers);

  it('computes economy price with a 1x multiplier', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ seatClass: 'economy' }),
      flight: buildFlight({ basePriceUSD: 100 }),
    });
    const result = await filter.process(ctx);
    expect(result.pricing.classBasePriceUSD).toBe(100);
    expect(result.pricing.currentPriceUSD).toBe(100);
  });

  it('computes business price with a 2.5x multiplier', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ seatClass: 'business' }),
      flight: buildFlight({ basePriceUSD: 100 }),
    });
    const result = await filter.process(ctx);
    expect(result.pricing.classBasePriceUSD).toBe(250);
  });

  it('computes first class price with a 4x multiplier', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ seatClass: 'first' }),
      flight: buildFlight({ basePriceUSD: 100 }),
    });
    const result = await filter.process(ctx);
    expect(result.pricing.classBasePriceUSD).toBe(400);
  });

  it('uses the multipliers injected via config, not hardcoded ones', async () => {
    const customFilter = new BasePriceFilter({ economy: 2, business: 3, first: 5 });
    const ctx = buildContext({
      reservation: buildReservation({ seatClass: 'economy' }),
      flight: buildFlight({ basePriceUSD: 100 }),
    });
    const result = await customFilter.process(ctx);
    expect(result.pricing.classBasePriceUSD).toBe(200);
  });

  it('R4: throws CorruptContextError when flight is null', async () => {
    const ctx = buildContext({ flight: null });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });

  it('R4: throws CorruptContextError when basePriceUSD is NaN', async () => {
    const ctx = buildContext({ flight: buildFlight({ basePriceUSD: NaN }) });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });

  it('R4: throws CorruptContextError when basePriceUSD is negative', async () => {
    const ctx = buildContext({ flight: buildFlight({ basePriceUSD: -10 }) });
    await expect(filter.process(ctx)).rejects.toThrow(CorruptContextError);
  });
});
