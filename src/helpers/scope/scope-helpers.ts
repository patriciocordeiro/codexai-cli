import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { CONFIG_FILE_PATH } from '../../constants/constants';
import { CodeAiConfig } from '../../models/config.model';
import { loadProjectConfig } from '../config/config-helpers';
import { isExcludedPath, isSupportedCodeFile } from '../file/file-helpers';

export function getFilesForScope(
  paths: string[],
  options: { changed?: boolean }
): string[] {
  console.log('Paths provided for scope:', paths);
  const projectRoot = process.cwd();
  let initialPaths: string[];
  if (options.changed) {
    const { execSync } = require('child_process');
    try {
      const output = execSync('git diff --name-only HEAD', {
        encoding: 'utf-8',
      }) as string;
      initialPaths = output.split('\n').filter(f => f.trim().length > 0);
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

function validatePathsInScope(
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

export async function determineAnalysisScope(
  paths: string[],
  options: { changed?: boolean },
  getFilesForScopeImpl: typeof getFilesForScope
): Promise<{
  scope: 'ENTIRE_PROJECT' | 'SELECTED_FILES';
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
  const scope: 'SELECTED_FILES' = 'SELECTED_FILES';
  const getFiles = getFilesForScopeImpl;

  if (options.changed || (paths && paths.length > 0)) {
    targetFilePaths = getFiles(paths, options);

    spinner.info(
      `Analyzing ${targetFilePaths.length} files in the specified scope...`
    );
  } else {
    spinner.info(
      `Defaulting to target directory from config: "${config.targetDirectory}"`
    );

    targetFilePaths = getFiles([config.targetDirectory], {});
  }

  try {
    validatePathsInScope(targetFilePaths, config.targetDirectory, projectRoot);
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
