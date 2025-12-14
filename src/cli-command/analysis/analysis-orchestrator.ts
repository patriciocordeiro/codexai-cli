import chalk from 'chalk';
import {
  deployOutOfSyncFiles,
  displayNoFilesToAnalyze,
  handleAnalysisError,
  prepareAnalysisDataWithDiffs,
  triggerAnalysisAndDisplayResults,
  triggerAnalysisWithDiffs,
} from '../../helpers/analysis/analysis-helpers';
import { isGitRepository } from '../../helpers/git/git-helpers';
import { promptForAnalysisTask } from '../../helpers/prompts/prompt-helpers';
import { AnalysisAuthHandler } from './analysis-auth-handler';
import { AnalysisStrategyFactory } from './analysis-strategies';
import {
  AnalysisCommandOptions,
  AnalysisExecutionParams,
  AnalysisPreparationResult,
} from './analysis-strategy.interface';

/**
 * Main orchestrator for analysis operations
 * Coordinates authentication, strategy selection, and analysis execution
 */
export class AnalysisOrchestrator {
  private readonly isNonInteractive: boolean;
  private readonly authHandler: AnalysisAuthHandler;
  private readonly strategyFactory: AnalysisStrategyFactory;

  /**
   *
   */
  constructor() {
    // Detect non-interactive/CI environments where prompts should not be used
    this.isNonInteractive = Boolean(process.env.CI) || !process.stdin.isTTY;

    this.authHandler = new AnalysisAuthHandler(this.isNonInteractive);
    this.strategyFactory = new AnalysisStrategyFactory({
      isGitRepository: isGitRepository(),
      isNonInteractive: this.isNonInteractive,
      currentDirectory: process.cwd(),
    });
  }

  /**
   * Orchestrates the complete analysis flow
   * @param {string} task - The analysis task to execute
   * @param {string[]} paths - The file paths to analyze
   * @param {AnalysisCommandOptions} options - Analysis command options
   */
  async runAnalysis(
    task: string,
    paths: string[],
    options: AnalysisCommandOptions
  ): Promise<void> {
    try {
      // 1. Validate task in non-interactive environments
      this.validateTaskInNonInteractive(task);

      // 2. Ensure authentication and project setup
      const authContext = await this.authHandler.ensureAuthContext();

      // 3. Handle task selection
      const selectedTask = await this.selectTask(task);

      // 4. Prepare analysis (determine strategy and get target files)
      const preparation = await this.prepareAnalysis(paths, options);

      // 5. Validate we have files to analyze
      if (preparation.targetFiles.length === 0) {
        displayNoFilesToAnalyze();
        return;
      }

      // 6. Deploy any out-of-sync files
      await deployOutOfSyncFiles({
        apiKey: authContext.apiKey,
        projectId: authContext.projectId,
      });

      // 7. Execute the analysis
      await this.executeAnalysis({
        ...authContext,
        task: selectedTask,
        language: options.language || 'en',
        scope: preparation.scope,
        targetFilePaths: preparation.targetFiles,
        isOpenBrowser: options.openBrowser || false,
      });
    } catch (error) {
      handleAnalysisError(error);
    }
  }

  /**
   *
   * @param {string} task
   * @returns {void}
   */
  private validateTaskInNonInteractive(task: string): void {
    if (!task && this.isNonInteractive) {
      this.handleNonInteractiveTaskError();
    }
  }

  /**
   * Selects or prompts for an analysis task
   * @param {string} task - The analysis task to execute
   * @returns {Promise<string>} The selected task
   */
  private async selectTask(task: string): Promise<string> {
    if (task) {
      return task;
    }

    if (this.isNonInteractive) {
      this.handleNonInteractiveTaskError();
    }

    return await promptForAnalysisTask();
  }

  /**
   * Handles error when no task is provided in non-interactive mode
   * @returns {void}
   * @throws Exits the process after displaying an error message
   */
  private handleNonInteractiveTaskError(): void {
    console.error(
      chalk.red.bold(
        '\n❌ Analysis task not provided and CLI is running in non-interactive mode. Please specify a task (e.g., REVIEW) with `--task` or as a positional argument.'
      )
    );
    process.exit(1);
  }

