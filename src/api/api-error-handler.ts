import axios from 'axios';
import {
  AuthenticationError,
  FileSystemError,
  NetworkError,
  ValidationError,
} from '../error/errors';

/**
 * Enhanced error class that includes troubleshooting solutions.
 */
export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly solutions: string[];
  public readonly docsUrl?: string;

  /**
   * @param {string} message - The error message.
   * @param {number} [statusCode] - The HTTP status code.
   * @param {string[]} [solutions] - Array of troubleshooting solutions.
   * @param {string} [docsUrl] - Documentation URL for more information.
   */
  constructor(
    message: string,
    statusCode?: number,
    solutions: string[] = [],
    docsUrl?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.solutions = solutions;
    this.docsUrl = docsUrl;
  }

  /**
   * Returns a formatted error message with solutions and documentation link.
   * @returns {string} Formatted error message with troubleshooting steps and docs.
   */
  getDetailedMessage(): string {
    let detailed = this.message;

    if (this.solutions.length > 0) {
      detailed += '\n\nTroubleshooting steps:';
      this.solutions.forEach((solution, index) => {
        detailed += `\n  ${index + 1}. ${solution}`;
      });
    }

    if (this.docsUrl) {
      detailed += `\n\n📖 For more help: ${this.docsUrl}`;
    }

    return detailed;
  }
}

/**
 * Error information with message, troubleshooting steps, and documentation links.
 */
interface ErrorInfo {
  message: string;
  solutions: string[];
  docsUrl?: string;
}

/**
 * Maps HTTP status codes to user-friendly error messages and solutions.
 */
const STATUS_CODE_INFO: Record<number, ErrorInfo> = {
  400: {
    message: 'Invalid request. Please check your input and try again.',
    solutions: [
      'Verify all required parameters are provided',
      'Check that file paths are valid and exist',
      'Ensure project name contains only valid characters',
      'Validate that the request format matches the API specification',
    ],
    docsUrl: 'https://docs.codexai.dev/troubleshooting/invalid-request',
  },
  401: {
    message: 'Authentication failed. Please check your API key.',
    solutions: [
      'Run "codexai config" to set or update your API key',
      'Verify your API key is correct in your configuration',
      'Check if your API key has expired',
      'Ensure you have an active subscription',
    ],
    docsUrl: 'https://docs.codexai.dev/authentication/api-keys',
  },
  403: {
    message:
      'Access denied. You do not have permission to perform this action.',
    solutions: [
      'Check if you are authenticated with a valid API key',
      'logout and log back in to refresh your session',
      'Check if your API key has the required permissions',
      "Verify you own the project you're trying to access",
      'Contact support if you believe this is an error',
      'Ensure your subscription includes the requested feature',
    ],
    docsUrl: 'https://docs.codexai.dev/troubleshooting/access-denied',
  },
  404: {
    message:
      'Resource not found. The requested project or endpoint does not exist.',
    solutions: [
      'Verify the project ID is correct',
      'Check if the project was deleted or moved',
      "Ensure you're using the correct API endpoint",
      'Run "codexai list" to see your available projects',
    ],
    docsUrl: 'https://docs.codexai.dev/api/endpoints',
  },
  409: {
    message: 'Conflict. The resource already exists or is in use.',
    solutions: [
      'Choose a different project name',
      'Check if a project with this name already exists',
      'Wait for any ongoing operations to complete',
      'Use the update operation instead of create if appropriate',
    ],
    docsUrl: 'https://docs.codexai.dev/troubleshooting/conflicts',
  },
  413: {
    message: 'File too large. Please reduce the size of your project files.',
    solutions: [
      'Remove large binary files (images, videos, archives)',
      'Add large files to .gitignore',
      'Compress or optimize large text files',
      'Split your project into smaller modules if possible',
      'Check the maximum file size limits in our documentation',
    ],
    docsUrl: 'https://docs.codexai.dev/limits/file-size',
  },
  422: {
    message: 'Invalid data. Please check your request parameters.',
    solutions: [
      'Verify all required fields are provided',
      'Check data types match the expected format',
      'Ensure enum values are from the allowed list',
      'Validate file paths and project structure',
      'Review the API documentation for parameter requirements',
    ],
    docsUrl: 'https://docs.codexai.dev/api/validation',
  },
  429: {
    message: 'Too many requests. Please wait a moment and try again.',
    solutions: [
      'Wait a few minutes before retrying',
      'Reduce the frequency of your requests',
      'Consider upgrading your plan for higher rate limits',
      'Batch multiple operations when possible',
    ],
    docsUrl: 'https://docs.codexai.dev/limits/rate-limiting',
  },
  500: {
    message: 'Server error. Please try again later.',
    solutions: [
      'Wait a few minutes and retry your request',
      'Check our status page for known issues',
      'Contact support if the problem persists',
      'Try again with a smaller request if possible',
    ],
    docsUrl: 'https://docs.codexai.dev/troubleshooting/server-errors',
  },
  502: {
    message: 'Service temporarily unavailable. Please try again later.',
    solutions: [
      'Wait a few minutes and retry',
      'Check our status page for maintenance announcements',
      'Ensure your internet connection is stable',
      'Contact support if the issue persists',
    ],
    docsUrl: 'https://status.codexai.dev',
  },
  503: {
    message: 'Service unavailable. Please try again later.',
    solutions: [
      'The service may be under maintenance',
      'Check our status page for updates',
      'Wait 10-15 minutes before retrying',
      'Contact support if the outage is extended',
    ],
    docsUrl: 'https://status.codexai.dev',
  },
  504: {
    message: 'Request timeout. Please try again later.',
    solutions: [
      'Retry your request as it may have timed out',
      'Try with a smaller project or fewer files',
      'Check your internet connection stability',
      'Contact support if timeouts persist',
    ],
    docsUrl: 'https://docs.codexai.dev/troubleshooting/timeouts',
  },
};

