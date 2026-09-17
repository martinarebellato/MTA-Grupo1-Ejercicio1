import { ExchangeRateFilter } from '../../../src/filters/ExchangeRateFilter';
import type {
  ExchangeRateOperationalConfig,
  ExchangeRateService,
  RateResult,
} from '../../../src/services/exchange/ExchangeRateService';
import { buildContext, buildFlight } from '../../helpers/builders';

const NOW = new Date('2024-01-01T00:00:00.000Z');

const TEST_CONFIG: ExchangeRateOperationalConfig = {
  timeoutMs: 1000,
  maxAttempts: 3,
  retryDelayMs: 0,
  cacheTtlMs: 3_600_000,
  fallbackRates: {},
};

class FakeExchangeRateService implements ExchangeRateService {
  constructor(private readonly result: RateResult) {}

  async getRate(): Promise<RateResult> {
    return this.result;
  }

  invalidateCache(): void {
    // no-op
  }
}

describe('ExchangeRateFilter', () => {
  it('C1: destination AR with rate 1000 converts base 150 to 150000 ARS with full metadata', async () => {
    const service = new FakeExchangeRateService({ rate: 1000, source: 'api', retrievedAt: NOW });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'AR', basePriceUSD: 150 }) });

    const result = await filter.process(ctx);

    expect(result.metadata.exchange).toEqual({
      baseCurrency: 'USD',
      targetCurrency: 'ARS',
      rate: 1000,
      source: 'api',
      retrievedAt: NOW,
      originalPrice: 150,
      convertedPrice: 150000,
    });
    expect(result.issues).toEqual([]);
  });

  it('C2: destination BR resolves BRL with its rate', async () => {
    const service = new FakeExchangeRateService({ rate: 5.4, source: 'api', retrievedAt: NOW });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'BR', basePriceUSD: 100 }) });

    const result = await filter.process(ctx);

    expect(result.metadata.exchange?.targetCurrency).toBe('BRL');
    expect(result.metadata.exchange?.convertedPrice).toBe(540);
  });

  it('C2: destination ES resolves EUR with its rate', async () => {
    const service = new FakeExchangeRateService({ rate: 0.92, source: 'api', retrievedAt: NOW });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'ES', basePriceUSD: 800 }) });

    const result = await filter.process(ctx);

    expect(result.metadata.exchange?.targetCurrency).toBe('EUR');
    expect(result.metadata.exchange?.convertedPrice).toBeCloseTo(736, 10);
  });

  it('destination US resolves USD with rate 1 and no warning', async () => {
    const service = new FakeExchangeRateService({ rate: 1, source: 'api', retrievedAt: NOW });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'US', basePriceUSD: 200 }) });

    const result = await filter.process(ctx);

    expect(result.metadata.exchange?.targetCurrency).toBe('USD');
    expect(result.metadata.exchange?.rate).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it('C3: a fallback source adds a warning and does not halt the reservation', async () => {
    const service = new FakeExchangeRateService({
      rate: 1000,
      source: 'fallback-default',
      retrievedAt: NOW,
      failureReason: 'network down',
    });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'AR', basePriceUSD: 150 }) });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([
      expect.objectContaining({ severity: 'warning', code: 'EXCHANGE_RATE_FALLBACK' }),
    ]);
    expect(result.halted).toBe(false);
  });

  it('an unmapped country adds a warning and defaults to USD', async () => {
    const service = new FakeExchangeRateService({ rate: 1, source: 'api', retrievedAt: NOW });
    const filter = new ExchangeRateFilter(service, TEST_CONFIG);
    const ctx = buildContext({ flight: buildFlight({ destinationCountry: 'ZZ', basePriceUSD: 200 }) });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([
      expect.objectContaining({ severity: 'warning', code: 'UNKNOWN_DESTINATION_CURRENCY' }),
    ]);
    expect(result.metadata.exchange?.targetCurrency).toBe('USD');
    expect(result.halted).toBe(false);
  });
});
