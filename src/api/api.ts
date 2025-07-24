// In src/api.ts
import axios, { AxiosError } from 'axios';
import ora from 'ora';
import { API_BASE_URL } from '../constants/constants';

/**
 * Creates a new project on the backend with the provided files.
 * @param apiKey The API key for authentication.
 * @param projectName The name of the project.
 * @param zipBuffer The compressed project files as a Buffer.
 * @param fileManifest A mapping of file paths to their hashes.
 * @returns The created project ID.
 */
export async function createProjectWithFiles(
  apiKey: string,
  projectName: string,
  zipBuffer: Buffer,
  fileManifest: Record<string, string>
): Promise<{ projectId: string; projectUrl: string }> {
  const endpointUrl = `${API_BASE_URL}/createProjectWithFilesFunction`;

  // We need to send both a file (zip) and JSON (manifest)
  // The standard way to do this is with FormData.
  const FormData = require('form-data');
  const form = new FormData();

  form.append('projectZip', zipBuffer, { filename: 'project.zip' });
  form.append('fileManifest', JSON.stringify(fileManifest));
  form.append('projectName', projectName);

  console.log('📦 Uploading project files...', endpointUrl);

  try {
    const response = await axios.post(endpointUrl, form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
    });
    console.log('✅ Project created successfully:', response.data);
    return response.data; // Expecting backend to return { projectId }
  } catch (error) {
    const err = error as AxiosError;
    throw err.response?.data; // Let the main action handler catch this
  }
}

/**
 * Calls the backend to start a new analysis run for an existing project.
 *
 * @param apiKey The user's authenticated API key.
 * @param projectId The ID of the project to analyze.
 * @param task The analysis task to perform (e.g., 'REVIEW').
 * @param language The desired language for the results.
 * @returns A promise that resolves with the analysis run details, including the resultsUrl.
 */
export async function triggerAnalysis(
  apiKey: string,
  projectId: string,
  taskType: string,
  language: string,
  scope: 'ENTIRE_PROJECT' | 'SELECTED_FILES',
  filesForAnalysis: string[]
): Promise<{ resultsUrl: string; analysisRunId: string }> {
  const triggerSpinner = ora(`Starting '${taskType}' analysis...`).start();
  try {
    // This is the endpoint for starting an analysis run
    const endpointUrl = `${API_BASE_URL}/triggerAnalysisForCliFunction`;

    // Callable functions are called differently with axios. Payload is wrapped in { data: { ... } }
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

    triggerSpinner.succeed('Analysis successfully initiated!');
    // The response from a callable function is nested under a `result` key
    return response.data;
  } catch (error) {
    triggerSpinner.fail('Failed to start analysis.');
    // Let the main handler catch and process the error
    throw error;
  }
}

/**
 * Fetches the current file manifest (paths and hashes) for an existing project.
 */
export async function getProjectManifest(
  apiKey: string,
  projectId: string
): Promise<Record<string, string>> {
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
    const err = error as AxiosError;
    throw err.response?.data;
  }
}

/**
 * Uploads a "patch" of changed/new files to an existing project.
 */
export async function updateProjectFiles(
  apiKey: string,
  projectId: string,
  patchZipBuffer: Buffer,
  updatedManifest: Record<string, string> // Send only the hashes for the changed files
): Promise<{ message: string }> {
  const endpointUrl = `${API_BASE_URL}/updateProjectFilesFunction`;

  const FormData = require('form-data');
  const form = new FormData();

  form.append('patchZip', patchZipBuffer, { filename: 'patch.zip' });
  form.append('updatedManifest', JSON.stringify(updatedManifest));
  form.append('projectId', projectId);

  const response = await axios.post(endpointUrl, form, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
  });

  return response.data;
}
