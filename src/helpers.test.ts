import { afterEach, describe, expect, it, jest } from '@jest/globals';

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

  describe('createProjectWithFiles', () => {
    it('should create project and return results', async () => {
      jest.resetModules();

      // Mock constants
      jest.doMock('./constants', () => ({
        API_BASE_URL: 'https://api.test.com',
        HTTP_TIMEOUT: 30000,
        IS_DEVELOPMENT: false,
      }));

      // Mock ora spinner
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      jest.doMock('ora', () => jest.fn(() => mockSpinner));

      // Mock axios post method
      mockAxiosPost.mockResolvedValue({
        data: {
          resultsUrl: 'https://results.test.com',
          projectId: 'proj-123',
        },
      });

      const { createProjectWithFiles } = await import('./helpers');
      const mockBuffer = Buffer.from('test-zip');
      const result = await createProjectWithFiles(
        mockBuffer,
        'test-api-key',
        'test-project',
        'REVIEW',
        'en'
      );

      expect(result).toEqual({
        resultsUrl: 'https://results.test.com',
        projectId: 'proj-123',
      });
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Analysis successfully initiated!'
      );
    });

    it('should handle API errors', async () => {
      jest.resetModules();
      jest.clearAllMocks();
      const mockBuffer = Buffer.from('test-zip');

      // Mock axios to return error
      const axiosError = {
        response: {
          status: 400,
          data: 'Bad request',
        },
      };
      mockAxiosPost.mockRejectedValue(axiosError);

      // Mock ora spinner
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      jest.doMock('ora', () => jest.fn(() => mockSpinner));

      // Mock console.error and process.exit
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const { createProjectWithFiles } = await import('./helpers');

      await expect(
        createProjectWithFiles(mockBuffer, 'test-api-key')
      ).rejects.toThrow('process.exit called');

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        'Failed to start analysis.'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Error 400: Bad request'
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockConsoleError.mockRestore();
      mockExit.mockRestore();
    });
  });
  describe('Error handling in createProjectWithFiles', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should handle unexpected axios error', async () => {
      jest.resetModules();
      jest.clearAllMocks();

      const mockBuffer = Buffer.from('test-zip');
      // Simulate axios throwing a generic error (not AxiosError)
      mockAxiosPost.mockRejectedValue(new Error('Network down'));

      // Mock ora spinner
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      jest.doMock('ora', () => jest.fn(() => mockSpinner));

      // Mock console.error and process.exit
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const { createProjectWithFiles } = await import('./helpers');

      await expect(
        createProjectWithFiles(mockBuffer, 'test-api-key')
      ).rejects.toThrow('process.exit called');

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        'Failed to start analysis.'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        'An unexpected error occurred:',
        'Network down'
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockConsoleError.mockRestore();
      mockExit.mockRestore();
    });
  });
  describe('compressProject', () => {
    it('should compress project files successfully', async () => {
      jest.resetModules();
      jest.clearAllMocks();
      const mockBuffer = Buffer.from('test-zip-content');
      const mockCreateZipFromPaths = jest.fn(() => Promise.resolve(mockBuffer));
      jest.doMock('./archive', () => ({
        createZipFromPaths: mockCreateZipFromPaths,
      }));

      // Mock ora spinner
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      jest.doMock('ora', () => jest.fn(() => mockSpinner));

      const { compressProject } = await import('./helpers');
      const result = await compressProject(['/test/path']);

      expect(result).toBe(mockBuffer);
      expect(mockCreateZipFromPaths).toHaveBeenCalledWith(['/test/path']);
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle compression errors', async () => {
      jest.resetModules();
      jest.clearAllMocks();

      const error = new Error('Compression failed');
      const mockCreateZipFromPaths = jest.fn(() => Promise.reject(error));
      jest.doMock('./archive', () => ({
        createZipFromPaths: mockCreateZipFromPaths,
      }));

      // Mock ora spinner
      const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
      };
      jest.doMock('ora', () => jest.fn(() => mockSpinner));

      // Mock console.error and process.exit
      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const { compressProject } = await import('./helpers');

      await expect(compressProject(['/test/path'])).rejects.toThrow(
        'process.exit called'
      );
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        'Error during file compression.'
      );
      expect(mockConsoleError).toHaveBeenCalledWith(error);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockConsoleError.mockRestore();
      mockExit.mockRestore();
    });
  });

  describe('executeCommand', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should execute a command successfully', async () => {
      jest.resetModules();
      jest.clearAllMocks();
      const mockExec = jest.fn(
        (
          cmd: string,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string
          ) => void
        ) => {
          callback(null, 'Command output', '');
        }
      );
      jest
        .spyOn(require('child_process'), 'exec')
        .mockImplementation(mockExec as never);

      const { executeCommand } = await import('./helpers');
      const result = await executeCommand('echo Hello World');

      expect(result).toBe(undefined);
      expect(mockExec).toHaveBeenCalledWith(
        'echo Hello World',
        expect.any(Function)
      );
    });

    it('should handle command execution errors', async () => {
      const mockExec = jest.fn(
        (
          cmd: string,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string
          ) => void
        ) => {
          callback(new Error('Command failed'), '', 'Error output');
        }
      );
      jest
        .spyOn(require('child_process'), 'exec')
        .mockImplementation(mockExec as never);

      const { executeCommand } = await import('./helpers');

      await expect(executeCommand('invalid-command')).rejects.toThrow(
        'Command failed'
      );
      expect(mockExec).toHaveBeenCalledWith(
        'invalid-command',
        expect.any(Function)
      );
    });
  });

  // describe('openBrowser', () => {
  //   it('should open the browser with the correct URL', async () => {
  //     jest.resetModules();
  //     // Mock executeCommand to resolve (simulate success)
  //     const mockExecuteCommand = jest
  //       .fn()
  //       .mockResolvedValue(undefined as never);

  //     // Mock os.platform to simulate different platforms
  //     jest.spyOn(require('os'), 'platform').mockReturnValue('darwin');
  //     jest.doMock('./helpers', () => ({
  //       ...(jest.requireActual('./helpers') as object),
  //       executeCommand: mockExecuteCommand,
  //     }));

  //     const { openBrowser } = await import('./helpers');
  //     await openBrowser('https://example.com');

  //     expect(mockExecuteCommand).toHaveBeenCalledWith(
  //       'open https://example.com'
  //     );
  //   });

  //   it('should handle executeCommand errors gracefully', async () => {
  //     jest.resetModules();
  //     // Mock executeCommand to reject (simulate failure)
  //     const mockExecuteCommand = jest
  //       .fn()
  //       .mockRejectedValue(new Error('Command failed') as never);
  //     jest.spyOn(require('os'), 'platform').mockReturnValue('darwin');
  //     jest.doMock('./helpers', () => ({
  //       ...(jest.requireActual('./helpers') as object),
  //       executeCommand: mockExecuteCommand,
  //     }));

  //     // Mock console.error to suppress error output in test
  //     const mockConsoleError = jest
  //       .spyOn(console, 'error')
  //       .mockImplementation(() => {});

  //     const { openBrowser } = await import('./helpers');
  //     // Instead of expecting resolves, expect rejection (since openBrowser does not catch executeCommand errors)
  //     await expect(openBrowser('https://example.com')).rejects.toThrow(
  //       'Command failed'
  //     );

  //     expect(mockExecuteCommand).toHaveBeenCalledWith(
  //       'open https://example.com'
  //     );
  //     mockConsoleError.mockRestore();
  //   });
  // });
});
