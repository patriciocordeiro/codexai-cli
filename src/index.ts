#!/usr/bin/env node

import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import open from 'open';
import ora from 'ora';
import { createZipFromPaths } from './archive';
import { loadApiKey, logout, webLogin } from './auth'; // Renamed import for clarity
import { API_BASE_URL, HTTP_TIMEOUT, IS_DEVELOPMENT } from './constants';
import { logConfiguration, validateEnvironment } from './config';

// Validate environment before starting
validateEnvironment();

// Show configuration in development mode
if (IS_DEVELOPMENT) {
  logConfiguration();
}

// Configure axios defaults
axios.defaults.timeout = HTTP_TIMEOUT;

const program = new Command();

program
  .name('codeai')
  .description('A CLI tool to upload and analyze code projects.')
  .version('0.0.1');

// --- Helper Functions for Analysis ---
async function checkAuthentication(): Promise<string> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('❌ You must be logged in. Please run `codeai login`.');
    process.exit(1);
  }
  console.log('✅ Authenticated.');
  return apiKey;
}

async function compressProject(paths: string[]): Promise<Buffer> {
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

async function uploadZippedFile(
  zipBuffer: Buffer,
  apiKey: string,
  projectName?: string,
  taskType: string = 'REVIEW'
): Promise<{ resultsUrl: string; projectId: string }> {
  const uploadSpinner = ora(
    'Uploading project and starting analysis...'
  ).start();
  try {
    const endpointUrl = `${API_BASE_URL}/createProjectWithFilesFunction`;
    console.log('API_BASE_URL', API_BASE_URL);
    const response = await axios.post(endpointUrl, zipBuffer, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/zip',
        'X-Project-Name': projectName || '',
        'X-Task-Type': taskType.toUpperCase(),
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
      const errorMessage =
        (axiosError.response.data as { error: string })?.error ||
        JSON.stringify(axiosError.response.data);
      console.error(`❌ Error ${axiosError.response.status}: ${errorMessage}`);
    } else {
      console.error('An unexpected error occurred:', axiosError.message);
    }
    process.exit(1);
  }
}

async function triggerAnalysis(
  apiKey: string,
  options: { task: string },
  projectId: string
) {
  const triggerSpinner = ora(`Starting '${options.task}' analysis...`).start();

  try {
    // This is an HTTP Callable function that accepts JSON data
    const triggerResponse = await axios.post(
      `${API_BASE_URL}/triggerAnalysisFunction`,
      // Note: Callable functions invoked via HTTP have a `/data` wrapper in the payload
      {
        data: {
          projectId: projectId,
          task: options.task.toUpperCase(),
          parameters: {}, // Future: Add parameters from CLI options here
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json', // It's a JSON payload now
        },
      }
    );

    const result = triggerResponse.data.result;

    triggerSpinner.succeed(
      `\n📊 Analysis task '${options.task}' started successfully for project ID: ${projectId}`
    );

    console.log('\n🔄 Waiting for analysis to complete...', result);
    // Note: The response will contain a URL
    return result as { resultsUrl: string; projectId: string };
  } catch (error) {
    triggerSpinner.fail('Failed to start analysis.');
    console.error(JSON.stringify(error));
    process.exit(1);
  }
}

// --- Auth Commands ---
program
  .command('login')
  .description('Authenticate via your web browser.')
  .action(async () => {
    try {
      await webLogin();
    } catch (error) {
      // Error logging is handled within webLogin, so we just exit
      console.error(chalk.red.bold('\nAuthentication failed.', error));
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Sign out and remove the local API key.')
  .action(async () => {
    await logout();
    console.log('✅ You have been logged out.');
  });

// --- THE SINGLE 'ANALYZE' COMMAND ---
program
  .command('analyze')
  .description('Uploads a project and starts a new analysis.')
  .argument('<paths...>', 'A list of paths to files or folders to analyze')
  .option('-p, --project <name>', 'Assign a name to this analysis project')
  .option(
    '-t, --task <type>',
    'Specify the analysis task (e.g., REVIEW, UNIT_TESTS)',
    'REVIEW'
  )
  .action(async (paths, options) => {
    console.log('🚀 Starting CodeAI analysis...');

    try {
      // 1. Check for authentication
      const apiKey = await checkAuthentication();

      // 2. Compress the project files
      const zipBuffer = await compressProject(paths);

      // 3. Upload and start analysis
      const { projectId } = await uploadZippedFile(
        zipBuffer,
        apiKey,
        options.project,
        options.task
      );

      // 4. Execute the analysis task
      const result = await triggerAnalysis(apiKey, options, projectId);

      // 5. Display results
      console.log(
        `\n✅ Analysis completed successfully for project ID: ${projectId}`
      );
      console.log(`🔗 View results at: ${result.resultsUrl}`);
      open(result.resultsUrl).catch(err => {
        console.error(
          chalk.red.bold('Failed to open results URL in browser:', err)
        );
      });
    } catch (error) {
      console.error(
        chalk.red.bold('\nAnalysis failed.', JSON.stringify(error))
      );
      process.exit(1);
    }
  });

program.parse(process.argv);
