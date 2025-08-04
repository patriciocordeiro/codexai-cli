import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  deployOutOfSyncFiles,
  displayNoFilesToAnalyze,
  getAnalysisScope,
  handleAnalysisError,
  setupAnalysisContext,
  triggerAnalysisAndDisplayResults,
} from '../helpers/analysis/analysis-helpers';
import {
  calculateFileDiff,
  createDeploymentPatch,
  displayDeploymentSuccess,
  getLocalManifest,
  getRemoteManifest,
  handleDeploymentError,
  setupDeploymentContext,
  uploadPatch,
} from '../helpers/deploy/deploy-helpers';
import {
  createRemoteProject,
  displayProjectCreationSuccessMessage,
  handleProjectCreationError,
  prepareProjectArchive,
  saveProjectConfiguration,
  setupProjectParameters,
} from '../helpers/project/project-helpers';
import { AnalysisScope, RunAnalysisParams } from '../models/cli.model';
import { ProgramCreateProjectParams } from '../models/command-helpers.model';
import {
  programCreateProject,
  programDeploy,
  runAnalysis,
} from './cli-command-helpers';

// --- Mocks for all dependencies ---

jest.mock('../helpers/analysis/analysis-helpers');
jest.mock('../helpers/deploy/deploy-helpers');
jest.mock('../helpers/project/project-helpers');
jest.mock('chalk', () => ({
  bold: jest.fn(msg => msg),
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
};
// Use the corrected ora mock from your example
jest.mock('ora', () => jest.fn(() => mockSpinner));

// --- Type-cast mocks for clarity ---
const mockedSetupProjectParameters = setupProjectParameters as jest.Mock;
const mockedPrepareProjectArchive = prepareProjectArchive as jest.Mock;
const mockedCreateRemoteProject = createRemoteProject as jest.Mock;

const mockedSetupDeploymentContext = setupDeploymentContext as jest.Mock;
const mockedGetRemoteManifest = getRemoteManifest as jest.Mock;
const mockedGetLocalManifest = getLocalManifest as jest.Mock;
const mockedCalculateFileDiff = calculateFileDiff as jest.Mock;
const mockedCreateDeploymentPatch = createDeploymentPatch as jest.Mock;
const mockedUploadPatch = uploadPatch as jest.Mock;

const mockedSetupAnalysisContext = setupAnalysisContext as jest.Mock;
const mockedGetAnalysisScope = getAnalysisScope as jest.Mock;

// --- Test Suite ---
describe('command-helpers', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('programCreateProject', () => {
    const params: ProgramCreateProjectParams = {
      targetDirectoryArg: './src',
      options: { name: 'my-project' },
    };

    it('should successfully execute all steps of project creation in order', async () => {
      // Arrange
      mockedSetupProjectParameters.mockResolvedValue({
        projectName: 'my-project',
        targetDirectory: './src',
        apiKey: 'api-key-123',
      } as never);
      mockedPrepareProjectArchive.mockResolvedValue({
        zipBuffer: Buffer.from('zip'),
        fileManifest: { 'file.ts': 'hash' },
      } as never);
      mockedCreateRemoteProject.mockResolvedValue({
        projectId: 'proj-abc',
        projectUrl: 'https://project.url',
      } as never);

      // Act
      await programCreateProject(params);

      // Assert
      expect(setupProjectParameters).toHaveBeenCalledWith(params);
      expect(prepareProjectArchive).toHaveBeenCalledWith('./src');
      expect(createRemoteProject).toHaveBeenCalledWith({
        apiKey: 'api-key-123',
        projectName: 'my-project',
        zipBuffer: Buffer.from('zip'),
        fileManifest: { 'file.ts': 'hash' },
      });
      expect(saveProjectConfiguration).toHaveBeenCalledWith({
        projectId: 'proj-abc',
        targetDirectory: './src',
      });
      expect(displayProjectCreationSuccessMessage).toHaveBeenCalledWith(
        'https://project.url'
      );
      expect(handleProjectCreationError).not.toHaveBeenCalled();
    });

    it('should call the error handler if any step fails', async () => {
      // Arrange
      const error = new Error('Setup failed');
      mockedSetupProjectParameters.mockRejectedValue(error as never);

      // Act
      await programCreateProject(params);

      // Assert
      expect(handleProjectCreationError).toHaveBeenCalledWith({
        error,
        spinner: mockSpinner,
      });
      expect(prepareProjectArchive).not.toHaveBeenCalled();
    });
  });

  describe('programDeploy', () => {
    it('should execute all deployment steps if changes are found', async () => {
      // Arrange
      mockedSetupDeploymentContext.mockResolvedValue({
        projectId: 'proj-abc',
        apiKey: 'api-key-123',
        targetDirectory: './src',
      } as never);
      mockedGetRemoteManifest.mockResolvedValue({ 'a.ts': 'h1' } as never);
      mockedGetLocalManifest.mockResolvedValue({
        'a.ts': 'h2',
        'b.ts': 'h3',
      } as never);
      mockedCalculateFileDiff.mockReturnValue({
        filesToUpdate: ['a.ts', 'b.ts'],
        manifestForUpdate: { 'a.ts': 'h2', 'b.ts': 'h3' },
      } as never);
      mockedCreateDeploymentPatch.mockResolvedValueOnce(
        Buffer.from('patch') as never
      );
      mockedUploadPatch.mockResolvedValueOnce(Promise.resolve() as never);

      // Act
      await programDeploy();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Deploying file changes to CodeAI...'
      );
      expect(setupDeploymentContext).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Deploying to project: proj-abc'
      );
      expect(getRemoteManifest).toHaveBeenCalled();
      expect(getLocalManifest).toHaveBeenCalledWith('./src');
      expect(calculateFileDiff).toHaveBeenCalled();
      expect(createDeploymentPatch).toHaveBeenCalledWith(['a.ts', 'b.ts']);
      expect(uploadPatch).toHaveBeenCalledWith({
        apiKey: 'api-key-123',
        projectId: 'proj-abc',
        patchZipBuffer: Buffer.from('patch'),
        manifestForUpdate: { 'a.ts': 'h2', 'b.ts': 'h3' },
      });
      expect(displayDeploymentSuccess).toHaveBeenCalled();
      expect(handleDeploymentError).not.toHaveBeenCalled();
    });

    it('should exit early if no file changes are detected', async () => {
      // Arrange
      mockedSetupDeploymentContext.mockResolvedValue({
        projectId: 'proj-abc',
        apiKey: 'api-key-123',
        targetDirectory: './src',
      } as never);
      mockedGetRemoteManifest.mockResolvedValue({ 'a.ts': 'h1' } as never);
      mockedGetLocalManifest.mockResolvedValue({ 'a.ts': 'h1' } as never);
      mockedCalculateFileDiff.mockReturnValue({
        filesToUpdate: [],
        manifestForUpdate: {},
      } as never);

      // Act
      await programDeploy();

      // Assert
      expect(calculateFileDiff).toHaveBeenCalled();
      expect(createDeploymentPatch).not.toHaveBeenCalled();
      expect(uploadPatch).not.toHaveBeenCalled();
      expect(displayDeploymentSuccess).not.toHaveBeenCalled();
    });

    it('should call the error handler on failure', async () => {
      // Arrange
      const error = new Error('Deployment context failed');
      mockedSetupDeploymentContext.mockRejectedValue(error as never);

      // Act
      await programDeploy();

      // Assert
      expect(handleDeploymentError).toHaveBeenCalledWith(error, mockSpinner);
      expect(getRemoteManifest).not.toHaveBeenCalled();
    });
  });

  describe('runAnalysis', () => {
    const params: RunAnalysisParams = {
      task: 'REVIEW',
      paths: [],
      options: { scope: AnalysisScope.ENTIRE_PROJECT, language: 'es' },
    };

    it('should execute a full analysis run successfully', async () => {
      // Arrange
      mockedSetupAnalysisContext.mockResolvedValue({
        projectId: 'proj-abc',
        apiKey: 'api-key-123',
      } as never);
      mockedGetAnalysisScope.mockResolvedValue({
        scope: AnalysisScope.ENTIRE_PROJECT,
        targetFilePaths: [],
      } as never);

      // Act
      await runAnalysis(params);

      // Assert
      expect(setupAnalysisContext).toHaveBeenCalled();
      expect(getAnalysisScope).toHaveBeenCalledWith({
        paths: params.paths,
        scope: params.options.scope,
      });
      expect(displayNoFilesToAnalyze).not.toHaveBeenCalled();
      expect(deployOutOfSyncFiles).toHaveBeenCalledWith({
        apiKey: 'api-key-123',
        projectId: 'proj-abc',
      });
      expect(triggerAnalysisAndDisplayResults).toHaveBeenCalledWith({
        apiKey: 'api-key-123',
        projectId: 'proj-abc',
        task: params.task,
        language: 'es',
        scope: AnalysisScope.ENTIRE_PROJECT,
        targetFilePaths: [],
      });
      expect(handleAnalysisError).not.toHaveBeenCalled();
    });

    it('should default the language to "en" if not provided', async () => {
      // Arrange
      const paramsWithoutLang: RunAnalysisParams = {
        task: 'REVIEW',
        paths: [],
        options: { scope: AnalysisScope.ENTIRE_PROJECT }, // No language
      };
      mockedSetupAnalysisContext.mockResolvedValue({
        projectId: 'proj-abc',
        apiKey: 'api-key-123',
      } as never);
      mockedGetAnalysisScope.mockResolvedValue({
        scope: AnalysisScope.ENTIRE_PROJECT,
        targetFilePaths: [],
      } as never);

      // Act
      await runAnalysis(paramsWithoutLang);

      // Assert
      expect(triggerAnalysisAndDisplayResults).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en', // Should default here
        })
      );
    });

    it('should exit early if scope is SELECTED_FILES and no files are found', async () => {
      // Arrange
      mockedSetupAnalysisContext.mockResolvedValue({
        projectId: 'proj-abc',
        apiKey: 'api-key-123',
      } as never);
      mockedGetAnalysisScope.mockResolvedValue({
        scope: AnalysisScope.SELECTED_FILES,
        targetFilePaths: [], // No files returned
      } as never);

      // Act
      await runAnalysis(params);

      // Assert
      expect(setupAnalysisContext).toHaveBeenCalled();
      expect(getAnalysisScope).toHaveBeenCalled();
      expect(displayNoFilesToAnalyze).toHaveBeenCalled();
      expect(deployOutOfSyncFiles).not.toHaveBeenCalled();
      expect(triggerAnalysisAndDisplayResults).not.toHaveBeenCalled();
    });

    it('should call the error handler on failure', async () => {
      // Arrange
      const error = new Error('Context setup failed');
      mockedSetupAnalysisContext.mockRejectedValue(error as never);

      // Act
      await runAnalysis(params);

      // Assert
      expect(handleAnalysisError).toHaveBeenCalledWith(error);
      expect(getAnalysisScope).not.toHaveBeenCalled();
    });
  });
});
