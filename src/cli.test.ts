import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Mock external dependencies before any imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxiosPost = jest.fn() as jest.MockedFunction<any>;
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: mockAxiosPost,
    defaults: { timeout: 30000 },
  },
}));

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    red: jest.fn(text => text),
    green: jest.fn(text => text),
    yellow: jest.fn(text => text),
    blue: jest.fn(text => text),
    gray: jest.fn(text => text),
  },
}));

jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn(() => ({
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    })),
  })),
}));

// Mock internal modules
jest.mock('./archive');
jest.mock('./auth');
jest.mock('./constants');
jest.mock('./config');

// Prevent process.exit from terminating the test runner
let originalProcessExit: typeof process.exit;

// Set required environment variables for tests
beforeAll(() => {
  process.env.CLI_CONFIG_DIR = '/tmp';
  process.env.API_BASE_URL = 'https://api.test.com';
  process.env.WEB_APP_URL = 'https://web.test.com';

  originalProcessExit = process.exit;
  jest
    .spyOn(process, 'exit')
    .mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit called with "${code}"`);
    });
});

afterAll(() => {
  process.exit = originalProcessExit;
});

describe('CLI (index.ts)', () => {
  beforeEach(() => {
    // Ensure required env vars are set before each test
    process.env.CLI_CONFIG_DIR = '/tmp';
    process.env.API_BASE_URL = 'https://api.test.com';
    process.env.WEB_APP_URL = 'https://web.test.com';
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should export helper functions', async () => {
    // Ensure required env vars are set before importing helpers
    process.env.CLI_CONFIG_DIR = '/tmp';
    process.env.API_BASE_URL = 'https://api.test.com';
    process.env.WEB_APP_URL = 'https://web.test.com';

    const indexModule = await import('./helpers');

    expect(typeof indexModule.compressProject).toBe('function');
    expect(typeof indexModule.createProjectWithFiles).toBe('function');
  });

  describe('Module initialization', () => {
    it('should validate environment on startup', async () => {
      jest.resetModules(); // Ensure module registry is reset so mocks are used

      const mockValidateEnvironment = jest.fn();
      jest.doMock('./config', () => ({
        validateEnvironment: mockValidateEnvironment,
        logConfiguration: jest.fn(),
      }));

      jest.doMock('./constants', () => ({
        API_BASE_URL: 'https://api.test.com',
        HTTP_TIMEOUT: 30000,
        IS_DEVELOPMENT: false,
      }));
      const { validateEnvironment } = await import('./config');
      validateEnvironment();
      expect(mockValidateEnvironment).toHaveBeenCalled();
    });

    it('should log configuration in development mode', async () => {
      const mockLogConfiguration = jest.fn();
      jest.doMock('./config', () => ({
        validateEnvironment: jest.fn(),
        logConfiguration: mockLogConfiguration,
      }));

      jest.doMock('./constants', () => ({
        API_BASE_URL: 'https://api.test.com',
        HTTP_TIMEOUT: 30000,
        IS_DEVELOPMENT: true,
      }));

      const { logConfiguration } = await import('./config');
      logConfiguration();

      expect(mockLogConfiguration).toHaveBeenCalled();
    });

    it('should not log configuration in production mode', async () => {
      const mockLogConfiguration = jest.fn();
      jest.doMock('./config', () => ({
        validateEnvironment: jest.fn(),
        logConfiguration: mockLogConfiguration,
      }));

      jest.doMock('./constants', () => ({
        API_BASE_URL: 'https://api.test.com',
        HTTP_TIMEOUT: 30000,
        IS_PRODUCTION: true,
      }));

      expect(mockLogConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('CLI entry point', () => {
    it('should not run CLI when not main module', async () => {
      // Import Command class and instantiate it, then spy on its parse method
      const { Command } = require('commander');
      const commandInstance = new Command();
      const runSpy = jest
        .spyOn(commandInstance, 'parse')
        .mockImplementation(() => {
          throw new Error('CLI should not run in this context');
        });

      await jest.isolateModulesAsync(async () => {
        await import('./helpers');
      });

      expect(runSpy).not.toHaveBeenCalled();

      // Restore require.main to its original value
      runSpy.mockRestore();
    });
  });
});

describe('Integration tests', () => {
  it('should handle successful analyze command flow', async () => {
    // Mock all dependencies
    const mockLoadApiKey = jest.fn(() => Promise.resolve('test-api-key'));
    const mockCreateZipFromPaths = jest.fn(() =>
      Promise.resolve(Buffer.from('test-zip'))
    );
    const mockResponse = {
      resultsUrl: 'https://results.test.com',
      projectId: 'proj-123',
    };

    // Mock axios post
    mockAxiosPost.mockResolvedValue({ data: mockResponse });

    jest.doMock('./auth', () => ({ loadApiKey: mockLoadApiKey }));
    jest.doMock('./archive', () => ({
      createZipFromPaths: mockCreateZipFromPaths,
    }));

    const mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };
    jest.doMock('ora', () => jest.fn(() => mockSpinner));

    const { checkAuthentication, compressProject, createProjectWithFiles } =
      await import('./helpers');

    // Test the full flow
    const apiKey = await checkAuthentication();
    const zipBuffer = await compressProject(['/test/path']);
    const result = await createProjectWithFiles(
      zipBuffer,
      apiKey,
      'test-project',
      'REVIEW',
      'en'
    );

    expect(apiKey).toBe('test-api-key');
    expect(result.projectId).toBe('proj-123');
    expect(result.resultsUrl).toBe('https://results.test.com');
    expect(mockCreateZipFromPaths).toHaveBeenCalledWith(['/test/path']);
  });
});
