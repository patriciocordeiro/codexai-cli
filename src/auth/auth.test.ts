/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    red: jest.fn(x => x),
    green: jest.fn(x => x),
    yellow: jest.fn(x => x),
    cyan: { underline: jest.fn(x => x) },
    bold: jest.fn(x => x),
    dim: jest.fn(x => x),
  },
  red: jest.fn(x => x),
  green: jest.fn(x => x),
  yellow: jest.fn(x => x),
  cyan: { underline: jest.fn(x => x) },
  bold: jest.fn(x => x),
  dim: jest.fn(x => x),
}));

// Mock axios
jest.mock('axios', () => ({
  default: {
    post: jest.fn(),
  },
  post: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock cli-helpers
jest.mock('../helpers/cli/cli-helpers', () => ({
  openBrowser: jest.fn(),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  writeJson: jest.fn(),
  chmod: jest.fn(),
  pathExists: jest.fn(),
  readJson: jest.fn(),
  remove: jest.fn(),
}));

// Mock ora
jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    text: '',
  }))
);

import axios from 'axios';
import * as fse from 'fs-extra';
import ora from 'ora';
import { openBrowser } from '../helpers/cli/cli-helpers';
import {
  checkAuthentication,
  loadApiKey,
  logout,
  saveApiKey,
  webLogin,
} from './auth';

const TEST_API_KEY = 'test-api-key';
const CONFIG_PATH = expect.stringMatching(/config\.json$/);

// Get references to the mocked functions
const mockFsExtra = fse as jest.Mocked<typeof fse>;
const mockOra = ora as jest.Mock;
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockOpenBrowser = openBrowser as jest.Mock;

