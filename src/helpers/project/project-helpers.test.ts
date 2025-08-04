import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as fse from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import { createProjectWithFiles } from '../../api/api'; // Corrected module path
import * as constants from '../../constants/constants';
import { GetProjectNameParams } from '../../models/project-helpers.model';
import { openBrowser } from '../cli/cli-helpers';
import {
  getProjectName,
  getProjectNameFromPackageJson,
} from '../project/project-helpers';
import {
  createRemoteProject,
  displayProjectCreationSuccessMessage,
  handleProjectCreationError,
  prepareProjectArchive,
  promptForTargetDirectory,
  saveProjectConfiguration,
  setupProjectParameters,
  validateTargetDirectory,
} from './project-helpers';

// Ensure openBrowser is a Jest mock function
jest.mock('../cli/cli-helpers', () => ({
  openBrowser: jest.fn(),
}));

jest.mock('inquirer');

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
}));
jest.mock('chalk', () => ({
  bold: Object.assign(
    jest.fn((msg: string) => msg),
    {
      green: jest.fn((msg: string) => msg),
    }
  ),
  cyan: jest.fn((msg: string) => msg),
  blue: {
    underline: jest.fn((msg: string) => msg),
  },
  yellow: jest.fn((msg: string) => msg),
  green: jest.fn((msg: string) => msg),
  red: Object.assign(
    jest.fn((msg: string) => msg),
    {
      bold: jest.fn((msg: string) => msg),
    }
  ),
}));
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
};

jest.mock('ora', () => jest.fn(() => mockSpinner));

jest.mock('../../api/api', () => ({
  createProjectWithFiles: jest.fn(),
}));

jest.mock('../../auth/auth', () => ({
  checkAuthentication: jest.fn(),
  loadApiKey: jest.fn(),
}));

jest.mock('../../file-utils/file-utils', () => ({
  createProjectArchive: jest.fn(),
}));

jest.mock('../config/config-helpers', () => ({
  guardAgainstExistingProject: jest.fn(),
}));

jest.mock('path', () => ({
  ...(jest.requireActual('path') as object),
  join: jest.fn((a: string, b: string) => `${a}/${b}`),
}));

