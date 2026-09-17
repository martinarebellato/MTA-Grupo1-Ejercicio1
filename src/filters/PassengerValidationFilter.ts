import type { Filter } from '../pipeline/Filter';
import type { Clock } from '../shared/clock';
import { withError, type ReservationContext } from '../pipeline/ReservationContext';
import { calculateAge, passengerTypeForAge } from '../domain/passenger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Filter 1 (letra): validates the passenger attached by ReservationContextLoader. */
export class PassengerValidationFilter implements Filter {
  readonly name = 'PassengerValidation' as const;

  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const passenger = ctx.passenger;

    if (passenger === null) {
      return withError(ctx, this.name, 'PASSENGER_NOT_FOUND', `Passenger ${ctx.reservation.passengerId} not found`);
    }

    let next = ctx;

    if (!passenger.isActive) {
      next = withError(next, this.name, 'PASSENGER_INACTIVE', `Passenger ${passenger.id} is not active`);
    }

    if (passenger.name.trim() === '') {
      next = withError(next, this.name, 'INVALID_PASSENGER_NAME', 'Passenger name must not be empty');
    }

    if (!EMAIL_REGEX.test(passenger.email)) {
      next = withError(next, this.name, 'INVALID_EMAIL', `Invalid email: ${passenger.email}`);
    }

    const age = calculateAge(passenger.dateOfBirth, this.clock.now());
    const expectedType = passengerTypeForAge(age);
    if (expectedType !== passenger.passengerType) {
      next = withError(
        next,
        this.name,
        'PASSENGER_TYPE_AGE_MISMATCH',
        `Passenger type "${passenger.passengerType}" does not match age ${age} (expected "${expectedType}")`,
      );
    }

    return next;
  }
}
