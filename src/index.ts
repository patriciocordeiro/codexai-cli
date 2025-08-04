import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import { logout, webLogin } from './auth/auth';
import { logConfiguration, validateEnvironment } from './config/config';
import { HTTP_TIMEOUT, IS_PRODUCTION } from './constants/constants';

import {
  programCreateProject,
  programDeploy,
  runAnalysis,
} from './cli-command/cli-command-helpers';

validateEnvironment();

if (!IS_PRODUCTION) {
  logConfiguration();
}

axios.defaults.timeout = HTTP_TIMEOUT;

const program = new Command();

program
  .name('codeai')
  .description(
    'A CLI tool for AI-powered code analysis and automated code review using AI'
  )
  .version('0.0.1');

// --- Auth Commands ---
program
  .command('login')
  .description('Authenticate via your web browser.')
  .action(async () => {
    try {
      await webLogin();
    } catch (error) {
      console.error(chalk.red.bold('\nAuthentication failed.', error));
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Sign out and remove the local API key.')
  .action(async () => {
    await logout();
    console.info('✅ You have been logged out.');
  });

program
  .command('create')
  .description(
    'Initializes and creates a new CodeAI project from the current directory.'
  )
  .argument(
    '[path]',
    'Optional: The main directory to analyze (e.g., "src"). Defaults to the entire project.'
  )
  .option(
    '-n, --name <name>',
    'Override the project name (from package.json or current folder name)'
  )
  .action(async (targetDirectoryArg, options) => {
    programCreateProject({ targetDirectoryArg, options });
  });

program
  .command('deploy')
  .description('Deploys file changes to your linked CodeAI project.')
  .action(async () => {
    await programDeploy();
  });

program
  .command('run')
  .description(
    'Run a new analysis on the linked project after deploying any local changes.'
  )
  .argument('<task>', 'The analysis task to run (e.g., REVIEW)')
  .argument(
    '[paths...]',
    'Optional: Specific files or folders to analyze. If omitted, uses the target directory from .codeai.json.'
  )
  .option(
    '-c, --changed',
    'Analyze only the files changed in your local git repository.'
  )
  .option(
    '-l, --language <lang>',
    'Specify language for analysis results',
    'en'
  )
  .action(async (task, paths, options) => {
    await runAnalysis({ task, paths, options });
  });

// Only run the CLI if this file is being executed directly, not when imported for testing
if (require.main === module) {
  program.parse(process.argv);
}
