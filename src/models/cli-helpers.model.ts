export interface SaveProjectConfigurationParams {
  projectId: string;
  targetDirectory: string;
}
// Interfaces for CLI helper function parameters
import type { Ora } from 'ora';

export interface CreateRemoteProjectParams {
  apiKey: string;
  projectName: string;
  zipBuffer: Buffer;
  fileManifest: Record<string, string>;
}

export interface HandleProjectCreationErrorParams {
  error: unknown;
  spinner: Ora;
}