  /**
   * Prepares analysis by determining strategy and getting target files
   * @param {string[]} paths - The file paths to analyze
   * @param {AnalysisCommandOptions} options - Analysis command options
   * @returns {Promise<AnalysisPreparationResult>} Preparation result with strategy, target files, and scope
   */
  private async prepareAnalysis(
    paths: string[],
    options: AnalysisCommandOptions
  ): Promise<AnalysisPreparationResult> {
    // Determine the appropriate strategy
    const strategy = await this.strategyFactory.determineStrategy(
      options.method,
      paths,
      options.all,
      this.isNonInteractive
    );

    // Get target files using the strategy
    const targetFiles = await strategy.getTargetFiles(paths);

    return {
      strategy,
      targetFiles,
      scope: strategy.getScope(),
      description: strategy.getDescription(),
    };
  }

  /**
   * Logs analysis execution parameters
   * @param {AnalysisExecutionParams} params
   */
  private logAnalysisExecutionParams(params: AnalysisExecutionParams): void {
    console.info(chalk.blue.bold(`Task: ${params.task}`));
    console.info(chalk.blue.bold(`Language: ${params.language}`));
  }

  /**
   * Executes the analysis
   * @param {AnalysisExecutionParams} params - The execution parameters
   * @returns {Promise<void>}
   */
  private async executeAnalysis(
    params: AnalysisExecutionParams
  ): Promise<void> {
    console.info(
      chalk.blue.bold(`\n🔍 Running analysis with scope: ${params.scope}`)
    );
    this.logTargetFiles(params.targetFilePaths);
    this.logAnalysisExecutionParams(params);

    await triggerAnalysisAndDisplayResults({
      apiKey: params.apiKey,
      projectId: params.projectId,
      task: params.task,
      language: params.language,
      scope: params.scope,
      targetFilePaths: params.targetFilePaths,
      isOpenBrowser: params.isOpenBrowser,
    });
  }

  /**
   * Logs the target files for analysis
   * @param {string[]} targetFilePaths - The paths of files to be analyzed
   */
  private logTargetFiles(targetFilePaths: string[]): void {
    console.info(
      chalk.blue.bold(`Target files:\n${targetFilePaths.join('\n')}\n'----'`)
    );
  }

  /**
   * Executes analysis with diff information included
   * @param {AnalysisExecutionParams} params - The execution parameters
   */
  private async executeAnalysisWithDiffs(
    params: AnalysisExecutionParams
  ): Promise<void> {
    console.info(
      chalk.blue.bold(
        `\n🔍 Running analysis with diffs - scope: ${params.scope}`
      )
    );
    this.logTargetFiles(params.targetFilePaths);
    this.logAnalysisExecutionParams(params);

    // Prepare analysis data with diff information
    const analysisData = await prepareAnalysisDataWithDiffs({
      paths: params.targetFilePaths,
      scope: params.scope,
    });

    console.info(
      chalk.green(
        `\n📊 Diff data collected for ${analysisData.filesWithDiffs.length} files`
      )
    );

    await triggerAnalysisWithDiffs({
      apiKey: params.apiKey,
      projectId: params.projectId,
      task: params.task,
      language: params.language,
      analysisData,
      isOpenBrowser: params.isOpenBrowser,
    });
  }

  /**
   * Orchestrates the complete analysis flow with diff information
   * This is an enhanced version that includes git diff data
   * @param {string} task - The analysis task to execute
   * @param {string[]} paths - The file paths to analyze
   * @param {AnalysisCommandOptions} options - Analysis command options
   */
  async runAnalysisWithDiffs(
    task: string,
    paths: string[],
    options: AnalysisCommandOptions
  ): Promise<void> {
    try {
      // 1. Validate task in non-interactive environments
      this.validateTaskInNonInteractive(task);

      // 2. Ensure authentication and project setup
      const authContext = await this.authHandler.ensureAuthContext();

      // 3. Handle task selection
      const selectedTask = await this.selectTask(task);

      // 4. Prepare analysis (determine strategy and get target files)
      const preparation = await this.prepareAnalysis(paths, options);

      // 5. Validate we have files to analyze
      if (preparation.targetFiles.length === 0) {
        displayNoFilesToAnalyze();
        return;
      }

      // 6. Deploy any out-of-sync files
      await deployOutOfSyncFiles({
        apiKey: authContext.apiKey,
        projectId: authContext.projectId,
      });

      // 7. Execute the analysis with diffs
      await this.executeAnalysisWithDiffs({
        ...authContext,
        task: selectedTask,
        language: options.language || 'en',
        scope: preparation.scope,
        targetFilePaths: preparation.targetFiles,
        isOpenBrowser: options.openBrowser || false,
      });
    } catch (error) {
      handleAnalysisError(error);
    }
  }
}
