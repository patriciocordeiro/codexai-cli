import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file

dotenv.config();

/**
 * The current Node.js environment (default: 'production').
 */
export const NODE_ENV = process.env.NODE_ENV || 'production';
/**
 * The log level for the CLI (default: 'info').
 */
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
/**
 * The directory for CLI configuration files.
 */
export const CLI_CONFIG_DIR = process.env.CLI_CONFIG_DIR;
/**
 * The CLI timeout in milliseconds (default: 120000).
 */
export const CLI_TIMEOUT = parseInt(process.env.CLI_TIMEOUT || '120000', 10);
/**
 * The HTTP request timeout in milliseconds (default: 30000).
 */
export const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '30000', 10);
/**
 * The maximum number of retries for HTTP requests (default: 3).
 */
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

/**
 * The URL for web login (default: 'https://app.codeai.com/login').
 */
export const WEB_LOGIN_PAGE_LINK = process.env.CODEAI_LOGIN_URL || 'login-cli';
/**
 * Whether the environment is production.
 */
export const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * The base URL for the CodeAI web application.
 */
export const WEB_APP_URL = process.env.CODEAI_WEB_URL;
/**
 * The base URL for the CodeAI API.
 */
export const API_BASE_URL = process.env.CODEAI_API_URL;

// --- File System ---
/**
 * The name of the project configuration file.
 */
export const CONFIG_FILE_NAME = '.codeai.json';
/**
 * The absolute path to the project configuration file.
 */
export const CONFIG_FILE_PATH = path.join(process.cwd(), CONFIG_FILE_NAME);
/**
 * The default maximum upload size in megabytes.
 */
export const DEFAULT_UPLOAD_LIMIT_MB = 10;
/**
 * The maximum number of files allowed per analysis run.
 */
export const FILE_RUN_LIMIT = 200;
