/**
 * Error thrown when authentication fails or is required.
 */
export class AuthenticationError extends Error {
  /**
   * @param {string} message - The error message describing the authentication failure.
   */
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown for network-related failures, optionally including a status code.
 */
export class NetworkError extends Error {
  /**
   * @param {string} message - The error message describing the network failure.
   * @param {number} [statusCode] - Optional HTTP status code associated with the error.
   */
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown for file system-related failures, optionally including a file path.
 */
export class FileSystemError extends Error {
  /**
   * @param {string} message - The error message describing the file system failure.
   * @param {string} [path] - Optional file path associated with the error.
   */
  constructor(
    message: string,
    public path?: string
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Error thrown for validation failures.
 */
export class ValidationError extends Error {
  /**
   * @param {string} message - The error message describing the validation failure.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
