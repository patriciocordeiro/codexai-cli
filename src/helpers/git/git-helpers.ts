// @ts-ignore
import { execSync } from 'child_process';
import * as fse from 'fs-extra';
import * as path from 'path';

/**
 * Checks if the current directory (or specified directory) is a git repository.
 * @param {string} [dir] - The directory to check. Defaults to current working directory.
 * @returns {boolean} True if the directory is a git repository, false otherwise.
 */
export function isGitRepository(dir?: string): boolean {
  const checkDir = dir || process.cwd();

  try {
    // Method 1: Check for .git directory
    const gitDir = path.join(checkDir, '.git');
    if (fse.existsSync(gitDir)) {
      return true;
    }

    // Method 2: Try git command to verify it's a git repo
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: checkDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that the current directory is a git repository and throws an error if not.
 * @param {string} [dir] - The directory to check. Defaults to current working directory.
 * @throws {Error} If the directory is not a git repository.
 */
export function validateGitRepository(dir?: string): void {
  if (!isGitRepository(dir)) {
    const checkDir = dir || process.cwd();
    throw new Error(
      `The directory "${checkDir}" is not a git repository. Please initialize git first with: git init`
    );
  }
}

/**
 * Gets the list of files changed in the current git working directory.
 * This includes staged files, unstaged files, untracked files, and files changed in the current branch.
 * @returns {string[]} Array of changed file paths.
 */
export function getChangedFiles(): string[] {
  try {
    const allFiles = new Set<string>();

    // 1. Get staged files (files added to index)
    try {
      const stagedOutput = execSync('git diff --cached --name-only', {
        encoding: 'utf-8',
      });
      const stagedFiles = stagedOutput
        .split('\n')
        .filter((f: string) => f.trim().length > 0);
      stagedFiles.forEach(file =>
        allFiles.add(file.trim().replace(/\\/g, '/'))
      );
    } catch {
      // Ignore if no staged files
    }

    // 2. Get unstaged files (files modified but not staged)
    try {
      const unstagedOutput = execSync('git diff --name-only', {
        encoding: 'utf-8',
      });
      const unstagedFiles = unstagedOutput
        .split('\n')
        .filter((f: string) => f.trim().length > 0);
      unstagedFiles.forEach(file =>
        allFiles.add(file.trim().replace(/\\/g, '/'))
      );
    } catch {
      // Ignore if no unstaged files
    }

    // 3. Get untracked files (new files not yet added to git)
    try {
      const untrackedOutput = execSync(
        'git ls-files --others --exclude-standard',
        { encoding: 'utf-8' }
      );
      const untrackedFiles = untrackedOutput
        .split('\n')
        .filter((f: string) => f.trim().length > 0);
      untrackedFiles.forEach(file =>
        allFiles.add(file.trim().replace(/\\/g, '/'))
      );
    } catch {
      // Ignore if no untracked files
    }

    // 4. If we have very few or no files from above, try to get files changed in current branch
    if (allFiles.size === 0) {
      try {
        // Try to find the default branch (main, master, develop)
        const branches = ['main', 'master', 'develop'];
        let baseBranch = '';
        let branchFound = false;

        for (const branch of branches) {
          try {
            execSync(`git rev-parse --verify origin/${branch}`, {
              stdio: 'ignore',
            });
            baseBranch = `origin/${branch}`;
            branchFound = true;
            break;
          } catch {
            try {
              execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore' });
              baseBranch = branch;
              branchFound = true;
              break;
            } catch {
              // Continue to next branch
            }
          }
        }

        if (branchFound && baseBranch) {
          const branchOutput = execSync(
            `git diff ${baseBranch}...HEAD --name-only`,
            { encoding: 'utf-8' }
          );
          const branchFiles = branchOutput
            .split('\n')
            .filter((f: string) => f.trim().length > 0);
          branchFiles.forEach(file =>
            allFiles.add(file.trim().replace(/\\/g, '/'))
          );
        }
      } catch {
        // Branch diff failed, will try fallback below
      }

      // If still no files after branch detection, try fallback to last commit
      if (allFiles.size === 0) {
        try {
          const lastCommitOutput = execSync('git diff HEAD~1 --name-only', {
            encoding: 'utf-8',
          });
          const lastCommitFiles = lastCommitOutput
            .split('\n')
            .filter((f: string) => f.trim().length > 0);
          lastCommitFiles.forEach(file =>
            allFiles.add(file.trim().replace(/\\/g, '/'))
          );
        } catch {
          // Ignore if this also fails
        }
      }
    }

    return Array.from(allFiles);
  } catch (err) {
    console.error(
      'Failed to get changed files from git. Is this a git repository?',
      err
    );
    return [];
  }
}
