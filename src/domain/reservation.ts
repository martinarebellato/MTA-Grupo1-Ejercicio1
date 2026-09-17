import type { SeatClass } from './flight';

export interface ReservationRequest {
  readonly id: string;
  readonly passengerId: string;
  readonly flightCode: string;
  readonly origin: string;
  readonly destination: string;
  readonly seatClass: SeatClass;
}

export type ReservationStatus =
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'REJECTED'
  | 'FAILED';
