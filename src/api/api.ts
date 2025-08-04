// In src/api.ts
import axios from 'axios';
import { API_BASE_URL } from '../constants/constants';
import { AnalysisScope } from '../models/cli.model';
import { handleApiError } from './api-error-handler';
import {
  CreateProjectWithFilesInput,
  CreateProjectWithFilesOutput,
  GetProjectManifestInput,
  GetProjectManifestOutput,
  TriggerAnalysisInput,
  TriggerAnalysisOutput,
  UpdateProjectFilesInput,
  UpdateProjectFilesOutput,
} from './api.model';

/**
 * Creates a new project on the backend with the provided files.
 * @param {CreateProjectWithFilesInput} params - The input parameters for creating a project with files.
 * @param {string} params.apiKey - The API key for authentication.
 * @param {string} params.projectName - The name of the project.
 * @param {Buffer} params.zipBuffer - The compressed project files as a Buffer.
 * @param {Record<string, string>} params.fileManifest - A mapping of file paths to their hashes.
 * @returns {Promise<CreateProjectWithFilesOutput>} The created project ID and project URL.
 */
export async function createProjectWithFiles({
  apiKey,
  projectName,
  zipBuffer,
  fileManifest,
}: CreateProjectWithFilesInput): Promise<CreateProjectWithFilesOutput> {
  const endpointUrl = `${API_BASE_URL}/createProjectWithFilesFunction`;

  const FormData = require('form-data');
  const form = new FormData();

  form.append('projectZip', zipBuffer, { filename: 'project.zip' });
  form.append('fileManifest', JSON.stringify(fileManifest));
  form.append('projectName', projectName);

  try {
    const response = await axios.post(endpointUrl, form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'uploading project files');
  }
}

/**
 * Calls the backend to start a new analysis run for an existing project.
 * @param {TriggerAnalysisInput} params - The input parameters for triggering an analysis.
 * @param {string} params.apiKey - The user's authenticated API key.
 * @param {string} params.projectId - The ID of the project to analyze.
 * @param {string} params.taskType - The analysis task to perform (e.g., 'REVIEW').
 * @param {string} params.language - The desired language for the results.
 * @param {AnalysisScope} [params.scope] - The scope of the analysis (default: GIT_DIFF).
 * @param {string[]} params.filesForAnalysis - The files to analyze.
 * @returns {Promise<TriggerAnalysisOutput>} The analysis run details, including the resultsUrl and analysisRunId.
 */
export async function triggerAnalysis({
  apiKey,
  projectId,
  taskType,
  language,
  scope = AnalysisScope.GIT_DIFF,
  filesForAnalysis,
}: TriggerAnalysisInput): Promise<TriggerAnalysisOutput> {
  try {
    const endpointUrl = `${API_BASE_URL}/triggerAnalysisForCliFunction`;
    const response = await axios.post(
      endpointUrl,
      {
        data: {
          projectId: projectId,
          task: taskType.toUpperCase(),
          parameters: { language: language.toLowerCase() },
          scope: scope,
          filesForAnalysis: filesForAnalysis,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'starting analysis');
  }
}

/**
 * Fetches the current file manifest (paths and hashes) for an existing project.
 * @param {GetProjectManifestInput} params - The input parameters for fetching the project manifest.
 * @param {string} params.apiKey - The API key for authentication.
 * @param {string} params.projectId - The ID of the project.
 * @returns {Promise<GetProjectManifestOutput>} The file manifest (paths and hashes).
 */
export async function getProjectManifest({
  apiKey,
  projectId,
}: GetProjectManifestInput): Promise<GetProjectManifestOutput> {
  const endpointUrl = `${API_BASE_URL}/getProjectManifestFunction`;
  try {
    const response = await axios.post(
      endpointUrl,
      { data: { projectId } },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    return response.data.manifest;
  } catch (error) {
    return handleApiError(error, 'fetching project manifest');
  }
}

/**
 * Uploads a "patch" of changed/new files to an existing project.
 * @param {UpdateProjectFilesInput} params - The input parameters for updating project files.
 * @param {string} params.apiKey - The API key for authentication.
 * @param {string} params.projectId - The ID of the project.
 * @param {Buffer} params.patchZipBuffer - The compressed patch files as a Buffer.
 * @param {Record<string, string>} params.updatedManifest - The updated file manifest (changed files only).
 * @returns {Promise<UpdateProjectFilesOutput>} A message indicating the result.
 */
export async function updateProjectFiles({
  apiKey,
  projectId,
  patchZipBuffer,
  updatedManifest,
}: UpdateProjectFilesInput): Promise<UpdateProjectFilesOutput> {
  const endpointUrl = `${API_BASE_URL}/updateProjectFilesFunction`;

  const FormData = require('form-data');
  const form = new FormData();

  form.append('patchZip', patchZipBuffer, { filename: 'patch.zip' });
  form.append('updatedManifest', JSON.stringify(updatedManifest));
  form.append('projectId', projectId);

  try {
    const response = await axios.post(endpointUrl, form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'updating project files');
  }
}
