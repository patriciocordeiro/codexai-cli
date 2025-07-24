import chalk from 'chalk';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import fse from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import * as os from 'os';
import path from 'path';
import { getProjectManifest, updateProjectFiles } from '../api/api';
import {
  createProjectArchive,
  createZipFromPaths,
} from '../file-utils/file-utils';

const FILE_RUN_LIMIT = 200; // The soft limit for number of files in a single run

/**
 * Reads the target directory from the .codeai.json configuration file.
 * If not specified, defaults to the current directory.
 * @returns {Promise<string>} The target directory path as a string.
 * @throws Will throw an error if the target directory is not specified.
 */
export async function getTargetDirectory(): Promise<string> {
  const configPath = path.join(process.cwd(), '.codeai.json');
  const config = await fse.readJson(configPath);
  const targetDirectory = config.targetDirectory || '.';
  if (!targetDirectory) {
    throw new Error(
      'No target directory specified in the project configuration.'
    );
  }
  return targetDirectory;
}

/**
 * Reads the project name from the local package.json file.
 * @returns The project name or null if not found.
 */
export async function getProjectNameFromPackageJson(): Promise<string | null> {
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (await fse.pathExists(pkgJsonPath)) {
    const pkg = await fse.readJson(pkgJsonPath);
    return pkg.name || null;
  }
  return null;
}

/**
 * Determines the project name in a specific order of priority:
 * 1. A name provided via CLI options (`options.name`).
 * 2. The 'name' field from the nearest package.json file.
 * 3. The name of the current working directory.
 *
 * @param options - The options object from the commander action, which may contain a `name` property.
 * @returns A promise that resolves with the determined project name string.
 */
export async function getProjectName(options: {
  name?: string;
}): Promise<string> {
  // Priority 1: Direct name from CLI option
  if (options.name && typeof options.name === 'string' && options.name.trim()) {
    return options.name.trim();
  }

  // Priority 2: Name from package.json
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (await fse.pathExists(pkgJsonPath)) {
    try {
      const pkg = await fse.readJson(pkgJsonPath);
      if (pkg.name) {
        return pkg.name;
      }
    } catch (error) {
      // Ignore errors reading package.json (e.g., if malformed) and fall back
      console.warn(
        chalk.yellow('Could not read "name" from package.json.'),
        error
      );
    }
  }

  // Priority 3: Fallback to the current directory's name
  return path.basename(process.cwd());
}

/**
 * Opens the given URL in the default browser for the current OS.
 * @param {string} url - The URL to open.
 * @returns {Promise<void>}
 */
export async function openBrowser(url: string): Promise<void> {
  if (url.length) {
    if (os.platform() === 'darwin') {
      // macOS
      await executeCommand(`open ${url}`);
    } else if (os.platform() === 'win32') {
      // Windows
      await executeCommand(`start ${url}`);
    } else {
      await executeCommand(`xdg-open ${url}`);
    }
  } else {
    console.warn(
      'Warning: No results URL provided. Please copy the link above.'
    );
  }
}

/**
 * Executes a shell command asynchronously.
 * @param {string} command - The command to execute.
 * @returns {Promise<void>}
 * @throws Will reject if the command fails.
 */
