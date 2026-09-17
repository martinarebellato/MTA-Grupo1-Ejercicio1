import type { Router } from 'express';
import { SystemClock, type Clock } from './shared/clock';
import { ConsoleLogger, isLogLevel, type Logger } from './shared/logger';
import { env } from './config/env';
import { defaultPipelineConfig } from './config/defaultPipelineConfig';
import { InMemoryPassengerRepository, type PassengerRepository } from './repositories/PassengerRepository';
import { InMemoryFlightRepository, type FlightRepository } from './repositories/FlightRepository';
import { mockPassengers } from '../data/mockPassengers';
import { mockFlights } from '../data/mockFlights';
import { ExchangeRateApiProvider } from './services/exchange/ExchangeRateApiProvider';
import type { ExchangeRateProvider } from './services/exchange/ExchangeRateProvider';
import { DefaultExchangeRateService, type ExchangeRateService } from './services/exchange/ExchangeRateService';
import { PipelineConfigService } from './services/PipelineConfigService';
import { PipelineFactory } from './pipeline/PipelineFactory';
import { ReservationContextLoader } from './pipeline/ReservationContextLoader';
import { InMemoryReservationStatusStore, type ReservationStatusStore } from './services/ReservationStatusStore';
import { ReservationProcessingService } from './services/ReservationProcessingService';
import { createReservationsRouter } from './http/routes/reservations.routes';
import { createPipelineRouter } from './http/routes/pipeline.routes';
import { createExchangeRatesRouter } from './http/routes/exchangeRates.routes';

export interface Container {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly passengerRepository: PassengerRepository;
  readonly flightRepository: FlightRepository;
  readonly exchangeRateProvider: ExchangeRateProvider;
  readonly exchangeRateService: ExchangeRateService;
  readonly pipelineConfigService: PipelineConfigService;
  readonly pipelineFactory: PipelineFactory;
  readonly reservationContextLoader: ReservationContextLoader;
  readonly reservationStatusStore: ReservationStatusStore;
  readonly reservationProcessingService: ReservationProcessingService;
  readonly reservationsRouter: Router;
  readonly pipelineRouter: Router;
  readonly exchangeRatesRouter: Router;
}

export interface ContainerOverrides {
  readonly clock?: Clock;
  readonly logger?: Logger;
  readonly passengerRepository?: PassengerRepository;
  readonly flightRepository?: FlightRepository;
  readonly exchangeRateProvider?: ExchangeRateProvider;
  /** Escape hatch for integration tests that need the exchange service itself to misbehave (R2). */
  readonly exchangeRateService?: ExchangeRateService;
}

/** Composition root: wires every dependency once, so mocks/config are loaded a single time. */
export function buildContainer(overrides: ContainerOverrides = {}): Container {
  const clock: Clock = overrides.clock ?? new SystemClock();
  const logger: Logger = overrides.logger ?? new ConsoleLogger(isLogLevel(env.LOG_LEVEL) ? env.LOG_LEVEL : 'info');

  const passengerRepository = overrides.passengerRepository ?? new InMemoryPassengerRepository(mockPassengers);
  const flightRepository = overrides.flightRepository ?? new InMemoryFlightRepository(mockFlights);

  const exchangeRateProvider = overrides.exchangeRateProvider ?? new ExchangeRateApiProvider(env.EXCHANGE_API_BASE_URL);
  const exchangeRateService =
    overrides.exchangeRateService ?? new DefaultExchangeRateService(exchangeRateProvider, clock, logger);

  const pipelineConfigService = new PipelineConfigService(defaultPipelineConfig);
  const pipelineFactory = new PipelineFactory({ clock, logger, exchangeRateService });
  const reservationContextLoader = new ReservationContextLoader(passengerRepository, flightRepository);
  const reservationStatusStore = new InMemoryReservationStatusStore(clock);
  const reservationProcessingService = new ReservationProcessingService(
    clock,
    reservationContextLoader,
    pipelineFactory,
    pipelineConfigService,
    reservationStatusStore,
  );

  const reservationsRouter = createReservationsRouter({ reservationProcessingService, reservationStatusStore });
  const pipelineRouter = createPipelineRouter({ pipelineConfigService });
  const exchangeRatesRouter = createExchangeRatesRouter({ exchangeRateService });

  return {
    clock,
    logger,
    passengerRepository,
    flightRepository,
    exchangeRateProvider,
    exchangeRateService,
    pipelineConfigService,
    pipelineFactory,
    reservationContextLoader,
    reservationStatusStore,
    reservationProcessingService,
    reservationsRouter,
    pipelineRouter,
    exchangeRatesRouter,
  };
}
