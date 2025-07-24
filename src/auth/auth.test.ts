// import { beforeEach, describe, expect, it, jest } from '@jest/globals';
// import axios from 'axios';
// import chalk from 'chalk';
// import * as fse from 'fs-extra';
// import ora from 'ora';
// import * as helpers from '../helpers/helpers';
// import { openBrowser } from '../helpers/helpers';
// import { loadApiKey, logout, saveApiKey, webLogin } from './auth';

// jest.mock('path', () => ({
//   join: (...args: string[]) => args.join('/'),
//   dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
//   basename: (p: string) => p.split('/').pop() || '',
//   resolve: (...args: string[]) => args.join('/'),
// }));
// jest.mock('os', () => ({
//   homedir: () => '/mock',
// }));

// jest.mock('fs-extra');
// jest.mock('axios');
// jest.mock('ora', () => {
//   const oraMock = jest.fn(() => ({
//     start: jest.fn().mockReturnThis(),
//     succeed: jest.fn(),
//     fail: jest.fn(),
//   }));
//   return oraMock;
// });
// jest.mock('chalk', () => ({
//   bold: (s: string) => s,
//   dim: (s: string) => s,
//   cyan: { underline: (s: string) => s },
//   green: (s: string) => s,
//   red: (s: string) => s,
//   yellow: (s: string) => s,
// }));

// jest.mock('./helpers', () => ({
//   openBrowser: jest.fn(),
//   executeCommand: jest.fn(),
// }));

// jest.mock('./constants', () => ({
//   API_BASE_URL: 'https://api.test.com',
//   WEB_APP_URL: 'https://web.test.com',
//   CLI_CONFIG_DIR: '/mock/.codeai',
//   CLI_TIMEOUT: 120000,
//   HTTP_TIMEOUT: 30000,
//   MAX_RETRIES: 3,
//   IS_DEVELOPMENT: false,
// }));