/**
 * Handles API errors and throws appropriate custom error instances with user-friendly messages and solutions.
 * @param {unknown} error - The error caught from an API call.
 * @param {string} operation - A description of the operation that failed (e.g., 'uploading project files').
 * @throws {ApiError | AuthenticationError | NetworkError | FileSystemError | ValidationError} Appropriate error type with user-friendly message and solutions.
 */
export function handleApiError(error: unknown, operation: string): never {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    // Extract error message and solutions from response or status code
    let errorMessage = '';
    let solutions: string[] = [];
    let docsUrl: string | undefined;

    // Check if we have enhanced error info for this status code
    if (statusCode && STATUS_CODE_INFO[statusCode]) {
      const errorInfo = STATUS_CODE_INFO[statusCode];

      // Use our enhanced error info for better user experience
      errorMessage = errorInfo.message;
      solutions = errorInfo.solutions;
      docsUrl = errorInfo.docsUrl;
    } else {
      // Fallback to server message if we don't have enhanced info
      if (typeof responseData === 'object' && responseData?.message) {
        errorMessage = responseData.message;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else {
        errorMessage = `Failed ${operation}. Please try again.`;
      }
    }

    // Create enhanced error with solutions and docs
    const apiError = new ApiError(errorMessage, statusCode, solutions, docsUrl);

    // Throw specific error types based on status code for backward compatibility
    switch (statusCode) {
      case 401:
        throw new AuthenticationError(apiError.getDetailedMessage());

      case 403:
        throw new AuthenticationError(apiError.getDetailedMessage());

      case 400:
      case 422:
        throw new ValidationError(apiError.getDetailedMessage());

      case 413:
        throw new FileSystemError(apiError.getDetailedMessage());

      default:
        throw apiError; // Use the enhanced ApiError for other cases
    }
  }

  console.error(
    `\n❌ An unexpected error occurred while ${operation}:`,
    error instanceof Error ? error.message : String(error)
  );

  // Handle non-Axios errors
  if (error instanceof Error) {
    throw new NetworkError(`Failed ${operation}: ${error.message}`);
  }

  // Handle unknown errors
  throw new NetworkError(
    `Unknown error occurred while ${operation}. Please try again.`
  );
}