export async function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Error executing command: ${command}`));
        console.error(chalk.red(`stderr: ${stderr}`));
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Checks if a .codeai.json file exists in the current directory.
 * If it exists, logs an error message and exits the process.
 * @returns {Promise<void>}
 */
export async function guardAgainstExistingProject(): Promise<void> {
  const configFilePath = path.join(process.cwd(), '.codeai.json');

  if (await fse.pathExists(configFilePath)) {
    const spinner = ora(); // Use ora for consistent spinner styling
    spinner.fail('Project already initialized.');

    try {
      const config = await fse.readJson(configFilePath);
      if (config.projectId) {
        console.error(
          chalk.yellow(
            `This directory is already linked to project ID: ${config.projectId}`
          )
        );
      }
    } catch (error) {
      // Handle case where config file is malformed
      console.error(
        chalk.red('Error reading .codeai.json file.'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error(
        chalk.yellow(
          'An existing .codeai.json file was found but could not be read.'
        )
      );
    }

    console.error(
      chalk.yellow('To run a new analysis, use `codeai run <task>`.')
    );

    console.error(
      chalk.yellow('To deploy updated files, use `codeai deploy`.')
    );

    process.exit(1);
  }
}

/**
 * Interface for the .codeai.json configuration file.
 */
export interface CodeAiConfig {
  projectId: string;
  targetDirectory: string;
  maxUploadSizeMB?: number;
}

/**
 * Loads and validates the .codeai.json project configuration file.
 * Exits the process if the file is missing or invalid.
 * @returns {Promise<CodeAiConfig>} The parsed configuration object.
 */
export async function loadProjectConfig(): Promise<CodeAiConfig> {
  const configFilePath = path.join(process.cwd(), '.codeai.json');

  if (!(await fse.pathExists(configFilePath))) {
    // ... (error handling for uninitialized project)
  }

  try {
    const config = await fse.readJson(configFilePath);
    if (!config.projectId || !config.targetDirectory) {
      // Validate required fields
      throw new Error('projectId or targetDirectory not found in .codeai.json');
    }
    return config as CodeAiConfig;
  } catch (error) {
    console.error(
      chalk.red('Error reading or parsing .codeai.json file.'),
      error
    );
    process.exit(1);
  }
}

/**
 * Checks for local file changes against the remote manifest and deploys a patch if needed.
 * @param {string} apiKey - The user's authenticated API key.
 * @param {string} projectId - The ID of the project to check.
 * @returns {Promise<void>}
 */
export async function deployChangesIfNeeded(
  apiKey: string,
  projectId: string
): Promise<void> {
  const spinner = ora('Checking for local file changes...').start();
  const targetDirectory = await getTargetDirectory();

  // Fetch remote and local states concurrently
  const [remoteManifest, { fileManifest: localManifest }] = await Promise.all([
    getProjectManifest(apiKey, projectId),
    createProjectArchive(process.cwd(), targetDirectory),
  ]);

  const filesToUpdate: string[] = [];
  const manifestForUpdate: Record<string, string> = {};

  for (const [filePath, localHash] of Object.entries(localManifest)) {
    if (remoteManifest[filePath] !== localHash) {
      filesToUpdate.push(filePath);
      manifestForUpdate[filePath] = localHash;
    }
  }

  if (filesToUpdate.length > 0) {
    spinner.warn(
      chalk.yellow(
        `Found ${filesToUpdate.length} local changes. Deploying updates before analysis...`
      )
    );
    const patchZipBuffer = await createZipFromPaths(
      filesToUpdate,
      process.cwd()
    );
    await updateProjectFiles(
      apiKey,
      projectId,
      patchZipBuffer,
      manifestForUpdate
    );
    spinner.succeed('Project context updated successfully.');
  } else {
    spinner.succeed('Project is up-to-date.');
  }
}

/**
 * Returns an array of changed files in the current git repository, as relative paths.
 * @returns {string[]} Array of changed file paths.
 */
export function getChangedFiles(): string[] {
  try {
    // This command by default returns paths relative to the git repo root, which is what we want.
    const output = execSync('git diff --name-only', { encoding: 'utf-8' });
    const files = output.split('\n').filter(f => f.trim().length > 0);
    // Normalize path separators just in case (for Windows git clients)
    return files.map(f => f.replace(/\\/g, '/'));
  } catch (err) {
    console.error(
      'Failed to get changed files from git. Is this a git repository?',
      err
    );
    return [];
  }
}

/**
 * Validates that all provided file paths are within the project's target directory.
 * Throws an error if any path is outside the allowed scope.
 * @param {string[]} targetFilePaths - Array of file paths to validate.
 * @param {string} targetDirectory - The allowed target directory.
 * @param {string} projectRoot - The root directory of the project.
 * @throws Will throw an error if any file is outside the target directory.
 */
function validatePathsInScope(
  targetFilePaths: string[],
  targetDirectory: string,
  projectRoot: string
): void {
  const absoluteTargetDir = path.resolve(projectRoot, targetDirectory);

  for (const file of targetFilePaths) {
    const absoluteFile = path.resolve(projectRoot, file);
    const relative = path.relative(absoluteTargetDir, absoluteFile);

    // If the relative path starts with '..' or is an absolute path on Windows,
    // it's outside the target directory.
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        `File path "${file}" is outside the project's configured target directory ("${targetDirectory}").`
      );
    }
  }
}

