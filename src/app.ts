import express, { type Express, type Router } from 'express';
import type { Logger } from './shared/logger';
import { createErrorHandler } from './http/middleware/errorHandler';
import { notFound } from './http/middleware/notFound';

export interface AppDeps {
  readonly logger: Logger;
  readonly reservationsRouter: Router;
  readonly pipelineRouter: Router;
  readonly exchangeRatesRouter: Router;
}

/** Builds the Express app (routers injected, no `listen`) so it stays testable in isolation. */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/reservations', deps.reservationsRouter);
  app.use('/pipeline', deps.pipelineRouter);
  app.use('/exchange-rates', deps.exchangeRatesRouter);

  app.use(notFound);
  app.use(createErrorHandler(deps.logger));

  return app;
}
