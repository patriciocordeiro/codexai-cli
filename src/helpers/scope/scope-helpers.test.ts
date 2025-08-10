import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AnalysisScope } from '../../models/cli.model';

// Mock dependencies at the top level
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('../git/git-helpers', () => ({
  getChangedFiles: jest.fn(),
  isGitRepository: jest.fn(),
  validateGitRepository: jest.fn(),
}));

jest.mock('ora', () => {
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

jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  pathExists: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn(text => text),
    red: jest.fn(text => text),
    yellow: jest.fn(text => text),
  },
}));

jest.mock('../file/file-helpers');
jest.mock('../config/config-helpers', () => ({
  loadProjectConfig: jest.fn(),
  getTargetDirectory: jest.fn(),
}));

const fse = require('fs-extra');
const path = require('path');

describe('Analysis Scope Helpers', () => {
  const VIRTUAL_PROJECT_ROOT = '/test/project';

  // Virtual File System Setup
  const virtualFileSystem: { [key: string]: string[] } = {
    [VIRTUAL_PROJECT_ROOT]: ['src', 'node_modules', 'README.md'],
    [`${VIRTUAL_PROJECT_ROOT}/src`]: ['index.js', 'style.css', 'components'],
    [`${VIRTUAL_PROJECT_ROOT}/src/components`]: ['Button.ts', 'Card.js'],
    [`${VIRTUAL_PROJECT_ROOT}/node_modules`]: ['some-dep'],
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Setup git-helpers mock return values
    const {
      getChangedFiles,
      isGitRepository,
      validateGitRepository,
    } = require('../git/git-helpers');
    getChangedFiles.mockReturnValue([
      'src/api/api.ts',
      'src/components/Button.tsx',
    ]);
    isGitRepository.mockReturnValue(true);
    validateGitRepository.mockImplementation(() => {});

    // Consistent Mocking for File System and Path
    process.cwd = () => VIRTUAL_PROJECT_ROOT;

    jest.spyOn(path, 'resolve').mockImplementation((...args: unknown[]) => {
      return path.join(...(args as string[]));
    });

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

      const result = getFilesForScope(['.'], {});

      expect(
        result.some((p: string | string[]) => p.includes('node_modules'))
      ).toBe(false);
      expect(result).toHaveLength(3);
    });

    it('should get changed files from git when changed option is used', () => {
      jest.resetModules();

      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: (p: string) =>
          p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js'),
        isExcludedPath: () => false,
      }));

      const { getFilesForScope } = require('./scope-helpers');
      const fse = require('fs-extra');
      const path = require('path');

      fse.existsSync.mockImplementation((p: string) => {
        const files = [
          'src/api/api.ts',
          'src/components/Button.tsx',
          'README.md',
        ];
        return files.some(
          f =>
            p === f ||
            p.endsWith('/' + f) ||
            p.endsWith(f.replace(/\//g, path.sep))
        );
      });
      fse.statSync.mockImplementation(() => ({
        isDirectory: () => false,
      }));

      // Setup git-helpers mock to return the expected files
      const { getChangedFiles } = require('../git/git-helpers');
      getChangedFiles.mockReturnValue([
        'src/api/api.ts',
        'src/components/Button.tsx',
        'README.md',
      ]);

      const result = getFilesForScope([], { changed: true });

      expect(getChangedFiles).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result).toContain('src/api/api.ts');
      expect(result).toContain('src/components/Button.tsx');
    });

    it('should handle empty paths array', () => {
      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: (p: string) =>
          p.endsWith('.js') || p.endsWith('.ts'),
        isExcludedPath: () => false,
      }));
      const { getFilesForScope } = require('./scope-helpers');

      const result = getFilesForScope([], {});

      expect(result).toHaveLength(0);
    });

    it('should handle git error gracefully', () => {
      jest.doMock('../file/file-helpers', () => ({
        isSupportedCodeFile: () => true,
        isExcludedPath: () => false,
      }));

      // Setup git-helpers mock to throw an error
      const { getChangedFiles } = require('../git/git-helpers');
      getChangedFiles.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const { getFilesForScope } = require('./scope-helpers');

      expect(() => {
        getFilesForScope([], { changed: true });
      }).toThrow('Failed to get changed files from git.');
    });
  });

  describe('validatePathsInScope', () => {
    it('should not throw error for files within target directory', () => {
      const { validatePathsInScope } = require('./scope-helpers');

      expect(() => {
        validatePathsInScope(
          ['src/index.js', 'src/utils.js'],
          'src',
          '/test/project'
        );
      }).not.toThrow();
    });

    it('should throw error for files outside target directory', () => {
      const { validatePathsInScope } = require('./scope-helpers');

      expect(() => {
        validatePathsInScope(['../config.js'], 'src', '/test/project');
      }).toThrow(
        'File path "../config.js" is outside the project\'s configured target directory ("src").'
      );
    });

    it('should handle empty file paths array', () => {
      const { validatePathsInScope } = require('./scope-helpers');

      expect(() => {
        validatePathsInScope([], 'src', '/test/project');
      }).not.toThrow();
    });

    it('should throw error for absolute paths outside target directory', () => {
      const { validatePathsInScope } = require('./scope-helpers');

      expect(() => {
        validatePathsInScope(['/etc/passwd'], 'src', '/test/project');
      }).toThrow(
        'File path "/etc/passwd" is outside the project\'s configured target directory ("src").'
      );
    });
  });

  describe('determineAnalysisScope', () => {
    it('should default to GIT_DIFF scope when no scope provided', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue(['src/index.js']);
      const validateMock = jest.fn();

      const result = await scopeHelpers.determineAnalysisScope({
        paths: [],
        scope: AnalysisScope.GIT_DIFF,
        getFilesForScopeImpl: getFilesMock,
        validatePathsInScopeImpl: validateMock,
      });

      expect(loadProjectConfig).toHaveBeenCalled();
      expect(getFilesMock).toHaveBeenCalledWith([], { changed: true });
      expect(result.targetFilePaths).toEqual(['src/index.js']);
      expect(result.scope).toBe(AnalysisScope.GIT_DIFF);
    });

    it('should use SELECTED_FILES scope when paths provided', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue(['src/specific.js']);
      const validateMock = jest.fn();

      const result = await scopeHelpers.determineAnalysisScope({
        paths: ['src/specific.js'],
        scope: AnalysisScope.SELECTED_FILES,
        getFilesForScopeImpl: getFilesMock,
        validatePathsInScopeImpl: validateMock,
      });

      expect(getFilesMock).toHaveBeenCalledWith(['src/specific.js'], {
        changed: false,
      });
      expect(result.targetFilePaths).toEqual(['src/specific.js']);
      expect(result.scope).toBe(AnalysisScope.SELECTED_FILES);
    });

    it('should use ENTIRE_PROJECT scope', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest
        .fn()
        .mockReturnValue(['src/index.js', 'src/utils.js']);
      const validateMock = jest.fn();

      const result = await scopeHelpers.determineAnalysisScope({
        paths: [],
        scope: AnalysisScope.ENTIRE_PROJECT,
        getFilesForScopeImpl: getFilesMock,
        validatePathsInScopeImpl: validateMock,
      });

      expect(getFilesMock).toHaveBeenCalledWith(['src'], { changed: false });
      expect(result.targetFilePaths).toEqual(['src/index.js', 'src/utils.js']);
      expect(result.scope).toBe(AnalysisScope.ENTIRE_PROJECT);
    });

    it('should throw an error if a specified file is outside the targetDirectory', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue(['../secrets.txt']);
      const validateMock = jest.fn(() => {
        throw new Error(
          'File path "../secrets.txt" is outside the project\'s configured target directory ("src").'
        );
      });

      await expect(
        scopeHelpers.determineAnalysisScope({
          paths: ['../secrets.txt'],
          scope: AnalysisScope.SELECTED_FILES,
          getFilesForScopeImpl: getFilesMock,
          validatePathsInScopeImpl: validateMock,
        })
      ).rejects.toThrow(
        'File path "../secrets.txt" is outside the project\'s configured target directory ("src").'
      );
    });

    it('should handle no files found scenario', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockResolvedValue({
        projectId: 'proj-123',
        targetDirectory: 'src',
      });

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn().mockReturnValue([]);
      const validateMock = jest.fn();

      const result = await scopeHelpers.determineAnalysisScope({
        paths: [],
        scope: AnalysisScope.GIT_DIFF,
        getFilesForScopeImpl: getFilesMock,
        validatePathsInScopeImpl: validateMock,
      });

      expect(result.targetFilePaths).toEqual([]);
      expect(result.scope).toBe(AnalysisScope.GIT_DIFF);
    });

    it('should handle project config load failure', async () => {
      const { loadProjectConfig } = require('../config/config-helpers');
      loadProjectConfig.mockRejectedValue(new Error('Config not found'));

      const scopeHelpers = require('./scope-helpers');
      const getFilesMock = jest.fn();
      const validateMock = jest.fn();

      await expect(
        scopeHelpers.determineAnalysisScope({
          paths: [],
          scope: AnalysisScope.GIT_DIFF,
          getFilesForScopeImpl: getFilesMock,
          validatePathsInScopeImpl: validateMock,
        })
      ).rejects.toThrow('Config not found');
    });
  });
});
