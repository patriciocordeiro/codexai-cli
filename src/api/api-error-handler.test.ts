import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  AuthenticationError,
  FileSystemError,
  NetworkError,
  ValidationError,
} from '../error/errors';
import { ApiError, handleApiError } from './api-error-handler';

// Mock axios
jest.mock('axios');

// Mock axios.isAxiosError separately
const mockIsAxiosError = jest.fn();

// Setup axios mock
const mockedAxios = axios as jest.Mocked<typeof axios>;
Object.defineProperty(mockedAxios, 'isAxiosError', {
  value: mockIsAxiosError,
  writable: true,
});

describe('api-error-handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid output during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ApiError', () => {
    describe('constructor', () => {
      it('should create ApiError with all parameters', () => {
        const solutions = ['Try again', 'Check config'];
        const docsUrl = 'https://docs.example.com';
        const error = new ApiError('Test message', 400, solutions, docsUrl);

        expect(error.message).toBe('Test message');
        expect(error.statusCode).toBe(400);
        expect(error.solutions).toEqual(solutions);
        expect(error.docsUrl).toBe(docsUrl);
        expect(error.name).toBe('ApiError');
      });

      it('should create ApiError with default solutions parameter', () => {
        const error = new ApiError('Test message', 400);

        expect(error.message).toBe('Test message');
        expect(error.statusCode).toBe(400);
        expect(error.solutions).toEqual([]);
        expect(error.docsUrl).toBeUndefined();
        expect(error.name).toBe('ApiError');
      });

      it('should create ApiError without statusCode', () => {
        const error = new ApiError('Test message');

        expect(error.message).toBe('Test message');
        expect(error.statusCode).toBeUndefined();
        expect(error.solutions).toEqual([]);
        expect(error.docsUrl).toBeUndefined();
        expect(error.name).toBe('ApiError');
      });

      it('should create ApiError with empty solutions array', () => {
        const error = new ApiError('Test message', 500, []);

        expect(error.solutions).toEqual([]);
      });

      it('should create ApiError with solutions but no docsUrl', () => {
        const solutions = ['Solution 1', 'Solution 2'];
        const error = new ApiError('Test message', 400, solutions);

        expect(error.solutions).toEqual(solutions);
        expect(error.docsUrl).toBeUndefined();
      });
    });

    describe('getDetailedMessage', () => {
      it('should return basic message when no solutions or docs', () => {
        const error = new ApiError('Basic error');

        expect(error.getDetailedMessage()).toBe('Basic error');
      });

      it('should include solutions in formatted message', () => {
        const solutions = ['Check your config', 'Try again later'];
        const error = new ApiError('Error occurred', 400, solutions);

        const detailed = error.getDetailedMessage();

        expect(detailed).toBe(
          'Error occurred\n\nTroubleshooting steps:\n  1. Check your config\n  2. Try again later'
        );
      });

      it('should include docs URL when provided', () => {
        const docsUrl = 'https://docs.example.com/help';
        const error = new ApiError('Error occurred', 400, [], docsUrl);

        const detailed = error.getDetailedMessage();

        expect(detailed).toBe(
          'Error occurred\n\n📖 For more help: https://docs.example.com/help'
        );
      });

      it('should include both solutions and docs URL', () => {
        const solutions = ['Solution 1'];
        const docsUrl = 'https://docs.example.com';
        const error = new ApiError('Error occurred', 400, solutions, docsUrl);

        const detailed = error.getDetailedMessage();

        expect(detailed).toBe(
          'Error occurred\n\nTroubleshooting steps:\n  1. Solution 1\n\n📖 For more help: https://docs.example.com'
        );
      });

      it('should format multiple solutions correctly', () => {
        const solutions = [
          'First solution',
          'Second solution',
          'Third solution',
        ];
        const error = new ApiError('Multiple solutions', 400, solutions);

        const detailed = error.getDetailedMessage();

        expect(detailed).toBe(
          'Multiple solutions\n\nTroubleshooting steps:\n  1. First solution\n  2. Second solution\n  3. Third solution'
        );
      });

      it('should handle empty solutions array', () => {
        const error = new ApiError('No solutions', 400, []);

        expect(error.getDetailedMessage()).toBe('No solutions');
      });
    });
  });

  describe('handleApiError', () => {
    beforeEach(() => {
      mockIsAxiosError.mockReturnValue(false);
    });

    describe('Axios errors with known status codes', () => {
      it('should handle 400 validation error', () => {
        const axiosError = new AxiosError('Bad Request');
        axiosError.response = {
          status: 400,
          data: { message: 'Invalid input' },
          statusText: 'Bad Request',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'testing validation')).toThrow(
          ValidationError
        );
        expect(() => handleApiError(axiosError, 'testing validation')).toThrow(
          /Invalid request. Please check your input and try again./
        );
      });

      it('should handle 401 authentication error', () => {
        const axiosError = new AxiosError('Unauthorized');
        axiosError.response = {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'authenticating')).toThrow(
          AuthenticationError
        );
        expect(() => handleApiError(axiosError, 'authenticating')).toThrow(
          /Authentication failed. Please check your API key./
        );
      });

      it('should handle 403 forbidden error', () => {
        const axiosError = new AxiosError('Forbidden');
        axiosError.response = {
          status: 403,
          data: {},
          statusText: 'Forbidden',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'accessing resource')).toThrow(
          AuthenticationError
        );
        expect(() => handleApiError(axiosError, 'accessing resource')).toThrow(
          /Access denied. You do not have permission to perform this action./
        );
      });

      it('should handle 404 not found error', () => {
        const axiosError = new AxiosError('Not Found');
        axiosError.response = {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'finding resource')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'finding resource')).toThrow(
          /Resource not found. The requested project or endpoint does not exist./
        );
      });

      it('should handle 409 conflict error', () => {
        const axiosError = new AxiosError('Conflict');
        axiosError.response = {
          status: 409,
          data: {},
          statusText: 'Conflict',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'creating resource')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'creating resource')).toThrow(
          /Conflict. The resource already exists or is in use./
        );
      });

      it('should handle 413 file too large error', () => {
        const axiosError = new AxiosError('Payload Too Large');
        axiosError.response = {
          status: 413,
          data: {},
          statusText: 'Payload Too Large',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'uploading file')).toThrow(
          FileSystemError
        );
        expect(() => handleApiError(axiosError, 'uploading file')).toThrow(
          /File too large. Please reduce the size of your project files./
        );
      });

      it('should handle 422 unprocessable entity error', () => {
        const axiosError = new AxiosError('Unprocessable Entity');
        axiosError.response = {
          status: 422,
          data: {},
          statusText: 'Unprocessable Entity',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'processing data')).toThrow(
          ValidationError
        );
        expect(() => handleApiError(axiosError, 'processing data')).toThrow(
          /Invalid data. Please check your request parameters./
        );
      });

      it('should handle 429 rate limit error', () => {
        const axiosError = new AxiosError('Too Many Requests');
        axiosError.response = {
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'making request')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'making request')).toThrow(
          /Too many requests. Please wait a moment and try again./
        );
      });

      it('should handle 500 server error', () => {
        const axiosError = new AxiosError('Internal Server Error');
        axiosError.response = {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'processing request')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'processing request')).toThrow(
          /Server error. Please try again later./
        );
      });

      it('should handle 502 bad gateway error', () => {
        const axiosError = new AxiosError('Bad Gateway');
        axiosError.response = {
          status: 502,
          data: {},
          statusText: 'Bad Gateway',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'connecting')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'connecting')).toThrow(
          /Service temporarily unavailable. Please try again later./
        );
      });

      it('should handle 503 service unavailable error', () => {
        const axiosError = new AxiosError('Service Unavailable');
        axiosError.response = {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'accessing service')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'accessing service')).toThrow(
          /Service unavailable. Please try again later./
        );
      });

      it('should handle 504 gateway timeout error', () => {
        const axiosError = new AxiosError('Gateway Timeout');
        axiosError.response = {
          status: 504,
          data: {},
          statusText: 'Gateway Timeout',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() =>
          handleApiError(axiosError, 'waiting for response')
        ).toThrow(ApiError);
        expect(() =>
          handleApiError(axiosError, 'waiting for response')
        ).toThrow(/Request timeout. Please try again later./);
      });
    });

    describe('Axios errors with unknown status codes', () => {
      it('should handle unknown status code with server message object', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: { message: 'Custom server error' },
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'Custom server error'
        );
      });

      it('should handle unknown status code with string response data', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: 'String error message',
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'String error message'
        );
      });

      it('should handle unknown status code with no message', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: {},
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'Failed unknown operation. Please try again.'
        );
      });

      it('should handle unknown status code with null response data', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: null,
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'Failed unknown operation. Please try again.'
        );
      });

      it('should handle unknown status code with undefined response data', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: undefined,
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'Failed unknown operation. Please try again.'
        );
      });

      it('should handle unknown status code with number response data', () => {
        const axiosError = new AxiosError('Unknown Error');
        axiosError.response = {
          status: 999,
          data: 12345,
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'unknown operation')).toThrow(
          'Failed unknown operation. Please try again.'
        );
      });
    });

    describe('Axios errors without status code', () => {
      it('should handle axios error without response', () => {
        const axiosError = new AxiosError('Network Error');
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'network operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'network operation')).toThrow(
          'Failed network operation. Please try again.'
        );
      });

      it('should handle axios error with undefined status', () => {
        const axiosError = new AxiosError('Network Error');
        axiosError.response = {
          status: undefined as any,
          data: {},
          statusText: 'Unknown',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'network operation')).toThrow(
          ApiError
        );
        expect(() => handleApiError(axiosError, 'network operation')).toThrow(
          'Failed network operation. Please try again.'
        );
      });
    });

    describe('Non-Axios errors', () => {
      it('should handle regular Error objects', () => {
        const regularError = new Error('Regular error message');
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(regularError, 'general operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(regularError, 'general operation')).toThrow(
          'Failed general operation: Regular error message'
        );
      });

      it('should handle Error objects with empty message', () => {
        const regularError = new Error('');
        mockIsAxiosError.mockReturnValue(false);

        expect(() =>
          handleApiError(regularError, 'empty error operation')
        ).toThrow(NetworkError);
        expect(() =>
          handleApiError(regularError, 'empty error operation')
        ).toThrow('Failed empty error operation: ');
      });

      it('should handle custom Error subclasses', () => {
        class CustomError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'CustomError';
          }
        }

        const customError = new CustomError('Custom error occurred');
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(customError, 'custom operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(customError, 'custom operation')).toThrow(
          'Failed custom operation: Custom error occurred'
        );
      });
    });

    describe('Unknown error types', () => {
      it('should handle string errors', () => {
        const stringError = 'String error message';
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(stringError, 'string operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(stringError, 'string operation')).toThrow(
          'Unknown error occurred while string operation. Please try again.'
        );
      });

      it('should handle number errors', () => {
        const numberError = 42;
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(numberError, 'number operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(numberError, 'number operation')).toThrow(
          'Unknown error occurred while number operation. Please try again.'
        );
      });

      it('should handle null errors', () => {
        const nullError = null;
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(nullError, 'null operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(nullError, 'null operation')).toThrow(
          'Unknown error occurred while null operation. Please try again.'
        );
      });

      it('should handle undefined errors', () => {
        const undefinedError = undefined;
        mockIsAxiosError.mockReturnValue(false);

        expect(() =>
          handleApiError(undefinedError, 'undefined operation')
        ).toThrow(NetworkError);
        expect(() =>
          handleApiError(undefinedError, 'undefined operation')
        ).toThrow(
          'Unknown error occurred while undefined operation. Please try again.'
        );
      });

      it('should handle object errors without message', () => {
        const objectError = { code: 'SOME_ERROR', details: 'Error details' };
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(objectError, 'object operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(objectError, 'object operation')).toThrow(
          'Unknown error occurred while object operation. Please try again.'
        );
      });

      it('should handle boolean errors', () => {
        const booleanError = false;
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(booleanError, 'boolean operation')).toThrow(
          NetworkError
        );
        expect(() => handleApiError(booleanError, 'boolean operation')).toThrow(
          'Unknown error occurred while boolean operation. Please try again.'
        );
      });
    });

    describe('console.error logging', () => {
      it('should log error message for Error objects', () => {
        const errorMessage = 'Test error message';
        const error = new Error(errorMessage);
        const operation = 'test operation';
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(error, operation)).toThrow();
        expect(console.error).toHaveBeenCalledWith(
          `\n❌ An unexpected error occurred while ${operation}:`,
          errorMessage
        );
      });

      it('should log stringified error for non-Error objects', () => {
        const error = { code: 'TEST_ERROR' };
        const operation = 'test operation';
        mockIsAxiosError.mockReturnValue(false);

        expect(() => handleApiError(error, operation)).toThrow();
        expect(console.error).toHaveBeenCalledWith(
          `\n❌ An unexpected error occurred while ${operation}:`,
          '[object Object]'
        );
      });

      it('should not log for Axios errors', () => {
        const axiosError = new AxiosError('Axios Error');
        axiosError.response = {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        expect(() => handleApiError(axiosError, 'test operation')).toThrow();
        expect(console.error).not.toHaveBeenCalled();
      });
    });

    describe('Error properties preservation', () => {
      it('should preserve all ApiError properties for known status codes', () => {
        const axiosError = new AxiosError('Not Found');
        axiosError.response = {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        try {
          handleApiError(axiosError, 'finding resource');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          const apiError = error as ApiError;
          expect(apiError.statusCode).toBe(404);
          expect(apiError.solutions).toHaveLength(4); // Based on STATUS_CODE_INFO[404]
          expect(apiError.docsUrl).toBe(
            'https://docs.codexai.dev/api/endpoints'
          );
        }
      });

      it('should include detailed message with solutions for specific error types', () => {
        const axiosError = new AxiosError('Unauthorized');
        axiosError.response = {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: {} } as InternalAxiosRequestConfig,
        };
        mockIsAxiosError.mockReturnValue(true);

        try {
          handleApiError(axiosError, 'authenticating');
        } catch (error) {
          expect(error).toBeInstanceOf(AuthenticationError);
          const authError = error as AuthenticationError;
          expect(authError.message).toContain('Authentication failed');
          expect(authError.message).toContain('Troubleshooting steps:');
          expect(authError.message).toContain('Run "codexai config"');
          expect(authError.message).toContain('📖 For more help:');
        }
      });
    });
  });
});
