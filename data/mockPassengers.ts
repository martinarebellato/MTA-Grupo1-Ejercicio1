import type { Passenger } from '../src/domain/passenger';
import { yearsAgo } from '../src/shared/dates';

/**
 * Mock passenger database (letra: `/data/mockPassengers.ts`). Dates of birth are generated
 * relative to "now" (`yearsAgo`) so fixtures stay valid regardless of when the tests run.
 */
export const mockPassengers: readonly Passenger[] = [
  // P1/B1: adult, no loyalty tier, active, AR — baseline happy-path passenger.
  {
    id: 'PAX-001',
    name: 'Lucia Fernandez',
    email: 'lucia.fernandez@example.com',
    dateOfBirth: yearsAgo(35),
    passengerType: 'adult',
    loyaltyTier: 'none',
    country: 'AR',
    isActive: true,
  },
  // P2: adult, gold tier, active, BR — exercises the loyalty discount.
  {
    id: 'PAX-002',
    name: 'Bruno Alves',
    email: 'bruno.alves@example.com',
    dateOfBirth: yearsAgo(40),
    passengerType: 'adult',
    loyaltyTier: 'gold',
    country: 'BR',
    isActive: true,
  },
  // P3: child, gold tier, active, AR — exercises loyalty + child discount combined.
  {
    id: 'PAX-003',
    name: 'Mia Gonzalez',
    email: 'mia.gonzalez@example.com',
    dateOfBirth: yearsAgo(8),
    passengerType: 'child',
    loyaltyTier: 'gold',
    country: 'AR',
    isActive: true,
  },
  // P4: senior, silver tier, active, ES — exercises the senior discount + EUR conversion.
  {
    id: 'PAX-004',
    name: 'Carmen Ruiz',
    email: 'carmen.ruiz@example.com',
    dateOfBirth: yearsAgo(70),
    passengerType: 'senior',
    loyaltyTier: 'silver',
    country: 'ES',
    isActive: true,
  },
  // Inactive passenger — should be rejected by PassengerValidationFilter (PASSENGER_INACTIVE).
  {
    id: 'PAX-005',
    name: 'Diego Torres',
    email: 'diego.torres@example.com',
    dateOfBirth: yearsAgo(30),
    passengerType: 'adult',
    loyaltyTier: 'bronze',
    country: 'US',
    isActive: false,
  },
  // Invalid email — should be rejected by PassengerValidationFilter (INVALID_EMAIL).
  {
    id: 'PAX-006',
    name: 'Camila Rojas',
    email: 'camila.rojas-not-an-email',
    dateOfBirth: yearsAgo(30),
    passengerType: 'adult',
    loyaltyTier: 'none',
    country: 'CL',
    isActive: true,
  },
  // Empty name — should be rejected by PassengerValidationFilter (INVALID_PASSENGER_NAME).
  {
    id: 'PAX-007',
    name: '',
    email: 'empty.name@example.com',
    dateOfBirth: yearsAgo(30),
    passengerType: 'adult',
    loyaltyTier: 'none',
    country: 'UY',
    isActive: true,
  },
  // passengerType/age mismatch (30 years old but tagged as child) — PASSENGER_TYPE_AGE_MISMATCH.
  {
    id: 'PAX-008',
    name: 'Julian Perez',
    email: 'julian.perez@example.com',
    dateOfBirth: yearsAgo(30),
    passengerType: 'child',
    loyaltyTier: 'none',
    country: 'AR',
    isActive: true,
  },
  // Extra active adult, bronze, US — additional happy-path coverage.
  {
    id: 'PAX-009',
    name: 'Sofia Martinez',
    email: 'sofia.martinez@example.com',
    dateOfBirth: yearsAgo(45),
    passengerType: 'adult',
    loyaltyTier: 'bronze',
    country: 'US',
    isActive: true,
  },
  // Extra active adult, silver, MX — additional happy-path coverage.
  {
    id: 'PAX-010',
    name: 'Andres Lopez',
    email: 'andres.lopez@example.com',
    dateOfBirth: yearsAgo(50),
    passengerType: 'adult',
    loyaltyTier: 'silver',
    country: 'MX',
    isActive: true,
  },
];
