// import { config } from 'dotenv';
// import * as path from 'path';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file (created by build script)
const envPath = path.resolve(process.cwd(), '.env');
config({ path: envPath });

console.log(`Environment variables loaded from: ${envPath}`);

// --- Environment Configuration ---
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const CLI_CONFIG_DIR = process.env.CLI_CONFIG_DIR || '~/.codeai';
export const CLI_TIMEOUT = parseInt(process.env.CLI_TIMEOUT || '120000', 10);
export const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '30000', 10);
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

// Development mode check
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
// --- URL Configuration (Production vs Development) ---
export const WEB_APP_URL = IS_DEVELOPMENT
  ? process.env.CODEAI_WEB_URL || 'http://localhost:3000'
  : 'https://app.codeai.com';

export const API_BASE_URL = IS_DEVELOPMENT
  ? process.env.CODEAI_API_URL || 'http://localhost:5001'
  : 'https://api.codeai.com';
