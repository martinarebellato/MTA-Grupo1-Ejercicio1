import type { Clock } from '../../shared/clock';
import type { Logger } from '../../shared/logger';
import type { ExchangeRateSource } from '../../domain/pricing';
import type { ExchangeRateProvider } from './ExchangeRateProvider';
import { RateCache } from './RateCache';
import { withRetry } from './retry';

export interface RateResult {
  readonly rate: number;
  readonly source: ExchangeRateSource;
  readonly retrievedAt: Date;
  readonly failureReason?: string;
}

/**
 * Retry/timeout/fallback knobs for a single `getRate` call. Passed per-call (not baked into the
 * service at construction) so a per-request `PipelineConfig` override actually takes effect, even
 * though the service instance — and its cache — is a long-lived singleton shared across requests.
 */
export interface ExchangeRateOperationalConfig {
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly retryDelayMs: number;
  readonly cacheTtlMs: number;
  readonly fallbackRates: Readonly<Record<string, number>>;
}

export interface ExchangeRateService {
  getRate(target: string, config: ExchangeRateOperationalConfig): Promise<RateResult>;
  invalidateCache(): void;
}

const BASE_CURRENCY = 'USD';

/** Combines cache + retry/timeout + fallback + single-flight + logging for exchange rates. */
export class DefaultExchangeRateService implements ExchangeRateService {
  private readonly provider: ExchangeRateProvider;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly cache: RateCache;
  private pendingFetch: Promise<Readonly<Record<string, number>>> | null = null;

  constructor(provider: ExchangeRateProvider, clock: Clock, logger: Logger) {
    this.provider = provider;
    this.clock = clock;
    this.logger = logger;
    this.cache = new RateCache(clock);
  }

  async getRate(target: string, config: ExchangeRateOperationalConfig): Promise<RateResult> {
    const now = this.clock.now();

    if (target === BASE_CURRENCY) {
      return { rate: 1, source: 'api', retrievedAt: now };
    }

    const cached = this.cache.get(BASE_CURRENCY, config.cacheTtlMs);
    if (cached !== null && cached.rates[target] !== undefined) {
      return { rate: cached.rates[target], source: 'cache', retrievedAt: cached.fetchedAt };
    }

    try {
      const rates = await this.fetchRatesSingleFlight(config);
      const rate = rates[target];
      if (rate === undefined) {
        return this.fallback(target, now, config, `Target currency ${target} is missing from the exchange API response`);
      }
      return { rate, source: 'api', retrievedAt: now };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Exchange rate API exhausted all ${config.maxAttempts} attempts`, {
        target,
        message,
      });
      return this.fallback(target, now, config, message);
    }
  }

  invalidateCache(): void {
    this.cache.invalidate();
  }

  private fallback(target: string, now: Date, config: ExchangeRateOperationalConfig, reason: string): RateResult {
    const fallbackRate = config.fallbackRates[target];
    if (fallbackRate !== undefined) {
      return { rate: fallbackRate, source: 'fallback-default', retrievedAt: now, failureReason: reason };
    }
    return { rate: 1, source: 'fallback-usd', retrievedAt: now, failureReason: reason };
  }

  private fetchRatesSingleFlight(config: ExchangeRateOperationalConfig): Promise<Readonly<Record<string, number>>> {
    if (this.pendingFetch !== null) {
      return this.pendingFetch;
    }

    const fetchPromise = withRetry(() => this.provider.fetchRates(BASE_CURRENCY, { timeoutMs: config.timeoutMs }), {
      maxAttempts: config.maxAttempts,
      delayMs: config.retryDelayMs,
      onAttemptFailed: (error, attempt) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Exchange rate API attempt ${attempt} failed`, { attempt, message });
      },
    })
      .then((rates) => {
        this.cache.set(BASE_CURRENCY, rates);
        return rates;
      })
      .finally(() => {
        this.pendingFetch = null;
      });

    this.pendingFetch = fetchPromise;
    return fetchPromise;
  }
}
