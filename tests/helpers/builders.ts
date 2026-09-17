import type { Passenger } from '../../src/domain/passenger';
import type { Flight } from '../../src/domain/flight';
import type { ReservationRequest } from '../../src/domain/reservation';
import { createContext, type ReservationContext } from '../../src/pipeline/ReservationContext';

export function buildPassenger(overrides: Partial<Passenger> = {}): Passenger {
  return {
    id: 'PAX-001',
    name: 'Test Passenger',
    email: 'test@example.com',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    passengerType: 'adult',
    loyaltyTier: 'none',
    country: 'AR',
    isActive: true,
    ...overrides,
  };
}

export function buildFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    code: 'AA001',
    origin: 'MIA',
    destination: 'JFK',
    destinationCountry: 'US',
    basePriceUSD: 200,
    availableSeats: 50,
    durationMinutes: 180,
    departureAt: new Date('2099-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function buildReservation(overrides: Partial<ReservationRequest> = {}): ReservationRequest {
  return {
    id: 'RES-001',
    passengerId: 'PAX-001',
    flightCode: 'AA001',
    origin: 'MIA',
    destination: 'JFK',
    seatClass: 'economy',
    ...overrides,
  };
}

export interface BuildContextOptions {
  readonly reservation?: ReservationRequest;
  readonly passenger?: Passenger | null;
  readonly flight?: Flight | null;
}

export function buildContext(options: BuildContextOptions = {}): ReservationContext {
  const reservation = options.reservation ?? buildReservation();
  const passenger = 'passenger' in options ? (options.passenger ?? null) : buildPassenger();
  const flight = 'flight' in options ? (options.flight ?? null) : buildFlight();
  return createContext(reservation, passenger, flight);
}
