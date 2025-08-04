/**
 * Parameters for programCreateProject.
 */
export interface ProgramCreateProjectParams {
  targetDirectoryArg: string;
  options: { name?: string };
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
  };
}
