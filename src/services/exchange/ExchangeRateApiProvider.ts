import { z } from 'zod';
import type { ExchangeRateProvider, FetchRatesOptions } from './ExchangeRateProvider';
import {
  ExchangeApiTimeoutError,
  ExchangeApiNetworkError,
  ExchangeApiHttpError,
  ExchangeApiInvalidResponseError,
} from './errors';

const ratesResponseSchema = z.object({
  rates: z.record(z.string(), z.number()),
});

export type FetchFn = typeof fetch;

/**
 * Duck-types the error's `name` instead of using `instanceof Error`: a `DOMException` thrown by
 * an `AbortSignal.timeout()` abort can originate from a different realm than the local `Error`
 * global (notably under Jest's per-test-file VM context), which would make `instanceof Error`
 * unreliable even though the object is a perfectly normal error-like value.
 */
function isTimeoutLikeError(error: unknown): boolean {
  const name = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  return name === 'TimeoutError' || name === 'AbortError';
}

function errorMessage(error: unknown): string {
  const message = typeof error === 'object' && error !== null ? (error as { message?: unknown }).message : undefined;
  return typeof message === 'string' ? message : String(error);
}

/** HTTP-backed `ExchangeRateProvider` for the ExchangeRate-API v4 `latest/{base}` endpoint. */
export class ExchangeRateApiProvider implements ExchangeRateProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(baseUrl: string, fetchFn: FetchFn = fetch) {
    this.baseUrl = baseUrl;
    this.fetchFn = fetchFn;
  }

  async fetchRates(base: string, options: FetchRatesOptions): Promise<Record<string, number>> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/${base}`, {
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (isTimeoutLikeError(error)) {
        throw new ExchangeApiTimeoutError();
      }
      throw new ExchangeApiNetworkError(errorMessage(error));
    }

    if (!response.ok) {
      throw new ExchangeApiHttpError(response.status);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ExchangeApiInvalidResponseError('Response body is not valid JSON');
    }

    const parsed = ratesResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ExchangeApiInvalidResponseError('Response payload does not match the expected shape');
    }

    return parsed.data.rates;
  }
}
