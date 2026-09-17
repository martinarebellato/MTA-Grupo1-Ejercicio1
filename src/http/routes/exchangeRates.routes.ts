import { Router } from 'express';
import { ExchangeRatesController } from '../controllers/ExchangeRatesController';
import type { ExchangeRateService } from '../../services/exchange/ExchangeRateService';

export interface ExchangeRatesRouterDeps {
  readonly exchangeRateService: ExchangeRateService;
}

export function createExchangeRatesRouter(deps: ExchangeRatesRouterDeps): Router {
  const controller = new ExchangeRatesController(deps.exchangeRateService);
  const router = Router();
  router.delete('/cache', controller.invalidateCache);
  return router;
}
