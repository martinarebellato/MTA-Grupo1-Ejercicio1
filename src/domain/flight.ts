export type SeatClass = 'economy' | 'business' | 'first';

export interface Flight {
  readonly code: string;
  readonly origin: string;
  readonly destination: string;
  readonly destinationCountry: string;
  readonly basePriceUSD: number;
  readonly availableSeats: number;
  readonly durationMinutes: number;
  readonly departureAt: Date;
}
