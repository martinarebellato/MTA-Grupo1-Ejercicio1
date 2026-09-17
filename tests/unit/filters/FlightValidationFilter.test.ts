import { FlightValidationFilter } from '../../../src/filters/FlightValidationFilter';
import { FakeClock } from '../../helpers/FakeClock';
import { buildContext, buildFlight, buildReservation } from '../../helpers/builders';

const NOW = new Date('2024-06-01T00:00:00.000Z');
const FUTURE = new Date('2024-12-01T00:00:00.000Z');
const PAST = new Date('2024-01-01T00:00:00.000Z');

describe('FlightValidationFilter', () => {
  const filter = new FlightValidationFilter(new FakeClock(NOW));

  it('passes a valid flight without issues', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 50, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([]);
    expect(result.halted).toBe(false);
  });

  it('rejects a non-existent flight', async () => {
    const ctx = buildContext({ flight: null });

    const result = await filter.process(ctx);

    expect(result.halted).toBe(true);
    expect(result.issues).toEqual([
      expect.objectContaining({ severity: 'error', code: 'FLIGHT_NOT_FOUND', filter: 'FlightValidation' }),
    ]);
  });

  it('B3: rejects a flight with 0 available seats', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 0, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'NO_SEATS_AVAILABLE' }));
  });

  it('accepts a flight with exactly 1 available seat', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 1, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([]);
  });

  it('rejects a mismatched origin', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'EZE', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 10, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'ORIGIN_MISMATCH' }));
  });

  it('rejects a mismatched destination', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'GRU' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 10, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'DESTINATION_MISMATCH' }));
  });

  it('treats IATA code comparison as case-insensitive', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'mia', destination: 'jfk' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 10, departureAt: FUTURE }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([]);
  });

  it('rejects a flight that departed in the past', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 10, departureAt: PAST }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'FLIGHT_DEPARTED' }));
  });

  it('rejects a flight departing exactly now', async () => {
    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK' }),
      flight: buildFlight({ origin: 'MIA', destination: 'JFK', availableSeats: 10, departureAt: NOW }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'FLIGHT_DEPARTED' }));
  });
});
