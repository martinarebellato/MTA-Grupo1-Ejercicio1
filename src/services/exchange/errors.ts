export class ExchangeApiTimeoutError extends Error {
  constructor(message = 'Exchange rate API request timed out') {
    super(message);
    this.name = 'ExchangeApiTimeoutError';
  }
}

export class ExchangeApiNetworkError extends Error {
  constructor(message = 'Exchange rate API request failed due to a network error') {
    super(message);
    this.name = 'ExchangeApiNetworkError';
  }
}

export class ExchangeApiHttpError extends Error {
  readonly status: number;

  constructor(status: number, message = `Exchange rate API responded with HTTP ${status}`) {
    super(message);
    this.name = 'ExchangeApiHttpError';
    this.status = status;
  }
}

export class ExchangeApiInvalidResponseError extends Error {
  constructor(message = 'Exchange rate API returned an invalid payload') {
    super(message);
    this.name = 'ExchangeApiInvalidResponseError';
  }
}
