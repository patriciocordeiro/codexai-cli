import chalk from 'chalk';
import fse from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { CodeAiConfig } from '../../models/cli.model';

/**
 * Gets the target directory from the .codeai.json project configuration file.
 * @returns {Promise<string>} The target directory specified in the config.
 * @throws {Error} If no target directory is specified.
 */
export async function getTargetDirectory(): Promise<string> {
  const configPath = path.join(process.cwd(), '.codeai.json');
  const config = await fse.readJson(configPath);
  const targetDirectory = config.targetDirectory;
  if (!targetDirectory) {
    throw new Error(
      'No target directory specified in the project configuration.'
    );
  }
  return targetDirectory;
}

/**
 * Loads the project configuration from the specified file path.
 * @param {string} configFilePath - The path to the .codeai.json config file.
 * @returns {Promise<CodeAiConfig>} The loaded project configuration object.
 * @throws {Error} If the config file does not exist or is invalid.
 */
export async function loadProjectConfig(
  configFilePath: string
): Promise<CodeAiConfig> {
  const isFileExists = await fse.pathExists(configFilePath);

  if (!isFileExists) {
    const spinner = ora('Loading project configuration...').start();
    spinner.fail('Project configuration file not found.');
    console.error(
      chalk.red(
        'No .codeai.json file found in the current directory. Please initialize your project first.'
      )
    );
    throw new Error(
      'No .codeai.json file found in the current directory. Please initialize your project first.'
    );
  }

  try {
    const config = await fse.readJson(configFilePath);

    if (!config.projectId || !config.targetDirectory) {
      throw new Error('projectId or targetDirectory not found in .codeai.json');
    }
    return config as CodeAiConfig;
  } catch (error) {
    console.error(
      chalk.red('Error reading or parsing .codeai.json file.'),
      error
    );

    throw error;
  }
}

/**
 * Guards against initializing a project in a directory that is already linked to a CodeAI project.
 * @param {string} configFilePath - The path to the .codeai.json config file.
 * @returns {Promise<void>} Resolves if no existing project is found, otherwise throws an error.
 * @throws {Error} If the project is already initialized.
 */
export async function guardAgainstExistingProject(
  configFilePath: string
): Promise<void> {
  const isFileExists = await fse.pathExists(configFilePath);
  if (isFileExists) {
    const spinner = ora();
    spinner.fail('Project already initialized.');

    try {
      const config = await fse.readJson(configFilePath);
      if (config.projectId) {
        console.error(
          chalk.yellow(
            `This directory is already linked to project ID: ${config.projectId}`
          )
        );
      }
    } catch (error) {
      console.error(
        chalk.red('Error reading project configuration file.'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error(
        chalk.yellow(
          'An existing project configuration file was found but could not be read.'
        )
      );

      throw error;
    }

    console.error(
      chalk.yellow('To run a new analysis, use `codeai run <task>`.')
    );
    console.error(
      chalk.yellow('To deploy updated files, use `codeai deploy`.')
    );
    throw new Error(
      'Project already initialized. Use `codeai run <task>` to run a new analysis or `codeai deploy` to deploy updated files.'
    );
  }
}
