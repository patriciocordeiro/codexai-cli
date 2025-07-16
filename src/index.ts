#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import open from 'open';
import { logout, webLogin } from './auth';
import { logConfiguration, validateEnvironment } from './config';
import { HTTP_TIMEOUT, IS_PRODUCTION } from './constants';
import {
  checkAuthentication,
  compressProject,
  createProjectWithFiles,
} from './helpers';

// Validate environment before starting
validateEnvironment();

// Show configuration in development mode
if (!IS_PRODUCTION) {
  logConfiguration();
}

// Configure axios defaults
axios.defaults.timeout = HTTP_TIMEOUT;

const cliProgram = new Command();

cliProgram
  .name('codeai')
  .description('A CLI tool to upload and analyze code projects.')
  .version('0.0.1');

// --- Auth Commands ---
cliProgram
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

cliProgram
  .command('logout')
  .description('Sign out and remove the local API key.')
  .action(async () => {
    await logout();
    console.log('✅ You have been logged out.');
  });

cliProgram
  .command('analyze')
  .description('Uploads a project and starts a new analysis.')
  .argument('<paths...>', 'A list of paths to files or folders to analyze')
  .option('-p, --project <name>', 'Assign a name to this analysis project')
  .option(
    '-t, --task <type>',
    'Specify the analysis task (e.g., REVIEW, UNIT_TESTS)',
    'REVIEW'
  )
  .option(
    '-l, --language <lang>',
    'Specify the preferred language for analysis results (e.g., en, es, fr, pt)',
    'en'
  )
  .action(async (paths, options) => {
    console.log('🚀 Starting CodeAI analysis...');

    try {
      // 1. Check for authentication
      const apiKey = await checkAuthentication();

      // 2. Compress the project files
      const zipBuffer = await compressProject(paths);

      // 3. Upload and start analysis
      const { projectId, resultsUrl } = await createProjectWithFiles(
        zipBuffer,
        apiKey,
        options.project,
        options.task,
        options.language
      );

      // 4. Display results
      console.log(
        `\n✅ Analysis completed successfully for project ID: ${projectId}`
      );
      console.log(`🔗 View results at: ${resultsUrl}`);
      open(resultsUrl).catch(err => {
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

// Only run the CLI if this file is being executed directly, not when imported for testing
if (require.main === module) {
  cliProgram.parse(process.argv);
}
