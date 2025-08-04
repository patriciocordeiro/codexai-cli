import { ApiError } from './api-error-handler';

/**
 * Displays user-friendly error information with troubleshooting steps.
 * @param {Error} error - The error to display.
 * @param {boolean} showSolutions - Whether to show troubleshooting solutions.
 */
export function displayError(
  error: Error,
  showSolutions: boolean = true
): void {
  console.error(`❌ Error: ${error.message}`);

  // If it's an ApiError with solutions, display them
  if (
    error instanceof ApiError &&
    showSolutions &&
    error.solutions.length > 0
  ) {
    console.error('\n💡 Troubleshooting steps:');
    error.solutions.forEach((solution, index) => {
      console.error(`   ${index + 1}. ${solution}`);
    });
  }

  // Add status code if available
  if (error instanceof ApiError && error.statusCode) {
    console.error(`\n   Status Code: ${error.statusCode}`);
  }

  // Add documentation link if available
  if (error instanceof ApiError && error.docsUrl) {
    console.error(`\n📖 For more help: ${error.docsUrl}`);
  }
}

/**
 * Extracts solutions from an error if available.
 * @param {Error} error - The error to extract solutions from.
 * @returns {string[]} Array of solution strings.
 */
export function getSolutions(error: Error): string[] {
  if (error instanceof ApiError) {
    return error.solutions;
  }
  return [];
}

/**
 * Extracts documentation URL from an error if available.
 * @param {Error} error - The error to extract documentation URL from.
 * @returns {string | undefined} Documentation URL or undefined.
 */
export function getDocsUrl(error: Error): string | undefined {
  if (error instanceof ApiError) {
    return error.docsUrl;
  }
  return undefined;
}
