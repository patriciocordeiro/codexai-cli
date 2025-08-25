import chalk from 'chalk';
import inquirer from 'inquirer';
import { AnalysisScope } from '../../models/cli.model';

/**
 * Available analysis methods for the user to choose from
 */
export interface AnalysisMethodOption {
  name: string;
  value: AnalysisScope;
  description: string;
}

/**
 * Available analysis tasks for the user to choose from
 */
export interface AnalysisTaskOption {
  name: string;
  value: string;
  description: string;
}

/**
 * Prompts the user to select an analysis method when not specified
 * @param {boolean} isGitRepo - Whether the current directory is a git repository
 * @returns {Promise<AnalysisScope>} The selected analysis method
 */
export async function promptForAnalysisMethod(
  isGitRepo: boolean
): Promise<AnalysisScope> {
  const options: AnalysisMethodOption[] = [];

  if (isGitRepo) {
    options.push({
      name: 'Git diff (changed files only)',
      value: AnalysisScope.GIT_DIFF,
      description: 'Analyze only files that have been changed in git',
    });
  }

  options.push(
    {
      name: 'Entire project',
      value: AnalysisScope.ENTIRE_PROJECT,
      description: 'Analyze all files in the project',
    },
    {
      name: 'Selected files/folders',
      value: AnalysisScope.SELECTED_FILES,
      description: 'Specify particular files or folders to analyze',
    }
  );

  console.info(
    chalk.blue.bold('\n🔍 How would you like to analyze your code?')
  );

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'Select analysis method:',
      choices: options.map(option => ({
        name: `${option.name} - ${chalk.dim(option.description)}`,
        value: option.value,
      })),
    },
  ]);

  return answer.method;
}

/**
 * Prompts the user to select an analysis task
 * @returns {Promise<string>} The selected analysis task
 */
export async function promptForAnalysisTask(): Promise<string> {
  const tasks: AnalysisTaskOption[] = [
    {
      name: 'REVIEW',
      value: 'REVIEW',
      description: 'General code review and analysis',
    },
    {
      name: 'SECURITY',
      value: 'SECURITY',
      description: 'Security vulnerability analysis',
    },
    {
      name: 'PERFORMANCE',
      value: 'PERFORMANCE',
      description: 'Performance optimization suggestions',
    },
    {
      name: 'DOCUMENTATION',
      value: 'DOCUMENTATION',
      description: 'Documentation and code comments review',
    },
    {
      name: 'TESTING',
      value: 'TESTING',
      description: 'Test coverage and quality analysis',
    },
  ];

  console.info(
    chalk.blue.bold('\n📋 What type of analysis would you like to run?')
  );

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'task',
      message: 'Select analysis task:',
      choices: tasks.map(task => ({
        name: `${task.name} - ${chalk.dim(task.description)}`,
        value: task.value,
      })),
    },
  ]);

  return answer.task;
}

/**
 * Prompts the user to specify files or folders when SELECTED_FILES method is chosen
 * @returns {Promise<string[]>} Array of file/folder paths
 */
export async function promptForSelectedPaths(): Promise<string[]> {
  console.info(chalk.blue.bold('\n📁 Specify files or folders to analyze'));
  console.info(
    chalk.dim(
      'You can enter multiple paths separated by spaces (e.g., src/ lib/utils.ts)'
    )
  );

  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'paths',
      message: 'Enter file or folder paths:',
      /**
       * Validates the user input for file paths
       * @param {string} input - The user input
       * @returns {boolean | string} True if valid, error message if invalid
       */
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) {
          return 'Please enter at least one file or folder path';
        }
        return true;
      },
    },
  ]);

  return answer.paths
    .trim()
    .split(/\s+/)
    .filter((path: string) => path.length > 0);
}

/**
 * Prompts the user whether to proceed with authentication
 * @returns {Promise<boolean>} Whether the user wants to proceed with login
 */
export async function promptForLogin(): Promise<boolean> {
  console.info(chalk.yellow.bold('\n🔐 Authentication Required'));
  console.info(chalk.yellow('You need to be logged in to run analysis.'));

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Would you like to log in now?',
      default: true,
    },
  ]);

  return answer.proceed;
}

/**
 * Prompts the user whether to proceed with project creation
 * @returns {Promise<boolean>} Whether the user wants to proceed with project creation
 */
export async function promptForProjectCreation(): Promise<boolean> {
  console.info(chalk.yellow.bold('\n📁 Project Not Found'));
  console.info(
    chalk.yellow('No CodeAI project configuration found in this directory.')
  );

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Would you like to create a new project now?',
      default: true,
    },
  ]);

  return answer.proceed;
}
