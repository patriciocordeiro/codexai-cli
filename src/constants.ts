import { config } from 'dotenv';
import * as path from 'path';

const envFile = '.env';
const envPath = path.resolve(process.cwd(), envFile);

config({ path: envPath });

// --- Environment Configuration ---
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const CLI_CONFIG_DIR = process.env.CLI_CONFIG_DIR || '~/.codeai';
export const CLI_TIMEOUT = parseInt(process.env.CLI_TIMEOUT || '120000', 10);
export const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '30000', 10);
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

// Development mode check
export const IS_PRODUCTION = NODE_ENV === 'production';

// --- URL Configuration (from environment variables) ---
export const WEB_APP_URL = process.env.CODEAI_WEB_URL;
export const API_BASE_URL = process.env.CODEAI_API_URL;

if ((!WEB_APP_URL || !API_BASE_URL) && process.env.NODE_ENV === 'production') {
  throw new Error(
    'Environment variables CODEAI_WEB_URL and CODEAI_API_URL must be set. Please check your .env file or check the .env.example file in the project root to see the required variables.'
  );
}
