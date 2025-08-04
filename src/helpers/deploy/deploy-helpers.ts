import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { getProjectManifest, updateProjectFiles } from '../../api/api';
import { checkAuthentication, loadApiKey } from '../../auth/auth';
import { CONFIG_FILE_NAME } from '../../constants/constants';
import {
  createProjectArchive,
  createZipFromPaths,
} from '../../file-utils/file-utils';
import { DeploymentContext, FileDiff } from '../../models/cli.model';
import {
  CalculateFileDiffParams,
  GetRemoteManifestParams,
  UploadPatchParams,
} from '../../models/deploy-helpers.model';
import {
  getTargetDirectory,
  loadProjectConfig,
} from '../config/config-helpers';

/**
 * Checks for local file changes and deploys updates to the remote project if needed.
 * @param {string} apiKey - The API key for authentication.
 * @param {string} projectId - The project ID to update.
 * @returns {Promise<void>} Resolves when deployment is complete or project is up-to-date.
 */
export async function deployChangesIfNeeded(
  apiKey: string,
  projectId: string
): Promise<void> {
  const spinner = ora('Checking for local file changes...').start();
  const targetDirectory = await getTargetDirectory();
  const [remoteManifest, { fileManifest: localManifest }] = await Promise.all([
    getProjectManifest({ apiKey, projectId }),
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
    await updateProjectFiles({
      apiKey,
      projectId,
      patchZipBuffer,
      updatedManifest: manifestForUpdate,
    });
    spinner.succeed('Project context updated successfully.');
  } else {
    spinner.succeed('Project is up-to-date.');
  }
}

/**
 * Sets up the deployment context by loading project config and authenticating.
 * @returns {Promise<DeploymentContext>} The deployment context including projectId, apiKey, and targetDirectory.
 */
export async function setupDeploymentContext(): Promise<DeploymentContext> {
  const configFilePath = path.join(process.cwd(), CONFIG_FILE_NAME);
  const { projectId } = await loadProjectConfig(configFilePath);
  const apiKey = await checkAuthentication(loadApiKey);
  const targetDirectory = await getTargetDirectory();

  return { projectId, apiKey, targetDirectory };
}

/**
 * Fetches the remote manifest (file hashes) for the given project.
 * @param {GetRemoteManifestParams} params - The API key and project ID.
 * @returns {Promise<Record<string, string>>} The remote manifest mapping file paths to hashes.
 */
export async function getRemoteManifest({
  apiKey,
  projectId,
}: GetRemoteManifestParams): Promise<Record<string, string>> {
  const spinner = ora('Fetching remote project state...').start();
  const remoteManifest = await getProjectManifest({ apiKey, projectId });
  spinner.succeed('Remote state fetched.');
  return remoteManifest;
}

/**
 * Scans local files in the target directory and calculates their hashes.
 * @param {string} targetDirectory - The directory to scan.
 * @returns {Promise<Record<string, string>>} The local manifest mapping file paths to hashes.
 */
export async function getLocalManifest(
  targetDirectory: string
): Promise<Record<string, string>> {
  const spinner = ora('Scanning local files and calculating hashes...').start();

  const { fileManifest: localManifest } = await createProjectArchive(
    process.cwd(),
    targetDirectory
  );

  spinner.succeed(`Found ${Object.keys(localManifest).length} local files.`);
  return localManifest;
}

/**
 * Calculates the difference between local and remote manifests, returning files to update and the update manifest.
 * @param {CalculateFileDiffParams} params - The local and remote manifests.
 * @returns {FileDiff} The diff result including files to update and manifest for update.
 */
export function calculateFileDiff({
  localManifest,
  remoteManifest,
}: CalculateFileDiffParams): FileDiff {
  const spinner = ora('Comparing local and remote files...').start();

  const filesToUpdate: string[] = [];
  const manifestForUpdate: Record<string, string> = {};

  for (const [filePath, localHash] of Object.entries(localManifest)) {
    // A file needs updating if it's new OR if its hash has changed
    if (remoteManifest[filePath] !== localHash) {
      filesToUpdate.push(filePath);
      manifestForUpdate[filePath] = localHash;
    }
  }

  if (filesToUpdate.length === 0) {
    spinner.succeed(
      'No file changes detected. Your project is already up to date!'
    );
  } else {
    spinner.succeed(
      `Found ${filesToUpdate.length} new or modified files to deploy.`
    );
  }

  return { filesToUpdate, manifestForUpdate };
}

/**
 * Creates a zip buffer containing the files to update for deployment.
 * @param {string[]} filesToUpdate - The list of files to include in the patch.
 * @returns {Promise<Buffer>} The zip buffer containing the patch files.
 */
export async function createDeploymentPatch(
  filesToUpdate: string[]
): Promise<Buffer> {
  const spinner = ora('Compressing changed files...').start();

  const patchZipBuffer = await createZipFromPaths(filesToUpdate, process.cwd());

  spinner.succeed(
    `Compressed patch file (${(patchZipBuffer.length / 1024).toFixed(2)} KB).`
  );

  return patchZipBuffer;
}

/**
 * Uploads the patch zip buffer and manifest to the server for deployment.
 * @param {UploadPatchParams} params - The upload parameters including API key, project ID, patch buffer, and manifest.
 * @returns {Promise<void>} Resolves when the upload is complete.
 */
export async function uploadPatch({
  apiKey,
  projectId,
  patchZipBuffer,
  manifestForUpdate,
}: UploadPatchParams): Promise<void> {
  const spinner = ora('Uploading patch to the server...').start();

  await updateProjectFiles({
    apiKey,
    projectId,
    patchZipBuffer,
    updatedManifest: manifestForUpdate,
  });

  spinner.succeed(chalk.green('✅ Project successfully deployed!'));
}

/**
 * Displays a message indicating successful deployment and next steps.
 * @returns {void}
 */
export function displayDeploymentSuccess(): void {
  console.info('\nYou can now run an analysis on the updated project:');
  console.info(chalk.cyan('  codeai run REVIEW'));
}

/**
 * Handles errors that occur during deployment, displaying appropriate messages and exiting.
 * @param {unknown} error - The error object.
 * @param {ReturnType<typeof ora>} spinner - The ora spinner instance.
 * @returns {void}
 */
export function handleDeploymentError(
  error: unknown,
  spinner: ReturnType<typeof ora>
): void {
  console.error(chalk.red('Error during deployment:'), error);
  spinner.fail('An error occurred during deployment.');
  process.exit(1);
}
