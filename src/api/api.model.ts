// Interfaces for API functions in src/api/api.ts

import { AnalysisScope } from '../models/cli.model';

/**
 * Input for createProjectWithFiles
 */
export interface CreateProjectWithFilesInput {
  apiKey: string;
  projectName: string;
  zipBuffer: Buffer;
  fileManifest: Record<string, string>;
}

/**
 * Output for createProjectWithFiles
 */
export interface CreateProjectWithFilesOutput {
  projectId: string;
  projectUrl: string;
}

/**
 * Input for triggerAnalysis
 */
export interface TriggerAnalysisInput {
  apiKey: string;
  projectId: string;
  taskType: string;
  language: string;
  scope?: AnalysisScope;
  filesForAnalysis: string[];
}

/**
 * Output for triggerAnalysis
 */
export interface TriggerAnalysisOutput {
  resultsUrl: string;
  analysisRunId: string;
}

/**
 * Input for getProjectManifest
 */
export interface GetProjectManifestInput {
  apiKey: string;
  projectId: string;
}

/**
 * Output for getProjectManifest
 */
export type GetProjectManifestOutput = Record<string, string>;

/**
 * Input for updateProjectFiles
 */
export interface UpdateProjectFilesInput {
  apiKey: string;
  projectId: string;
  patchZipBuffer: Buffer;
  updatedManifest: Record<string, string>;
}

/**
 * Output for updateProjectFiles
 */
export interface UpdateProjectFilesOutput {
  message: string;
}