/**
 * Checks if the number of files exceeds the limit and asks the user for confirmation.
 * Exits the process if the user declines.
 * @param {number} fileCount - The number of files to process.
 * @returns {Promise<void>}
 */
async function confirmFileLimit(fileCount: number): Promise<void> {
  if (fileCount > FILE_RUN_LIMIT) {
    console.log(
      chalk.yellow(
        `\n⚠️  This analysis will process ${fileCount} files, which is more than the recommended limit of ${FILE_RUN_LIMIT}.`
      )
    );
    console.log(
      chalk.yellow(
        '   This may result in a longer processing time and higher costs.'
      )
    );

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Do you want to continue?',
        default: true,
      },
    ]);

    if (!proceed) {
      console.log(chalk.red('Analysis cancelled by user.'));
      process.exit(0);
    }
  }
}

/**
 * Gathers files for analysis based on provided paths or git diff.
 * Ensures all paths are relative to the project root and deduplicated.
 * @param {string[]} paths - Paths to include.
 * @param {{ changed?: boolean }} options - Options object, e.g. { changed: true } for git diff.
 * @returns {string[]} Array of file paths to include in the analysis.
 */
export function getFilesForScope(
  paths: string[],
  options: { changed?: boolean }
): string[] {
  const projectRoot = process.cwd();

  // Determine the initial set of paths to check
  let initialPaths: string[];
  if (options.changed) {
    try {
      const output = execSync('git diff --name-only HEAD', {
        encoding: 'utf-8',
      });
      initialPaths = output.split('\n').filter(f => f.trim().length > 0);
    } catch (err) {
      console.error(
        chalk.red(
          'Failed to get changed files from git. Is this a git repository?'
        ),
        err
      );
      process.exit(1);
    }
  } else {
    initialPaths = paths;
  }

  const files = new Set<string>(); // Use a Set for automatic deduplication

  function walk(currentPath: string) {
    const absolutePath = path.resolve(projectRoot, currentPath);
    if (isExcludedPath(absolutePath)) return;
    if (!fs.existsSync(absolutePath)) return;

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath)) {
        walk(path.join(currentPath, entry)); // Recurse with relative path
      }
    } else if (isSupportedCodeFile(absolutePath)) {
      // Always add the path relative to the project root
      const relativePath = path.relative(projectRoot, absolutePath);
      files.add(relativePath.replace(/\\/g, '/')); // Normalize to forward slashes
    }
  }

  for (const p of initialPaths) {
    walk(p);
  }

  return Array.from(files);
}

/**
 * Determines the scope and list of files for an analysis run, validates them,
 * and checks against file limits.
 * @param {string[]} paths - Optional paths provided by the user.
 * @param {{ changed?: boolean }} options - CLI options, specifically `options.changed`.
 * @returns {Promise<{ scope: 'ENTIRE_PROJECT' | 'SELECTED_FILES'; targetFilePaths: string[] }>}
 */
