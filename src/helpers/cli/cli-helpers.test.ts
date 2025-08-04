import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { confirmFileLimit, openBrowser } from './cli-helpers';

jest.mock('path', () => ({
  __esModule: true,
  default: {
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => args.join('/')),
  },
}));

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest
      .fn()
      .mockResolvedValue({ proceed: true } as never) as unknown as jest.Mock,
  },
}));
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn(text => `green:${text}`),
    red: jest.fn(text => `red:${text}`),
    yellow: jest.fn(text => `yellow:${text}`),
  },
}));

jest.mock('../../constants/constants', () => ({
  FILE_RUN_LIMIT: 200,
}));

describe('cli-helpers', () => {
  let exitSpy: ReturnType<typeof jest.spyOn>;
  let logSpy: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    logSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should export confirmFileLimit and openBrowser', () => {
    expect(typeof confirmFileLimit).toBe('function');
    expect(typeof openBrowser).toBe('function');
  });

  it('should not exit if fileCount is below limit', async () => {
    await expect(confirmFileLimit(100)).resolves.toBeUndefined();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should prompt and exit if user declines when fileCount is above limit', async () => {
    const inquirer = await import('inquirer');
    (inquirer.default.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      proceed: false,
    } as never);
    await expect(confirmFileLimit(201)).rejects.toThrow(
      'Analysis cancelled by user.'
    );
  });

  it('should call executeCommand with correct command for openBrowser (darwin)', async () => {
    jest.resetModules();
    jest.doMock('os', () => ({
      platform: () => 'darwin',
    }));
    const shellHelpers = await import('../shell/shell-helpers');
    const execSpy = jest
      .spyOn(shellHelpers, 'executeCommand')
      .mockResolvedValue(undefined);
    await openBrowser('http://example.com');
    expect(execSpy).toHaveBeenCalledWith('open http://example.com');
    execSpy.mockRestore();
  });

  it('should call executeCommand with correct command for openBrowser (win32)', async () => {
    jest.resetModules();
    jest.doMock('os', () => ({
      platform: () => 'win32',
    }));
    const shellHelpers = await import('../shell/shell-helpers');
    const execSpy = jest
      .spyOn(shellHelpers, 'executeCommand')
      .mockResolvedValue(undefined);
    await openBrowser('http://example.com');
    expect(execSpy).toHaveBeenCalledWith('start http://example.com');
    execSpy.mockRestore();
  });

  it('should call executeCommand with correct command for openBrowser (linux)', async () => {
    jest.resetModules();
    jest.doMock('os', () => ({
      platform: () => 'linux',
    }));
    const shellHelpers = await import('../shell/shell-helpers');
    const execSpy = jest
      .spyOn(shellHelpers, 'executeCommand')
      .mockResolvedValue(undefined);
    await openBrowser('http://example.com');
    expect(execSpy).toHaveBeenCalledWith('xdg-open http://example.com');
    execSpy.mockRestore();
  });

  it('should warn if url is empty', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await openBrowser('');
    expect(warnSpy).toHaveBeenCalledWith(
      'Warning: No results URL provided. Please copy the link above.'
    );
    warnSpy.mockRestore();
  });

  it('should log an error and throw if executeCommand fails', async () => {
    jest.resetModules();
    jest.doMock('os', () => ({
      platform: () => 'darwin',
    }));
    const shellHelpers = await import('../shell/shell-helpers');
    const execSpy = jest
      .spyOn(shellHelpers, 'executeCommand')
      .mockRejectedValue(new Error('Command failed'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(openBrowser('http://example.com')).rejects.toThrow(
      'Failed to open browser for URL: http://example.com'
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to open browser for URL: http://example.com'
      )
    );

    execSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
