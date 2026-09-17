export interface RetryOptions {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly onAttemptFailed?: (error: unknown, attempt: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries `fn` up to `maxAttempts` total attempts (D10), with a short linear backoff. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      options.onAttemptFailed?.(error, attempt);
      if (attempt < options.maxAttempts && options.delayMs > 0) {
        await sleep(options.delayMs * attempt);
      }
    }
  }

  throw lastError;
}
