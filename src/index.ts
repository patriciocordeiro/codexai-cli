import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import {
  loginWithToken,
  logout,
  setTemporaryToken,
  webLogin,
  webLoginCI,
} from './auth/auth';
import { logConfiguration, validateEnvironment } from './config/config';
import { HTTP_TIMEOUT, IS_PRODUCTION } from './constants/constants';

import {
  programCreateProject,
  programDeploy,
  runAnalysisWithDiffs,
} from './cli-command/cli-command-helpers';

/**
 * Adds the --token option to a command and handles setting the temporary token
 * @param {Command} command - The commander command to add the token option to
 * @returns {Command} The command with the token option added
 */
function addTokenOption(command: Command): Command {
  return command.option(
    '--token <token>',
    'Authenticate using an API token for CI environments'
  );
}

/**
 * Handles setting the temporary token if provided in options
 * @param {object} options - The command options object
 * @param {string} [options.token] - The API token if provided
 */
function handleTokenOption(options: { token?: string }): void {
  if (options.token) {
    setTemporaryToken(options.token);
  }
}

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
  .option('--no-browser', 'Do not open browser automatically')
  .option(
    '--token <token>',
    'Authenticate using an API token for CI environments'
  )
  .action(async options => {
    try {
      if (options.token) {
        await loginWithToken(options.token);
      } else {
        await webLogin(options.browser);
      }
    } catch (error) {
      console.error(chalk.red.bold('\nAuthentication failed.', error));
      process.exit(1);
    }
  });

program
  .command('login:ci')
  .description('Authenticate for CI environments and display the API token.')
  .option('--no-browser', 'Do not open browser automatically')
  .action(async options => {
    try {
      await webLoginCI(options.browser);
    } catch (error) {
      console.error(chalk.red.bold('\nAuthentication failed.', error));
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Sign out and remove the local API key.')
  .action(async () => {
    try {
      await logout();
      console.info('✅ You have been logged out.');
    } catch {
      // Ensure logout always succeeds from CLI perspective
      console.warn(chalk.yellow('⚠️  Logout completed with warnings.'));
      console.info('✅ You have been logged out.');
    }
  });

addTokenOption(
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
).action(async (targetDirectoryArg, options) => {
  handleTokenOption(options);
  await programCreateProject({ targetDirectoryArg, options });
});

addTokenOption(
  program
    .command('deploy')
    .description('Deploys file changes to your linked CodeAI project.')
).action(async options => {
  handleTokenOption(options);
  await programDeploy();
});

addTokenOption(
  program
    .command('run')
    .description(
      'Run a new analysis on the linked project after deploying any local changes.'
    )
    .argument(
      '[task]',
      'The analysis task to run (if not provided, you will be prompted to select)'
    )
    .option(
      '--paths <paths...>',
      'Optional: Specific files or folders to analyze. If omitted, uses the target directory from .codeai.json.'
    )
    .option(
      '--method <method>',
      'Analysis method: "git-diff", "entire-project", or "selected-files". If not provided, defaults to git-diff for git repositories or prompts for selection.'
    )
    .option(
      '-t, --task <task>',
      'Specify analysis task (e.g., REVIEW, SECURITY). Useful for CI/pipelines where positional args are inconvenient.'
    )
    .option(
      '-l, --language <lang>',
      'Specify language for analysis results',
      'en'
    )
    .option(
      '--all',
      'Analyze the entire project, overriding .codeai.json target directory'
    )
    .option(
      '--open-browser',
      'Open the analysis results in the web dashboard after completion'
    )
).action(async (task, paths, options) => {
  handleTokenOption(options);

  const finalTask = options.task || task;
  const finalPaths: string[] = Array.isArray(paths) ? paths : [];
  await runAnalysisWithDiffs({ task: finalTask, paths: finalPaths, options });
});

// Only run the CLI if this file is being executed directly, not when imported for testing
if (require.main === module) {
  program.parse(process.argv);
}
