import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import { exec } from 'child_process';
import ora from 'ora';
import * as os from 'os';
import { createZipFromPaths } from './archive';
import { loadApiKey } from './auth';
import { API_BASE_URL } from './constants';

export async function checkAuthentication(): Promise<string> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('❌ You must be logged in. Please run `codeai login`.');
    process.exit(1);
  }
  console.log('✅ Authenticated.');
  return apiKey;
}

export async function compressProject(paths: string[]): Promise<Buffer> {
  const zipSpinner = ora('Compressing project files...').start();
  try {
    const zipBuffer = await createZipFromPaths(paths);
    zipSpinner.succeed(
      `Project compressed (${(zipBuffer.length / 1024).toFixed(2)} KB).`
    );
    return zipBuffer;
  } catch (err) {
    zipSpinner.fail('Error during file compression.');
    console.error(err);
    process.exit(1);
  }
}

export async function createProjectWithFiles(
  zipBuffer: Buffer,
  apiKey: string,
  projectName?: string,
  taskType: string = 'REVIEW',
  language: string = 'en'
): Promise<{ resultsUrl: string; projectId: string }> {
  const uploadSpinner = ora(
    'Uploading project and starting analysis...'
  ).start();
  try {
    const endpointUrl = `${API_BASE_URL}/createProjectWithFilesFunction`;
    const response = await axios.post(endpointUrl, zipBuffer, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/zip',
        'X-Project-Name': projectName || '',
        'X-Task-Type': taskType.toUpperCase(),
        'X-Language': language.toLowerCase(),
        'X-CLI-Version': '1.0.0',
        'User-Agent': 'CodeAI-CLI/1.0.0',
      },
    });

    uploadSpinner.succeed('Analysis successfully initiated!');
    return response.data;
  } catch (error) {
    uploadSpinner.fail('Failed to start analysis.');
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const errorMessage = axiosError.response.data;
      console.error(`❌ Error ${axiosError.response.status}: ${errorMessage}`);
      if (
        axiosError.response.status === 401 ||
        axiosError.response.status === 403
      ) {
        console.error(
          '❌ Unauthorized: Please check your API key or logout and login again.'
        );
      }
    } else {
      console.error('An unexpected error occurred:', axiosError.message);
    }
    process.exit(1);
  }
}

export async function openBrowser(url: string): Promise<void> {
  if (url.length) {
    if (os.platform() === 'darwin') {
      // macOS
      await executeCommand(`open ${url}`);
    } else if (os.platform() === 'win32') {
      // Windows
      await executeCommand(`start ${url}`);
    } else {
      await executeCommand(`xdg-open ${url}`);
    }
  } else {
    console.warn(
      'Warning: No results URL provided. Please copy the link above.'
    );
  }
}

// Helper function to execute commands and handle errors
export async function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Error executing command: ${command}`));
        console.error(chalk.red(`stderr: ${stderr}`));
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
