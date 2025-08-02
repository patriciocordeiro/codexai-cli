jest.mock('ora', () => {
  // Ensure ora() returns an object with all spinner methods used in code
  return () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  });
});

jest.mock('../../constants/constants', () => ({
  CONFIG_FILE_PATH: '/virtual/.codeai.json',
  NODE_ENV: 'test',
  LOG_LEVEL: 'info',
  CLI_CONFIG_DIR: '/virtual',
  CLI_TIMEOUT: 120000,
  HTTP_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  IS_PRODUCTION: false,
  WEB_APP_URL: 'http://localhost',
  API_BASE_URL: 'http://localhost/api',
  CONFIG_FILE_NAME: '.codeai.json',
}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

// Mock dotenv to prevent module not found error in tests
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
//

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  pathExists: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  pathExists: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../file/file-helpers');
jest.mock('ora', () => {
  // Ensure ora() returns an object with all spinner methods used in code
  return () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  });
});
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn(text => `green:${text}`),
    red: jest.fn(text => `red:${text}`),
    yellow: jest.fn(text => `yellow:${text}`),
  },
}));

require('../config/config-helpers');

jest.mock('../config/config-helpers');

const fse = require('fs-extra');
const path = require('path');
// const { loadProjectConfig } = require('../config/config-helpers');

describe('Analysis Scope Helpers', () => {
  const VIRTUAL_PROJECT_ROOT = '/test/project';

  // --- Virtual File System Setup ---
  const virtualFileSystem: { [key: string]: string[] } = {
    [VIRTUAL_PROJECT_ROOT]: ['src', 'node_modules', 'README.md'],
    [`${VIRTUAL_PROJECT_ROOT}/src`]: ['index.js', 'style.css', 'components'],
    [`${VIRTUAL_PROJECT_ROOT}/src/components`]: ['Button.ts', 'Card.js'],
    [`${VIRTUAL_PROJECT_ROOT}/node_modules`]: ['some-dep'],
  };

  //   const mockedOra = ora as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    // --- Consistent Mocking for File System and Path ---
    process.cwd = () => VIRTUAL_PROJECT_ROOT;

    // Use jest.spyOn to mock path.resolve
    jest.spyOn(path, 'resolve').mockImplementation((...args: unknown[]) => {
      // A simplified resolve that joins paths starting from our virtual root
      return path.join(...(args as string[]));
    });
    // Keep original path.join and path.relative for internal mock logic

    fse.existsSync.mockImplementation(
      (p: string) =>
        !!virtualFileSystem[p] ||
        Object.values(virtualFileSystem).flat().includes(path.basename(p))
    );
    fse.statSync.mockImplementation((p: string) => ({
      isDirectory: () => !!virtualFileSystem[p],
    }));
    fse.readdirSync.mockImplementation(
      (p: string) => virtualFileSystem[p] || []
    );
  });

  describe('getFilesForScope', () => {
    it('should walk a directory and return only supported files, respecting nesting', () => {
      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: (p: string) =>
          p.endsWith('.js') || p.endsWith('.ts'),
        isExcludedPath: () => false,
      }));
      const { getFilesForScope } = require('./scope-helpers');

      const result = getFilesForScope(['src'], {});

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          'src/index.js',
          'src/components/Button.ts',
          'src/components/Card.js',
        ])
      );
      expect(result).not.toContain('src/style.css');
    });

    it('should exclude specified paths like node_modules', () => {
      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: () => true,
        isExcludedPath: (p: string) => p.includes('node_modules'),
      }));
      const { getFilesForScope } = require('./scope-helpers');

      // We pass the root as the path to walk from
      const result = getFilesForScope(['.'], {});

      expect(
        result.some((p: string | string[]) => p.includes('node_modules'))
      ).toBe(false);
      // Ensure it finds the files that are NOT excluded
      expect(result).toHaveLength(3); // src/index.js, src/components/*, README.md
    });

    it('should get changed files from git when --changed option is used', () => {
      jest.resetModules();
      const gitDiffOutput =
        'src/api/api.ts\nsrc/components/Button.tsx\nREADME.md';

      jest.doMock('child_process', () => ({
        execSync: jest.fn(() => gitDiffOutput),
      }));

      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: (p: string) => !p.endsWith('README.md'),
        isExcludedPath: () => false,
      }));

      // Directly mock fse.existsSync and fse.statSync
      const fse = require('fs-extra');
      fse.existsSync.mockImplementation((p: string) => {
        const files = [
          'src/api/api.ts',
          'src/components/Button.tsx',
          'README.md',
        ];
        return files.some(f => p === f || p.endsWith('/' + f));
      });
      fse.statSync.mockImplementation(() => ({
        isDirectory: () => false,
      }));

      // Re-require after all mocks
      const { getFilesForScope } = require('./scope-helpers');
      const { execSync } = require('child_process');

      const result = getFilesForScope([], { changed: true });

      expect(execSync).toHaveBeenCalledWith('git diff --name-only HEAD', {
        encoding: 'utf-8',
      });
      expect(result).toHaveLength(2);
      expect(result).toContain('src/api/api.ts');
      expect(result).toContain('src/components/Button.tsx');
    });
  });

  describe('determineAnalysisScope', () => {
    it('should default to the targetDirectory from config', async () => {
      //  jest.resetModules();
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue(['src/index.js']);

      const result = await scopeHelpers.determineAnalysisScope(
        [],
        {},
        getFilesMock
      );

      expect(loadProjectConfig).toHaveBeenCalled();
      expect(getFilesMock).toHaveBeenCalledWith(['src'], {});
      expect(result.targetFilePaths).toEqual(['src/index.js']);
    });

    it('should throw an error if a specified file is outside the targetDirectory', async () => {
      //  jest.resetModules();
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue(['../secrets.txt']);

      await expect(
        scopeHelpers.determineAnalysisScope(
          ['../secrets.txt'],
          {},
          getFilesMock
        )
      ).rejects.toThrow(
        'File path "../secrets.txt" is outside the project\'s configured target directory ("src").'
      );
    });
  });
});