describe('environment variable check (process.exit branch)', () => {
  it('should call process.exit(1) and log error if required env vars are missing', () => {
    jest.resetModules();
    jest.doMock('../constants/constants', () => ({
      API_BASE_URL: '',
      CLI_CONFIG_DIR: '',
      WEB_APP_URL: '',
      WEB_LOGIN_PAGE_LINK: 'login',
    }));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const chalkMock = { red: jest.fn(x => x) };
    jest.doMock('chalk', () => chalkMock);
    try {
      require('./auth');
    } catch (e) {
      expect(e.message).toBe('exit');
    }
    expect(errorSpy).toHaveBeenCalledWith(
      'Error: One or more required environment variables are not set.'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('environment variables validation', () => {
    it('should validate that required environment variables are set', () => {
      // This test ensures the environment variable check runs when the module is imported
      // The actual check happens at module load time, so we verify the constants exist
      const {
        API_BASE_URL,
        CLI_CONFIG_DIR,
        WEB_APP_URL,
      } = require('../constants/constants');
      expect(API_BASE_URL).toBeDefined();
      expect(CLI_CONFIG_DIR).toBeDefined();
      expect(WEB_APP_URL).toBeDefined();
    });
  });

  describe('saveApiKey', () => {
    it('should save API key successfully', async () => {
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await saveApiKey(TEST_API_KEY);

      expect(mockFsExtra.ensureDir).toHaveBeenCalled();
      expect(mockFsExtra.writeJson).toHaveBeenCalledWith(CONFIG_PATH, {
        apiKey: TEST_API_KEY,
      });
      expect(mockFsExtra.chmod).toHaveBeenCalledWith(CONFIG_PATH, 0o600);
    });

    it('should handle saveApiKey errors', async () => {
      const error = new Error('Write failed');
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockRejectedValue(error);

      await expect(saveApiKey(TEST_API_KEY)).rejects.toThrow('Write failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save API key.',
        error
      );
    });
  });

  describe('loadApiKey', () => {
    it('should load API key successfully when config exists', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true);
      mockFsExtra.readJson.mockResolvedValue({ apiKey: TEST_API_KEY });

      const apiKey = await loadApiKey();

      expect(apiKey).toBe(TEST_API_KEY);
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
      expect(mockFsExtra.readJson).toHaveBeenCalledWith(CONFIG_PATH);
    });

    it('should return null if config does not exist', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false);

      const apiKey = await loadApiKey();

      expect(apiKey).toBeNull();
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
      expect(mockFsExtra.readJson).not.toHaveBeenCalled();
    });

    it('should handle error when loading API key and return null', async () => {
      const error = new Error('Read failed');
      mockFsExtra.pathExists.mockResolvedValue(true);
      mockFsExtra.readJson.mockRejectedValue(error);

      const apiKey = await loadApiKey();

      expect(apiKey).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load API key.',
        error
      );
    });
  });

  describe('logout', () => {
    it('should remove API key file if it exists', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true);
      mockFsExtra.remove.mockResolvedValue(undefined);

      await logout();

      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
      expect(mockFsExtra.remove).toHaveBeenCalledWith(CONFIG_PATH);
    });

    it('should not attempt to remove if config does not exist', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false);

      await logout();

      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
      expect(mockFsExtra.remove).not.toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', async () => {
      const error = new Error('Remove failed');
      mockFsExtra.pathExists.mockResolvedValue(true);
      mockFsExtra.remove.mockRejectedValue(error);

      await logout();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to remove API key.',
        error
      );
    });
  });

  describe('webLogin', () => {
    let mockSpinner: any;

    beforeEach(() => {
      mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      mockOra.mockReturnValue(mockSpinner);
    });

    it('should successfully login and save the API key on the first poll', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post.mockResolvedValue({
        data: { result: { apiKey: 'new-api-key' } },
      });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('To complete authentication')
      );
      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.stringContaining('mock-uuid')
      );
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/getCliApiKeyFunction'),
        { data: { sessionId: 'mock-uuid' } }
      );
      expect(mockFsExtra.writeJson).toHaveBeenCalledWith(CONFIG_PATH, {
        apiKey: 'new-api-key',
      });
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should warn if browser cannot be opened but continue with login', async () => {
      const browserError = new Error('Browser failed');
      mockOpenBrowser.mockRejectedValue(browserError);
      mockAxios.post.mockResolvedValue({
        data: { result: { apiKey: 'new-api-key' } },
      });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockOpenBrowser).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not automatically open')
      );
      expect(mockAxios.post).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should timeout if API never returns apiKey', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post.mockResolvedValue({ data: {} });

      // Mock delay to resolve immediately for faster test
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn(callback => {
        callback();
        return {} as any;
      });

      await expect(webLogin()).rejects.toThrow('Login timed out.');

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Login timed out')
      );

      global.setTimeout = originalSetTimeout;
    });

    it('should handle polling errors gracefully and continue polling', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle response without result property', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockResolvedValueOnce({ data: { something: 'else' } })
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle response with data but no result.apiKey', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockResolvedValueOnce({ data: { result: {} } })
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle response with data but undefined result', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockResolvedValueOnce({ data: { result: undefined } })
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });

  describe('checkAuthentication', () => {
    it('should throw error if not authenticated', async () => {
      const mockLoadApiKey = jest.fn().mockResolvedValue(null);
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      mockOra.mockReturnValue(mockSpinner);

      await expect(checkAuthentication(mockLoadApiKey)).rejects.toThrow(
        'Authentication required'
      );

      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        '❌ You must be logged in. Please run `codeai login`.'
      );
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });

    it('should succeed if authenticated', async () => {
      const mockLoadApiKey = jest.fn().mockResolvedValue(TEST_API_KEY);
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      mockOra.mockReturnValue(mockSpinner);

      const apiKey = await checkAuthentication(mockLoadApiKey);

      expect(apiKey).toBe(TEST_API_KEY);
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('You are logged in.');
      expect(mockSpinner.fail).not.toHaveBeenCalled();
    });

    it('should handle loadApiKey errors during authentication check', async () => {
      const error = new Error('Load failed');
      const mockLoadApiKey = jest.fn().mockRejectedValue(error);
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      mockOra.mockReturnValue(mockSpinner);

      await expect(checkAuthentication(mockLoadApiKey)).rejects.toThrow(error);

      expect(mockSpinner.start).toHaveBeenCalled();
    });
  });

  describe('webLogin', () => {
    let mockSpinner: any;

    beforeEach(() => {
      mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      mockOra.mockReturnValue(mockSpinner);
    });

    it('should successfully login and save the API key on the first poll', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post.mockResolvedValue({
        data: { result: { apiKey: 'new-api-key' } },
      });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('To complete authentication')
      );
      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.stringContaining('mock-uuid')
      );
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/getCliApiKeyFunction'),
        { data: { sessionId: 'mock-uuid' } }
      );
      expect(mockFsExtra.writeJson).toHaveBeenCalledWith(CONFIG_PATH, {
        apiKey: 'new-api-key',
      });
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should warn if browser cannot be opened but continue with login', async () => {
      const browserError = new Error('Browser failed');
      mockOpenBrowser.mockRejectedValue(browserError);
      mockAxios.post.mockResolvedValue({
        data: { result: { apiKey: 'new-api-key' } },
      });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockOpenBrowser).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not automatically open')
      );
      expect(mockAxios.post).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should timeout if API never returns apiKey', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post.mockResolvedValue({ data: {} });

      // Mock delay to resolve immediately for faster test
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn(callback => {
        callback();
        return {} as any;
      });

      await expect(webLogin()).rejects.toThrow('Login timed out.');

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Login timed out')
      );

      global.setTimeout = originalSetTimeout;
    });

    it('should handle polling errors gracefully and continue polling', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle response without result property', async () => {
      mockOpenBrowser.mockResolvedValue(undefined);
      mockAxios.post
        .mockResolvedValueOnce({ data: { something: 'else' } })
        .mockResolvedValueOnce({
          data: { result: { apiKey: 'new-api-key' } },
        });
      mockFsExtra.ensureDir.mockResolvedValue(undefined);
      mockFsExtra.writeJson.mockResolvedValue(undefined);
      mockFsExtra.chmod.mockResolvedValue(undefined);

      await webLogin();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });
});
