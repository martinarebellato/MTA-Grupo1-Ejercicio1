import { calculateAge, passengerTypeForAge } from '../../../src/domain/passenger';

describe('calculateAge', () => {
  it('returns the full years elapsed when the birthday already happened this year', () => {
    const dateOfBirth = new Date('1990-01-01T00:00:00.000Z');
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(calculateAge(dateOfBirth, now)).toBe(34);
  });

  it('does not count the current year yet when the birthday is today', () => {
    const dateOfBirth = new Date('1990-06-01T00:00:00.000Z');
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(calculateAge(dateOfBirth, now)).toBe(34);
  });

  it('has not yet incremented the age when the birthday is tomorrow', () => {
    const dateOfBirth = new Date('1990-06-02T00:00:00.000Z');
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(calculateAge(dateOfBirth, now)).toBe(33);
  });

  it('handles a birthday that already passed earlier this year by month', () => {
    const dateOfBirth = new Date('1990-03-15T00:00:00.000Z');
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(calculateAge(dateOfBirth, now)).toBe(34);
  });

  it('handles a birthday later this year by month', () => {
    const dateOfBirth = new Date('1990-12-15T00:00:00.000Z');
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(calculateAge(dateOfBirth, now)).toBe(33);
  });
});

describe('passengerTypeForAge', () => {
  it('classifies 11 as child', () => {
    expect(passengerTypeForAge(11)).toBe('child');
  });

  it('classifies 12 as adult (lower bound)', () => {
    expect(passengerTypeForAge(12)).toBe('adult');
  });

  it('classifies 65 as adult (upper bound)', () => {
    expect(passengerTypeForAge(65)).toBe('adult');
  });

  it('classifies 66 as senior', () => {
    expect(passengerTypeForAge(66)).toBe('senior');
  });

  it('classifies 0 as child', () => {
    expect(passengerTypeForAge(0)).toBe('child');
  });
});
