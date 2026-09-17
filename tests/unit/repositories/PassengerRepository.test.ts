import type { Passenger } from '../../../src/domain/passenger';
import { InMemoryPassengerRepository } from '../../../src/repositories/PassengerRepository';

const passenger: Passenger = {
  id: 'PAX-001',
  name: 'Test Passenger',
  email: 'test@example.com',
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  passengerType: 'adult',
  loyaltyTier: 'none',
  country: 'AR',
  isActive: true,
};

describe('InMemoryPassengerRepository', () => {
  it('finds a passenger by id', async () => {
    const repo = new InMemoryPassengerRepository([passenger]);
    await expect(repo.findById('PAX-001')).resolves.toEqual(passenger);
  });

  it('returns null when the passenger does not exist', async () => {
    const repo = new InMemoryPassengerRepository([passenger]);
    await expect(repo.findById('PAX-999')).resolves.toBeNull();
  });

  it('does not expose the internal array for external mutation', async () => {
    const source = [passenger];
    const repo = new InMemoryPassengerRepository(source);
    source.push({ ...passenger, id: 'PAX-002' });
    await expect(repo.findById('PAX-002')).resolves.toBeNull();
  });
});