// describe('auth', () => {
//   const CONFIG_PATH = '/mock/.codeai/config.json';

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('saveApiKey', () => {
//     it('saves the API key to a file', async () => {
//       await saveApiKey('mock-api-key');
//       expect(fse.ensureDir).toHaveBeenCalledWith('/mock/.codeai');
//       expect(fse.writeJson).toHaveBeenCalledWith(CONFIG_PATH, {
//         apiKey: 'mock-api-key',
//       });
//       expect(fse.chmod).toHaveBeenCalledWith(CONFIG_PATH, 0o600);
//     });

//     it('logs and throws if saving fails', async () => {
//       const error = new Error('disk full');
//       // Mock ensureDir to throw
//       (fse.ensureDir as jest.Mock).mockRejectedValueOnce(error as never);

//       const consoleErrorSpy = jest
//         .spyOn(console, 'error')
//         .mockImplementation(() => {});

//       await expect(saveApiKey('fail-key')).rejects.toThrow(error);
//       expect(consoleErrorSpy).toHaveBeenCalledWith(
//         'Failed to save API key.',
//         error
//       );

//       consoleErrorSpy.mockRestore();
//     });
//   });

//   describe('loadApiKey', () => {
//     it('loads the API key from a file', async () => {
//       (fse.pathExists as jest.Mock).mockImplementation(
//         async (path: unknown) => {
//           return typeof path === 'string' && path === CONFIG_PATH;
//         }
//       );

//       (fse.readJson as jest.Mock).mockImplementation(async (file: unknown) => {
//         if (typeof file === 'string') {
//           return { apiKey: 'mock-api-key' };
//         }
//         throw new Error('Invalid file path');
//       });

//       const apiKey = await loadApiKey();
//       expect(apiKey).toBe('mock-api-key');
//       expect(fse.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
//       expect(fse.readJson).toHaveBeenCalledWith(CONFIG_PATH);
//     });

//     it('returns null if the file does not exist', async () => {
//       (fse.pathExists as jest.Mock).mockImplementation(async () => false);

//       const apiKey = await loadApiKey();
//       expect(apiKey).toBeNull();
//       expect(fse.pathExists).toHaveBeenCalledWith(CONFIG_PATH);
//     });

//     it('logs and returns null if loading fails', async () => {
//       const error = new Error('read error');
//       (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
//       (fse.readJson as jest.Mock).mockRejectedValue(error as never);

//       const consoleErrorSpy = jest
//         .spyOn(console, 'error')
//         .mockImplementation(() => {});

//       const apiKey = await loadApiKey();
//       expect(apiKey).toBeNull();
//       expect(consoleErrorSpy).toHaveBeenCalledWith(
//         'Failed to load API key.',
//         error
//       );

//       consoleErrorSpy.mockRestore();
//     });
//   });

//   describe('webLogin', () => {
//     it('opens the browser and polls for API key', async () => {
//       const spinnerMock = {
//         start: jest.fn().mockReturnThis(),
//         succeed: jest.fn(),
//         fail: jest.fn(),
//       };
//       (ora as jest.Mock).mockReturnValue(spinnerMock);
//       (axios.post as jest.Mock).mockImplementation(async (url: unknown) => {
//         if (typeof url === 'string' && url.includes('getCliApiKeyFunction')) {
//           return { data: { result: { apiKey: 'mock-api-key' } } };
//         }
//         throw new Error('Invalid URL');
//       });

//       // Spy on openBrowser so it can be asserted
//       const openBrowserSpy = jest
//         .spyOn(helpers, 'openBrowser')
//         .mockResolvedValue(undefined);

//       await webLogin();

//       expect(openBrowserSpy).toHaveBeenCalledWith(
//         expect.stringContaining('/cli-login?session=')
//       );
//       expect(spinnerMock.start).toHaveBeenCalled();
//       expect(spinnerMock.succeed).toHaveBeenCalledWith(
//         chalk.green('✅ Successfully logged in!')
//       );

//       openBrowserSpy.mockRestore();
//       expect(fse.writeJson).toHaveBeenCalledWith(CONFIG_PATH, {
//         apiKey: 'mock-api-key',
//       });
//     });

//     it('fails if login times out', async () => {
//       jest.spyOn(global, 'setTimeout').mockImplementation((fn: unknown) => {
//         (fn as Function)();
//         return 0 as never;
//       });
//       jest.mock('./auth', () => {
//         const original = jest.requireActual('./auth');
//         return Object.assign({}, original, {
//           delay: () => Promise.resolve(),
//         });
//       });
//       const spinnerMock = {
//         start: jest.fn().mockReturnThis(),
//         succeed: jest.fn(),
//         fail: jest.fn(),
//       };
//       (ora as jest.Mock).mockReturnValue(spinnerMock);
//       (axios.post as jest.Mock).mockImplementation(async () => {
//         throw new Error('Polling error');
//       });

//       await expect(webLogin()).rejects.toThrow('Login timed out.');

//       expect(spinnerMock.fail).toHaveBeenCalledWith(
//         chalk.red('❌ Login timed out. Please try again.')
//       );
//     });

//     it('warns if browser cannot be opened', async () => {
//       const spinnerMock = {
//         start: jest.fn().mockReturnThis(),
//         succeed: jest.fn(),
//         fail: jest.fn(),
//       };
//       (ora as jest.Mock).mockReturnValue(spinnerMock);

//       const consoleWarnSpy = jest
//         .spyOn(console, 'warn')
//         .mockImplementation(() => {});

//       // Make open throw
//       (openBrowser as jest.Mock).mockImplementation(() => {
//         throw new Error('browser error');
//       });

//       // Patch axios.post to immediately resolve with no apiKey to avoid polling loop
//       (axios.post as jest.Mock).mockResolvedValue({
//         data: { result: {} },
//       } as never);

//       // Patch setTimeout/delay to avoid real waiting
//       jest.spyOn(global, 'setTimeout').mockImplementation((fn: unknown) => {
//         (fn as Function)();
//         return 0 as never;
//       });

//       // Patch delay to resolve immediately
//       jest.mock('./auth', () => {
//         const original = jest.requireActual('./auth');
//         return Object.assign({}, original, {
//           delay: () => Promise.resolve(),
//         });
//       });

//       await expect(webLogin()).rejects.toThrow('Login timed out.');

//       expect(consoleWarnSpy).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Warning: Could not automatically open the browser. Please copy the link above.'
//         )
//       );

//       consoleWarnSpy.mockRestore();
//     });
//   });

//   describe('logout', () => {
//     it('removes the API key file', async () => {
//       (fse.pathExists as jest.Mock).mockImplementation(() =>
//         Promise.resolve(true)
//       );
//       (fse.remove as jest.Mock).mockImplementation(() => Promise.resolve());
//       await logout();
//       expect(fse.remove).toHaveBeenCalledWith(CONFIG_PATH);
//     });

//     it('logs error if removing API key fails', async () => {
//       (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
//       const error = new Error('remove failed');
//       (fse.remove as jest.Mock).mockRejectedValue(error as never);

//       const consoleErrorSpy = jest
//         .spyOn(console, 'error')
//         .mockImplementation(() => {});

//       await logout();
//       expect(consoleErrorSpy).toHaveBeenCalledWith(
//         'Failed to remove API key.',
//         error
//       );

//       consoleErrorSpy.mockRestore();
//     });
//   });

//   describe('environment variable validation', () => {
//     it('should exit if required environment variables are missing', async () => {
//       // Remove required env vars
//       jest.clearAllMocks();
//       jest.resetModules();
//       jest.mock('./constants', () => ({
//         API_BASE_URL: null,
//         WEB_APP_URL: undefined,
//         CLI_CONFIG_DIR: undefined, // Simulate missing
//       }));

//       console.log('CLI_CONFIG_DIR', process.env.CLI_CONFIG_DIR);
//       const mockConsoleError = jest
//         .spyOn(console, 'error')
//         .mockImplementation(() => {});
//       const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
//         throw new Error('process.exit called');
//       });

//       // Import the module that triggers the env check
//       let thrownError: Error | null = null;
//       try {
//         await import('./auth');
//       } catch (err) {
//         thrownError = err as Error;
//       }
//       expect(thrownError).toBeTruthy();
//       expect(thrownError?.message).toBe('process.exit called');
//       expect(mockConsoleError).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Error: One or more required environment variables are not set.'
//         )
//       );
//       expect(mockExit).toHaveBeenCalledWith(1);

//       mockConsoleError.mockRestore();
//       mockExit.mockRestore();
//     });
//   });
// });
