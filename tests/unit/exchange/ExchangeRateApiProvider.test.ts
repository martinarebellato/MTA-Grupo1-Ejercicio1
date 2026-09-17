import { ExchangeRateApiProvider, type FetchFn } from '../../../src/services/exchange/ExchangeRateApiProvider';
import {
  ExchangeApiTimeoutError,
  ExchangeApiNetworkError,
  ExchangeApiHttpError,
  ExchangeApiInvalidResponseError,
} from '../../../src/services/exchange/errors';

describe('ExchangeRateApiProvider', () => {
  it('returns the rates from a valid response', async () => {
    const fetchFn: FetchFn = async () => new Response(JSON.stringify({ rates: { ARS: 1000, BRL: 5.4 } }), { status: 200 });
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    const rates = await provider.fetchRates('USD', { timeoutMs: 1000 });

    expect(rates).toEqual({ ARS: 1000, BRL: 5.4 });
  });

  it('R1: throws ExchangeApiTimeoutError when the request is slower than the timeout', async () => {
    const fetchFn: FetchFn = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation timed out', 'TimeoutError'));
        });
      });
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    await expect(provider.fetchRates('USD', { timeoutMs: 20 })).rejects.toThrow(ExchangeApiTimeoutError);
  });

  it('R3: throws ExchangeApiNetworkError on a fetch-level TypeError', async () => {
    const fetchFn: FetchFn = async () => {
      throw new TypeError('fetch failed');
    };
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    await expect(provider.fetchRates('USD', { timeoutMs: 1000 })).rejects.toThrow(ExchangeApiNetworkError);
  });

  it('throws ExchangeApiHttpError on a non-2xx response', async () => {
    const fetchFn: FetchFn = async () => new Response('{}', { status: 500 });
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    await expect(provider.fetchRates('USD', { timeoutMs: 1000 })).rejects.toThrow(ExchangeApiHttpError);
  });

  it('throws ExchangeApiInvalidResponseError on a body that is not valid JSON', async () => {
    const fetchFn: FetchFn = async () => new Response('not json', { status: 200 });
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    await expect(provider.fetchRates('USD', { timeoutMs: 1000 })).rejects.toThrow(ExchangeApiInvalidResponseError);
  });

  it('throws ExchangeApiInvalidResponseError when the payload does not match the expected shape', async () => {
    const fetchFn: FetchFn = async () => new Response(JSON.stringify({ notRates: 1 }), { status: 200 });
    const provider = new ExchangeRateApiProvider('https://api.example.com/latest', fetchFn);

    await expect(provider.fetchRates('USD', { timeoutMs: 1000 })).rejects.toThrow(ExchangeApiInvalidResponseError);
  });
});
