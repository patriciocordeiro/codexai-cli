import { describe, expect, it, jest } from '@jest/globals';

// Mock internal modules

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
jest.mock('open', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
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

describe('Helpers', () => {
  describe('checkAuthentication', () => {
    it('should return API key when authenticated', async () => {
      // Mock loadApiKey to return a valid API key
      jest.mock('./auth', () => ({
        loadApiKey: jest.fn(() => Promise.resolve('test-api-key')),
      }));

      // Mock console.log
      const mockConsoleLog = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const { checkAuthentication } = await import('./helpers');

      const result = await checkAuthentication();

      expect(result).toBe('test-api-key');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Authenticated.');

      mockConsoleLog.mockRestore();
    });

    it('should exit when not authenticated', async () => {
      jest.resetModules();
      jest.doMock('./auth', () => ({
        loadApiKey: jest.fn(() => Promise.resolve(null)),
      }));

      // Mock console.error and process.exit
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const { checkAuthentication } = await import('./helpers');

      await expect(checkAuthentication()).rejects.toThrow(
        'process.exit called'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ You must be logged in. Please run `codeai login`.'
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockConsoleError.mockRestore();
      mockExit.mockRestore();
    });
  });
});
