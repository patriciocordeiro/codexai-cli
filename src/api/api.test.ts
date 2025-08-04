// In src/api.test.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { AnalysisScope } from '../models/cli.model';
import {
  createProjectWithFiles,
  getProjectManifest,
  triggerAnalysis,
  updateProjectFiles,
} from './api';
import { ApiError } from './api-error-handler';

// Mock external dependencies
jest.mock('axios');
jest.mock('ora', () => {
  const oraMock = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
  };
  return jest.fn(() => oraMock);
});

// Mock axios.isAxiosError separately
const mockIsAxiosError = jest.fn();

// Mock FormData since the original function uses require('form-data')
jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => {
    // This mock simulates the FormData interface used in the functions
    const formData = {
      _data: new Map<string, unknown>(),
      append: jest.fn((key: string, value: unknown) => {
        formData._data.set(key, value);
      }),
      getHeaders: jest.fn(() => ({ 'content-type': 'multipart/form-data' })),
    };
    return formData;
  });
});

// Mock constants to have a stable API_BASE_URL for tests
jest.mock('../constants/constants', () => ({
  API_BASE_URL: 'https://api.test.com',
}));

// Type-cast the mocked modules for better type-safety and autocompletion
const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedFormData = FormData as unknown as jest.Mock;

// Setup axios.isAxiosError mock
Object.defineProperty(mockedAxios, 'isAxiosError', {
  value: mockIsAxiosError,
  writable: true,
});

