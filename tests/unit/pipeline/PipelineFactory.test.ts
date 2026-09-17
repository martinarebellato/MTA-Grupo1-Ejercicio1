import { PipelineFactory } from '../../../src/pipeline/PipelineFactory';
import { DefaultExchangeRateService } from '../../../src/services/exchange/ExchangeRateService';
import { defaultPipelineConfig } from '../../../src/config/defaultPipelineConfig';
import { mergePipelineConfig } from '../../../src/config/pipelineConfig';
import { FakeClock } from '../../helpers/FakeClock';
import { FakeExchangeRateProvider } from '../../helpers/FakeExchangeRateProvider';
import { buildContext, buildFlight, buildPassenger, buildReservation } from '../../helpers/builders';
import { SilentLogger } from '../../../src/shared/logger';

function buildFactory(): PipelineFactory {
  const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
  const exchangeRateService = new DefaultExchangeRateService(new FakeExchangeRateProvider(), clock, new SilentLogger());
  return new PipelineFactory({ clock, logger: new SilentLogger(), exchangeRateService });
}

function validContext() {
  return buildContext({
    reservation: buildReservation({ origin: 'MIA', destination: 'JFK', seatClass: 'economy' }),
    passenger: buildPassenger({ dateOfBirth: new Date('1990-01-01T00:00:00.000Z'), passengerType: 'adult' }),
    flight: buildFlight({
      origin: 'MIA',
      destination: 'JFK',
      destinationCountry: 'US',
      basePriceUSD: 200,
      availableSeats: 10,
      departureAt: new Date('2099-01-01T00:00:00.000Z'),
    }),
  });
}

describe('PipelineFactory', () => {
  it('builds the pipeline with the exact filter order from the exercise statement', async () => {
    const factory = buildFactory();
    const pipeline = factory.create(defaultPipelineConfig);

    const result = await pipeline.run(validContext());

    expect(result.trace.map((step) => step.filter)).toEqual([
      'PassengerValidation',
      'FlightValidation',
      'ExchangeRate',
      'BasePrice',
      'LoyaltyDiscount',
      'PassengerTypeAdjustment',
      'TaxesAndFees',
    ]);
    expect(result.pricing.totalUSD).toBe(265);
  });

  it('reflects a disabled filter in the trace and skips its effect', async () => {
    const factory = buildFactory();
    const config = mergePipelineConfig(defaultPipelineConfig, { loyaltyDiscount: { enabled: false } });
    const pipeline = factory.create(config);

    const ctx = buildContext({
      reservation: buildReservation({ origin: 'MIA', destination: 'JFK', seatClass: 'economy' }),
      passenger: buildPassenger({
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        passengerType: 'adult',
        loyaltyTier: 'gold',
      }),
      flight: buildFlight({
        origin: 'MIA',
        destination: 'JFK',
        destinationCountry: 'US',
        basePriceUSD: 200,
        availableSeats: 10,
        departureAt: new Date('2099-01-01T00:00:00.000Z'),
      }),
    });

    const result = await pipeline.run(ctx);

    expect(result.trace).toContainEqual({ filter: 'LoyaltyDiscount', status: 'disabled', durationMs: 0 });
    expect(result.pricing.loyaltyDiscountUSD).toBeUndefined();
    expect(result.pricing.totalUSD).toBe(265);
  });

  it('changing a parameter like taxRate changes the resulting total', async () => {
    const factory = buildFactory();
    const config = mergePipelineConfig(defaultPipelineConfig, { taxesAndFees: { taxRate: 0.2 } });
    const pipeline = factory.create(config);

    const result = await pipeline.run(validContext());

    expect(result.pricing.taxesUSD).toBe(40);
    expect(result.pricing.totalUSD).toBe(281);
  });
});
