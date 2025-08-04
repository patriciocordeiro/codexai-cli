import chalk from 'chalk';
import ora from 'ora';
import {
  deployOutOfSyncFiles,
  displayNoFilesToAnalyze,
  getAnalysisScope,
  handleAnalysisError,
  setupAnalysisContext,
  triggerAnalysisAndDisplayResults,
} from '../helpers/analysis/analysis-helpers';
import {
  calculateFileDiff,
  createDeploymentPatch,
  displayDeploymentSuccess,
  getLocalManifest,
  getRemoteManifest,
  handleDeploymentError,
  setupDeploymentContext,
  uploadPatch,
} from '../helpers/deploy/deploy-helpers';
import {
  createRemoteProject,
  displayProjectCreationSuccessMessage,
  handleProjectCreationError,
  prepareProjectArchive,
  saveProjectConfiguration,
  setupProjectParameters,
} from '../helpers/project/project-helpers';
import { AnalysisScope } from '../models/cli.model';
import {
  ProgramCreateProjectParams,
  RunAnalysisParams,
} from '../models/command-helpers.model';

/**
 * Creates a new project, prepares files, uploads to remote, and saves local config.
 *
 * @param {ProgramCreateProjectParams} params - The parameters object.
 * @param {string} params.targetDirectoryArg - The target directory argument for the new project.
 * @param {{ name?: string }} params.options - Options for project creation, including optional name.
 * @returns {Promise<void>} Resolves when the project is created and configured.
 */
export async function programCreateProject({
  targetDirectoryArg,
  options,
}: ProgramCreateProjectParams): Promise<void> {
  const spinner = ora();
  try {
    // Setup and validation phase
    const { projectName, targetDirectory, apiKey } =
      await setupProjectParameters({
        targetDirectoryArg,
        options,
      });

    // File preparation phase
    const { zipBuffer, fileManifest } =
      await prepareProjectArchive(targetDirectory);

    // Remote project creation phase
    const { projectId, projectUrl } = await createRemoteProject({
      apiKey,
      projectName,
      zipBuffer,
      fileManifest,
    });

    // Local configuration phase
    await saveProjectConfiguration({ projectId, targetDirectory });

    // Success feedback
    displayProjectCreationSuccessMessage(projectUrl);
  } catch (error) {
    handleProjectCreationError({ error, spinner });
  }
}

/**
 * Deploys local file changes to the remote project.
 *
 * @returns {Promise<void>} Resolves when deployment is complete.
 */
export async function programDeploy(): Promise<void> {
  const spinner = ora();

  try {
    console.info('🚀 Deploying file changes to CodeAI...');

    // Setup deployment context
    const { projectId, apiKey, targetDirectory } =
      await setupDeploymentContext();
    spinner.succeed(`Deploying to project: ${chalk.bold(projectId)}`);

    // Get remote and local manifests
    const remoteManifest = await getRemoteManifest({ apiKey, projectId });
    const localManifest = await getLocalManifest(targetDirectory);

    // Calculate differences
    const { filesToUpdate, manifestForUpdate } = calculateFileDiff({
      localManifest,
      remoteManifest,
    });

    // Early exit if no changes
    if (filesToUpdate.length === 0) {
      return;
    }

    // Create and upload patch
    const patchZipBuffer = await createDeploymentPatch(filesToUpdate);
    await uploadPatch({ apiKey, projectId, patchZipBuffer, manifestForUpdate });

    // Success feedback
    displayDeploymentSuccess();
  } catch (error) {
    handleDeploymentError(error, spinner);
  }
}

/**
 * Runs the analysis task for the project.
 *
 * @param {RunAnalysisParams} params - The parameters object.
 * @param {string} params.task - The analysis task to run.
 * @param {string[]} params.paths - The file paths to analyze.
 * @param {{ scope?: AnalysisScope; language?: string }} params.options - Options for analysis, including scope and language.
 * @returns {Promise<void>} Resolves when analysis is complete.
 */
export async function runAnalysis({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void> {
  try {
    // 1. Load project and authenticate
    const { projectId, apiKey } = await setupAnalysisContext();

    // 2. Determine and VALIDATE the scope of files for this run.
    const { scope, targetFilePaths } = await getAnalysisScope({
      paths,
      scope: options.scope,
    });

    // If scope analysis resulted in no files (e.g., no git changes), exit.
    if (
      scope === AnalysisScope.SELECTED_FILES &&
      targetFilePaths.length === 0
    ) {
      displayNoFilesToAnalyze();
      return;
    }

    // 3. Check for and deploy any out-of-sync files to update project context.
    await deployOutOfSyncFiles({ apiKey, projectId });

    // 4. Trigger the analysis with the determined scope and display results.
    await triggerAnalysisAndDisplayResults({
      apiKey,
      projectId,
      task,
      language: options.language || 'en',
      scope: scope as AnalysisScope,
      targetFilePaths,
    });
  } catch (error) {
    handleAnalysisError(error);
  }
}
