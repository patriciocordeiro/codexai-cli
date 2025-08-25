import chalk from 'chalk';
import ora from 'ora';
import { webLogin } from '../auth/auth';
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
import { isGitRepository } from '../helpers/git/git-helpers';
import {
  createRemoteProject,
  displayProjectCreationSuccessMessage,
  handleProjectCreationError,
  prepareProjectArchive,
  saveProjectConfiguration,
  setupProjectParameters,
} from '../helpers/project/project-helpers';
import {
  promptForAnalysisMethod,
  promptForAnalysisTask,
  promptForLogin,
  promptForProjectCreation,
  promptForSelectedPaths,
} from '../helpers/prompts/prompt-helpers';
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
 * @param {{ method?: string; language?: string; all?: boolean; openBrowser?: boolean }} params.options - Options for analysis.
 * @returns {Promise<void>} Resolves when analysis is complete.
 */
export async function runAnalysis({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void> {
  try {
    // Detect non-interactive/CI environments where prompts should not be used.
    // Use CI env var or absence of a TTY for child processes.

    const nonInteractive = Boolean(process.env.CI) || !process.stdin.isTTY;

    // Early check: in non-interactive/CI environments require task to be provided
    if (!task && nonInteractive) {
      console.error(
        chalk.red.bold(
          '\n❌ Analysis task not provided and CLI is running in non-interactive mode. Please specify a task (e.g., REVIEW) with `--task` or as a positional argument.'
        )
      );
      process.exit(1);
    }

    // 1. Handle authentication - check if user is logged in, if not prompt to login
    let apiKey: string;
    let projectId: string;

    try {
      const context = await setupAnalysisContext();
      apiKey = context.apiKey;
      projectId = context.projectId;
    } catch (error) {
      // Check if it's an authentication error
      if (
        error instanceof Error &&
        error.message === 'Authentication required'
      ) {
        if (nonInteractive) {
          console.error(
            chalk.red.bold(
              '\n❌ Authentication required but CLI is running in non-interactive/CI mode. Please provide valid authentication before running analysis.'
            )
          );
          process.exit(1);
        }

        const shouldLogin = await promptForLogin();
        if (!shouldLogin) {
          console.info(chalk.yellow('Analysis cancelled.'));
          process.exit(0);
        }

        // Start login process
        await webLogin(true);

        // Try to get context again after login
        try {
          const context = await setupAnalysisContext();
          apiKey = context.apiKey;
          projectId = context.projectId;
        } catch (projectError) {
          // If still failing, it might be a project configuration issue
          if (
            projectError instanceof Error &&
            projectError.message.includes('.codeai.json')
          ) {
            if (nonInteractive) {
              console.error(
                chalk.red(
                  '\n❌ Project configuration not found and CLI is running in non-interactive/CI mode. Please create a project before running analysis.'
                )
              );
              process.exit(1);
            }

            const shouldCreateProject = await promptForProjectCreation();
            if (!shouldCreateProject) {
              console.info(chalk.yellow('Analysis cancelled.'));
              process.exit(0);
            }

            // Start project creation process
            await programCreateProject({
              targetDirectoryArg: '',
              options: {},
            });

            // Try to get context one more time
            const finalContext = await setupAnalysisContext();
            apiKey = finalContext.apiKey;
            projectId = finalContext.projectId;
          } else {
            throw projectError;
          }
        }
      } else if (
        error instanceof Error &&
        error.message.includes('.codeai.json')
      ) {
        // Project configuration not found
        if (nonInteractive) {
          console.error(
            chalk.red(
              '\n❌ Project configuration not found and CLI is running in non-interactive/CI mode. Please create a project before running analysis.'
            )
          );
          process.exit(1);
        }

        const shouldCreateProject = await promptForProjectCreation();
        if (!shouldCreateProject) {
          console.info(chalk.yellow('Analysis cancelled.'));
          process.exit(0);
        }

        // Start project creation process
        await programCreateProject({
          targetDirectoryArg: '',
          options: {},
        });

        // Try to get context after project creation
        const context = await setupAnalysisContext();
        apiKey = context.apiKey;
        projectId = context.projectId;
      } else {
        throw error;
      }
    }

    // 2. Handle task selection - if no task provided, prompt user to select
    let selectedTask = task;
    if (!selectedTask) {
      if (nonInteractive) {
        console.error(
          chalk.red.bold(
            '\n❌ Analysis task not provided and CLI is running in non-interactive mode. Please specify a task (e.g., REVIEW) with `--task` or as a positional argument.'
          )
        );
        process.exit(1);
      }

      selectedTask = await promptForAnalysisTask();
    }

    // 3. Check git repository status for method determination
    const isGitRepo = isGitRepository();

    // 4. Determine analysis method and scope
    let analysisScope: AnalysisScope;
    let targetPaths = paths;

    // Handle method selection
    if (options.method) {
      // Method explicitly provided via --method
      switch (options.method.toLowerCase()) {
        case 'git-diff':
          if (!isGitRepo) {
            console.error(chalk.red.bold('\n❌ Cannot use git-diff method'));
            console.info(
              chalk.yellow('This directory is not a git repository.')
            );
            console.info(chalk.bold('\n🔧 Your options:'));
            console.info(chalk.cyan('  1. Initialize a git repository:'));
            console.info(
              chalk.gray(
                '     git init && git add . && git commit -m "Initial commit"'
              )
            );
            console.info(chalk.cyan('\n  2. Use a different method:'));
            console.info(chalk.gray('     codeai run --method entire-project'));
            console.info(chalk.gray('     codeai run --method selected-files'));
            process.exit(1);
          }
          analysisScope = AnalysisScope.GIT_DIFF;
          break;
        case 'entire-project':
          analysisScope = AnalysisScope.ENTIRE_PROJECT;
          break;
        case 'selected-files':
          analysisScope = AnalysisScope.SELECTED_FILES;
          if (targetPaths.length === 0) {
            targetPaths = await promptForSelectedPaths();
          }
          break;
        default:
          console.error(
            chalk.red.bold(`\n❌ Invalid method: ${options.method}`)
          );
          console.info(
            chalk.yellow(
              'Valid methods are: git-diff, entire-project, selected-files'
            )
          );
          process.exit(1);
      }
    } else if (targetPaths.length > 0) {
      // Specific paths provided
      analysisScope = AnalysisScope.SELECTED_FILES;
    } else if (options.all) {
      // --all flag provided
      analysisScope = AnalysisScope.ENTIRE_PROJECT;
    } else {
      // No method specified, no paths, no --all flag
      if (isGitRepo) {
        // Default to git-diff for git repositories
        analysisScope = AnalysisScope.GIT_DIFF;
      } else {
        // Not a git repo, show options and let user choose
        console.info(chalk.yellow.bold('\n⚠️  Not a Git Repository'));
        console.info(
          chalk.yellow(
            'This directory is not a git repository, so git-diff analysis is not available.'
          )
        );
        analysisScope = await promptForAnalysisMethod(isGitRepo);

        if (analysisScope === AnalysisScope.SELECTED_FILES) {
          targetPaths = await promptForSelectedPaths();
        }
      }
    }

    // 5. Get analysis scope and validate files
    const { scope, targetFilePaths } = await getAnalysisScope({
      paths: targetPaths,
      scope: analysisScope,
    });

    // If scope analysis resulted in no files, exit
    if (targetFilePaths.length === 0) {
      displayNoFilesToAnalyze();
      return;
    }

    // 6. Deploy any out-of-sync files to update project context
    await deployOutOfSyncFiles({ apiKey, projectId });

    // 7. Trigger the analysis and display results
    console.info(chalk.blue.bold(`\n🔍 Running analysis with scope: ${scope}`));
    logTargetFiles(targetFilePaths);
    console.info(chalk.blue.bold(`Task: ${selectedTask}`));
    console.info(chalk.blue.bold(`Language: ${options.language || 'en'}`));

    await triggerAnalysisAndDisplayResults({
      apiKey,
      projectId,
      task: selectedTask,
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
 * Logs the target files for analysis
 * @param {string[]} targetFilePaths - Array of file paths to log
 */
function logTargetFiles(targetFilePaths: string[]) {
  console.info(
    chalk.blue.bold(`Target files:\n${targetFilePaths.join('\n')}\n'----'`)
  );
}
