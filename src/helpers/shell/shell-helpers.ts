import chalk from 'chalk';
import { exec } from 'child_process';

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
