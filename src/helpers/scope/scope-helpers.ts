import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { CONFIG_FILE_PATH } from '../../constants/constants';
import { AnalysisScope, CodeAiConfig } from '../../models/cli.model';
import { loadProjectConfig } from '../config/config-helpers';
import { isExcludedPath, isSupportedCodeFile } from '../file/file-helpers';
import { getChangedFiles } from '../git/git-helpers';

/**
 * Returns a list of supported code files within the provided paths.
 * If options.changed is true, only files changed in the current Git working directory are considered.
 *
 * @param {Array<string>} paths - Array of file or directory paths to include in the scope.
 * @param {object} options - Options for file selection. If changed is true, only changed files are included.
 * @param {boolean} [options.changed] - If true, only changed files are included.
 * @returns {Array<string>} Array of relative file paths matching supported code file criteria.
 * @throws {Error} If git command fails or repository is not found when changed is true.
 */
export function getFilesForScope(
  paths: string[],
  options: { changed?: boolean }
): string[] {
  const projectRoot = process.cwd();
  let initialPaths: string[];
  if (options.changed) {
    try {
      initialPaths = getChangedFiles();
    } catch (err) {
      console.error(
        'Failed to get changed files from git. Is this a git repository?',
        err
      );
      throw new Error('Failed to get changed files from git.');
    }
  } else {
    initialPaths = paths;
  }

  const files = new Set<string>();
  /**
   *
   * @param currentPath
   */
  function walk(currentPath: string) {
    const absolutePath = path.resolve(projectRoot, currentPath);

    if (isExcludedPath(absolutePath)) return;
    if (!fs.existsSync(absolutePath)) return;
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath)) {
        walk(path.join(currentPath, entry));
      }
    } else if (isSupportedCodeFile(absolutePath)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      files.add(relativePath.replace(/\\/g, '/'));
    }
  }
  for (const p of initialPaths) {
    walk(p);
  }
  return Array.from(files);
}

/**
 * Validates that all file paths are within the project's configured target directory.
 * Throws an error if any file is outside the target directory.
 *
 * @param {Array<string>} targetFilePaths - Array of file paths to validate.
 * @param {string} targetDirectory - The project's configured target directory.
 * @param {string} projectRoot - The root directory of the project.
 * @throws {Error} If any file is outside the target directory.
 */
export function validatePathsInScope(
  targetFilePaths: string[],
  targetDirectory: string,
  projectRoot: string
): void {
  const absoluteTargetDir = path.resolve(projectRoot, targetDirectory);
  if (targetFilePaths.length === 0) return;
  for (const file of targetFilePaths) {
    const absoluteFile = path.resolve(projectRoot, file);
    const relative = path.relative(absoluteTargetDir, absoluteFile);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        `File path "${file}" is outside the project's configured target directory ("${targetDirectory}").`
      );
    }
  }
}

/**
 * Determines the analysis scope and returns the list of files to analyze.
 * Uses GIT_DIFF as the default scope, analyzing files changed in git diff if no scope is provided.
 *
 * @param {Array<string>} paths - Array of file or directory paths to include in the scope.
 * @param {string} [scope] - The analysis scope (GIT_DIFF, SELECTED_FILES, ENTIRE_PROJECT).
 * @param {Function} getFilesForScopeImpl - Implementation for retrieving files for scope.
 * @param {Function} validatePathsInScopeImpl - Implementation for validating file paths in scope.
 * @returns {object} Object containing the scope and the list of target file paths to analyze. Properties:
 *   - scope {string} The analysis scope used.
 *   - targetFilePaths {Array<string>} The list of file paths to analyze.
 * @throws {Error} If project configuration fails to load or file validation fails.
 */

/**
 *
 * @param root0
 * @param root0.paths
 * @param root0.scope
 * @param root0.getFilesForScopeImpl
 * @param root0.validatePathsInScopeImpl
 * @returns {Promise<{ scope: AnalysisScope; targetFilePaths: string[] }>} An object containing the analysis scope and the list of target file paths to analyze.
 */
export async function determineAnalysisScope({
  paths,
  scope = AnalysisScope.GIT_DIFF,
  getFilesForScopeImpl,
  validatePathsInScopeImpl,
}: {
  paths: string[];
  scope?: AnalysisScope;
  getFilesForScopeImpl: typeof getFilesForScope;
  validatePathsInScopeImpl: typeof validatePathsInScope;
}): Promise<{
  scope: AnalysisScope;
  targetFilePaths: string[];
}> {
  const spinner = ora();
  let config: CodeAiConfig;
  try {
    spinner.start('Determining analysis scope...');
    config = await loadProjectConfig(CONFIG_FILE_PATH);
  } catch (err) {
    console.error('Failed to load project configuration:', err);
    throw err;
  }

  const projectRoot = process.cwd();
  let targetFilePaths: string[];
  const getFiles = getFilesForScopeImpl;

  if (!scope || scope === AnalysisScope.GIT_DIFF) {
    targetFilePaths = getFiles([], { changed: true });

    spinner.info(
      `Analyzing ${targetFilePaths.length} files changed in git diff...`
    );
  } else if (
    scope === AnalysisScope.SELECTED_FILES &&
    paths &&
    paths.length > 0
  ) {
    targetFilePaths = getFiles(paths, { changed: false });
    spinner.info(
      `Analyzing ${targetFilePaths.length} files in the specified scope...`
    );
  } else if (scope === AnalysisScope.ENTIRE_PROJECT) {
    spinner.info(
      `Defaulting to target directory from config: "${config.targetDirectory}"`
    );
    targetFilePaths = getFiles([config.targetDirectory], { changed: false });
  } else {
    // fallback: treat as GIT_DIFF
    targetFilePaths = getFiles([], { changed: true });
    spinner.info(
      `Analyzing ${targetFilePaths.length} files changed in git diff...`
    );
  }

  try {
    validatePathsInScopeImpl(
      targetFilePaths,
      config.targetDirectory,
      projectRoot
    );
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : String(err));
    throw err;
  }
  if (targetFilePaths.length === 0) {
    spinner.succeed(
      'No matching files found to analyze in the specified scope.'
    );
    return { scope, targetFilePaths };
  }
  spinner.succeed(`Found ${targetFilePaths.length} files to analyze.`);
  return { scope, targetFilePaths };
}
