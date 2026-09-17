import { ConsoleLogger, SilentLogger, isLogLevel } from '../../../src/shared/logger';

describe('isLogLevel', () => {
  it('accepts the four known levels', () => {
    expect(isLogLevel('debug')).toBe(true);
    expect(isLogLevel('info')).toBe(true);
    expect(isLogLevel('warn')).toBe(true);
    expect(isLogLevel('error')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isLogLevel('trace')).toBe(false);
    expect(isLogLevel('')).toBe(false);
  });
});

describe('ConsoleLogger', () => {
  const spies = {
    debug: jest.spyOn(console, 'debug').mockImplementation(() => undefined),
    info: jest.spyOn(console, 'info').mockImplementation(() => undefined),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: jest.spyOn(console, 'error').mockImplementation(() => undefined),
  };

  afterEach(() => {
    Object.values(spies).forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    Object.values(spies).forEach((spy) => spy.mockRestore());
  });

  it('logs messages at or above the configured level', () => {
    const logger = new ConsoleLogger('warn');
    logger.debug('should be skipped');
    logger.info('should be skipped too');
    logger.warn('warning message');
    logger.error('error message');

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('defaults to info level', () => {
    const logger = new ConsoleLogger();
    logger.debug('skipped');
    logger.info('logged');

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).toHaveBeenCalledTimes(1);
  });

  it('includes the context in the logged line when provided', () => {
    const logger = new ConsoleLogger('debug');
    logger.info('message with context', { requestId: 'abc-123' });

    expect(spies.info).toHaveBeenCalledWith(expect.stringContaining('requestId'));
  });
});

describe('SilentLogger', () => {
  it('never throws and produces no visible output', () => {
    const logger = new SilentLogger();
    expect(() => {
      logger.debug('x');
      logger.info('x');
      logger.warn('x');
      logger.error('x');
    }).not.toThrow();
  });
});
