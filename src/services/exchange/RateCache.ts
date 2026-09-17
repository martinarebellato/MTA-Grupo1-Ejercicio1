import type { Clock } from '../../shared/clock';

export interface CachedRates {
  readonly rates: Readonly<Record<string, number>>;
  readonly fetchedAt: Date;
}

/**
 * In-memory TTL cache of exchange rates, keyed by base currency. `ttlMs` is taken per `get()`
 * call (not fixed at construction) so a per-request `PipelineConfig` override of `cacheTtlMs`
 * actually takes effect against the shared cache, the same way `ExchangeRateOperationalConfig`
 * threads `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates` per call.
 */
export class RateCache {
  private readonly clock: Clock;
  private entries: ReadonlyMap<string, CachedRates>;

  constructor(clock: Clock) {
    this.clock = clock;
    this.entries = new Map();
  }

  get(base: string, ttlMs: number): CachedRates | null {
    const entry = this.entries.get(base);
    if (entry === undefined) {
      return null;
    }
    const age = this.clock.now().getTime() - entry.fetchedAt.getTime();
    if (age >= ttlMs) {
      return null;
    }
    return entry;
  }

  set(base: string, rates: Readonly<Record<string, number>>): void {
    const next = new Map(this.entries);
    next.set(base, { rates, fetchedAt: this.clock.now() });
    this.entries = next;
  }

  invalidate(): void {
    this.entries = new Map();
  }
}
