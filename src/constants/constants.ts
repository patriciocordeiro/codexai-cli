import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'production';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const CLI_CONFIG_DIR = process.env.CLI_CONFIG_DIR;
export const CLI_TIMEOUT = parseInt(process.env.CLI_TIMEOUT || '120000', 10);
export const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '30000', 10);
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

export const IS_PRODUCTION = NODE_ENV === 'production';

export const WEB_APP_URL = process.env.CODEAI_WEB_URL;
export const API_BASE_URL = process.env.CODEAI_API_URL;
