import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getChangedFiles,
  isGitRepository,
  validateGitRepository,
} from './git-helpers';

// Mock the child_process module
jest.mock('child_process');

// Mock console.error to prevent logging during tests and to spy on it
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import the mocked version of execSync
const { execSync } = require('child_process');

describe('getChangedFiles', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    execSync.mockReset();
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

  // --- Test Case 4: No changed files ---
  it('should return an empty array when the git command returns an empty string', () => {
    const gitOutput = '';
    execSync.mockReturnValue(gitOutput);

    const files = getChangedFiles();

    expect(files).toHaveLength(0);
  });

  // --- Test Case 6: Staged, unstaged, and untracked files combined ---
  it('should combine staged, unstaged, and untracked files and deduplicate', () => {
    // Simulate three calls: staged, unstaged, untracked
    execSync
      .mockReturnValueOnce('file1.js\nfile2.js') // staged
      .mockReturnValueOnce('file2.js\nfile3.js') // unstaged
      .mockReturnValueOnce('file4.js\nfile1.js'); // untracked
    const files = getChangedFiles();
    expect(files.sort()).toEqual(
      ['file1.js', 'file2.js', 'file3.js', 'file4.js'].sort()
    );
    // Should call all three commands
    expect(execSync).toHaveBeenCalledWith(
      'git diff --cached --name-only',
      expect.anything()
    );
    expect(execSync).toHaveBeenCalledWith(
      'git diff --name-only',
      expect.anything()
    );
    expect(execSync).toHaveBeenCalledWith(
      'git ls-files --others --exclude-standard',
      expect.anything()
    );
  });

  // --- Test Case 7: Fallback to branch diff if no files found ---
  it('should use branch diff if no staged/unstaged/untracked files', () => {
    // All three return empty, then branch fallback
    execSync
      .mockReturnValueOnce('') // staged
      .mockReturnValueOnce('') // unstaged
      .mockReturnValueOnce('') // untracked
      .mockImplementationOnce(() => {
        throw new Error('no origin/main');
      }) // origin/main
      .mockImplementationOnce(() => ''); // main exists
    execSync.mockReturnValueOnce('branch1.js\nbranch2.js'); // branch diff
    const files = getChangedFiles();
    expect(files).toEqual(['branch1.js', 'branch2.js']);
  });

  // --- Test Case 7: All commands fail scenario ---
  it('should return empty array if all git commands fail', () => {
    execSync.mockImplementation(() => {
      throw new Error('git command failed');
    });
    const files = getChangedFiles();
    expect(files).toEqual([]);
  });
});

describe('isGitRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true if .git exists', () => {
    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(true);
    expect(isGitRepository('/fake/dir')).toBe(true);
  });

  it('returns true if git command succeeds', () => {
    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(false);
    execSync.mockImplementationOnce(() => {});
    expect(isGitRepository('/fake/dir')).toBe(true);
  });

  it('returns false if neither .git nor git command', () => {
    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(false);
    execSync.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    expect(isGitRepository('/fake/dir')).toBe(false);
  });
});

describe('validateGitRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not throw if isGitRepository returns true', () => {
    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(true);
    expect(() => validateGitRepository('/fake/dir')).not.toThrow();
  });

  it('throws if isGitRepository returns false', () => {
    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(false);
    execSync.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    expect(() => validateGitRepository('/fake/dir')).toThrow(
      /not a git repository/
    );
  });
});
