export type PassengerType = 'child' | 'adult' | 'senior';
export type LoyaltyTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface Passenger {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly dateOfBirth: Date;
  readonly passengerType: PassengerType;
  readonly loyaltyTier: LoyaltyTier;
  readonly country: string;
  readonly isActive: boolean;
}

/** Age in whole years as of `now`, honoring whether the birthday already happened this year. */
export function calculateAge(dateOfBirth: Date, now: Date): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  const dayDiff = now.getDate() - dateOfBirth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

/** child < 12, adult 12–65 (inclusive), senior > 65. */
export function passengerTypeForAge(age: number): PassengerType {
  if (age < 12) {
    return 'child';
  }
  if (age <= 65) {
    return 'adult';
  }
  return 'senior';
}
