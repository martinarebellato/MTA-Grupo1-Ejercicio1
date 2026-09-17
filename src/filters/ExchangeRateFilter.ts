import type { Filter } from '../pipeline/Filter';
import { requireFlight, requireFiniteNonNegative } from '../pipeline/errors';
import { withExchangeMetadata, withWarning, type ReservationContext } from '../pipeline/ReservationContext';
import { currencyForCountry } from '../domain/currencyByCountry';
import type { ExchangeRateService, ExchangeRateOperationalConfig } from '../services/exchange/ExchangeRateService';

const BASE_CURRENCY = 'USD';

/** Filter 3 (letra): enriches the context with the destination currency conversion (D1, D2). */
export class ExchangeRateFilter implements Filter {
  readonly name = 'ExchangeRate' as const;

  private readonly exchangeRateService: ExchangeRateService;
  private readonly config: ExchangeRateOperationalConfig;

  constructor(exchangeRateService: ExchangeRateService, config: ExchangeRateOperationalConfig) {
    this.exchangeRateService = exchangeRateService;
    this.config = config;
  }

  async process(ctx: ReservationContext): Promise<ReservationContext> {
    const flight = requireFlight(ctx.flight);
    const originalPrice = requireFiniteNonNegative(flight.basePriceUSD, 'flight.basePriceUSD');

    let next = ctx;
    let targetCurrency = currencyForCountry(flight.destinationCountry);
    if (targetCurrency === null) {
      next = withWarning(
        next,
        this.name,
        'UNKNOWN_DESTINATION_CURRENCY',
        `No currency mapping for country ${flight.destinationCountry}; defaulting to ${BASE_CURRENCY}`,
      );
      targetCurrency = BASE_CURRENCY;
    }

    const rateResult = await this.exchangeRateService.getRate(targetCurrency, this.config);

    if (rateResult.source === 'fallback-default' || rateResult.source === 'fallback-usd') {
      const reason = rateResult.failureReason !== undefined ? `: ${rateResult.failureReason}` : '';
      next = withWarning(
        next,
        this.name,
        'EXCHANGE_RATE_FALLBACK',
        `Using fallback exchange rate for ${targetCurrency} (source: ${rateResult.source})${reason}`,
      );
    }

    return withExchangeMetadata(next, {
      baseCurrency: BASE_CURRENCY,
      targetCurrency,
      rate: rateResult.rate,
      source: rateResult.source,
      retrievedAt: rateResult.retrievedAt,
      originalPrice,
      convertedPrice: originalPrice * rateResult.rate,
    });
  }
}
