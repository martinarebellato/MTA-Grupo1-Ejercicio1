export interface FetchRatesOptions {
  readonly timeoutMs: number;
}

export interface ExchangeRateProvider {
  fetchRates(base: string, options: FetchRatesOptions): Promise<Record<string, number>>;
}
