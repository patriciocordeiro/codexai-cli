/**
 * Parameters for programCreateProject.
 */
export interface ProgramCreateProjectParams {
  targetDirectoryArg: string;
  options: { name?: string; isOpenBrowser?: boolean };
}

/**
 * Parameters for runAnalysis.
 */
export interface RunAnalysisParams {
  task: string;
  paths: string[];
  options: {
    scope?: import('./cli.model').AnalysisScope;
    language?: string;
    changed?: boolean;
    all?: boolean;
    openBrowser?: boolean;
  };
}
