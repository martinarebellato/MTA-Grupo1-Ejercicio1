import type { Clock } from '../../src/shared/clock';

export class FakeClock implements Clock {
  private current: Date;

  constructor(initial: Date = new Date('2024-01-01T00:00:00.000Z')) {
    this.current = initial;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date): void {
    this.current = date;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
