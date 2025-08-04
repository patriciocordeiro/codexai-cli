import {
  API_BASE_URL,
  IS_PRODUCTION,
  LOG_LEVEL,
  NODE_ENV,
  WEB_APP_URL,
} from '../constants/constants';

/**
 * Logger utility class for configurable log levels and message formatting.
 */
export class Logger {
  private static level = LOG_LEVEL;

  /**
   * Logs a debug message if the log level allows.
   * @param {string} message - The debug message.
   * @param {...unknown} args - Additional arguments to log.
   */
  static debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Logs an info message if the log level allows.
   * @param {string} message - The info message.
   * @param {...unknown} args - Additional arguments to log.
   */
  static info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message if the log level allows.
   * @param {string} message - The warning message.
   * @param {...unknown} args - Additional arguments to log.
   */
  static warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Logs an error message if the log level allows.
   * @param {string} message - The error message.
   * @param {...unknown} args - Additional arguments to log.
   */
  static error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Determines if a message should be logged based on the current log level.
   * @param {string} level - The log level to check.
   * @returns {boolean} True if the message should be logged, false otherwise.
   */
  private static shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }
}

/**
 * Validates and logs the current environment configuration.
 * @returns {Promise<void>} Resolves when validation is complete.
 */
export async function validateEnvironment(): Promise<void> {
  Logger.debug(`Environment: ${NODE_ENV}`);
  Logger.debug(`Production mode: ${IS_PRODUCTION}`);
  Logger.debug('Environment validation completed successfully');
}

/**
 * Logs the current configuration if not in production mode.
 * @param {boolean} [isProduction=IS_PRODUCTION] - Whether the environment is production.
 * @returns {void}
 */
export function logConfiguration(isProduction: boolean = IS_PRODUCTION): void {
  if (!isProduction) {
    Logger.debug('Current configuration:');
    Logger.debug(`- NODE_ENV: ${NODE_ENV}`);
    Logger.debug(`- LOG_LEVEL: ${LOG_LEVEL}`);
    Logger.debug(`- WEB_APP_URL: ${WEB_APP_URL}`);
    Logger.debug(`- API_BASE_URL: ${API_BASE_URL}`);
  }
}
