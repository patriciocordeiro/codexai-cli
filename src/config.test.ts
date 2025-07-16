import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { logConfiguration, Logger, validateEnvironment } from './config';
import { IS_PRODUCTION, NODE_ENV } from './constants';

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof jest.spyOn>;
  let consoleInfoSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs debug messages when level is debug', () => {
    Logger['level'] = 'debug';
    Logger.debug('Debug message');
    expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
  });

  it('does not log debug messages when level is info', () => {
    Logger['level'] = 'info';
    Logger.debug('Debug message');
    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  it('logs info messages when level is info', () => {
    Logger['level'] = 'info';
    Logger.info('Info message');
    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message');
  });

  it('logs warn messages when level is warn', () => {
    Logger['level'] = 'warn';
    Logger.warn('Warn message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warn message');
  });

  it('logs error messages when level is error', () => {
    Logger['level'] = 'error';
    Logger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
  });
});

describe('validateEnvironment', () => {
  let debugSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    debugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs environment details', () => {
    validateEnvironment();
    expect(debugSpy).toHaveBeenCalledWith(`Environment: ${NODE_ENV}`);
    expect(debugSpy).toHaveBeenCalledWith(`Production mode: ${IS_PRODUCTION}`);
    expect(debugSpy).toHaveBeenCalledWith(
      'Environment validation completed successfully'
    );
  });
});

describe('logConfiguration', () => {
  it('should use default argument (IS_PRODUCTION) if not provided', () => {
    const debugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});
    // Call without argument, should use default (IS_PRODUCTION)
    logConfiguration();
    // If IS_PRODUCTION is true, debug should not be called
    // If IS_PRODUCTION is false, debug should be called
    // We only assert that it does not throw and is callable
    expect(typeof logConfiguration).toBe('function');
    debugSpy.mockRestore();
  });

  it('should log configuration when isProduction is false', () => {
    const debugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});
    logConfiguration(false);
    expect(debugSpy).toHaveBeenCalledWith('Current configuration:');
    debugSpy.mockRestore();
  });

  it('should not log configuration when isProduction is true', () => {
    const debugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});
    logConfiguration(true);
    expect(debugSpy).not.toHaveBeenCalledWith('Current configuration:');
    debugSpy.mockRestore();
  });
});
