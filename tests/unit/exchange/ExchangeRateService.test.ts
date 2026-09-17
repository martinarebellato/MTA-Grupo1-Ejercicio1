import { DefaultExchangeRateService, type ExchangeRateOperationalConfig } from '../../../src/services/exchange/ExchangeRateService';
import { FakeExchangeRateProvider } from '../../helpers/FakeExchangeRateProvider';
import { FakeClock } from '../../helpers/FakeClock';
import type { Logger, LogContext } from '../../../src/shared/logger';

const ONE_HOUR_MS = 60 * 60 * 1000;

const opConfig: ExchangeRateOperationalConfig = {
  timeoutMs: 1000,
  maxAttempts: 3,
  retryDelayMs: 0,
  cacheTtlMs: ONE_HOUR_MS,
  fallbackRates: { ARS: 1000 },
};

class SpyLogger implements Logger {
  readonly warnCalls: Array<{ message: string; context?: LogContext }> = [];
  readonly errorCalls: Array<{ message: string; context?: LogContext }> = [];

  debug(): void {
    // no-op
  }

  info(): void {
    // no-op
  }

  warn(message: string, context?: LogContext): void {
    this.warnCalls.push(context === undefined ? { message } : { message, context });
  }

  error(message: string, context?: LogContext): void {
    this.errorCalls.push(context === undefined ? { message } : { message, context });
  }
}

describe('DefaultExchangeRateService', () => {
  it('the first call fetches from the API and calls the provider once', async () => {
    const provider = new FakeExchangeRateProvider().succeedWith({ ARS: 1000 });
    const clock = new FakeClock();
    const service = new DefaultExchangeRateService(provider, clock, new SpyLogger());

    const result = await service.getRate('ARS', opConfig);

    expect(result).toMatchObject({ rate: 1000, source: 'api' });
    expect(provider.calls).toBe(1);
  });

  it('C4: a second call within the TTL hits the cache and does not call the provider again; after the TTL it does', async () => {
    const provider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const service = new DefaultExchangeRateService(provider, clock, new SpyLogger());

    await service.getRate('ARS', opConfig);
    const second = await service.getRate('ARS', opConfig);
    expect(second.source).toBe('cache');
    expect(provider.calls).toBe(1);

    clock.advance(ONE_HOUR_MS);
    const third = await service.getRate('ARS', opConfig);
    expect(third.source).toBe('api');
    expect(provider.calls).toBe(2);
  });

  it('invalidateCache() forces a new provider call', async () => {
    const provider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const service = new DefaultExchangeRateService(provider, new FakeClock(), new SpyLogger());

    await service.getRate('ARS', opConfig);
    service.invalidateCache();
    await service.getRate('ARS', opConfig);

    expect(provider.calls).toBe(2);
  });

  it('C3/R1/R3: after 3 failed attempts it returns fallback-default with the table rate and logs warn x3 + error x1', async () => {
    const provider = new FakeExchangeRateProvider().alwaysFailWith(new Error('network down'));
    const logger = new SpyLogger();
    const service = new DefaultExchangeRateService(provider, new FakeClock(), logger);

    const result = await service.getRate('ARS', opConfig);

    expect(result.source).toBe('fallback-default');
    expect(result.rate).toBe(1000);
    expect(provider.calls).toBe(3);
    expect(logger.warnCalls).toHaveLength(3);
    expect(logger.errorCalls).toHaveLength(1);
  });

  it('falls back to USD (rate 1) for a currency outside the fallback table', async () => {
    const provider = new FakeExchangeRateProvider().alwaysFailWith(new Error('network down'));
    const service = new DefaultExchangeRateService(provider, new FakeClock(), new SpyLogger());

    const result = await service.getRate('JPY', opConfig);

    expect(result.source).toBe('fallback-usd');
    expect(result.rate).toBe(1);
  });

  it('10 concurrent getRate calls trigger a single provider call (single-flight)', async () => {
    const provider = new FakeExchangeRateProvider().succeedWith({ ARS: 1000 });
    const service = new DefaultExchangeRateService(provider, new FakeClock(), new SpyLogger());

    const results = await Promise.all(Array.from({ length: 10 }, () => service.getRate('ARS', opConfig)));

    expect(provider.calls).toBe(1);
    results.forEach((result) => expect(result.rate).toBe(1000));
  });

  it('succeeds on the 2nd attempt with source api', async () => {
    const provider = new FakeExchangeRateProvider().failWith(new Error('fail once')).succeedWith({ ARS: 1000 });
    const service = new DefaultExchangeRateService(provider, new FakeClock(), new SpyLogger());

    const result = await service.getRate('ARS', opConfig);

    expect(result.source).toBe('api');
    expect(provider.calls).toBe(2);
  });

  it('honors a per-call cacheTtlMs override against the shared cache', async () => {
    const provider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const service = new DefaultExchangeRateService(provider, clock, new SpyLogger());

    await service.getRate('ARS', opConfig);
    clock.advance(5000);

    const stillFresh = await service.getRate('ARS', { ...opConfig, cacheTtlMs: 10000 });
    expect(stillFresh.source).toBe('cache');

    const nowStale = await service.getRate('ARS', { ...opConfig, cacheTtlMs: 1000 });
    expect(nowStale.source).toBe('api');
    expect(provider.calls).toBe(2);
  });

  it('resolves USD to rate 1 without calling the provider', async () => {
    const provider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const service = new DefaultExchangeRateService(provider, new FakeClock(), new SpyLogger());

    const result = await service.getRate('USD', opConfig);

    expect(result).toMatchObject({ rate: 1 });
    expect(provider.calls).toBe(0);
  });
});
