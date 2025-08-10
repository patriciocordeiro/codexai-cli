import chalk from 'chalk';
import ora from 'ora';
import {
  deployOutOfSyncFiles,
  displayNoFilesToAnalyze,
  getAnalysisScope,
  handleAnalysisError,
  handleNonGitRepository,
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
import { isGitRepository } from '../helpers/git/git-helpers';
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
 * @param {{ scope?: AnalysisScope; language?: string }} params.options - Options for analysis, including scope and language.
 * @returns {Promise<void>} Resolves when analysis is complete.
 */
export async function runAnalysis({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void> {
  try {
    // Check git repository requirements
    const isGitRepo = isGitRepository();

    // Determine what the user wants to analyze
    const hasSpecificPaths = paths.length > 0;
    const wantsEntireProject = options.all;
    const wantsChangedFiles = options.changed;
    const defaultBehavior =
      !hasSpecificPaths && !wantsEntireProject && !wantsChangedFiles;

    // Default behavior (no paths, no --all, no --changed) requires git
    if (defaultBehavior && !isGitRepo) {
      handleNonGitRepository();
      return;
    }

    // Also check if --changed is explicitly requested but no git repo
    if (wantsChangedFiles && !isGitRepo) {
      console.error(chalk.red.bold('\n❌ Cannot analyze changed files'));
      console.info(
        chalk.yellow(
          'The --changed option requires a git repository, but this directory is not one.'
        )
      );
      console.info(chalk.bold('\n🔧 Your options:'));
      console.info(chalk.cyan('  1. Initialize a git repository:'));
      console.info(
        chalk.gray(
          '     git init && git add . && git commit -m "Initial commit"'
        )
      );
      console.info(chalk.cyan('\n  2. Analyze the entire project instead:'));
      console.info(chalk.gray('     codeai run --all'));
      console.info(chalk.cyan('\n  3. Analyze specific files or folders:'));
      console.info(chalk.gray('     codeai run src/'));
      process.exit(1);
    }

    // 1. Load project and authenticate
    const { projectId, apiKey } = await setupAnalysisContext();

    // 2. Determine scope based on user input
    let analysisScope: AnalysisScope;
    if (wantsEntireProject) {
      analysisScope = AnalysisScope.ENTIRE_PROJECT;
    } else if (wantsChangedFiles || defaultBehavior) {
      // Both --changed flag and default behavior use git diff
      analysisScope = AnalysisScope.GIT_DIFF;
    } else if (hasSpecificPaths) {
      analysisScope = AnalysisScope.SELECTED_FILES;
    } else {
      // This shouldn't happen, but fallback to git diff
      analysisScope = AnalysisScope.GIT_DIFF;
    }

    // 3. Determine and VALIDATE the scope of files for this run.
    const { scope, targetFilePaths } = await getAnalysisScope({
      paths,
      scope: analysisScope,
    });

    // If scope analysis resulted in no files (e.g., no git changes), exit.
    if (
      (scope === AnalysisScope.SELECTED_FILES &&
        targetFilePaths.length === 0) ||
      (scope === AnalysisScope.GIT_DIFF && targetFilePaths.length === 0)
    ) {
      displayNoFilesToAnalyze();
      return;
    }

    // 3. Check for and deploy any out-of-sync files to update project context.
    await deployOutOfSyncFiles({ apiKey, projectId });

    // 4. Trigger the analysis with the determined scope and display results.
    // console log the analysis scope and target file paths
    console.info(chalk.blue.bold(`\n🔍 Running analysis with scope: ${scope}`)); // Log the analysis scope
    logTargetFiles(targetFilePaths);
    console.info(
      chalk.blue.bold(`Task: ${task || 'REVIEW'}`) // Log the task
    );
    console.info(chalk.blue.bold(`Language: ${options.language || 'en'}`)); // Log the language
    await triggerAnalysisAndDisplayResults({
      apiKey,
      projectId,
      task,
      language: options.language || 'en',
      scope: scope as AnalysisScope,
      targetFilePaths,
      isOpenBrowser: options.openBrowser || false,
    });
  } catch (error) {
    handleAnalysisError(error);
  }
}

/**
 *
 * @param targetFilePaths
 */
function logTargetFiles(targetFilePaths: string[]) {
  console.info(
    chalk.blue.bold(`Target files:\n${targetFilePaths.join('\n')}\n'----'`)
  );
}
