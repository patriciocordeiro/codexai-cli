import chalk from 'chalk';
import inquirer from 'inquirer';
import { FILE_RUN_LIMIT } from '../../constants/constants';

/**
 * Confirms with the user if the file count exceeds the recommended limit.
 * @param {number} fileCount - The number of files to process.
 * @returns {Promise<void>} Resolves if the user proceeds, otherwise throws an error.
 */
export async function confirmFileLimit(fileCount: number): Promise<void> {
  if (fileCount > FILE_RUN_LIMIT) {
    console.info(
      chalk.yellow(
        `\n⚠️  This analysis will process ${fileCount} files, which is more than the recommended limit of ${FILE_RUN_LIMIT}.`
      )
    );
    console.info(
      chalk.yellow(
        '   This may result in a longer processing time and higher costs.'
      )
    );
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Do you want to continue?',
        default: true,
      },
    ]);
    if (!proceed) {
      console.info(chalk.red('Analysis cancelled by user.'));
      throw new Error('Analysis cancelled by user.');
    }
  }
}

/**
 * Opens the provided URL in the default browser for the current OS.
 * @param {string} url - The URL to open.
 * @returns {Promise<void>} Resolves when the browser is opened or warns if no URL is provided.
 */
export async function openBrowser(url: string): Promise<void> {
  const os = await import('os');
  const { executeCommand } = await import('../shell/shell-helpers');
  if (url.length) {
    try {
      if (os.platform() === 'darwin') {
        await executeCommand(`open ${url}`);
      } else if (os.platform() === 'win32') {
        await executeCommand(`start ${url}`);
      } else {
        await executeCommand(`xdg-open ${url}`);
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to open browser for URL: ${url}. Error: ${(error as Error).message}`
        )
      );
      throw new Error(`Failed to open browser for URL: ${url}`);
    }
  } else {
    console.warn(
      'Warning: No results URL provided. Please copy the link above.'
    );
  }
}
