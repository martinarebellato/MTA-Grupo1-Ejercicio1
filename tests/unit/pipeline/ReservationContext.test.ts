import {
  createContext,
  withError,
  withWarning,
  withPricing,
  withExchangeMetadata,
  withTraceStep,
} from '../../../src/pipeline/ReservationContext';
import { CorruptContextError, requireFlight, requirePassenger, requireFiniteNonNegative } from '../../../src/pipeline/errors';
import { buildContext, buildFlight, buildPassenger, buildReservation } from '../../helpers/builders';

describe('createContext', () => {
  it('starts with empty issues/trace, no pricing/metadata and halted=false', () => {
    const ctx = createContext(buildReservation(), buildPassenger(), buildFlight());
    expect(ctx.issues).toEqual([]);
    expect(ctx.trace).toEqual([]);
    expect(ctx.pricing).toEqual({});
    expect(ctx.metadata).toEqual({});
    expect(ctx.halted).toBe(false);
  });
});

describe('withError', () => {
  it('appends an error issue and sets halted=true without mutating the original context', () => {
    const original = buildContext();
    const next = withError(original, 'PassengerValidation', 'PASSENGER_NOT_FOUND', 'Passenger not found');

    expect(next.issues).toEqual([
      { severity: 'error', code: 'PASSENGER_NOT_FOUND', message: 'Passenger not found', filter: 'PassengerValidation' },
    ]);
    expect(next.halted).toBe(true);

    expect(original.issues).toEqual([]);
    expect(original.halted).toBe(false);
  });
});

describe('withWarning', () => {
  it('appends a warning issue without setting halted, and does not mutate the original', () => {
    const original = buildContext();
    const next = withWarning(original, 'ExchangeRate', 'EXCHANGE_RATE_FALLBACK', 'Using fallback rate');

    expect(next.issues).toEqual([
      { severity: 'warning', code: 'EXCHANGE_RATE_FALLBACK', message: 'Using fallback rate', filter: 'ExchangeRate' },
    ]);
    expect(next.halted).toBe(false);

    expect(original.issues).toEqual([]);
  });
});

describe('withPricing', () => {
  it('merges partial pricing without mutating the original', () => {
    const original = buildContext();
    const withBase = withPricing(original, { classBasePriceUSD: 200, currentPriceUSD: 200 });
    const withLoyalty = withPricing(withBase, { loyaltyDiscountUSD: 30, currentPriceUSD: 170 });

    expect(withLoyalty.pricing).toEqual({
      classBasePriceUSD: 200,
      currentPriceUSD: 170,
      loyaltyDiscountUSD: 30,
    });
    expect(original.pricing).toEqual({});
    expect(withBase.pricing).toEqual({ classBasePriceUSD: 200, currentPriceUSD: 200 });
  });
});

describe('withExchangeMetadata', () => {
  it('sets metadata.exchange without mutating the original', () => {
    const original = buildContext();
    const exchange = {
      baseCurrency: 'USD',
      targetCurrency: 'ARS',
      rate: 1000,
      source: 'api' as const,
      retrievedAt: new Date('2024-01-01T00:00:00.000Z'),
      originalPrice: 150,
      convertedPrice: 150000,
    };
    const next = withExchangeMetadata(original, exchange);

    expect(next.metadata.exchange).toEqual(exchange);
    expect(original.metadata.exchange).toBeUndefined();
  });
});

describe('withTraceStep', () => {
  it('appends a trace step without mutating the original', () => {
    const original = buildContext();
    const next = withTraceStep(original, { filter: 'PassengerValidation', status: 'ok', durationMs: 5 });

    expect(next.trace).toEqual([{ filter: 'PassengerValidation', status: 'ok', durationMs: 5 }]);
    expect(original.trace).toEqual([]);
  });
});

describe('precondition guards', () => {
  it('requireFlight throws CorruptContextError on null', () => {
    expect(() => requireFlight(null)).toThrow(CorruptContextError);
  });

  it('requireFlight returns the flight when present', () => {
    const flight = buildFlight();
    expect(requireFlight(flight)).toBe(flight);
  });

  it('requirePassenger throws CorruptContextError on null', () => {
    expect(() => requirePassenger(null)).toThrow(CorruptContextError);
  });

  it('requirePassenger returns the passenger when present', () => {
    const passenger = buildPassenger();
    expect(requirePassenger(passenger)).toBe(passenger);
  });

  it('requireFiniteNonNegative throws on null', () => {
    expect(() => requireFiniteNonNegative(null, 'basePriceUSD')).toThrow(CorruptContextError);
  });

  it('requireFiniteNonNegative throws on NaN', () => {
    expect(() => requireFiniteNonNegative(NaN, 'basePriceUSD')).toThrow(CorruptContextError);
  });

  it('requireFiniteNonNegative throws on Infinity', () => {
    expect(() => requireFiniteNonNegative(Infinity, 'basePriceUSD')).toThrow(CorruptContextError);
    expect(() => requireFiniteNonNegative(-Infinity, 'basePriceUSD')).toThrow(CorruptContextError);
  });

  it('requireFiniteNonNegative throws on negative numbers', () => {
    expect(() => requireFiniteNonNegative(-1, 'basePriceUSD')).toThrow(CorruptContextError);
  });

  it('requireFiniteNonNegative returns the value when valid (including zero)', () => {
    expect(requireFiniteNonNegative(0, 'basePriceUSD')).toBe(0);
    expect(requireFiniteNonNegative(200, 'basePriceUSD')).toBe(200);
  });
});
