export interface CodeAiConfig {
  projectId: string;
  targetDirectory: string;
  maxUploadSizeMB?: number;
}

export interface CreateProjectParams {
  targetDirectoryArg: string;
  options: { name?: string };
}

export interface ProjectSetupResult {
  projectName: string;
  targetDirectory: string;
  apiKey: string;
}

export interface ProjectArchiveResult {
  zipBuffer: Buffer;
  fileManifest: Record<string, string>;
  includedFiles: string[];
}

export interface ProjectCreationResult {
  projectId: string;
  projectUrl: string;
}

// --- Deploy Command Helper Functions ---

export interface DeploymentContext {
  projectId: string;
  apiKey: string;
  targetDirectory: string;
}

export interface FileDiff {
  filesToUpdate: string[];
  manifestForUpdate: Record<string, string>;
}

export interface RunAnalysisParams {
  task: string;
  paths: string[];
  options: {
    language?: string;
    scope?: AnalysisScope;
  };
}

export interface AnalysisContext {
  projectId: string;
  apiKey: string;
}

export interface AnalysisScopeResult {
  scope: string;
  targetFilePaths: string[];
}

export enum AnalysisScope {
  SELECTED_FILES = 'SELECTED_FILES',
  ENTIRE_PROJECT = 'ENTIRE_PROJECT',
  GIT_DIFF = 'GIT_DIFF',
}
