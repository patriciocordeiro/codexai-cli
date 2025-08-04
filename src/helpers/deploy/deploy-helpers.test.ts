import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Mock dotenv first to prevent constants.ts from failing
jest.mock('dotenv', () => ({
  config: jest.fn(),
  __esModule: true,
}));

// Mock constants to prevent execution issues
jest.mock('../../constants/constants', () => ({
  API_BASE_URL: 'https://mock-api.com',
  NODE_ENV: 'test',
  LOG_LEVEL: 'info',
  __esModule: true,
}));

// Mock all external dependencies
jest.mock('chalk', () => {
  const chalkMock = {
    yellow: jest.fn(text => text),
    green: jest.fn(text => text),
    red: jest.fn(text => text),
    cyan: jest.fn(text => text),
  };
  return chalkMock;
});

jest.mock('ora', () => {
  const oraMock = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => oraMock);
});

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  __esModule: true,
  default: {
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => args.join('/')),
  },
}));

// Mock internal modules
jest.mock('../config/config-helpers', () => ({
  getTargetDirectory: jest.fn(),
  loadProjectConfig: jest.fn(),
  __esModule: true,
}));

jest.mock('../../api/api', () => ({
  getProjectManifest: jest.fn(),
  updateProjectFiles: jest.fn(),
  __esModule: true,
}));

jest.mock('../../auth/auth', () => ({
  checkAuthentication: jest.fn(),
  loadApiKey: jest.fn(),
  __esModule: true,
}));

jest.mock('../../file-utils/file-utils', () => ({
  createProjectArchive: jest.fn(),
  createZipFromPaths: jest.fn(),
  __esModule: true,
}));

