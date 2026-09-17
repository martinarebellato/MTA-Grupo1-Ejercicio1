import { Clock, SystemClock } from './clock';

const defaultClock: Clock = new SystemClock();

export function daysFromNow(days: number, clock: Clock = defaultClock): Date {
  const base = clock.now();
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function yearsAgo(years: number, clock: Clock = defaultClock): Date {
  const base = clock.now();
  const result = new Date(base.getTime());
  result.setFullYear(result.getFullYear() - years);
  return result;
}
