import { createApp } from './app';
import { buildContainer } from './container';
import { env } from './config/env';

const container = buildContainer();

const app = createApp({
  logger: container.logger,
  reservationsRouter: container.reservationsRouter,
  pipelineRouter: container.pipelineRouter,
  exchangeRatesRouter: container.exchangeRatesRouter,
});

app.listen(env.PORT, () => {
  container.logger.info(`Server listening on port ${env.PORT}`);
});
