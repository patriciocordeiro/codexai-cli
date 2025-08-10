import { AxiosError } from 'axios';
import chalk from 'chalk';
import fse from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { createProjectWithFiles } from '../../api/api';
import { checkAuthentication, loadApiKey } from '../../auth/auth';
import {
  CONFIG_FILE_NAME,
  CONFIG_FILE_PATH,
  DEFAULT_UPLOAD_LIMIT_MB,
  IS_PRODUCTION,
} from '../../constants/constants';
import { createProjectArchive } from '../../file-utils/file-utils';
import {
  CreateProjectParams,
  ProjectArchiveResult,
  ProjectCreationResult,
  ProjectSetupResult,
} from '../../models/cli.model';
import {
  CreateRemoteProjectParams,
  GetProjectNameParams,
  HandleProjectCreationErrorParams,
  SaveProjectConfigurationParams,
} from '../../models/project-helpers.model';
import { openBrowser } from '../cli/cli-helpers';
import { guardAgainstExistingProject } from '../config/config-helpers';

/**
 * Attempts to read the project name from package.json in the current working directory.
 * @returns {Promise<string|null>} The project name if found, otherwise null.
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
 * Determines the project name from CLI options or package.json, or falls back to the current directory name.
 * @param {object} options - Options object.
 * @param {string} [options.name] - Optional project name provided by the user.
 * @returns {Promise<string>} The resolved project name.
 */
export async function getProjectName(
  options: GetProjectNameParams
): Promise<string> {
  if (options.name && typeof options.name === 'string' && options.name.trim()) {
    return options.name.trim();
  }
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (await fse.pathExists(pkgJsonPath)) {
    try {
      const pkg = await fse.readJson(pkgJsonPath);
      if (pkg.name) {
        return pkg.name;
      }
    } catch (error) {
      console.warn(
        chalk.yellow('Could not read "name" from package.json.'),
        error
      );
    }
  }
  return path.basename(process.cwd());
}

/**
 * Validates that the specified target directory exists.
 * @param {string} targetDirectory - The directory to validate.
 * @throws {Error} If the directory does not exist.
 */
export async function validateTargetDirectory(
  targetDirectory: string
): Promise<void> {
  if (!(await fse.pathExists(targetDirectory))) {
    throw new Error(
      `The specified target directory "${targetDirectory}" does not exist.`
    );
  }
}

/**
 * Prompts the user to enter the target directory for the project analysis.
 * @returns {Promise<string>} The directory entered by the user, or '.' if blank.
 */
export async function promptForTargetDirectory(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetDir',
      message:
        'Enter the target directory for the project analysis or leave blank for the current directory: ',
      default: '.',
    },
  ]);
  return answers.targetDir.trim() === '' ? '.' : answers.targetDir.trim();
}

/**
 * Sets up project parameters including name, target directory, and API key.
 * @param {CreateProjectParams} params - Parameters for project creation.
 * @returns {Promise<ProjectSetupResult>} The setup result including projectName, targetDirectory, and apiKey.
 */
export async function setupProjectParameters(
  params: CreateProjectParams
): Promise<ProjectSetupResult> {
  const spinner = ora();
  // 1. Guard: Check if a project is already initialized here.
  spinner.start('Initializing new CodeAI project...');
  spinner.succeed('Starting project initialization...');
  spinner.succeed('Checking for existing project configuration...');
  await guardAgainstExistingProject(CONFIG_FILE_PATH);
  spinner.succeed('No existing project found. Proceeding with initialization.');

  // 2. Authenticate
  const apiKey = await checkAuthentication(loadApiKey);

  // 3. Determine Project Name
  spinner.start('Determining project name...');
  const projectName = await getProjectName(params.options);
  spinner.succeed(`Project name set to: ${chalk.bold(projectName)}`);

  // 4. Determine Target Directory
  let targetDirectory = params.targetDirectoryArg;
  if (!targetDirectory) {
    targetDirectory = await promptForTargetDirectory();
  }

  await validateTargetDirectory(targetDirectory);
  spinner.succeed(
    `Project target directory set to: ${chalk.bold(targetDirectory)}`
  );

  return { projectName, targetDirectory, apiKey };
}

/**
 * Prepares a zip archive of the project files for upload.
 * @param {string} targetDirectory - The directory to archive.
 * @returns {Promise<ProjectArchiveResult>} The archive result including zipBuffer, fileManifest, and includedFiles.
 * @throws {Error} If no files are found to upload.
 */
