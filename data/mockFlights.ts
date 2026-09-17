import type { Flight } from '../src/domain/flight';
import { daysFromNow } from '../src/shared/dates';

/**
 * Mock flight database (letra: `/data/mockFlights.ts`). `departureAt` is generated relative to
 * "now" (`daysFromNow`) so fixtures (including the intentionally past flight) stay valid
 * regardless of when the tests run.
 */
export const mockFlights: readonly Flight[] = [
  // P1/P2/B1: domestic USD route, no currency conversion involved.
  {
    code: 'AA001',
    origin: 'MIA',
    destination: 'JFK',
    destinationCountry: 'US',
    basePriceUSD: 200,
    availableSeats: 50,
    durationMinutes: 180,
    departureAt: daysFromNow(30),
  },
  // C1: destination AR — exercises ARS conversion.
  {
    code: 'LA4567',
    origin: 'SCL',
    destination: 'EZE',
    destinationCountry: 'AR',
    basePriceUSD: 150,
    availableSeats: 20,
    durationMinutes: 130,
    departureAt: daysFromNow(15),
  },
  // P3: destination BR — exercises BRL conversion + business class + child/gold discounts.
  {
    code: 'AR1300',
    origin: 'EZE',
    destination: 'GRU',
    destinationCountry: 'BR',
    basePriceUSD: 100,
    availableSeats: 10,
    durationMinutes: 170,
    departureAt: daysFromNow(20),
  },
  // P4: destination ES — exercises EUR conversion + first class + senior/silver discounts.
  // Only 2 seats available — still a valid (non-zero) seat count.
  {
    code: 'IB6844',
    origin: 'EZE',
    destination: 'MAD',
    destinationCountry: 'ES',
    basePriceUSD: 800,
    availableSeats: 2,
    durationMinutes: 780,
    departureAt: daysFromNow(45),
  },
  // B3: 0 available seats — should be rejected by FlightValidationFilter (NO_SEATS_AVAILABLE).
  {
    code: 'LA8070',
    origin: 'GRU',
    destination: 'SCL',
    destinationCountry: 'CL',
    basePriceUSD: 300,
    availableSeats: 0,
    durationMinutes: 240,
    departureAt: daysFromNow(10),
  },
  // Departed in the past — should be rejected by FlightValidationFilter (FLIGHT_DEPARTED).
  {
    code: 'AA900',
    origin: 'JFK',
    destination: 'EZE',
    destinationCountry: 'AR',
    basePriceUSD: 700,
    availableSeats: 30,
    durationMinutes: 660,
    departureAt: daysFromNow(-2),
  },
  // Destination JP: JPY is outside the default fallbackRates table — exercises fallback-usd.
  {
    code: 'JL005',
    origin: 'JFK',
    destination: 'HND',
    destinationCountry: 'JP',
    basePriceUSD: 1000,
    availableSeats: 15,
    durationMinutes: 840,
    departureAt: daysFromNow(60),
  },
];
