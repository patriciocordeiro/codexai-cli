// In src/api.test.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import ora from 'ora';
import {
  createProjectWithFiles,
  getProjectManifest,
  triggerAnalysis,
  updateProjectFiles,
} from './api';

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
const mockedOra = ora as jest.Mock;
const MockedFormData = FormData as unknown as jest.Mock;

describe('api', () => {
  beforeEach(() => {
    // Clear all mock history before each test
    jest.clearAllMocks();
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
      // Spy on console.log to verify logging behavior
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should create a project with files successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await createProjectWithFiles(
        apiKey,
        projectName,
        zipBuffer,
        fileManifest
      );

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
        {
          filename: 'project.zip',
        }
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📦 Uploading project files...',
        endpointUrl
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Project created successfully:',
        mockSuccessResponse
      );
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
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(
        createProjectWithFiles(apiKey, projectName, zipBuffer, fileManifest)
      ).rejects.toEqual(errorResponse);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📦 Uploading project files...',
        endpointUrl
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('✅ Project created successfully:')
      );
    });
  });

  describe('triggerAnalysis', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const taskType = 'REVIEW';
    const language = 'Spanish';
    const scope = 'SELECTED_FILES';
    const filesForAnalysis = ['src/index.ts', 'src/utils.ts'];
    const endpointUrl = 'https://api.test.com/triggerAnalysisForCliFunction';
    const mockSuccessResponse = {
      resultsUrl: 'https://app.test.com/results/res-123',
      analysisRunId: 'run-abc',
    };

    it('should trigger an analysis run successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act

      // Assert
      const result = await triggerAnalysis(
        apiKey,
        projectId,
        taskType,
        language,
        scope,
        filesForAnalysis
      );

      const oraSpinner = mockedOra.mock.results[0].value as {
        start: jest.Mock;
        succeed: jest.Mock;
        fail: jest.Mock;
      };

      expect(mockedOra).toHaveBeenCalledWith(
        `Starting '${taskType}' analysis...`
      );
      expect(oraSpinner.start).toHaveBeenCalledTimes(1);
      expect(oraSpinner.succeed).toHaveBeenCalledWith(
        'Analysis successfully initiated!'
      );
      expect(oraSpinner.fail).not.toHaveBeenCalled();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        endpointUrl,
        {
          data: {
            projectId: projectId,
            task: 'REVIEW', // uppercased
            parameters: { language: 'spanish' }, // lowercased
            scope: scope,
            filesForAnalysis: filesForAnalysis,
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
      const apiError = new Error('API request failed');
      mockedAxios.post.mockRejectedValue(apiError);
      // Act & Assert
      await expect(
        triggerAnalysis(
          apiKey,
          projectId,
          taskType,
          language,
          scope,
          filesForAnalysis
        )
      ).rejects.toThrow(apiError);

      // Ensure ora was called before accessing its mock results
      const oraSpinner = mockedOra.mock.results[0].value as {
        start: jest.Mock;
        succeed: jest.Mock;
        fail: jest.Mock;
      };

      expect(oraSpinner.start).toHaveBeenCalledTimes(1);
      expect(oraSpinner.fail).toHaveBeenCalledWith('Failed to start analysis.');
      expect(oraSpinner.succeed).not.toHaveBeenCalled();
    });
  });

  describe('getProjectManifest', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const endpointUrl = 'https://api.test.com/getProjectManifestFunction';
    const mockManifest = { 'file1.js': 'hash1', 'file2.css': 'hash2' };

    it('should fetch the project manifest successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: { manifest: mockManifest } });

      // Act
      const result = await getProjectManifest(apiKey, projectId);

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        endpointUrl,
        { data: { projectId } },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      expect(result).toEqual(mockManifest);
    });

    it('should throw the specific error data on API failure', async () => {
      // Arrange
      const errorResponse = { message: 'Project not found.' };
      const axiosError = {
        isAxiosError: true,
        response: { data: errorResponse, status: 404 },
      } as AxiosError;
      mockedAxios.post.mockRejectedValue(axiosError);

      // Act & Assert
      await expect(getProjectManifest(apiKey, projectId)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('updateProjectFiles', () => {
    const apiKey = 'test-api-key';
    const projectId = 'proj-xyz';
    const patchZipBuffer = Buffer.from('patch-content');
    const updatedManifest = { 'new-file.ts': 'new-hash' };
    const endpointUrl = 'https://api.test.com/updateProjectFilesFunction';
    const mockSuccessResponse = { message: 'Project updated successfully' };

    it('should update project files successfully', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ data: mockSuccessResponse });

      // Act
      const result = await updateProjectFiles(
        apiKey,
        projectId,
        patchZipBuffer,
        updatedManifest
      );

      // Assert
      expect(MockedFormData).toHaveBeenCalledTimes(1);
      const formInstance = MockedFormData.mock.results[0].value as {
        append: jest.Mock;
        getHeaders: jest.Mock;
        _data?: Map<string, unknown>;
      };
      expect(formInstance.append).toHaveBeenCalledWith(
        'patchZip',
        patchZipBuffer,
        {
          filename: 'patch.zip',
        }
      );
      expect(formInstance.append).toHaveBeenCalledWith(
        'updatedManifest',
        JSON.stringify(updatedManifest)
      );
      expect(formInstance.append).toHaveBeenCalledWith('projectId', projectId);

      const rawHeaders =
        typeof formInstance.getHeaders === 'function'
          ? formInstance.getHeaders()
          : undefined;
      const headers =
        rawHeaders &&
        typeof rawHeaders === 'object' &&
        !Array.isArray(rawHeaders)
          ? { ...rawHeaders }
          : {};

      expect(mockedAxios.post).toHaveBeenCalledWith(endpointUrl, formInstance, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...headers,
        },
      });

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should re-throw the original error on API failure', async () => {
      // Arrange
      const apiError = new Error('Update failed due to server error');
      mockedAxios.post.mockRejectedValue(apiError);

      // Act & Assert
      // This function does not have a try/catch, so it should re-throw the raw axios error.
      await expect(
        updateProjectFiles(apiKey, projectId, patchZipBuffer, updatedManifest)
      ).rejects.toThrow(apiError);
    });
  });
});
