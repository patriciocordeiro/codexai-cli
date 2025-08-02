import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getChangedFiles } from './git-helpers';
// Import the function to test

// Mock the child_process module
jest.mock('child_process');

// Mock console.error to prevent logging during tests and to spy on it
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import the mocked version of execSync
const { execSync } = require('child_process');

describe('getChangedFiles', () => {
  // Clear mocks before each test
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  // --- Test Case 1: Standard git output ---
  it('should parse a standard git diff output into an array of file paths', () => {
    const gitOutput = 'src/components/Button.tsx\nsrc/api/api.ts\nREADME.md\n';

    // Configure the mock to return our sample git output
    execSync.mockReturnValue(gitOutput);

    const files = getChangedFiles();

    // Assertions
    expect(files).toHaveLength(3);
    expect(files).toEqual([
      'src/components/Button.tsx',
      'src/api/api.ts',
      'README.md',
    ]);
    // Verify the mock was called with the correct command
    expect(execSync).toHaveBeenCalledWith('git diff --name-only', {
      encoding: 'utf-8',
    });
  });

  // --- Test Case 2: Output with extra whitespace and empty lines ---
  it('should filter out empty lines and trim whitespace from the output', () => {
    const gitOutput = '\n  src/index.ts  \n\nsrc/App.tsx\n';
    execSync.mockReturnValue(gitOutput);

    const files = getChangedFiles();

    expect(files).toHaveLength(2);
    expect(files).toEqual(['src/index.ts', 'src/App.tsx']);
  });

  // --- Test Case 3: Output with Windows-style path separators ---
  it('should normalize Windows-style backslashes to forward slashes', () => {
    const gitOutput = 'src\\components\\Button.tsx\nsrc\\api\\api.ts';
    execSync.mockReturnValue(gitOutput);

    const files = getChangedFiles();

    expect(files).toHaveLength(2);
    expect(files).toEqual(['src/components/Button.tsx', 'src/api/api.ts']);
  });

  // --- Test Case 4: Command fails (e.g., not a git repository) ---
  it('should return an empty array and log an error if execSync throws', () => {
    const mockError = new Error('fatal: not a git repository');

    // Configure the mock to throw an error when called
    execSync.mockImplementation(() => {
      throw mockError;
    });

    const files = getChangedFiles();

    // Assertions
    expect(files).toBeInstanceOf(Array);
    expect(files).toHaveLength(0);

    // Verify that console.error was called with the expected messages
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'Failed to get changed files from git. Is this a git repository?',
      mockError
    );
  });

  // --- Test Case 5: No changed files ---
  it('should return an empty array when the git command returns an empty string', () => {
    const gitOutput = '';
    execSync.mockReturnValue(gitOutput);

    const files = getChangedFiles();

    expect(files).toHaveLength(0);
  });
});