export async function prepareProjectArchive(
  targetDirectory: string
): Promise<ProjectArchiveResult> {
  const spinner = ora('Scanning and preparing project files...');

  const { zipBuffer, fileManifest, includedFiles } = await createProjectArchive(
    process.cwd(),
    targetDirectory
  );

  // Validate that we have files to upload
  if (includedFiles.length === 0) {
    spinner.fail('No files found to upload.');
    throw new Error(
      'No files were found in the target directory after applying ignore rules.'
    );
  }

  spinner.succeed(
    `Prepared ${includedFiles.length} files for upload (${(zipBuffer.length / 1024).toFixed(2)} KB).`
  );

  return { zipBuffer, fileManifest, includedFiles };
}

/**
 * Creates a new project on the remote server using the provided files.
 * @param {string} apiKey - The API key for authentication.
 * @param {string} projectName - The name of the project.
 * @param {Buffer} zipBuffer - The zipped project files.
 * @param {Record<string, string>} fileManifest - Manifest of files included in the archive.
 * @returns {Promise<ProjectCreationResult>} The result including projectId and projectUrl.
 */
export async function createRemoteProject({
  apiKey,
  projectName,
  zipBuffer,
  fileManifest,
}: CreateRemoteProjectParams): Promise<ProjectCreationResult> {
  const spinner = ora('Creating project on the server...');

  const { projectId, projectUrl } = await createProjectWithFiles({
    apiKey,
    projectName,
    zipBuffer,
    fileManifest,
  });

  spinner.succeed(`Project created with ID: ${chalk.bold(projectId)}`);
  return { projectId, projectUrl };
}

/**
 * Saves the project configuration to a local file.
 * @param {string} projectId - The ID of the created project.
 * @param {string} targetDirectory - The target directory for analysis.
 * @returns {Promise<void>}
 */
export async function saveProjectConfiguration({
  projectId,
  targetDirectory,
}: SaveProjectConfigurationParams): Promise<void> {
  const spinner = ora('Saving project configuration...').start();
  const configFilePath = path.join(process.cwd(), CONFIG_FILE_NAME);
  await fse.writeJson(
    configFilePath,
    {
      projectId,
      targetDirectory,
      maxUploadSizeMB: DEFAULT_UPLOAD_LIMIT_MB,
    },
    { spaces: 2 }
  );
  spinner.succeed(
    `Project configuration saved to ${chalk.green(CONFIG_FILE_NAME)}`
  );
}

/**
 * Displays a success message after project creation, including the project URL.
 * @param {string} projectUrl - The URL of the created project.
 * @param {boolean} isOpenBrowser - Whether to automatically open the browser.
 */
export function displayProjectCreationSuccessMessage(
  projectUrl: string,
  isOpenBrowser?: boolean
): void {
  console.info(chalk.bold.green('\nProject created and linked successfully!'));
  console.info('To run your first analysis, use the command:');
  console.info(chalk.cyan('  codeai run options'));

  if (!IS_PRODUCTION) {
    console.info(
      `You can also view your project at: ${chalk.blue.underline(projectUrl)}`
    );
    if (isOpenBrowser) {
      openBrowser(projectUrl).catch(() => {
        console.log('Deu erro');

        console.warn(
          chalk.yellow(
            `Could not automatically open browser. Please visit: ${projectUrl}`
          )
        );
      });
    }
  } else {
    console.info(chalk.bold.green(`Visit your project at: ${projectUrl}`));
  }
}

/**
 * Handles errors that occur during project creation, displaying appropriate messages and exiting the process.
 * @param {unknown} error - The error object.
 * @param {ReturnType<typeof ora>} spinner - The ora spinner instance.
 */
export function handleProjectCreationError({
  error,
  spinner,
}: HandleProjectCreationErrorParams): void {
  const axiosError = error as AxiosError;

  if (!spinner.isSpinning) {
    console.error(
      chalk.red.bold('\n❌ An error occurred during project creation.')
    );
  } else {
    spinner.fail('An error occurred during project creation.');
  }

  if (axiosError.isAxiosError) {
    console.error(
      chalk.red(`API Error: ${axiosError.response?.data || axiosError.message}`)
    );
  } else {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
  }

  process.exit(1);
}
