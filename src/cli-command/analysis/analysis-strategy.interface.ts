import { AnalysisScope } from '../../models/cli.model';

/**
 * Base interface for all analysis strategies
 */
export interface IAnalysisStrategy {
  /**
   * Validates if this strategy can be executed with the current context
   */
  canExecute(): Promise<boolean>;

  /**
   * Determines the file paths that should be analyzed
   */
  getTargetFiles(paths: string[]): Promise<string[]>;

  /**
   * Gets a human-readable description of what will be analyzed
   */
  getDescription(): string;

  /**
   * Gets the analysis scope enum value
   */
  getScope(): AnalysisScope;
}

/**
 * Configuration for creating analysis strategies
 */
export interface AnalysisStrategyConfig {
  isGitRepository: boolean;
  isNonInteractive: boolean;
  currentDirectory: string;
}

/**
 * Result of strategy selection and file resolution
 */
export interface AnalysisPreparationResult {
  strategy: IAnalysisStrategy;
  targetFiles: string[];
  scope: AnalysisScope;
  description: string;
}

/**
 * Parameters needed for running the actual analysis
 */
export interface AnalysisExecutionParams {
  apiKey: string;
  projectId: string;
  task: string;
  language: string;
  scope: AnalysisScope;
  targetFilePaths: string[];
  isOpenBrowser: boolean;
}

/**
 * Context required for authentication and project setup
 */
export interface AnalysisAuthContext {
  apiKey: string;
  projectId: string;
}

/**
 * Options for the overall analysis command
 */
export interface AnalysisCommandOptions {
  method?: string;
  language?: string;
  all?: boolean;
  openBrowser?: boolean;
}
