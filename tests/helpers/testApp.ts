import type { Express } from 'express';
import { createApp } from '../../src/app';
import { buildContainer, type Container, type ContainerOverrides } from '../../src/container';
import { SilentLogger } from '../../src/shared/logger';

export interface TestApp {
  readonly app: Express;
  readonly container: Container;
}

/** Builds a full app wired with `SilentLogger` and (by default) a fake exchange rate provider. */
export function testApp(overrides: ContainerOverrides = {}): TestApp {
  const container = buildContainer({ logger: new SilentLogger(), ...overrides });
  const app = createApp({
    logger: container.logger,
    reservationsRouter: container.reservationsRouter,
    pipelineRouter: container.pipelineRouter,
    exchangeRatesRouter: container.exchangeRatesRouter,
  });
  return { app, container };
}
