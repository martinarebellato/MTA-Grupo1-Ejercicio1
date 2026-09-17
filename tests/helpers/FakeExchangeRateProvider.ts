import type { ExchangeRateProvider, FetchRatesOptions } from '../../src/services/exchange/ExchangeRateProvider';

type Behavior = () => Promise<Record<string, number>>;

/** Programmable fake for `ExchangeRateProvider`: queue one-off behaviors and/or set a default. */
export class FakeExchangeRateProvider implements ExchangeRateProvider {
  calls = 0;

  private readonly queue: Behavior[] = [];
  private defaultBehavior: Behavior | null = null;
  private timeoutMode = false;

  succeedWith(rates: Record<string, number>): this {
    this.queue.push(() => Promise.resolve(rates));
    return this;
  }

  failWith(error: Error): this {
    this.queue.push(() => Promise.reject(error));
    return this;
  }

  alwaysSucceedWith(rates: Record<string, number>): this {
    this.defaultBehavior = () => Promise.resolve(rates);
    return this;
  }

  alwaysFailWith(error: Error): this {
    this.defaultBehavior = () => Promise.reject(error);
    return this;
  }

  /** Simulates a provider that never responds in time: rejects after `options.timeoutMs`, like a real `AbortSignal.timeout`. */
  alwaysTimeout(): this {
    this.timeoutMode = true;
    return this;
  }

  async fetchRates(_base: string, options: FetchRatesOptions): Promise<Record<string, number>> {
    this.calls += 1;
    if (this.timeoutMode) {
      return new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException('The operation timed out', 'TimeoutError')), options.timeoutMs);
      });
    }
    const next = this.queue.shift();
    if (next !== undefined) {
      return next();
    }
    if (this.defaultBehavior !== null) {
      return this.defaultBehavior();
    }
    throw new Error('FakeExchangeRateProvider: no behavior configured for this call');
  }
}
