import type { Clock } from '../shared/clock';
import type { Logger } from '../shared/logger';
import type { ExchangeRateService } from '../services/exchange/ExchangeRateService';
import type { PipelineConfig } from '../config/pipelineConfig';
import { Pipeline, type PipelineStage } from './Pipeline';
import { PassengerValidationFilter } from '../filters/PassengerValidationFilter';
import { FlightValidationFilter } from '../filters/FlightValidationFilter';
import { ExchangeRateFilter } from '../filters/ExchangeRateFilter';
import { BasePriceFilter } from '../filters/BasePriceFilter';
import { LoyaltyDiscountFilter } from '../filters/LoyaltyDiscountFilter';
import { PassengerTypeAdjustmentFilter } from '../filters/PassengerTypeAdjustmentFilter';
import { TaxesAndFeesFilter } from '../filters/TaxesAndFeesFilter';

export interface PipelineFactoryDeps {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly exchangeRateService: ExchangeRateService;
}

/** Single place that fixes the pipeline's filter order (D11) and builds it from config. */
export class PipelineFactory {
  private readonly deps: PipelineFactoryDeps;

  constructor(deps: PipelineFactoryDeps) {
    this.deps = deps;
  }

  create(config: PipelineConfig): Pipeline {
    const stages: readonly PipelineStage[] = [
      { filter: new PassengerValidationFilter(this.deps.clock), enabled: config.passengerValidation.enabled },
      { filter: new FlightValidationFilter(this.deps.clock), enabled: config.flightValidation.enabled },
      {
        filter: new ExchangeRateFilter(this.deps.exchangeRateService, config.exchangeRate),
        enabled: config.exchangeRate.enabled,
      },
      { filter: new BasePriceFilter(config.basePrice.classMultipliers), enabled: config.basePrice.enabled },
      {
        filter: new LoyaltyDiscountFilter(config.loyaltyDiscount.tierDiscounts),
        enabled: config.loyaltyDiscount.enabled,
      },
      {
        filter: new PassengerTypeAdjustmentFilter(config.passengerTypeAdjustment.discounts),
        enabled: config.passengerTypeAdjustment.enabled,
      },
      {
        filter: new TaxesAndFeesFilter(
          config.taxesAndFees.taxRate,
          config.taxesAndFees.airportFeeUSD,
          config.taxesAndFees.fuelSurchargeRate,
        ),
        enabled: config.taxesAndFees.enabled,
      },
    ];

    return new Pipeline(stages, this.deps.clock, this.deps.logger);
  }
}
