import type { Clock } from '../shared/clock';
import type { ReservationStatus } from '../domain/reservation';
import type { ReservationResult } from '../pipeline/ReservationResultMapper';

export interface StoredReservationStatus {
  readonly id: string;
  readonly status: ReservationStatus;
  readonly updatedAt: Date;
  readonly result: ReservationResult | null;
}

export interface ReservationStatusStore {
  markProcessing(id: string): void;
  save(result: ReservationResult): void;
  get(id: string): StoredReservationStatus | null;
}

/** In-memory store keyed by reservation id (D13); the last write for a given id wins. */
export class InMemoryReservationStatusStore implements ReservationStatusStore {
  private readonly clock: Clock;
  private entries: ReadonlyMap<string, StoredReservationStatus>;

  constructor(clock: Clock) {
    this.clock = clock;
    this.entries = new Map();
  }

  markProcessing(id: string): void {
    this.write(id, { id, status: 'PROCESSING', updatedAt: this.clock.now(), result: null });
  }

  save(result: ReservationResult): void {
    this.write(result.reservationId, {
      id: result.reservationId,
      status: result.status,
      updatedAt: this.clock.now(),
      result,
    });
  }

  get(id: string): StoredReservationStatus | null {
    return this.entries.get(id) ?? null;
  }

  private write(id: string, entry: StoredReservationStatus): void {
    const next = new Map(this.entries);
    next.set(id, entry);
    this.entries = next;
  }
}
