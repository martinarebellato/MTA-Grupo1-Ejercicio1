import type { Request, Response } from 'express';
import type { ExchangeRateService } from '../../services/exchange/ExchangeRateService';

export class ExchangeRatesController {
  private readonly exchangeRateService: ExchangeRateService;

  constructor(exchangeRateService: ExchangeRateService) {
    this.exchangeRateService = exchangeRateService;
  }

  invalidateCache = (_req: Request, res: Response): void => {
    this.exchangeRateService.invalidateCache();
    res.status(204).send();
  };
}
