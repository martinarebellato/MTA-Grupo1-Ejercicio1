import { daysFromNow, yearsAgo } from '../../../src/shared/dates';
import { FakeClock } from '../../helpers/FakeClock';

describe('daysFromNow', () => {
  it('adds days relative to the given clock', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    expect(daysFromNow(30, clock)).toEqual(new Date('2024-07-01T00:00:00.000Z'));
  });

  it('subtracts days when given a negative number', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    expect(daysFromNow(-2, clock)).toEqual(new Date('2024-05-30T00:00:00.000Z'));
  });
});

describe('yearsAgo', () => {
  it('subtracts years relative to the given clock', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    expect(yearsAgo(35, clock)).toEqual(new Date('1989-06-01T00:00:00.000Z'));
  });

  it('supports zero years (today)', () => {
    const clock = new FakeClock(new Date('2024-06-01T00:00:00.000Z'));
    expect(yearsAgo(0, clock)).toEqual(new Date('2024-06-01T00:00:00.000Z'));
  });
});
