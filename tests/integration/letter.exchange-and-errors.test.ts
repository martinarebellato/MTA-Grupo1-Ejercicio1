import request from 'supertest';
import { testApp } from '../helpers/testApp';
import { FakeClock } from '../helpers/FakeClock';
import { FakeExchangeRateProvider } from '../helpers/FakeExchangeRateProvider';
import { InMemoryFlightRepository } from '../../src/repositories/FlightRepository';
import type { Flight } from '../../src/domain/flight';
import type { ExchangeRateService, RateResult } from '../../src/services/exchange/ExchangeRateService';

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('Letter — exchange rates and error handling (C1-C4, R1-R4)', () => {
  it('C1: destination AR resolves ARS with full metadata (source api) and totalLocal', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const { app } = testApp({ clock, exchangeRateProvider });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'C1', passengerId: 'PAX-001', flightCode: 'LA4567', origin: 'SCL', destination: 'EZE', seatClass: 'economy' },
        ],
      });

    const result = res.body.results[0];
    expect(result.exchange).toMatchObject({
      baseCurrency: 'USD',
      targetCurrency: 'ARS',
      rate: 1000,
      source: 'api',
      originalPrice: 150,
      convertedPrice: 150000,
    });
    expect(result.totalLocal.currency).toBe('ARS');
  });

  it('C2: destination BR and ES in the same batch resolve BRL and EUR respectively', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysSucceedWith({ BRL: 5.4, EUR: 0.92 });
    const { app } = testApp({ clock, exchangeRateProvider });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'C2-BR', passengerId: 'PAX-003', flightCode: 'AR1300', origin: 'EZE', destination: 'GRU', seatClass: 'business' },
          { id: 'C2-ES', passengerId: 'PAX-004', flightCode: 'IB6844', origin: 'EZE', destination: 'MAD', seatClass: 'first' },
        ],
      });

    expect(res.body.results[0].exchange.targetCurrency).toBe('BRL');
    expect(res.body.results[1].exchange.targetCurrency).toBe('EUR');
  });

  it('C3: provider always fails -> COMPLETED_WITH_WARNINGS with EXCHANGE_RATE_FALLBACK and correct USD pricing; JL005 (JPY) falls back to USD rate 1', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysFailWith(new Error('network down'));
    const { app } = testApp({ clock, exchangeRateProvider });

    const resAr = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'C3-AR', passengerId: 'PAX-001', flightCode: 'LA4567', origin: 'SCL', destination: 'EZE', seatClass: 'economy' },
        ],
      });

    const arResult = resAr.body.results[0];
    expect(arResult.status).toBe('COMPLETED_WITH_WARNINGS');
    expect(arResult.warnings).toContainEqual(expect.objectContaining({ code: 'EXCHANGE_RATE_FALLBACK' }));
    expect(arResult.exchange.source).toBe('fallback-default');
    expect(arResult.exchange.rate).toBe(1000);
    expect(arResult.pricing.totalUSD).toBe(205);

    const resJp = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'C3-JP', passengerId: 'PAX-001', flightCode: 'JL005', origin: 'JFK', destination: 'HND', seatClass: 'economy' },
        ],
      });

    const jpResult = resJp.body.results[0];
    expect(jpResult.exchange.source).toBe('fallback-usd');
    expect(jpResult.exchange.rate).toBe(1);
  });

  it('C4: two consecutive POSTs reuse the cached rate; after the TTL a new provider call happens', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const { app } = testApp({ clock, exchangeRateProvider });

    const reservationBase = {
      passengerId: 'PAX-001',
      flightCode: 'LA4567',
      origin: 'SCL',
      destination: 'EZE',
      seatClass: 'economy' as const,
    };

    const first = await request(app)
      .post('/reservations/process')
      .send({ reservations: [{ id: 'C4-1', ...reservationBase }] });
    expect(first.body.results[0].exchange.source).toBe('api');
    expect(exchangeRateProvider.calls).toBe(1);

    const second = await request(app)
      .post('/reservations/process')
      .send({ reservations: [{ id: 'C4-2', ...reservationBase }] });
    expect(second.body.results[0].exchange.source).toBe('cache');
    expect(exchangeRateProvider.calls).toBe(1);

    clock.advance(ONE_HOUR_MS);

    const third = await request(app)
      .post('/reservations/process')
      .send({ reservations: [{ id: 'C4-3', ...reservationBase }] });
    expect(third.body.results[0].exchange.source).toBe('api');
    expect(exchangeRateProvider.calls).toBe(2);
  });

  it('R1: a provider slower than the timeout -> 3 attempts, fallback and warning', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysTimeout();
    const { app } = testApp({ clock, exchangeRateProvider });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'R1', passengerId: 'PAX-001', flightCode: 'LA4567', origin: 'SCL', destination: 'EZE', seatClass: 'economy' },
        ],
        config: { exchangeRate: { timeoutMs: 20, retryDelayMs: 0 } },
      });

    const result = res.body.results[0];
    expect(exchangeRateProvider.calls).toBe(3);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'EXCHANGE_RATE_FALLBACK' }));
    expect(result.exchange.source).toBe('fallback-default');
  }, 15000);

  it('R3: a provider that fails with a network error -> same fallback behavior, the pipeline keeps going', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysFailWith(new TypeError('fetch failed'));
    const { app } = testApp({ clock, exchangeRateProvider });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'R3', passengerId: 'PAX-001', flightCode: 'LA4567', origin: 'SCL', destination: 'EZE', seatClass: 'economy' },
        ],
      });

    const result = res.body.results[0];
    expect(exchangeRateProvider.calls).toBe(3);
    expect(result.status).toBe('COMPLETED_WITH_WARNINGS');
    expect(result.exchange.source).toBe('fallback-default');
  });

  it('R2: an exchange service that throws unexpectedly for one currency -> FAILED with FILTER_EXCEPTION, other reservations in the batch unaffected', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));

    class PartiallyThrowingExchangeRateService implements ExchangeRateService {
      async getRate(target: string): Promise<RateResult> {
        if (target === 'ARS') {
          throw new Error('exchange service exploded for ARS');
        }
        return { rate: 1, source: 'api', retrievedAt: clock.now() };
      }

      invalidateCache(): void {
        // no-op
      }
    }

    const { app } = testApp({ clock, exchangeRateService: new PartiallyThrowingExchangeRateService() });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'R2-boom', passengerId: 'PAX-001', flightCode: 'LA4567', origin: 'SCL', destination: 'EZE', seatClass: 'economy' },
          { id: 'R2-ok', passengerId: 'PAX-001', flightCode: 'AA001', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    const [boom, ok] = res.body.results;
    expect(boom.status).toBe('FAILED');
    expect(boom.errors).toContainEqual(expect.objectContaining({ code: 'FILTER_EXCEPTION' }));
    expect(ok.status).toBe('COMPLETED');
  });

  it('R4: a flight with basePriceUSD: NaN -> FAILED with CORRUPT_CONTEXT', async () => {
    const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
    const corruptFlight: Flight = {
      code: 'ZZ999',
      origin: 'MIA',
      destination: 'JFK',
      destinationCountry: 'US',
      basePriceUSD: NaN,
      availableSeats: 10,
      durationMinutes: 180,
      departureAt: new Date('2099-01-01T00:00:00.000Z'),
    };
    const exchangeRateProvider = new FakeExchangeRateProvider().alwaysSucceedWith({ ARS: 1000 });
    const { app } = testApp({
      clock,
      exchangeRateProvider,
      flightRepository: new InMemoryFlightRepository([corruptFlight]),
    });

    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'R4', passengerId: 'PAX-001', flightCode: 'ZZ999', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    const result = res.body.results[0];
    expect(result.status).toBe('FAILED');
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'CORRUPT_CONTEXT' }));
  });
});
