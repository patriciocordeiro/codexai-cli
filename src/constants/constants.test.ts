jest.mock('dotenv', () => ({
  /**
   *
   */
  config: () => {},
}));
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('constants', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('uses default values if env vars are not set', () => {
    process.env.CODEAI_WEB_URL = '';
    process.env.CODEAI_API_URL = '';
    process.env.NODE_ENV = 'production'; // In production, should be undefined when env vars are empty
    jest.resetModules();
    const { WEB_APP_URL, API_BASE_URL } = require('./constants');
    expect(WEB_APP_URL).toBeFalsy();
    expect(API_BASE_URL).toBeFalsy();
  });

  it('uses env vars if set', () => {
    process.env.CODEAI_WEB_URL = 'https://custom.web';
    process.env.CODEAI_API_URL = 'https://custom.api';
    jest.resetModules();
    const { WEB_APP_URL, API_BASE_URL } = require('./constants');
    expect(WEB_APP_URL).toBe('https://custom.web');
    expect(API_BASE_URL).toBe('https://custom.api');
  });

  it('defaults NODE_ENV to production if not set', () => {
    delete process.env.NODE_ENV;
    jest.resetModules();
    const { NODE_ENV } = require('./constants');
    expect(NODE_ENV).toBe('production');
  });

  it('uses default LOG_LEVEL if not set', () => {
    delete process.env.LOG_LEVEL;
    jest.resetModules();
    const { LOG_LEVEL } = require('./constants');
    expect(LOG_LEVEL).toBe('info');
  });

  it('uses default CLI_TIMEOUT if not set', () => {
    delete process.env.CLI_TIMEOUT;
    jest.resetModules();
    const { CLI_TIMEOUT } = require('./constants');
    expect(CLI_TIMEOUT).toBe(120000);
  });

  it('uses default HTTP_TIMEOUT if not set', () => {
    delete process.env.HTTP_TIMEOUT;
    jest.resetModules();
    const { HTTP_TIMEOUT } = require('./constants');
    expect(HTTP_TIMEOUT).toBe(30000);
  });

  it('uses default MAX_RETRIES if not set', () => {
    delete process.env.MAX_RETRIES;
    jest.resetModules();
    const { MAX_RETRIES } = require('./constants');
    expect(MAX_RETRIES).toBe(3);
  });

  it('uses default WEB_LOGIN_PAGE_LINK if not set', () => {
    delete process.env.CODEAI_LOGIN_URL;
    jest.resetModules();
    const { WEB_LOGIN_PAGE_LINK } = require('./constants');
    expect(WEB_LOGIN_PAGE_LINK).toBe('login-cli');
  });

  it('correctly identifies IS_PRODUCTION', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { IS_PRODUCTION } = require('./constants');
    expect(IS_PRODUCTION).toBe(true);
  });

  it('uses default CONFIG_FILE_NAME', () => {
    jest.resetModules();
    const { CONFIG_FILE_NAME } = require('./constants');
    expect(CONFIG_FILE_NAME).toBe('.codeai.json');
  });

  it('uses default CONFIG_FILE_PATH', () => {
    jest.resetModules();
    const { CONFIG_FILE_PATH } = require('./constants');
    const path = require('path');
    expect(CONFIG_FILE_PATH).toBe(path.join(process.cwd(), '.codeai.json'));
  });

  it('uses default DEFAULT_UPLOAD_LIMIT_MB', () => {
    jest.resetModules();
    const { DEFAULT_UPLOAD_LIMIT_MB } = require('./constants');
    expect(DEFAULT_UPLOAD_LIMIT_MB).toBe(10);
  });

  it('uses default FILE_RUN_LIMIT', () => {
    jest.resetModules();
    const { FILE_RUN_LIMIT } = require('./constants');
    expect(FILE_RUN_LIMIT).toBe(200);
  });
});
