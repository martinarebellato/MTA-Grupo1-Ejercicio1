/** Thrown by filters when the incoming context violates a precondition they rely on. */
export class CorruptContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptContextError';
  }
}

export function requireFlight<T>(flight: T | null | undefined): T {
  if (flight === null || flight === undefined) {
    throw new CorruptContextError('flight is required but was missing');
  }
  return flight;
}

export function requirePassenger<T>(passenger: T | null | undefined): T {
  if (passenger === null || passenger === undefined) {
    throw new CorruptContextError('passenger is required but was missing');
  }
  return passenger;
}

export function requireFiniteNonNegative(value: number | null | undefined, field: string): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    throw new CorruptContextError(`${field} must be a finite, non-negative number but was ${String(value)}`);
  }
  return value;
}
