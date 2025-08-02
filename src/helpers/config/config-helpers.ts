import chalk from 'chalk';
import fse from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { CodeAiConfig } from '../../models/config.model';

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

    console.log('Config loaded:', config);
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
        chalk.red('Error reading .codeai.json file.'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error(
        chalk.yellow(
          'An existing .codeai.json file was found but could not be read.'
        )
      );
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
  } else {
    const spinner = ora('Project initialized successfully.').start();
    spinner.succeed(
      'Project initialized successfully. You can now run analyses.'
    );
  }
}
