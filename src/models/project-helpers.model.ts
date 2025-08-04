import ora from 'ora';

/**
 * Parameters for getProjectName.
 */
export interface GetProjectNameParams {
  name?: string;
}

/**
 * Parameters for createRemoteProject.
 */
export interface CreateRemoteProjectParams {
  apiKey: string;
  projectName: string;
  zipBuffer: Buffer;
  fileManifest: Record<string, string>;
}

/**
 * Parameters for saveProjectConfiguration.
 */
export interface SaveProjectConfigurationParams {
  projectId: string;
  targetDirectory: string;
}

/**
 * Parameters for displayProjectCreationSuccessMessage.
 */
export interface DisplayProjectCreationSuccessMessageParams {
  projectUrl: string;
}

/**
 * Parameters for handleProjectCreationError.
 */
export interface HandleProjectCreationErrorParams {
  error: unknown;
  spinner: ReturnType<typeof ora>;
}
