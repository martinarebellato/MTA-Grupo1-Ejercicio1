import { ReservationContextLoader } from '../../../src/pipeline/ReservationContextLoader';
import { InMemoryPassengerRepository } from '../../../src/repositories/PassengerRepository';
import { InMemoryFlightRepository } from '../../../src/repositories/FlightRepository';
import { buildFlight, buildPassenger, buildReservation } from '../../helpers/builders';

describe('ReservationContextLoader', () => {
  it('attaches the passenger and flight when both exist', async () => {
    const passenger = buildPassenger({ id: 'PAX-001' });
    const flight = buildFlight({ code: 'AA001' });
    const loader = new ReservationContextLoader(
      new InMemoryPassengerRepository([passenger]),
      new InMemoryFlightRepository([flight]),
    );

    const ctx = await loader.load(buildReservation({ passengerId: 'PAX-001', flightCode: 'AA001' }));

    expect(ctx.passenger).toEqual(passenger);
    expect(ctx.flight).toEqual(flight);
    expect(ctx.issues).toEqual([]);
    expect(ctx.halted).toBe(false);
  });

  it('leaves passenger/flight as null when they do not exist, without adding issues', async () => {
    const loader = new ReservationContextLoader(new InMemoryPassengerRepository([]), new InMemoryFlightRepository([]));

    const ctx = await loader.load(buildReservation({ passengerId: 'PAX-999', flightCode: 'ZZ999' }));

    expect(ctx.passenger).toBeNull();
    expect(ctx.flight).toBeNull();
    expect(ctx.issues).toEqual([]);
    expect(ctx.halted).toBe(false);
  });
});
