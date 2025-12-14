import chalk from 'chalk';
import ora from 'ora';
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
    displayProjectCreationSuccessMessage(
      projectUrl,
      options.isOpenBrowser || false
    );
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
    // Setup deployment context
    const { projectId, apiKey, targetDirectory } =
      await setupDeploymentContext();
    spinner.succeed(`Started deployment to project: ${chalk.bold(projectId)}`);

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
      console.info(chalk.yellow('No changes detected.'));
      return;
    }

    // Create and upload patch
    spinner.start('Creating deployment patch...');
    logTargetFiles(filesToUpdate);
    console.info(`Uploading ${filesToUpdate.length} files to remote...`);
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
 * @param {{ method?: string; language?: string; all?: boolean; openBrowser?: boolean }} params.options - Options for analysis.
 * @returns {Promise<void>} Resolves when analysis is complete.
 */
export async function runAnalysis({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void> {
  const { AnalysisOrchestrator } = await import(
    './analysis/analysis-orchestrator'
  );
  const orchestrator = new AnalysisOrchestrator();

  await orchestrator.runAnalysis(task, paths, {
    method: options.method,
    language: options.language,
    all: options.all,
    openBrowser: options.openBrowser,
  });
}

/**
 * Runs the analysis task with diff information for the project.
 * This enhanced version includes git diff data for changed files.
 *
 * @param {RunAnalysisParams} params - The parameters object.
 * @param {string} params.task - The analysis task to run.
 * @param {string[]} params.paths - The file paths to analyze.
 * @param {{ method?: string; language?: string; all?: boolean; openBrowser?: boolean }} params.options - Options for analysis.
 * @returns {Promise<void>} Resolves when analysis is complete.
 */
export async function runAnalysisWithDiffs({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void> {
  const { AnalysisOrchestrator } = await import(
    './analysis/analysis-orchestrator'
  );
  const orchestrator = new AnalysisOrchestrator();

  await orchestrator.runAnalysisWithDiffs(task, paths, {
    method: options.method,
    language: options.language,
    all: options.all,
    openBrowser: options.openBrowser,
  });
}

/**
 * Logs the target files for deployment
 * @param {string[]} targetFilePaths - Array of file paths to log
 */
function logTargetFiles(targetFilePaths: string[]) {
  console.info(
    chalk.blue.bold(`Target files:\n${targetFilePaths.join('\n')}\n'----'`)
  );
}
