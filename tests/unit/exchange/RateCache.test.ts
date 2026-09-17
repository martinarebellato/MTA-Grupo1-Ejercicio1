import { RateCache } from '../../../src/services/exchange/RateCache';
import { FakeClock } from '../../helpers/FakeClock';

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('RateCache', () => {
  it('returns a hit before the TTL elapses', () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const cache = new RateCache(clock);

    cache.set('USD', { ARS: 1000 });
    clock.advance(ONE_HOUR_MS - 1);

    expect(cache.get('USD', ONE_HOUR_MS)).toEqual({
      rates: { ARS: 1000 },
      fetchedAt: new Date('2024-01-01T00:00:00.000Z'),
    });
  });

  it('returns a miss once the TTL has fully elapsed', () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const cache = new RateCache(clock);

    cache.set('USD', { ARS: 1000 });
    clock.advance(ONE_HOUR_MS);

    expect(cache.get('USD', ONE_HOUR_MS)).toBeNull();
  });

  it('returns null for a base currency that was never cached', () => {
    const cache = new RateCache(new FakeClock());
    expect(cache.get('USD', ONE_HOUR_MS)).toBeNull();
  });

  it('invalidate() empties the cache', () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const cache = new RateCache(clock);

    cache.set('USD', { ARS: 1000 });
    cache.invalidate();

    expect(cache.get('USD', ONE_HOUR_MS)).toBeNull();
  });

  it('respects a different ttlMs passed at get() time (per-call override)', () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const cache = new RateCache(clock);

    cache.set('USD', { ARS: 1000 });
    clock.advance(5000);

    expect(cache.get('USD', 10000)).not.toBeNull();
    expect(cache.get('USD', 1000)).toBeNull();
  });
});
