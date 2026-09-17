import type { Flight } from '../../../src/domain/flight';
import { InMemoryFlightRepository } from '../../../src/repositories/FlightRepository';

const flight: Flight = {
  code: 'AA001',
  origin: 'MIA',
  destination: 'JFK',
  destinationCountry: 'US',
  basePriceUSD: 200,
  availableSeats: 50,
  durationMinutes: 180,
  departureAt: new Date('2099-01-01T00:00:00.000Z'),
};

describe('InMemoryFlightRepository', () => {
  it('finds a flight by code', async () => {
    const repo = new InMemoryFlightRepository([flight]);
    await expect(repo.findByCode('AA001')).resolves.toEqual(flight);
  });

  it('is case-insensitive', async () => {
    const repo = new InMemoryFlightRepository([flight]);
    await expect(repo.findByCode('aa001')).resolves.toEqual(flight);
  });

  it('returns null when the flight does not exist', async () => {
    const repo = new InMemoryFlightRepository([flight]);
    await expect(repo.findByCode('ZZ999')).resolves.toBeNull();
  });

  it('does not expose the internal array for external mutation', async () => {
    const source = [flight];
    const repo = new InMemoryFlightRepository(source);
    source.push({ ...flight, code: 'BB002' });
    await expect(repo.findByCode('BB002')).resolves.toBeNull();
  });
});
