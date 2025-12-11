import chalk from 'chalk';
import { getAnalysisScope } from '../../helpers/analysis/analysis-helpers';
import {
  promptForAnalysisMethod,
  promptForSelectedPaths,
} from '../../helpers/prompts/prompt-helpers';
import { AnalysisScope } from '../../models/cli.model';
import {
  AnalysisStrategyConfig,
  IAnalysisStrategy,
} from './analysis-strategy.interface';

/**
 * Strategy for analyzing changes in Git repository using git diff
 */
export class GitDiffAnalysisStrategy implements IAnalysisStrategy {
  /**
   *
   * @param config
   */
  constructor(private readonly config: AnalysisStrategyConfig) {}

  /**
   *
   */
  async canExecute(): Promise<boolean> {
    return this.config.isGitRepository;
  }

  /**
   *
   * @param _paths
   */
  async getTargetFiles(_paths: string[]): Promise<string[]> {
    const result = await getAnalysisScope({
      paths: [],
      scope: AnalysisScope.GIT_DIFF,
    });
    return result.targetFilePaths;
  }

  /**
   *
   */
  getDescription(): string {
    return 'Git changes (modified, added files)';
  }

  /**
   *
   */
  getScope(): AnalysisScope {
    return AnalysisScope.GIT_DIFF;
  }
}

/**
 * Strategy for analyzing the entire project
 */
export class EntireProjectAnalysisStrategy implements IAnalysisStrategy {
  /**
   *
   * @param config
   */
  constructor(private readonly config: AnalysisStrategyConfig) {}

  /**
   *
   */
  async canExecute(): Promise<boolean> {
    return true; // Always available
  }

  /**
   *
   * @param _paths
   */
  async getTargetFiles(_paths: string[]): Promise<string[]> {
    const result = await getAnalysisScope({
      paths: [],
      scope: AnalysisScope.ENTIRE_PROJECT,
    });
    return result.targetFilePaths;
  }

  /**
   *
   */
  getDescription(): string {
    return 'All project files';
  }

  /**
   *
   */
  getScope(): AnalysisScope {
    return AnalysisScope.ENTIRE_PROJECT;
  }
}

/**
 * Strategy for analyzing selected files
 */
export class SelectedFilesAnalysisStrategy implements IAnalysisStrategy {
  /**
   *
   * @param config
   */
  constructor(private readonly config: AnalysisStrategyConfig) {}

  /**
   *
   */
  async canExecute(): Promise<boolean> {
    return true; // Always available
  }

  /**
   *
   * @param paths
   */
  async getTargetFiles(paths: string[]): Promise<string[]> {
    // If paths are provided, use them directly
    if (paths.length > 0) {
      const result = await getAnalysisScope({
        paths,
        scope: AnalysisScope.SELECTED_FILES,
      });
      return result.targetFilePaths;
    }

    // If no paths provided and running interactively, prompt for selection
    if (!this.config.isNonInteractive) {
      const selectedPaths = await promptForSelectedPaths();
      const result = await getAnalysisScope({
        paths: selectedPaths,
        scope: AnalysisScope.SELECTED_FILES,
      });
      return result.targetFilePaths;
    }

    // No paths and non-interactive mode - return empty
    return [];
  }

  /**
   *
   */
  getDescription(): string {
    return 'Selected files only';
  }

  /**
   *
   */
  getScope(): AnalysisScope {
    return AnalysisScope.SELECTED_FILES;
  }
}

/**
 * Factory for creating analysis strategies
 */
export class AnalysisStrategyFactory {
  private readonly strategies: Map<AnalysisScope, IAnalysisStrategy>;

  /**
   *
   * @param config
   */
  constructor(config: AnalysisStrategyConfig) {
    this.strategies = new Map<AnalysisScope, IAnalysisStrategy>([
      [AnalysisScope.GIT_DIFF, new GitDiffAnalysisStrategy(config)],
      [AnalysisScope.ENTIRE_PROJECT, new EntireProjectAnalysisStrategy(config)],
      [AnalysisScope.SELECTED_FILES, new SelectedFilesAnalysisStrategy(config)],
    ]);
  }

  /**
   * Creates a strategy based on method name
   * @param method
   */
  async createFromMethod(method: string): Promise<IAnalysisStrategy> {
    switch (method.toLowerCase()) {
      case 'git-diff':
        return this.getAndValidateStrategy(AnalysisScope.GIT_DIFF);
      case 'entire-project':
        return this.getStrategy(AnalysisScope.ENTIRE_PROJECT)!;
      case 'selected-files':
        return this.getStrategy(AnalysisScope.SELECTED_FILES)!;
      default:
        throw new Error(`Invalid method: ${method}`);
    }
  }

  /**
   * Creates a strategy based on analysis scope
   * @param scope
   */
  createFromScope(scope: AnalysisScope): IAnalysisStrategy {
    const strategy = this.getStrategy(scope);
    if (!strategy) {
      throw new Error(`Unknown analysis scope: ${scope}`);
    }
    return strategy;
  }

  /**
   * Determines the appropriate strategy based on context and user input
   * @param method
   * @param paths
   * @param allFlag
   * @param isNonInteractive
   */
  async determineStrategy(
    method?: string,
    paths: string[] = [],
    allFlag = false,
    isNonInteractive = false
  ): Promise<IAnalysisStrategy> {
    // Method explicitly provided
    if (method) {
      return await this.createFromMethod(method);
    }

    // Specific paths provided
    if (paths.length > 0) {
      return this.getStrategy(AnalysisScope.SELECTED_FILES)!;
    }

    // --all flag provided
    if (allFlag) {
      return this.getStrategy(AnalysisScope.ENTIRE_PROJECT)!;
    }

    // Default logic based on git repository status
    const gitDiffStrategy = this.getStrategy(AnalysisScope.GIT_DIFF)!;
    if (await gitDiffStrategy.canExecute()) {
      return gitDiffStrategy;
    }

    // Not a git repo, show options or default to entire project
    if (isNonInteractive) {
      return this.getStrategy(AnalysisScope.ENTIRE_PROJECT)!;
    }

    // Interactive mode: show options and let user choose
    console.info(chalk.yellow.bold('\n⚠️  Not a Git Repository'));
    console.info(
      chalk.yellow(
        'This directory is not a git repository, so git-diff analysis is not available.'
      )
    );

    const selectedScope = await promptForAnalysisMethod(false);
    return this.createFromScope(selectedScope);
  }

  /**
   * Gets strategy for given scope
   * @param scope
   */
  private getStrategy(scope: AnalysisScope): IAnalysisStrategy | undefined {
    return this.strategies.get(scope);
  }

  /**
   * Gets strategy and validates it can execute
   * @param scope
   */
  private async getAndValidateStrategy(
    scope: AnalysisScope
  ): Promise<IAnalysisStrategy> {
    const strategy = this.getStrategy(scope);
    if (!strategy) {
      throw new Error(`Unknown analysis scope: ${scope}`);
    }

    if (!(await strategy.canExecute())) {
      if (scope === AnalysisScope.GIT_DIFF) {
        console.error(chalk.red.bold('\n❌ Cannot use git-diff method'));
        console.info(chalk.yellow('This directory is not a git repository.'));
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
      throw new Error(`Strategy ${scope} cannot be executed`);
    }

    return strategy;
  }
}
