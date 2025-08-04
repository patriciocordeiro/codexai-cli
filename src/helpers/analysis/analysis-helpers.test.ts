// In tests/helpers/analysis/analysis-helpers.test.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AxiosError } from 'axios';
import chalk from 'chalk';

import { triggerAnalysis } from '../../api/api';
import { checkAuthentication, loadApiKey } from '../../auth/auth';
import * as constants from '../../constants/constants';
import {
  DeployOutOfSyncFilesParams,
  GetAnalysisScopeParams,
  TriggerAnalysisAndDisplayResultsParams,
} from '../../models/analysis-helpers.model';
import { AnalysisScope, AnalysisScopeResult } from '../../models/cli.model';
import { openBrowser } from '../cli/cli-helpers';
import { loadProjectConfig } from '../config/config-helpers';
import { deployChangesIfNeeded } from '../deploy/deploy-helpers';
import {
  determineAnalysisScope,
  getFilesForScope,
  validatePathsInScope,
} from '../scope/scope-helpers';
import {
  deployOutOfSyncFiles,
  displayNoFilesToAnalyze,
  getAnalysisScope,
  handleAnalysisError,
  setupAnalysisContext,
  triggerAnalysisAndDisplayResults,
} from './analysis-helpers';

// Import the mocked ora
import ora from 'ora';

// --- Mocks for all dependencies ---
jest.mock('../config/config-helpers', () => ({
  loadProjectConfig: jest.fn(),
}));

jest.mock('../../auth/auth', () => ({
  checkAuthentication: jest.fn(),
  loadApiKey: jest.fn(),
}));

jest.mock('../scope/scope-helpers', () => ({
  determineAnalysisScope: jest.fn(),
  getFilesForScope: jest.fn(),
  validatePathsInScope: jest.fn(),
}));

jest.mock('../deploy/deploy-helpers', () => ({
  deployChangesIfNeeded: jest.fn(),
}));

jest.mock('../../api/api', () => ({
  triggerAnalysis: jest.fn(),
}));

jest.mock('../cli/cli-helpers', () => ({
  openBrowser: jest.fn(),
}));