describe('api', () => {
  beforeEach(() => {
    // Clear all mock history before each test
    jest.clearAllMocks();

    // Setup axios.isAxiosError mock behavior
    mockIsAxiosError.mockImplementation((error: unknown) => {
      return error && typeof error === 'object' && 'isAxiosError' in error;
    });
  });

  describe('ApiError', () => {
    it('should create ApiError with default solutions parameter', () => {
      // This test specifically covers the default parameter assignment in the constructor
      const error = new ApiError('Test message', 400);
      expect(error.solutions).toEqual([]);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
    });

    it('should create ApiError without statusCode', () => {
      // This test covers the constructor without statusCode
      const error = new ApiError('Test message');
      expect(error.solutions).toEqual([]);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('createProjectWithFiles', () => {
    const apiKey = 'test-api-key';
    const projectName = 'My Test Project';
    const zipBuffer = Buffer.from('zip-file-content');
    const fileManifest = { 'index.ts': 'hash123' };
    const endpointUrl = 'https://api.test.com/createProjectWithFilesFunction';
    const mockSuccessResponse = {
      projectId: 'proj-xyz',
      projectUrl: 'https://app.test.com/projects/proj-xyz',
    };

    let consoleLogSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      // Spy on console.info to verify logging behavior
      consoleLogSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should create a project with files successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await createProjectWithFiles({
        apiKey,
        projectName,
        zipBuffer,
        fileManifest,
      });

      // Assert
      expect(MockedFormData).toHaveBeenCalledTimes(1);
      const formInstance = MockedFormData.mock.results[0].value as {
        append: jest.Mock;
        getHeaders: jest.Mock;
        _data: Map<string, unknown>;
      };
      expect(formInstance.append).toHaveBeenCalledWith(
        'projectZip',
        zipBuffer,
        { filename: 'project.zip' }
      );
      expect(formInstance.append).toHaveBeenCalledWith(
        'fileManifest',
        JSON.stringify(fileManifest)
      );
      expect(formInstance.append).toHaveBeenCalledWith(
        'projectName',
        projectName
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(endpointUrl, formInstance, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(formInstance.getHeaders?.() || {}),
        },
      });

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw the specific error data on API failure', async () => {
      // Arrange
      const errorResponse = {
        code: 'unauthenticated',
        message: 'Invalid API key.',
      };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 401 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Authentication failed. Please check your API key.');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const unknownError = new Error('Something went wrong');

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Failed uploading project files: Something went wrong');
    });

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const errorResponse = { message: 'Access denied' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 403 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow(
        'Access denied. You do not have permission to perform this action.'
      );
    });

    it('should handle 400 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid request parameters' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 400 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      );
    });

    it('should handle 422 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid data format' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 422 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Invalid data. Please check your request parameters.');
    });

    it('should handle 413 file too large error', async () => {
      // Arrange
      const errorResponse = { message: 'File too large' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 413 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow(
        'File too large. Please reduce the size of your project files.'
      );
    });

    it('should handle unknown status code with server message', async () => {
      // Arrange
      const errorResponse = { message: 'Custom error message' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Custom error message');
    });

    it('should handle axios error with string response data', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: 'String error message', status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('String error message');
    });

    it('should handle axios error with no response data', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: null, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Failed uploading project files. Please try again.');
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      const unknownError = 'String error';

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow(
        'Unknown error occurred while uploading project files. Please try again.'
      );
    });

    it('should handle axios error with undefined responseData', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: undefined, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Failed uploading project files. Please try again.');
    });

    it('should handle axios error with empty object responseData', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: {}, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Failed uploading project files. Please try again.');
    });

    it('should handle axios error with number responseData', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: 123, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles({ apiKey, projectName, zipBuffer, fileManifest })
      ).rejects.toThrow('Failed uploading project files. Please try again.');
    });
  });

  describe('triggerAnalysis', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const taskType = 'REVIEW';
    const language = 'Spanish';
    const filesForAnalysis = ['src/index.ts', 'src/utils.ts'];
    const endpointUrl = 'https://api.test.com/triggerAnalysisForCliFunction';
    const mockSuccessResponse = {
      resultsUrl: 'https://app.test.com/results/res-123',
      analysisRunId: 'run-abc',
    };

    it('should trigger an analysis run successfully', async () => {
      const scope: AnalysisScope = AnalysisScope.ENTIRE_PROJECT;
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await triggerAnalysis({
        apiKey,
        projectId,
        taskType,
        language,
        scope,
        filesForAnalysis,
      });

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        endpointUrl,
        {
          data: {
            projectId,
            task: taskType.toUpperCase(),
            parameters: { language: language.toLowerCase() },
            scope,
            filesForAnalysis,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should trigger an analysis run successfully with default scope', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await triggerAnalysis({
        apiKey,
        projectId,
        taskType,
        language,
        filesForAnalysis,
      });

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        endpointUrl,
        {
          data: {
            projectId,
            task: taskType.toUpperCase(),
            parameters: { language: language.toLowerCase() },
            scope: AnalysisScope.GIT_DIFF,
            filesForAnalysis,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle API failure, update spinner, and re-throw error', async () => {
      // Arrange
      const errorResponse = { message: 'API request failed' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 500 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Server error. Please try again later.');
    });

    it('should handle 401 authentication error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid API key' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 401 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Authentication failed. Please check your API key.');
    });

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const errorResponse = { message: 'Access denied' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 403 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow(
        'Access denied. You do not have permission to perform this action.'
      );
    });

    it('should handle 400 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid request parameters' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 400 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      );
    });

    it('should handle 422 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid data format' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 422 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Invalid data. Please check your request parameters.');
    });

    it('should handle 413 file too large error', async () => {
      // Arrange
      const errorResponse = { message: 'File too large' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 413 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow(
        'File too large. Please reduce the size of your project files.'
      );
    });

    it('should handle unknown status code with server message', async () => {
      // Arrange
      const errorResponse = { message: 'Custom error message' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Custom error message');
    });

    it('should handle axios error with string response data', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: 'String error message', status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('String error message');
    });

    it('should handle axios error with no response data', async () => {
      // Arrange
      const axiosError = {
        isAxiosError: true,
        response: { data: null, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Failed starting analysis. Please try again.');
    });

    it('should handle non-Axios errors', async () => {
      // Arrange
      const unknownError = new Error('Network connection failed');

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow('Failed starting analysis: Network connection failed');
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      const unknownError = 'String error';

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        triggerAnalysis({
          apiKey,
          projectId,
          taskType,
          language,
          filesForAnalysis,
        })
      ).rejects.toThrow(
        'Unknown error occurred while starting analysis. Please try again.'
      );
    });
  });

  describe('getProjectManifest', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const mockManifest = {
      paths: ['file1.js', 'file2.js'],
      hashes: ['hash1', 'hash2'],
    };

    it('should fetch the project manifest successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: { manifest: mockManifest } });

      // Act
      const result = await getProjectManifest({ apiKey, projectId });

      // Assert
      expect(result).toEqual(mockManifest);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const errorResponse = { message: 'Project not found.' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 404 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Resource not found. The requested project or endpoint does not exist.'
      );
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const unknownError = new Error('Something went wrong');

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Failed fetching project manifest: Something went wrong'
      );
    });

    it('should handle 401 authentication error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid API key' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 401 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Authentication failed. Please check your API key.'
      );
    });

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const errorResponse = { message: 'Access denied' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 403 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Access denied. You do not have permission to perform this action.'
      );
    });

    it('should handle 400 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid request parameters' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 400 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      );
    });

    it('should handle unknown status code with server message', async () => {
      // Arrange
      const errorResponse = { message: 'Custom error message' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Custom error message'
      );
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      const unknownError = 'String error';

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(getProjectManifest({ apiKey, projectId })).rejects.toThrow(
        'Unknown error occurred while fetching project manifest. Please try again.'
      );
    });
  });

  describe('updateProjectFiles', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const patchZipBuffer = Buffer.from('patch-zip-content');
    const updatedManifest = { 'file1.js': 'new-hash1' };
    const endpointUrl = 'https://api.test.com/updateProjectFilesFunction';
    const mockSuccessResponse = { message: 'Files updated successfully.' };

    it('should update project files successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await updateProjectFiles({
        apiKey,
        projectId,
        patchZipBuffer,
        updatedManifest,
      });

      // Assert
      expect(MockedFormData).toHaveBeenCalledTimes(1);
      const formInstance = MockedFormData.mock.results[0].value as {
        append: jest.Mock;
        getHeaders: jest.Mock;
        _data: Map<string, unknown>;
      };
      expect(formInstance.append).toHaveBeenCalledWith(
        'patchZip',
        patchZipBuffer,
        { filename: 'patch.zip' }
      );
      expect(formInstance.append).toHaveBeenCalledWith(
        'updatedManifest',
        JSON.stringify(updatedManifest)
      );
      expect(formInstance.append).toHaveBeenCalledWith('projectId', projectId);

      expect(mockedAxios.post).toHaveBeenCalledWith(endpointUrl, formInstance, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(formInstance.getHeaders?.() || {}),
        },
      });
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const errorResponse = { message: 'Update failed due to server error' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 500 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow('Server error. Please try again later.');
    });

    it('should handle 401 authentication error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid API key' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 401 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow('Authentication failed. Please check your API key.');
    });

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const errorResponse = { message: 'Access denied' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 403 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow(
        'Access denied. You do not have permission to perform this action.'
      );
    });

    it('should handle 400 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid request parameters' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 400 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      );
    });

    it('should handle 422 validation error', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid data format' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 422 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow('Invalid data. Please check your request parameters.');
    });

    it('should handle 413 file too large error', async () => {
      // Arrange
      const errorResponse = { message: 'File too large' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 413 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow(
        'File too large. Please reduce the size of your project files.'
      );
    });

    it('should handle unknown status code with server message', async () => {
      // Arrange
      const errorResponse = { message: 'Custom error message' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 999 },
      } as AxiosError;

      // Configure mocks
      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow('Custom error message');
    });

    it('should handle non-Axios errors', async () => {
      // Arrange
      const unknownError = new Error('Network connection failed');

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow(
        'Failed updating project files: Network connection failed'
      );
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      const unknownError = 'String error';

      // Configure mocks
      mockIsAxiosError.mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow(
        'Unknown error occurred while updating project files. Please try again.'
      );
    });

    it('should handle ApiError without solutions parameter', async () => {
      // Arrange
      const apiKey = 'valid-api-key';
      const projectId = 'project-123';
      const patchZipBuffer = Buffer.from('zip-content');
      const updatedManifest = { 'file.ts': 'content' };

      const mockError = new AxiosError('Axios error');
      mockError.response = {
        status: 400,
        data: { message: 'Validation failed' },
        statusText: 'Bad Request',
        headers: {},
        config: { headers: {} } as InternalAxiosRequestConfig,
      };
      mockIsAxiosError.mockReturnValue(true);
      (axios.put as jest.MockedFunction<typeof axios.put>).mockRejectedValue(
        mockError
      );

      // Act & Assert - This should trigger the default solutions parameter
      await expect(
        updateProjectFiles({
          apiKey,
          projectId,
          patchZipBuffer,
          updatedManifest,
        })
      ).rejects.toThrow();
    });
  });
});