describe('deploy-helpers', () => {
  let mockSpinner: any;
  let mockConsoleLog: any;
  let mockConsoleError: any;
  let mockProcessExit: any;
  let deployHelpers: any;
  let chalk: any;
  let ora: any;
  let configHelpers: any;
  let api: any;
  let fileUtils: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import modules after mocking
    deployHelpers = require('./deploy-helpers');
    chalk = require('chalk');
    ora = require('ora');
    configHelpers = require('../config/config-helpers');
    api = require('../../api/api');
    fileUtils = require('../../file-utils/file-utils');

    // Create a mock spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
    };
    ora.mockReturnValue(mockSpinner);

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Mock process.exit
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() was called');
    });

    // Mock process.cwd
    Object.defineProperty(process, 'cwd', {
      value: jest.fn().mockReturnValue('/mock/cwd'),
      configurable: true,
    });

    // Mock loadProjectConfig to return a default project config
    configHelpers.loadProjectConfig = jest.fn().mockResolvedValue({
      projectId: 'test-project-id',
      targetDirectory: ['src', 'test'],
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setupDeploymentContext', () => {
    it('should setup deployment context successfully', async () => {
      // Act
      const result = await deployHelpers.setupDeploymentContext();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('getRemoteManifest', () => {
    it('should call getProjectManifest with correct parameters', async () => {
      // Arrange
      const mockManifest = { 'file1.txt': 'hash123' };
      api.getProjectManifest.mockResolvedValue(mockManifest);

      // Act
      const result = await deployHelpers.getRemoteManifest({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      });

      // Assert
      expect(result).toEqual(mockManifest);
      expect(api.getProjectManifest).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Arrange
      const apiError = new Error('API Error');
      api.getProjectManifest.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        deployHelpers.getRemoteManifest({
          apiKey: 'test-api-key',
          projectId: 'test-project',
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getLocalManifest', () => {
    it('should create local manifest with target directory', async () => {
      // Arrange
      const mockArchive = {
        archive: Buffer.from('archive data'),
        fileManifest: { 'file1.txt': 'hash123' },
      };
      fileUtils.createProjectArchive.mockResolvedValue(mockArchive);

      // Act
      const result = await deployHelpers.getLocalManifest('src/**');

      // Assert
      expect(result).toEqual({ 'file1.txt': 'hash123' }); // Only returns fileManifest
      expect(fileUtils.createProjectArchive).toHaveBeenCalledWith(
        '/mock/cwd', // process.cwd() returns this mock value
        'src/**' // targetDirectory parameter
      );
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle archive creation errors', async () => {
      // Arrange
      const archiveError = new Error('Archive Error');
      fileUtils.createProjectArchive.mockRejectedValue(archiveError);

      // Act & Assert
      await expect(deployHelpers.getLocalManifest('src/**')).rejects.toThrow(
        'Archive Error'
      );
    });
  });

  describe('calculateFileDiff', () => {
    it('should calculate differences correctly', () => {
      // Arrange
      const localManifest = {
        'file1.txt': 'newhash',
        'file2.txt': 'samehash',
        'file3.txt': 'anotherhash',
      };
      const remoteManifest = {
        'file1.txt': 'oldhash',
        'file2.txt': 'samehash',
      };

      // Act
      const result = deployHelpers.calculateFileDiff({
        localManifest,
        remoteManifest,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.filesToUpdate).toContain('file1.txt'); // Changed file
      expect(result.filesToUpdate).toContain('file3.txt'); // New file
      expect(result.filesToUpdate).not.toContain('file2.txt'); // Unchanged file
      expect(result.manifestForUpdate).toEqual({
        'file1.txt': 'newhash',
        'file3.txt': 'anotherhash',
      });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle empty remote manifest', () => {
      // Arrange
      const localManifest = { 'file1.txt': 'hash123' };
      const remoteManifest = {};

      // Act
      const result = deployHelpers.calculateFileDiff({
        localManifest,
        remoteManifest,
      });

      // Assert
      expect(result.filesToUpdate).toContain('file1.txt');
      expect(result.manifestForUpdate).toEqual({ 'file1.txt': 'hash123' });
    });

    it('should handle no files to update', () => {
      // Arrange
      const localManifest = { 'file1.txt': 'hash123' };
      const remoteManifest = { 'file1.txt': 'hash123' };

      // Act
      const result = deployHelpers.calculateFileDiff({
        localManifest,
        remoteManifest,
      });

      // Assert
      expect(result.filesToUpdate).toEqual([]);
      expect(result.manifestForUpdate).toEqual({});
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'No file changes detected. Your project is already up to date!'
      );
    });

    it('should handle files to update', () => {
      // Arrange
      const localManifest = { 'file1.txt': 'newhash', 'file2.txt': 'hash123' };
      const remoteManifest = { 'file2.txt': 'hash123' };

      // Act
      const result = deployHelpers.calculateFileDiff({
        localManifest,
        remoteManifest,
      });

      // Assert
      expect(result.filesToUpdate).toEqual(['file1.txt']);
      expect(result.manifestForUpdate).toEqual({ 'file1.txt': 'newhash' });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Found 1 new or modified files to deploy.'
      );
    });
  });

  describe('createDeploymentPatch', () => {
    it('should create patch when there are files to update', async () => {
      // Arrange
      const filesToUpdate = ['file1.txt', 'file2.txt'];
      const mockPatch = Buffer.from('patch data');
      fileUtils.createZipFromPaths.mockResolvedValue(mockPatch);

      // Act
      const result = await deployHelpers.createDeploymentPatch(filesToUpdate);

      // Assert
      expect(result).toEqual(mockPatch);
      expect(fileUtils.createZipFromPaths).toHaveBeenCalledWith(
        filesToUpdate,
        '/mock/cwd'
      );
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle patch creation errors', async () => {
      // Arrange
      const filesToUpdate = ['file1.txt'];
      const patchError = new Error('Patch Error');
      fileUtils.createZipFromPaths.mockRejectedValue(patchError);

      // Act & Assert
      await expect(
        deployHelpers.createDeploymentPatch(filesToUpdate)
      ).rejects.toThrow('Patch Error');
    });
  });

  describe('uploadPatch', () => {
    it('should upload patch successfully', async () => {
      // Arrange
      api.updateProjectFiles.mockResolvedValue(undefined);

      // Act
      await deployHelpers.uploadPatch({
        apiKey: 'test-api-key',
        projectId: 'test-project',
        patchZipBuffer: Buffer.from('patch'),
        manifestForUpdate: { 'file1.txt': 'hash123' },
      });

      // Assert
      expect(api.updateProjectFiles).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        projectId: 'test-project',
        patchZipBuffer: Buffer.from('patch'),
        updatedManifest: { 'file1.txt': 'hash123' },
      });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      // Arrange
      const uploadError = new Error('Upload Error');
      api.updateProjectFiles.mockRejectedValue(uploadError);

      // Act & Assert
      await expect(
        deployHelpers.uploadPatch({
          apiKey: 'test-api-key',
          projectId: 'test-project',
          patch: Buffer.from('patch'),
          manifestForUpdate: { 'file1.txt': 'hash123' },
        })
      ).rejects.toThrow('Upload Error');
    });
  });

  describe('displayDeploymentSuccess', () => {
    it('should display success message', () => {
      // Act
      deployHelpers.displayDeploymentSuccess();

      // Assert
      expect(chalk.cyan).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '\nYou can now run an analysis on the updated project:'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('codeai run REVIEW')
      );
    });
  });

  describe('handleDeploymentError', () => {
    it('should handle errors with spinner', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      try {
        deployHelpers.handleDeploymentError(error, mockSpinner);
      } catch {
        // Expected due to process.exit mock
      }

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalled();
      expect(chalk.red).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.anything(), error);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle string errors', () => {
      // Arrange
      const error = 'String error message';

      // Act
      try {
        deployHelpers.handleDeploymentError(error, mockSpinner);
      } catch {
        // Expected due to process.exit mock
      }

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.anything(), error);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('deployChangesIfNeeded', () => {
    it('should handle successful deployment flow', async () => {
      // Arrange
      const mockRemoteManifest = { 'file1.txt': 'oldhash' };
      const mockLocalArchive = {
        archive: Buffer.from('archive'),
        fileManifest: { 'file1.txt': 'newhash', 'file2.txt': 'hash2' },
      };
      const mockPatch = Buffer.from('patch');
      const mockUploadResponse = { success: true };

      configHelpers.getTargetDirectory.mockResolvedValue(['src']);
      api.getProjectManifest.mockResolvedValue(mockRemoteManifest);
      fileUtils.createProjectArchive.mockResolvedValue(mockLocalArchive);
      fileUtils.createZipFromPaths.mockResolvedValue(mockPatch);
      api.updateProjectFiles.mockResolvedValue(mockUploadResponse);

      // Act
      await deployHelpers.deployChangesIfNeeded('test-api-key', 'test-project');

      // Assert
      expect(api.getProjectManifest).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      });
      expect(fileUtils.createProjectArchive).toHaveBeenCalled();
      expect(fileUtils.createZipFromPaths).toHaveBeenCalled();
      expect(api.updateProjectFiles).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should handle no changes scenario', async () => {
      // Arrange
      const mockRemoteManifest = { 'file1.txt': 'samehash' };
      const mockLocalArchive = {
        archive: Buffer.from('archive'),
        fileManifest: { 'file1.txt': 'samehash' },
      };

      configHelpers.getTargetDirectory.mockResolvedValue(['src']);
      api.getProjectManifest.mockResolvedValue(mockRemoteManifest);
      fileUtils.createProjectArchive.mockResolvedValue(mockLocalArchive);

      // Act
      await deployHelpers.deployChangesIfNeeded('test-api-key', 'test-project');

      // Assert
      expect(api.getProjectManifest).toHaveBeenCalled();
      expect(fileUtils.createProjectArchive).toHaveBeenCalled();
      expect(fileUtils.createZipFromPaths).not.toHaveBeenCalled(); // No changes to deploy
      expect(api.updateProjectFiles).not.toHaveBeenCalled(); // No changes to deploy
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('up-to-date')
      );
    });

    it('should handle errors during deployment', async () => {
      // Arrange
      const deployError = new Error('Deployment Error');
      configHelpers.getTargetDirectory.mockResolvedValue(['src']);
      api.getProjectManifest.mockRejectedValue(deployError);

      // Act & Assert
      await expect(
        deployHelpers.deployChangesIfNeeded('test-api-key', 'test-project')
      ).rejects.toThrow('Deployment Error');
    });
  });
});
