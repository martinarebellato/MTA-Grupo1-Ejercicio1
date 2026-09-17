import { SystemClock } from '../../../src/shared/clock';
import { FakeClock } from '../../helpers/FakeClock';

describe('SystemClock', () => {
  it('returns the current date', () => {
    const before = Date.now();
    const clock = new SystemClock();
    const now = clock.now().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe('FakeClock', () => {
  it('returns a fixed time by default', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    expect(clock.now()).toEqual(new Date('2024-06-01T00:00:00.000Z'));
  });

  it('allows setting a new fixed time', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    clock.set(new Date('2025-01-01T00:00:00.000Z'));
    expect(clock.now()).toEqual(new Date('2025-01-01T00:00:00.000Z'));
  });

  it('allows advancing the time by a duration', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    clock.advance(60 * 60 * 1000);
    expect(clock.now()).toEqual(new Date('2024-06-01T01:00:00.000Z'));
  });

  it('returns a defensive copy so callers cannot mutate internal state', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    const first = clock.now();
    first.setFullYear(1999);
    expect(clock.now()).toEqual(new Date('2024-06-01T00:00:00.000Z'));
  });
});