describe('project-helpers', () => {
  const originalCwd = process.cwd;
  beforeEach(() => {
    jest.clearAllMocks();
    // Optionally mock process.cwd if needed
  });
  afterEach(() => {
    process.cwd = originalCwd;
  });

  it('should export getProjectNameFromPackageJson and getProjectName', () => {
    expect(typeof getProjectNameFromPackageJson).toBe('function');
    expect(typeof getProjectName).toBe('function');
  });

  describe('getProjectNameFromPackageJson', () => {
    it('returns name if package.json exists and has name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({
        name: 'my-app',
      } as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBe('my-app');
      expect(fse.pathExists).toHaveBeenCalled();
      expect(fse.readJson).toHaveBeenCalled();
    });
    it('returns null if package.json exists but has no name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({} as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBeNull();
    });
    it('returns null if package.json does not exist', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBeNull();
    });
  });

  describe('getProjectName', () => {
    it('returns trimmed name from options if provided', async () => {
      const name = await getProjectName({
        name: '  my-app  ',
      } as GetProjectNameParams);
      expect(name).toBe('my-app');
    });
    it('returns name from package.json if no options.name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({
        name: 'pkg-app',
      } as never);
      const name = await getProjectName({} as GetProjectNameParams);
      expect(name).toBe('pkg-app');
    });
    it('returns cwd basename if package.json does not exist', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({} as GetProjectNameParams);
      expect(name).toBe('baz');
    });
    it('warns and returns cwd basename if package.json read fails', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockRejectedValue(new Error('fail') as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const name = await getProjectName({} as GetProjectNameParams);
      expect(name).toBe('baz');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
    it('returns cwd basename if package.json exists but has no name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({} as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({});
      expect(name).toBe('baz');
    });
    it('returns cwd basename if options.name is empty', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({
        name: '   ',
      } as GetProjectNameParams);
      expect(name).toBe('baz');
    });
    it('returns cwd basename if options.name is not a string', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({
        name: 123 as unknown,
      } as GetProjectNameParams);
      expect(name).toBe('baz');
    });
    it('returns cwd basename if options.name is null', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({
        name: null as unknown,
      } as GetProjectNameParams);
      expect(name).toBe('baz');
    });
  });

  describe('promptForTargetDirectory', () => {
    it('should return "." if user input is blank', async () => {
      jest.spyOn(inquirer, 'prompt').mockResolvedValue({ targetDir: '' });
      await expect(promptForTargetDirectory()).resolves.toBe('.');
    });

    it('should return trimmed user input if not blank', async () => {
      jest.spyOn(inquirer, 'prompt').mockResolvedValue({ targetDir: '  src ' });
      await expect(promptForTargetDirectory()).resolves.toBe('src');
    });
  });

  jest.mock('fs-extra');

  describe('validateTargetDirectory', () => {
    it('should throw if the target directory does not exist', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      await expect(validateTargetDirectory('/fake/dir')).rejects.toThrow(
        'The specified target directory "/fake/dir" does not exist.'
      );
    });

    it('should not throw if the target directory exists', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      await expect(
        validateTargetDirectory('/real/dir')
      ).resolves.toBeUndefined();
    });
  });

  describe('displayProjectCreationSuccessMessage', () => {
    let logSpy: jest.SpiedFunction<typeof console.log>;
    let warnSpy: jest.SpiedFunction<typeof console.warn>;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (constants.IS_PRODUCTION as boolean) = false;
    });

    afterEach(() => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should log all messages and open browser in non-production', async () => {
      (openBrowser as jest.Mock).mockResolvedValue(undefined as never);
      displayProjectCreationSuccessMessage('http://project-url');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project created and linked successfully!')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('To run your first analysis')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('codeai run options')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('You can also view your project at:')
      );
      expect(openBrowser).toHaveBeenCalledWith('http://project-url');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should warn if browser cannot be opened in non-production', async () => {
      (constants.IS_PRODUCTION as boolean) = false;
      (openBrowser as jest.Mock).mockRejectedValueOnce(
        new Error('fail') as never
      );

      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure the catch block is executed

      await displayProjectCreationSuccessMessage('http://project-url');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not automatically open browser')
      );
    });

    it('should log correct message in production', async () => {
      (constants.IS_PRODUCTION as boolean) = true;
      displayProjectCreationSuccessMessage('http://project-url');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Visit your project at:')
      );
      expect(openBrowser).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('createRemoteProject', () => {
    it('should create a remote project and return project details', async () => {
      const mockApiKey = 'test-api-key';
      const mockProjectName = 'test-project';
      const mockZipBuffer = Buffer.from('test-buffer');
      const mockFileManifest = { 'file1.txt': 'hash1' };
      const mockResponse = {
        projectId: 'test-project-id',
        projectUrl: 'http://test-project-url',
      };

      const mockCreateProjectWithFiles = createProjectWithFiles as jest.Mock;

      mockCreateProjectWithFiles.mockResolvedValueOnce(mockResponse as never);

      const result = await createRemoteProject({
        apiKey: mockApiKey,
        projectName: mockProjectName,
        zipBuffer: mockZipBuffer,
        fileManifest: mockFileManifest,
      });

      expect(createProjectWithFiles).toHaveBeenCalledWith({
        apiKey: mockApiKey,
        projectName: mockProjectName,
        zipBuffer: mockZipBuffer,
        fileManifest: mockFileManifest,
      });
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        `Project created with ID: test-project-id`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if project creation fails', async () => {
      const mockApiKey = 'test-api-key';
      const mockProjectName = 'test-project';
      const mockZipBuffer = Buffer.from('test-buffer');
      const mockFileManifest = { 'file1.txt': 'hash1' };
      const mockError = new Error('Project creation failed');

      const mockCreateProjectWithFiles = createProjectWithFiles as jest.Mock;

      mockCreateProjectWithFiles.mockRejectedValueOnce(mockError as never);

      await expect(
        createRemoteProject({
          apiKey: mockApiKey,
          projectName: mockProjectName,
          zipBuffer: mockZipBuffer,
          fileManifest: mockFileManifest,
        })
      ).rejects.toThrow('Project creation failed');
    });
  });

  describe('setupProjectParameters', () => {
    const { checkAuthentication } = require('../../auth/auth');
    const { guardAgainstExistingProject } = require('../config/config-helpers');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should setup project parameters with provided target directory', async () => {
      const mockApiKey = 'test-api-key';
      const mockProjectName = 'test-project';
      const mockTargetDir = './src';

      (checkAuthentication as jest.Mock).mockResolvedValue(mockApiKey as never);
      (guardAgainstExistingProject as jest.Mock).mockResolvedValue(
        undefined as never
      );
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);

      const result = await setupProjectParameters({
        options: { name: mockProjectName },
        targetDirectoryArg: mockTargetDir,
      });

      expect(guardAgainstExistingProject).toHaveBeenCalled();
      expect(checkAuthentication).toHaveBeenCalled();
      expect(result).toEqual({
        projectName: mockProjectName,
        targetDirectory: mockTargetDir,
        apiKey: mockApiKey,
      });
    });

    it('should prompt for target directory when not provided', async () => {
      const mockApiKey = 'test-api-key';
      const mockProjectName = 'test-project';

      (checkAuthentication as jest.Mock).mockResolvedValue(mockApiKey as never);
      (guardAgainstExistingProject as jest.Mock).mockResolvedValue(
        undefined as never
      );
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      jest.spyOn(inquirer, 'prompt').mockResolvedValue({ targetDir: '.' });

      const result = await setupProjectParameters({
        options: { name: mockProjectName },
        targetDirectoryArg: '',
      });

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(result.targetDirectory).toBe('.');
    });
  });

  describe('prepareProjectArchive', () => {
    const { createProjectArchive } = require('../../file-utils/file-utils');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should prepare project archive successfully', async () => {
      const mockTargetDir = './src';
      const mockZipBuffer = Buffer.from('test-zip');
      const mockFileManifest = { 'file1.ts': 'hash1' };
      const mockIncludedFiles = ['file1.ts', 'file2.ts'];

      (createProjectArchive as jest.Mock).mockResolvedValue({
        zipBuffer: mockZipBuffer,
        fileManifest: mockFileManifest,
        includedFiles: mockIncludedFiles,
      } as never);

      const result = await prepareProjectArchive(mockTargetDir);

      expect(createProjectArchive).toHaveBeenCalledWith(
        process.cwd(),
        mockTargetDir
      );
      expect(result).toEqual({
        zipBuffer: mockZipBuffer,
        fileManifest: mockFileManifest,
        includedFiles: mockIncludedFiles,
      });
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        `Prepared ${mockIncludedFiles.length} files for upload (${(mockZipBuffer.length / 1024).toFixed(2)} KB).`
      );
    });

    it('should throw error when no files found', async () => {
      const mockTargetDir = './src';

      (createProjectArchive as jest.Mock).mockResolvedValue({
        zipBuffer: Buffer.from(''),
        fileManifest: {},
        includedFiles: [],
      } as never);

      await expect(prepareProjectArchive(mockTargetDir)).rejects.toThrow(
        'No files were found in the target directory after applying ignore rules.'
      );

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        'No files found to upload.'
      );
    });
  });

  describe('saveProjectConfiguration', () => {
    const path = require('path');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should save project configuration successfully', async () => {
      const mockProjectId = 'test-project-id';
      const mockTargetDir = './src';

      (fse.writeJson as jest.Mock).mockResolvedValue(undefined as never);

      await saveProjectConfiguration({
        projectId: mockProjectId,
        targetDirectory: mockTargetDir,
      });

      expect(path.join).toHaveBeenCalled();
      expect(fse.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        {
          projectId: mockProjectId,
          targetDirectory: mockTargetDir,
          maxUploadSizeMB: expect.any(Number),
        },
        { spaces: 2 }
      );
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });

  describe('handleProjectCreationError', () => {
    let mockProcessExit: jest.SpiedFunction<typeof process.exit>;
    let consoleSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit() was called.');
      });
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      mockProcessExit.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle axios error with spinning spinner', () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'API Error message' },
        message: 'Request failed',
      };
      const mockSpinnerWithSpin = {
        ...mockSpinner,
        isSpinning: true,
      };

      expect(() => {
        handleProjectCreationError({
          error: mockError,
          spinner: mockSpinnerWithSpin as unknown as ReturnType<typeof ora>,
        });
      }).toThrow('process.exit() was called.');

      expect(mockSpinnerWithSpin.fail).toHaveBeenCalledWith(
        'An error occurred during project creation.'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Error: API Error message')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle axios error without response data', () => {
      const mockError = {
        isAxiosError: true,
        message: 'Network error',
      };
      const mockSpinnerWithSpin = {
        ...mockSpinner,
        isSpinning: true,
      };

      expect(() => {
        handleProjectCreationError({
          error: mockError,
          spinner: mockSpinnerWithSpin as unknown as ReturnType<typeof ora>,
        });
      }).toThrow('process.exit() was called.');

      expect(mockSpinnerWithSpin.fail).toHaveBeenCalledWith(
        'An error occurred during project creation.'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Error: Network error')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle axios error with non-spinning spinner', () => {
      const mockError = {
        isAxiosError: true,
        message: 'Request failed',
      };
      const mockSpinnerNotSpin = {
        ...mockSpinner,
        isSpinning: false,
      };

      expect(() => {
        handleProjectCreationError({
          error: mockError,
          spinner: mockSpinnerNotSpin as unknown as ReturnType<typeof ora>,
        });
      }).toThrow('process.exit() was called.');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ An error occurred during project creation.')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Error: Request failed')
      );
    });

    it('should handle regular error', () => {
      const mockError = new Error('Regular error message');
      const mockSpinnerNotSpin = {
        ...mockSpinner,
        isSpinning: false,
      };

      expect(() => {
        handleProjectCreationError({
          error: mockError,
          spinner: mockSpinnerNotSpin as unknown as ReturnType<typeof ora>,
        });
      }).toThrow('process.exit() was called.');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: Regular error message')
      );
    });
  });
});
