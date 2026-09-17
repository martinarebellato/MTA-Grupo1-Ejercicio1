import type { Passenger } from '../domain/passenger';

export interface PassengerRepository {
  findById(id: string): Promise<Passenger | null>;
}

export class InMemoryPassengerRepository implements PassengerRepository {
  private readonly byId: ReadonlyMap<string, Passenger>;

  constructor(passengers: readonly Passenger[]) {
    this.byId = new Map(passengers.map((passenger) => [passenger.id, passenger]));
  }

  async findById(id: string): Promise<Passenger | null> {
    return this.byId.get(id) ?? null;
  }
}
