import chalk from 'chalk';
import inquirer from 'inquirer';

const FILE_RUN_LIMIT = 200;

export async function confirmFileLimit(fileCount: number): Promise<void> {
  if (fileCount > FILE_RUN_LIMIT) {
    console.log(
      chalk.yellow(
        `\n⚠️  This analysis will process ${fileCount} files, which is more than the recommended limit of ${FILE_RUN_LIMIT}.`
      )
    );
    console.log(
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
      console.log(chalk.red('Analysis cancelled by user.'));
      throw new Error('Analysis cancelled by user.');
    }
  }
}

export async function openBrowser(url: string): Promise<void> {
  const os = await import('os');
  const { executeCommand } = await import('../shell/shell-helpers');
  if (url.length) {
    if (os.platform() === 'darwin') {
      await executeCommand(`open ${url}`);
    } else if (os.platform() === 'win32') {
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
