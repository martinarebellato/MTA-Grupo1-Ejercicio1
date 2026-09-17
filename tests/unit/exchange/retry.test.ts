import { withRetry } from '../../../src/services/exchange/retry';

describe('withRetry', () => {
  it('calls fn once on immediate success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on the 3rd attempt', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('exhausts all attempts and rethrows the last error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'));

    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 0 })).rejects.toThrow('fail 3');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onAttemptFailed for every failed attempt', async () => {
    const onAttemptFailed = jest.fn();
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail 1')).mockResolvedValueOnce('ok');

    await withRetry(fn, { maxAttempts: 3, delayMs: 0, onAttemptFailed });

    expect(onAttemptFailed).toHaveBeenCalledTimes(1);
    expect(onAttemptFailed).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});
