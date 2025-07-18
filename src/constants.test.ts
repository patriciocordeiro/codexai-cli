jest.mock('dotenv', () => ({ config: () => {} }));
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
    process.env.NODE_ENV = 'test';
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
});
