import type { Filter } from '../pipeline/Filter';
import type { Clock } from '../shared/clock';
import { withError, type ReservationContext } from '../pipeline/ReservationContext';

/** Filter 2 (letra): validates the flight attached by ReservationContextLoader. */
export class FlightValidationFilter implements Filter {
  readonly name = 'FlightValidation' as const;

  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const flight = ctx.flight;

    if (flight === null) {
      return withError(ctx, this.name, 'FLIGHT_NOT_FOUND', `Flight ${ctx.reservation.flightCode} not found`);
    }

    let next = ctx;

    if (flight.availableSeats <= 0) {
      next = withError(next, this.name, 'NO_SEATS_AVAILABLE', `Flight ${flight.code} has no available seats`);
    }

    if (ctx.reservation.origin.toUpperCase() !== flight.origin.toUpperCase()) {
      next = withError(
        next,
        this.name,
        'ORIGIN_MISMATCH',
        `Reservation origin ${ctx.reservation.origin} does not match flight origin ${flight.origin}`,
      );
    }

    if (ctx.reservation.destination.toUpperCase() !== flight.destination.toUpperCase()) {
      next = withError(
        next,
        this.name,
        'DESTINATION_MISMATCH',
        `Reservation destination ${ctx.reservation.destination} does not match flight destination ${flight.destination}`,
      );
    }

    if (flight.departureAt.getTime() <= this.clock.now().getTime()) {
      next = withError(next, this.name, 'FLIGHT_DEPARTED', `Flight ${flight.code} has already departed`);
    }

    return next;
  }
}
