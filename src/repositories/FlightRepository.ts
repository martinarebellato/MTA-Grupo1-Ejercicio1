import type { Flight } from '../domain/flight';

export interface FlightRepository {
  findByCode(code: string): Promise<Flight | null>;
}

export class InMemoryFlightRepository implements FlightRepository {
  private readonly byCode: ReadonlyMap<string, Flight>;

  constructor(flights: readonly Flight[]) {
    this.byCode = new Map(flights.map((flight) => [flight.code.toUpperCase(), flight]));
  }

  async findByCode(code: string): Promise<Flight | null> {
    return this.byCode.get(code.toUpperCase()) ?? null;
  }
}
