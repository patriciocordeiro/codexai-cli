import { AxiosError } from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { triggerAnalysis } from '../../api/api';
import { checkAuthentication, loadApiKey } from '../../auth/auth';
import { CONFIG_FILE_PATH, IS_PRODUCTION } from '../../constants/constants';
import {
  DeployOutOfSyncFilesParams,
  GetAnalysisScopeParams,
  TriggerAnalysisAndDisplayResultsParams,
} from '../../models/analysis-helpers.model';
import { AnalysisContext, AnalysisScopeResult } from '../../models/cli.model';
import { openBrowser } from '../cli/cli-helpers';
import { loadProjectConfig } from '../config/config-helpers';
import { deployChangesIfNeeded } from '../deploy/deploy-helpers';
import {
  determineAnalysisScope,
  getFilesForScope,
  validatePathsInScope,
} from '../scope/scope-helpers';

/**
 * Sets up the analysis context by loading project config and authenticating the user.
 * @returns {Promise<AnalysisContext>} The analysis context containing projectId and apiKey.
 */
export async function setupAnalysisContext(): Promise<AnalysisContext> {
  const { projectId } = await loadProjectConfig(CONFIG_FILE_PATH);
  console.info(`🚀 Starting analysis for project ${chalk.bold(projectId)}...`);
  const apiKey = await checkAuthentication(loadApiKey);
  return { projectId, apiKey };
}

/**
 * Determines the analysis scope and returns the list of files to analyze.
 * @param {GetAnalysisScopeParams} params - The parameters object.
 * @returns {Promise<AnalysisScopeResult>} The result containing scope and target file paths.
 */
export async function getAnalysisScope({
  paths,
  scope,
}: GetAnalysisScopeParams): Promise<AnalysisScopeResult> {
  return await determineAnalysisScope({
    paths,
    scope,
    getFilesForScopeImpl: getFilesForScope,
    validatePathsInScopeImpl: validatePathsInScope,
  });
}

/**
 * Displays a message when there are no files to analyze in the specified scope.
 */
export function displayNoFilesToAnalyze(): void {
  console.info(chalk.yellow('No files to analyze in the specified scope.'));
}

/**
 * Handles the case when trying to analyze git changes in a non-git repository.
 * Provides clear guidance on available options.
 */
export function handleNonGitRepository(): void {
  console.error(chalk.red.bold('\n❌ Not a git repository'));
  console.info(
    chalk.yellow(
      'The default analysis uses git diff to find changed files, but this directory is not a git repository.'
    )
  );
  console.info(chalk.bold('\n🔧 Here are your options:'));
  console.info(chalk.cyan('  1. Initialize a git repository:'));
  console.info(chalk.gray('     git init'));
  console.info(chalk.gray('     git add .'));
  console.info(chalk.gray('     git commit -m "Initial commit"'));
  console.info(chalk.cyan('\n  2. Analyze the entire project:'));
  console.info(chalk.gray('     codeai run --all'));
  console.info(chalk.cyan('\n  3. Analyze specific files or folders:'));
  console.info(chalk.gray('     codeai run src/'));
  console.info(chalk.gray('     codeai run src/file.js src/other.ts'));
  console.info(
    chalk.dim(
      '\n💡 Tip: Using git helps track which files have changed for more targeted analysis.'
    )
  );
  process.exit(1);
}

/**
 * Deploys out-of-sync files if needed before analysis.
 * @param {DeployOutOfSyncFilesParams} params - The parameters object.
 * @returns {Promise<void>}
 */
export async function deployOutOfSyncFiles({
  apiKey,
  projectId,
}: DeployOutOfSyncFilesParams): Promise<void> {
  await deployChangesIfNeeded(apiKey, projectId);
}

/**
 * Triggers the analysis and displays the results URL.
 * @param {TriggerAnalysisAndDisplayResultsParams} params - The parameters object.
 * @returns {Promise<void>}
 */
export async function triggerAnalysisAndDisplayResults({
  apiKey,
  projectId,
  task,
  language,
  scope,
  targetFilePaths,
  isOpenBrowser = false,
}: TriggerAnalysisAndDisplayResultsParams): Promise<void> {
  const spinner = ora('Sending analysis request to the server...').start();

  try {
    const { resultsUrl } = await triggerAnalysis({
      apiKey,
      projectId,
      taskType: task,
      language,
      scope,
      filesForAnalysis: targetFilePaths,
    });

    spinner.succeed('Analysis successfully initiated!');
    console.info('\n✅ View analysis progress and results at:');
    console.info(chalk.blue.underline(resultsUrl));

    if (!IS_PRODUCTION && isOpenBrowser) {
      openBrowser(resultsUrl);
    }
  } catch (error) {
    const isCI = Boolean(process.env.CI) || !process.stdin.isTTY;
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Check if this is a server unreachability issue
    if (
      errorMsg.includes('Server unreachable') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('ENOTFOUND') ||
      errorMsg.includes('Network Error')
    ) {
      spinner.fail('Server unreachable during analysis request');
      console.error('🌐 Unable to reach CodeAI server for analysis');

      if (isCI && process.env.CODEAI_FAIL_ON_UNREACHABLE !== 'true') {
        console.warn(
          '⚠️  CI mode: exiting gracefully despite server unreachability'
        );
        console.info(
          '💡 Set CODEAI_FAIL_ON_UNREACHABLE=true to make CI fail instead'
        );
        return; // Exit gracefully
      }
    }

    spinner.fail('Failed to initiate analysis');
    throw error;
  }
}

/**
 * Handles errors that occur during analysis, displaying appropriate messages and exiting the process.
 * @param {unknown} error - The error object.
 */
export function handleAnalysisError(error: unknown): void {
  const axiosError = error as AxiosError;
  if (axiosError?.response) {
    const errorMessage =
      (axiosError.response.data as { error?: { message?: string } })?.error
        ?.message || JSON.stringify(axiosError.response.data);
    console.error(
      chalk.red.bold(`\n❌ A backend error occurred: ${errorMessage}`)
    );
  } else {
    console.error(chalk.red.bold('\n❌ An unexpected error occurred:'), error);
  }
  process.exit(1);
}
