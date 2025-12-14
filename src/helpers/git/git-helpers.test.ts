import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getChangedFiles,
  getFilesWithDiffsForAnalysis,
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
  it('should use last commit diff if all other git commands fail', () => {
    // Simulate all other git commands returning empty or throwing, except for last commit diff
    let callCount = 0;
    execSync.mockImplementation((cmd: string, _options?: never) => {
      callCount++;

      // First three calls return empty to trigger fallback logic
      if (
        cmd === 'git diff --cached --name-only' ||
        cmd === 'git diff --name-only' ||
        cmd === 'git ls-files --others --exclude-standard'
      ) {
        return '';
      }

      // Branch verification commands fail
      if (cmd.startsWith('git rev-parse --verify')) {
        throw new Error('fail');
      }

      // Branch diff commands fail
      if (cmd.includes('...HEAD --name-only')) {
        throw new Error('fail');
      }

      // Fallback command succeeds
      if (cmd === 'git diff HEAD~1 --name-only') {
        return 'file1.txt\nfile2.js\n';
      }

      throw new Error('unexpected command: ' + cmd);
    });

    const files = getChangedFiles();
    expect(files).toContain('file1.txt');
    expect(files).toContain('file2.js');
    expect(files.length).toBe(2);
    expect(callCount).toBeGreaterThan(1);
  });

  it('should handle errors and log to console.error', () => {
    // Save original Set constructor
    const OriginalSet = global.Set;

    // Mock Set constructor to throw an error to trigger outer catch block
    global.Set = jest.fn().mockImplementation(() => {
      throw new Error('Set constructor error');
    }) as never;

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const files = getChangedFiles();

    expect(files).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to get changed files from git. Is this a git repository?',
      expect.any(Error)
    );

    // Restore original Set and console
    global.Set = OriginalSet;
    consoleSpy.mockRestore();
  });
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

  it('should use current working directory when no dir parameter provided', () => {
    // Mock process.cwd to cover line 12
    const originalCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/current/working/dir') as never;

    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(true);
    expect(isGitRepository()).toBe(true);

    // Restore original cwd
    process.cwd = originalCwd;
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

  it('should use current working directory when no dir parameter provided', () => {
    // Mock process.cwd to cover line 39
    const originalCwd = process.cwd;
    process.cwd = jest
      .fn()
      .mockReturnValue('/current/working/dir') as () => string;

    jest.spyOn(require('fs-extra'), 'existsSync').mockReturnValueOnce(false);
    execSync.mockImplementationOnce(() => {
      throw new Error('fail');
    });

    expect(() => validateGitRepository()).toThrow(/not a git repository/);
    expect(() => validateGitRepository()).toThrow(/current\/working\/dir/);

    // Restore original cwd
    process.cwd = originalCwd;
  });
});

describe('getFilesWithDiffsForAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return files with their diff hunks', () => {
    // Mock getChangedFiles to return some files
    execSync.mockImplementation((cmd: string) => {
      if (cmd === 'git diff --cached --name-only') {
        return 'src/file1.ts\n';
      }
      if (cmd === 'git diff --name-only') {
        return 'src/file2.ts\n';
      }
      if (cmd === 'git ls-files --others --exclude-standard') {
        return '';
      }
      if (cmd === 'git diff --cached --unified=3') {
        return `diff --git a/src/file1.ts b/src/file1.ts
index 1234567..abcdefg 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,3 +1,4 @@
 export function hello() {
+  console.log('world');
   return 'hello';
 }
`;
      }
      if (cmd === 'git diff --unified=3') {
        return `diff --git a/src/file2.ts b/src/file2.ts
index 9876543..fedcba9 100644
--- a/src/file2.ts
+++ b/src/file2.ts
@@ -5,6 +5,7 @@
 export function goodbye() {
+  console.log('farewell');
   return 'goodbye';
 }
`;
      }
      return '';
    });

    const result = getFilesWithDiffsForAnalysis();

    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe('src/file1.ts');
    expect(result[1].filePath).toBe('src/file2.ts');
    expect(result[0].hunks).toHaveLength(1);
    expect(result[1].hunks).toHaveLength(1);
    expect(result[0].hunks[0].filename).toBe('src/file1.ts');
    expect(result[1].hunks[0].filename).toBe('src/file2.ts');
  });

  it('should return empty array when no files changed', () => {
    execSync.mockImplementation((cmd: string) => {
      if (
        cmd === 'git diff --cached --name-only' ||
        cmd === 'git diff --name-only' ||
        cmd === 'git ls-files --others --exclude-standard'
      ) {
        return '';
      }
      // Fallback commands
      if (cmd.startsWith('git rev-parse --verify')) {
        throw new Error('no branch');
      }
      if (cmd === 'git diff HEAD~1 --name-only') {
        return '';
      }
      return '';
    });

    const result = getFilesWithDiffsForAnalysis();

    expect(result).toEqual([]);
  });

  it('should handle files with empty hunks when diff is unavailable', () => {
    execSync.mockImplementation((cmd: string) => {
      if (cmd === 'git diff --name-only') {
        return 'newfile.ts\n';
      }
      if (
        cmd === 'git diff --cached --unified=3' ||
        cmd === 'git diff --unified=3'
      ) {
        return ''; // No diff for untracked files
      }
      if (
        cmd === 'git diff --cached --name-only' ||
        cmd === 'git ls-files --others --exclude-standard'
      ) {
        return '';
      }
      return '';
    });

    const result = getFilesWithDiffsForAnalysis();

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('newfile.ts');
    expect(result[0].hunks).toEqual([]);
  });

  it('should handle errors gracefully and return empty array', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Mock to have changed files but fail on diff
    execSync.mockImplementation((cmd: string) => {
      // Return a changed file
      if (cmd === 'git diff --name-only') {
        return 'src/file.ts\n';
      }

      // Fail on diff commands
      if (
        cmd === 'git diff --cached --unified=3' ||
        cmd === 'git diff --unified=3'
      ) {
        throw new Error('git diff command failed');
      }

      // Handle other commands
      if (
        cmd === 'git diff --cached --name-only' ||
        cmd === 'git ls-files --others --exclude-standard'
      ) {
        return '';
      }

      return '';
    });

    const result = getFilesWithDiffsForAnalysis();

    // Should return file with empty hunks
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('src/file.ts');
    expect(result[0].hunks).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should group multiple hunks from same file', () => {
    execSync.mockImplementation((cmd: string) => {
      if (cmd === 'git diff --name-only') {
        return 'src/multi.ts\n';
      }
      if (
        cmd === 'git diff --cached --name-only' ||
        cmd === 'git ls-files --others --exclude-standard'
      ) {
        return '';
      }
      if (cmd === 'git diff --cached --unified=3') {
        return '';
      }
      if (cmd === 'git diff --unified=3') {
        return `diff --git a/src/multi.ts b/src/multi.ts
index 1111111..2222222 100644
--- a/src/multi.ts
+++ b/src/multi.ts
@@ -1,3 +1,4 @@
 function first() {
+  console.log('first');
   return 1;
 }
@@ -10,5 +11,6 @@
 function second() {
+  console.log('second');
   return 2;
 }
`;
      }
      return '';
    });

    const result = getFilesWithDiffsForAnalysis();

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('src/multi.ts');
    expect(result[0].hunks).toHaveLength(2);
    expect(result[0].hunks[0].filename).toBe('src/multi.ts');
    expect(result[0].hunks[1].filename).toBe('src/multi.ts');
  });
});
