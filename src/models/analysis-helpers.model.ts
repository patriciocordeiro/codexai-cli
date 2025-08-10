/**
 * Parameters for getAnalysisScope.
 */
export interface GetAnalysisScopeParams {
  paths: string[];
  scope?: import('./cli.model').AnalysisScope;
}

/**
 * Parameters for deployOutOfSyncFiles.
 */
export interface DeployOutOfSyncFilesParams {
  apiKey: string;
  projectId: string;
}

/**
 * Parameters for triggerAnalysisAndDisplayResults.
 */
export interface TriggerAnalysisAndDisplayResultsParams {
  apiKey: string;
  projectId: string;
  task: string;
  language: string;
  scope: import('./cli.model').AnalysisScope;
  targetFilePaths: string[];
  isOpenBrowser?: boolean;
}
