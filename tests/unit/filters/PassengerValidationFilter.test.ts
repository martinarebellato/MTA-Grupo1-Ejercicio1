import { PassengerValidationFilter } from '../../../src/filters/PassengerValidationFilter';
import { FakeClock } from '../../helpers/FakeClock';
import { buildContext, buildPassenger } from '../../helpers/builders';

const NOW = new Date('2024-06-01T00:00:00.000Z');

function ageDateOfBirth(age: number): Date {
  return new Date(`${NOW.getUTCFullYear() - age}-06-01T00:00:00.000Z`);
}

describe('PassengerValidationFilter', () => {
  const filter = new PassengerValidationFilter(new FakeClock(NOW));

  it('passes a valid passenger without issues', async () => {
    const ctx = buildContext({ passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }) });

    const result = await filter.process(ctx);

    expect(result.issues).toEqual([]);
    expect(result.halted).toBe(false);
  });

  it('B2: rejects a non-existent passenger and halts the pipeline', async () => {
    const ctx = buildContext({ passenger: null });

    const result = await filter.process(ctx);

    expect(result.halted).toBe(true);
    expect(result.issues).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PASSENGER_NOT_FOUND', filter: 'PassengerValidation' }),
    ]);
  });

  it('rejects an inactive passenger', async () => {
    const ctx = buildContext({
      passenger: buildPassenger({ isActive: false, dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', code: 'PASSENGER_INACTIVE' }),
    );
    expect(result.halted).toBe(true);
  });

  it('rejects an empty or whitespace-only name', async () => {
    const ctxEmpty = buildContext({
      passenger: buildPassenger({ name: '', dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }),
    });
    const ctxBlank = buildContext({
      passenger: buildPassenger({ name: '   ', dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }),
    });

    const resultEmpty = await filter.process(ctxEmpty);
    const resultBlank = await filter.process(ctxBlank);

    expect(resultEmpty.issues).toContainEqual(expect.objectContaining({ code: 'INVALID_PASSENGER_NAME' }));
    expect(resultBlank.issues).toContainEqual(expect.objectContaining({ code: 'INVALID_PASSENGER_NAME' }));
  });

  it('rejects an invalid email', async () => {
    const ctx = buildContext({
      passenger: buildPassenger({ email: 'not-an-email', dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }),
    });

    const result = await filter.process(ctx);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'INVALID_EMAIL' }));
  });

  it('accumulates every applicable error before halting', async () => {
    const ctx = buildContext({
      passenger: buildPassenger({
        isActive: false,
        name: '',
        email: 'bad-email',
        dateOfBirth: ageDateOfBirth(35),
        passengerType: 'adult',
      }),
    });

    const result = await filter.process(ctx);

    expect(result.issues.map((issue) => issue.code)).toEqual([
      'PASSENGER_INACTIVE',
      'INVALID_PASSENGER_NAME',
      'INVALID_EMAIL',
    ]);
    expect(result.halted).toBe(true);
  });

  describe('passengerType/age mismatch', () => {
    it('detects a child tagged with 30 years', async () => {
      const ctx = buildContext({
        passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(30), passengerType: 'child' }),
      });
      const result = await filter.process(ctx);
      expect(result.issues).toContainEqual(expect.objectContaining({ code: 'PASSENGER_TYPE_AGE_MISMATCH' }));
    });

    it('detects a senior tagged with 50 years', async () => {
      const ctx = buildContext({
        passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(50), passengerType: 'senior' }),
      });
      const result = await filter.process(ctx);
      expect(result.issues).toContainEqual(expect.objectContaining({ code: 'PASSENGER_TYPE_AGE_MISMATCH' }));
    });

    it('detects an adult tagged with 8 years', async () => {
      const ctx = buildContext({
        passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(8), passengerType: 'adult' }),
      });
      const result = await filter.process(ctx);
      expect(result.issues).toContainEqual(expect.objectContaining({ code: 'PASSENGER_TYPE_AGE_MISMATCH' }));
    });

    it('accepts age 12 as a valid adult (lower bound)', async () => {
      const ctx = buildContext({
        passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(12), passengerType: 'adult' }),
      });
      const result = await filter.process(ctx);
      expect(result.issues).toEqual([]);
    });

    it('accepts age 65 as a valid adult (upper bound)', async () => {
      const ctx = buildContext({
        passenger: buildPassenger({ dateOfBirth: ageDateOfBirth(65), passengerType: 'adult' }),
      });
      const result = await filter.process(ctx);
      expect(result.issues).toEqual([]);
    });
  });

  it('does not mutate the input context', async () => {
    const original = buildContext({
      passenger: buildPassenger({ isActive: false, dateOfBirth: ageDateOfBirth(35), passengerType: 'adult' }),
    });
    const snapshotIssues = [...original.issues];

    await filter.process(original);

    expect(original.issues).toEqual(snapshotIssues);
    expect(original.halted).toBe(false);
  });
});
