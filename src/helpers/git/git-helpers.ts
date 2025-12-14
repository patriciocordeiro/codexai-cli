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

export type DiffLine = {
  lineNumber: number | null; // null para linhas removidas
  type: '+' | '-' | ' ';
  text: string;
};

export type Hunk = {
  filename: string;
  hunkLines: DiffLine[];
};

/**
 * Represents a file along with its git diff information
 */
export interface FileWithDiff {
  filePath: string;
  hunks: Hunk[];
}

// Function to parse git diff output into structured hunks
/**
 *
 * @param diff
 */
export function parseDiff(diff: string): Hunk[] {
  const hunks: Hunk[] = [];

  // Split into file diffs by the unified git diff file separator
  const diffFiles = diff.split(/^diff --git /gm).slice(1);

  for (const fileDiff of diffFiles) {
    const fileHeader = fileDiff.match(/^a\/(.+?) b\/(.+?)\n/);
    if (!fileHeader) continue;
    const filename = fileHeader[2];

    // Match all hunk headers using matchAll for safer iteration
    const hunkHeaderRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/g;
    const headers = Array.from(fileDiff.matchAll(hunkHeaderRegex));

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const newStart = Number.parseInt(header[1], 10);
      const hunkStart = header.index + header[0].length;
      const nextHeader = headers[i + 1];
      const hunkEnd = nextHeader ? nextHeader.index : fileDiff.length;
      const hunkText = fileDiff
        .slice(hunkStart, hunkEnd)
        .replace(/\r/g, '')
        .replace(/^\n/, '')
        .replace(/\n$/, '');

      let currentNewLine = newStart;
      const hunkLines: DiffLine[] = [];

      if (hunkText.length === 0) {
        // Empty hunk
        hunks.push({ filename, hunkLines });
        continue;
      }

      const lines = hunkText.split('\n');
      for (const line of lines) {
        if (line.length === 0) continue;
        const firstChar = line[0];
        const content = line.slice(1);
        if (firstChar === '+') {
          hunkLines.push({
            lineNumber: currentNewLine,
            type: '+',
            text: content,
          });
          currentNewLine++;
        } else if (firstChar === '-') {
          hunkLines.push({ lineNumber: null, type: '-', text: content });
        } else if (firstChar === ' ') {
          hunkLines.push({
            lineNumber: currentNewLine,
            type: ' ',
            text: content,
          });
          currentNewLine++;
        } else {
          // Ignore metadata lines or context without leading markers
        }
      }

      hunks.push({ filename, hunkLines });
    }
  }

  return hunks;
}

/**
 * Function to get and parse git diff of last commit
 * Gets and parses the git diff of the last commit.
 * @returns {Promise<Hunk[] | undefined>} A promise that resolves to an array of hunks representing the diff, or undefined if no changes detected.
 */
export async function getAndParseGitDiffOfLastCommit(): Promise<
  Hunk[] | undefined
> {
  // 1️⃣ pegar diff
  const diff = execSync('git diff --unified=3 HEAD~1 HEAD').toString();
  if (!diff.trim()) {
    console.log('Nenhuma alteração detectada.');
    return;
  }

  // save to a json file for inspection

  fse.writeFileSync('diff.json', JSON.stringify(parseDiff(diff), null, 2));

  // 2️⃣ processar diff
  const hunks = parseDiff(diff);
  return hunks;
}

/**
 * Gets changed files along with their diff information for analysis.
 * Combines file paths with parsed diff hunks for each file.
 * @returns {FileWithDiff[]} Array of files with their respective diff information
 */
export function getFilesWithDiffsForAnalysis(): FileWithDiff[] {
  try {
    // 1. Get list of changed files
    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {
      return [];
    }

    // 2. Get full diff for all changes
    let diffOutput = '';
    try {
      // Get staged changes
      const stagedDiff = execSync('git diff --cached --unified=3', {
        encoding: 'utf-8',
      });
      diffOutput += stagedDiff;

      // Get unstaged changes
      const unstagedDiff = execSync('git diff --unified=3', {
        encoding: 'utf-8',
      });
      diffOutput += unstagedDiff;
    } catch (err) {
      console.error('Failed to get git diff:', err);
      return changedFiles.map(filePath => ({
        filePath,
        hunks: [],
      }));
    }

    if (!diffOutput.trim()) {
      // No diff available (e.g., only untracked files)
      return changedFiles.map(filePath => ({
        filePath,
        hunks: [],
      }));
    }

    // 3. Parse the diff into hunks
    const allHunks = parseDiff(diffOutput);

    // 4. Group hunks by filename
    const hunksByFile = new Map<string, Hunk[]>();
    for (const hunk of allHunks) {
      const existing = hunksByFile.get(hunk.filename) || [];
      existing.push(hunk);
      hunksByFile.set(hunk.filename, existing);
    }

    // 5. Create FileWithDiff objects for each changed file
    const filesWithDiffs: FileWithDiff[] = changedFiles.map(filePath => {
      const hunks = hunksByFile.get(filePath) || [];
      return {
        filePath,
        hunks,
      };
    });

    return filesWithDiffs;
  } catch (err) {
    console.error('Failed to get files with diffs:', err);
    return [];
  }
}
