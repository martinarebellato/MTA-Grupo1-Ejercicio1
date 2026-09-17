import type { Filter, FilterName } from '../../../src/pipeline/Filter';
import { Pipeline, type PipelineStage } from '../../../src/pipeline/Pipeline';
import { withError, withPricing, type ReservationContext } from '../../../src/pipeline/ReservationContext';
import { CorruptContextError } from '../../../src/pipeline/errors';
import { SilentLogger } from '../../../src/shared/logger';
import { FakeClock } from '../../helpers/FakeClock';
import { buildContext } from '../../helpers/builders';

function fakeFilter(
  name: FilterName,
  behavior: (ctx: ReservationContext) => ReservationContext | Promise<ReservationContext>,
): Filter {
  return {
    name,
    process: async (ctx) => behavior(ctx),
  };
}

function stage(filter: Filter, enabled = true): PipelineStage {
  return { filter, enabled };
}

describe('Pipeline', () => {
  it('runs filters in order, each receiving the previous output', async () => {
    const order: string[] = [];
    const f1 = fakeFilter('BasePrice', (ctx) => {
      order.push('BasePrice');
      return withPricing(ctx, { currentPriceUSD: 100 });
    });
    const f2 = fakeFilter('LoyaltyDiscount', (ctx) => {
      order.push('LoyaltyDiscount');
      expect(ctx.pricing.currentPriceUSD).toBe(100);
      return withPricing(ctx, { currentPriceUSD: 90 });
    });

    const pipeline = new Pipeline([stage(f1), stage(f2)], new FakeClock(), new SilentLogger());
    const result = await pipeline.run(buildContext());

    expect(order).toEqual(['BasePrice', 'LoyaltyDiscount']);
    expect(result.pricing.currentPriceUSD).toBe(90);
  });

  it('does not execute a disabled filter and marks it as disabled in the trace', async () => {
    const executed = jest.fn();
    const f1 = fakeFilter('LoyaltyDiscount', (ctx) => {
      executed();
      return ctx;
    });

    const pipeline = new Pipeline([stage(f1, false)], new FakeClock(), new SilentLogger());
    const result = await pipeline.run(buildContext());

    expect(executed).not.toHaveBeenCalled();
    expect(result.trace).toEqual([{ filter: 'LoyaltyDiscount', status: 'disabled', durationMs: 0 }]);
  });

  it('marks subsequent filters as skipped once the context is halted', async () => {
    const f1 = fakeFilter('PassengerValidation', (ctx) =>
      withError(ctx, 'PassengerValidation', 'PASSENGER_NOT_FOUND', 'not found'),
    );
    const f2Executed = jest.fn();
    const f2 = fakeFilter('FlightValidation', (ctx) => {
      f2Executed();
      return ctx;
    });

    const pipeline = new Pipeline([stage(f1), stage(f2)], new FakeClock(), new SilentLogger());
    const result = await pipeline.run(buildContext());

    expect(f2Executed).not.toHaveBeenCalled();
    expect(result.halted).toBe(true);
    expect(result.trace).toEqual([
      { filter: 'PassengerValidation', status: 'ok', durationMs: 0 },
      { filter: 'FlightValidation', status: 'skipped', durationMs: 0 },
    ]);
  });

  it('R2: a filter that throws a generic Error produces FILTER_EXCEPTION, skips the rest and never throws', async () => {
    const f1 = fakeFilter('BasePrice', () => {
      throw new Error('boom');
    });
    const f2Executed = jest.fn();
    const f2 = fakeFilter('LoyaltyDiscount', (ctx) => {
      f2Executed();
      return ctx;
    });

    const pipeline = new Pipeline([stage(f1), stage(f2)], new FakeClock(), new SilentLogger());

    let result: ReservationContext | undefined;
    await expect(
      (async () => {
        result = await pipeline.run(buildContext());
      })(),
    ).resolves.not.toThrow();

    expect(f2Executed).not.toHaveBeenCalled();
    expect(result?.halted).toBe(true);
    expect(result?.issues).toEqual([
      { severity: 'error', code: 'FILTER_EXCEPTION', message: 'boom', filter: 'BasePrice' },
    ]);
    expect(result?.trace).toEqual([
      { filter: 'BasePrice', status: 'failed', durationMs: 0 },
      { filter: 'LoyaltyDiscount', status: 'skipped', durationMs: 0 },
    ]);
  });

  it('R4: a filter that throws CorruptContextError produces a CORRUPT_CONTEXT issue', async () => {
    const f1 = fakeFilter('BasePrice', () => {
      throw new CorruptContextError('basePriceUSD is NaN');
    });

    const pipeline = new Pipeline([stage(f1)], new FakeClock(), new SilentLogger());
    const result = await pipeline.run(buildContext());

    expect(result.halted).toBe(true);
    expect(result.issues).toEqual([
      { severity: 'error', code: 'CORRUPT_CONTEXT', message: 'basePriceUSD is NaN', filter: 'BasePrice' },
    ]);
    expect(result.trace).toEqual([{ filter: 'BasePrice', status: 'failed', durationMs: 0 }]);
  });

  it('records the duration of each filter using the injected clock', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const f1 = fakeFilter('BasePrice', (ctx) => {
      clock.advance(42);
      return ctx;
    });

    const pipeline = new Pipeline([stage(f1)], clock, new SilentLogger());
    const result = await pipeline.run(buildContext());

    expect(result.trace).toEqual([{ filter: 'BasePrice', status: 'ok', durationMs: 42 }]);
  });

  it('never propagates exceptions thrown by filters', async () => {
    const f1 = fakeFilter('BasePrice', () => {
      throw new Error('unexpected');
    });

    const pipeline = new Pipeline([stage(f1)], new FakeClock(), new SilentLogger());
    await expect(pipeline.run(buildContext())).resolves.toBeDefined();
  });
});
