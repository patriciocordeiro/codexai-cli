import {
  API_BASE_URL,
  IS_PRODUCTION,
  LOG_LEVEL,
  NODE_ENV,
  WEB_APP_URL,
} from './constants';

/**
 * Logger utility with different levels
 */
export class Logger {
  private static level = LOG_LEVEL;

  static debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  private static shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }
}

/**
 * Environment configuration validator
 */
export async function validateEnvironment() {
  // No required environment variables for end users
  // URLs are hardcoded, other settings have defaults

  Logger.debug(`Environment: ${NODE_ENV}`);
  Logger.debug(`Production mode: ${IS_PRODUCTION}`);
  Logger.debug('Environment validation completed successfully');
}

/**
 * Configuration summary for debugging
 */
// export function logConfiguration(): void {
export function logConfiguration(isProduction: boolean = IS_PRODUCTION): void {
  if (!isProduction) {
    Logger.debug('Current configuration:');
    Logger.debug(`- NODE_ENV: ${NODE_ENV}`);
    Logger.debug(`- LOG_LEVEL: ${LOG_LEVEL}`);
    Logger.debug(`- WEB_APP_URL: ${WEB_APP_URL}`);
    Logger.debug(`- API_BASE_URL: ${API_BASE_URL}`);
  }
}