export async function determineAnalysisScope(
  paths: string[],
  options: { changed?: boolean }
): Promise<{
  scope: 'ENTIRE_PROJECT' | 'SELECTED_FILES';
  targetFilePaths: string[];
}> {
  const spinner = ora();
  const config = await loadProjectConfig(); // Now returns the full config
  const projectRoot = process.cwd();

  let targetFilePaths: string[];
  const scope: 'SELECTED_FILES' = 'SELECTED_FILES'; // The scope will always be targeted now

  if (options.changed || (paths && paths.length > 0)) {
    // User provided an explicit scope (git diff or paths)
    targetFilePaths = getFilesForScope(paths, options);
  } else {
    // Default case: use the targetDirectory from the config file
    spinner.info(
      `Defaulting to target directory from config: "${config.targetDirectory}"`
    );
    targetFilePaths = getFilesForScope([config.targetDirectory], {});
  }

  // Validate that all determined files are within the project's configured scope
  validatePathsInScope(targetFilePaths, config.targetDirectory, projectRoot);

  if (targetFilePaths.length === 0) {
    spinner.succeed(
      chalk.yellow('No matching files found to analyze in the specified scope.')
    );
    return { scope, targetFilePaths };
  }
  spinner.succeed(`Found ${targetFilePaths.length} files to analyze.`);

  await confirmFileLimit(targetFilePaths.length); // The confirmation prompt

  return { scope, targetFilePaths };
}

// In src/helpers.ts

/**
 * Calculates the total size of files and enforces the project's upload limit.
 * If the limit is exceeded, the process is terminated.
 *
 * @param filesToProcess - An array of file paths relative to the project root.
 * @param config - The loaded .codeai.json configuration object.
 */
export async function checkUploadSize(
  filesToProcess: string[],
  config: Partial<CodeAiConfig>
): Promise<void> {
  const spinner = ora('Calculating total upload size...').start();
  const limitMB = config.maxUploadSizeMB || 10; // Default for 'create'

  try {
    let totalSizeBytes = 0;
    const projectRoot = process.cwd();

    for (const relativePath of filesToProcess) {
      const absolutePath = path.join(projectRoot, relativePath);
      if (await fse.pathExists(absolutePath)) {
        const stats = await fse.stat(absolutePath);
        totalSizeBytes += stats.size;
      }
    }

    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    if (totalSizeMB > limitMB) {
      spinner.fail('Upload size limit exceeded.');
      console.error(
        chalk.red(
          `❌ Total size of files to upload (${totalSizeMB.toFixed(2)}MB) exceeds the project limit of ${limitMB}MB.`
        )
      );
      console.error(
        chalk.yellow(
          `   You can increase this limit by editing the 'maxUploadSizeMB' value in your .codeai.json file.`
        )
      );
      console.error(
        chalk.dim(
          `   Note: A hard limit of 50MB is enforced on the server to prevent abuse.`
        )
      ); // Good to be transparent
      process.exit(1);
    }

    spinner.succeed(`Upload size check passed (${totalSizeMB.toFixed(2)}MB).`);
  } catch (error) {
    spinner.fail('Failed to calculate upload size.');
    console.error(error);
    process.exit(1);
  }
}
/**
 * Returns true if the file is a supported code file.
 * @param {string} filePath - The file path to check.
 * @returns {boolean} True if supported, false otherwise.
 */
export function isSupportedCodeFile(filePath: string): boolean {
  return /\.(js|jsx|ts|tsx|json|md|txt|cjs|mjs|css|scss|html|yml|yaml|xml|csv|py|java|go|rb|php|sh|bat|dockerfile|env|tsconfig|eslintrc|prettierrc|gitignore|lock|toml|ini|pl|swift|rs|cpp|h|hpp|c|cs|vb|fs|kt|dart|scala|sql|r|jl|ipynb|sln|props|targets|gradle|makefile|mk|cmake|asm|vue|svelte|astro|tsx|jsx)$/.test(
    filePath
  );
}

/**
 * Returns true if the path should be excluded (e.g., node_modules, .git, dist, etc.)
 * @param {string} filePath - The file path to check.
 * @returns {boolean} True if excluded, false otherwise.
 */
export function isExcludedPath(filePath: string): boolean {
  return /(^|\/)(node_modules|\.git|dist|build|coverage|out|.next|.cache|tmp|temp|\.vscode|\.idea|\.husky|\.DS_Store|\.env.*|\.yarn|\.pnpm|\.parcel-cache|\.turbo|\.vercel|\.firebase|\.sentry|\.nyc_output|\.storybook|README\.md|package\.json|package-lock\.json|tsconfig\.json|tsconfig\..*|commitlint\.config\.json|\.[^/]+)(\/|$)/i.test(
    filePath
  );
}