jest.mock('chalk', () => ({
  bold: jest.fn(msg => msg),
  yellow: jest.fn(msg => msg),
  blue: {
    underline: jest.fn(msg => msg),
  },
  red: {
    bold: jest.fn(msg => msg),
  },
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
};

jest.mock('ora', () =>
  jest.fn((message: string) => {
    // When ora is called with a message, return a spinner that calls start with that message
    const spinner = {
      ...mockSpinner,
      start: jest.fn(() => {
        // Track that start was called with the message
        mockSpinner.start(message);
        return spinner;
      }),
    };
    return spinner;
  })
);

// --- Test Suite ---

describe('analysis-helpers', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock process.exit to throw an error instead of killing the test process
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() was called.');
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('setupAnalysisContext', () => {
    it('should load project config, log a message, and return the context', async () => {
      // Arrange
      (loadProjectConfig as jest.Mock).mockResolvedValue({
        projectId: 'proj-123',
      } as never);
      (checkAuthentication as jest.Mock).mockResolvedValue(
        'api-key-abc' as never
      );

      // Act
      const result = await setupAnalysisContext();

      // Assert
      expect(loadProjectConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Starting analysis for project proj-123...'
      );
      expect(checkAuthentication).toHaveBeenCalledWith(loadApiKey);
      expect(result).toEqual({
        projectId: 'proj-123',
        apiKey: 'api-key-abc',
      });
    });
  });

  describe('getAnalysisScope', () => {
    it('should delegate to determineAnalysisScope with correct parameters', async () => {
      // Arrange
      const params: GetAnalysisScopeParams = {
        paths: ['src/file.ts'],
        scope: AnalysisScope.SELECTED_FILES,
      };
      const expectedResult: AnalysisScopeResult = {
        scope: AnalysisScope.SELECTED_FILES,
        targetFilePaths: ['src/file.ts'],
      };
      (determineAnalysisScope as jest.Mock).mockResolvedValue(
        expectedResult as never
      );

      // Act
      const result = await getAnalysisScope(params);

      // Assert
      expect(determineAnalysisScope).toHaveBeenCalledWith({
        paths: params.paths,
        scope: params.scope,
        getFilesForScopeImpl: getFilesForScope, // Verifies implementation is passed
        validatePathsInScopeImpl: validatePathsInScope,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('displayNoFilesToAnalyze', () => {
    it('should log a yellow message to the console', () => {
      // Act
      displayNoFilesToAnalyze();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'No files to analyze in the specified scope.'
      );
      expect(chalk.yellow).toHaveBeenCalled();
    });
  });

  describe('deployOutOfSyncFiles', () => {
    it('should call deployChangesIfNeeded with the provided context', async () => {
      // Arrange
      const params: DeployOutOfSyncFilesParams = {
        apiKey: 'api-key-abc',
        projectId: 'proj-123',
      };

      // Act
      await deployOutOfSyncFiles(params);

      // Assert
      expect(deployChangesIfNeeded).toHaveBeenCalledWith(
        params.apiKey,
        params.projectId
      );
    });
  });

  describe('triggerAnalysisAndDisplayResults', () => {
    const params: TriggerAnalysisAndDisplayResultsParams = {
      apiKey: 'api-key-abc',
      projectId: 'proj-123',
      task: 'REVIEW',
      language: 'english',
      scope: AnalysisScope.ENTIRE_PROJECT,
      targetFilePaths: [],
    };
    const mockApiResponse = { resultsUrl: 'https://results.url/123' };

    it('should trigger analysis, log URL, and open browser in non-production', async () => {
      // Arrange
      (constants.IS_PRODUCTION as boolean) = false;
      (triggerAnalysis as jest.Mock).mockResolvedValue(
        mockApiResponse as never
      );

      // Act
      await triggerAnalysisAndDisplayResults(params);

      // Assert
      expect(ora).toHaveBeenCalledWith(
        'Sending analysis request to the server...'
      );
      expect(triggerAnalysis).toHaveBeenCalledWith({
        apiKey: params.apiKey,
        projectId: params.projectId,
        taskType: params.task,
        language: params.language,
        scope: params.scope,
        filesForAnalysis: params.targetFilePaths,
      });
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Analysis successfully initiated!'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n✅ View analysis progress and results at:'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(mockApiResponse.resultsUrl);
      expect(openBrowser).toHaveBeenCalledWith(mockApiResponse.resultsUrl);
    });

    it('should not open browser in production environments', async () => {
      // Arrange
      (constants.IS_PRODUCTION as boolean) = true;
      (triggerAnalysis as jest.Mock).mockResolvedValue(
        mockApiResponse as never
      );

      // Act
      await triggerAnalysisAndDisplayResults(params);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockApiResponse.resultsUrl);
      expect(openBrowser).not.toHaveBeenCalled();
    });
  });

  describe('handleAnalysisError', () => {
    it('should handle Axios errors with a specific error message structure', () => {
      // Arrange
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        response: {
          data: { error: { message: 'Project not found.' } },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
      };

      // Act & Assert
      expect(() => handleAnalysisError(error)).toThrow(
        'process.exit() was called.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\n❌ A backend error occurred: Project not found.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle Axios errors with unexpected data structure by stringifying it', () => {
      // Arrange
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        response: {
          data: { detail: 'Invalid input provided' },
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
      };

      // Act & Assert
      expect(() => handleAnalysisError(error)).toThrow(
        'process.exit() was called.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `\n❌ A backend error occurred: ${JSON.stringify(error.response?.data)}`
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Axios generic errors', () => {
      // Arrange
      const error = new Error('Something went wrong');

      // Act & Assert
      expect(() => handleAnalysisError(error)).toThrow(
        'process.exit() was called.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\n❌ An unexpected error occurred:',
        error
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle an Axios error without a response object', () => {
      // Arrange
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: 'Network Error', // No response object
      };

      // Act & Assert
      expect(() => handleAnalysisError(error)).toThrow(
        'process.exit() was called.'
      );
      // It should fall back to the generic error handler
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\n❌ An unexpected error occurred:',
        error
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
