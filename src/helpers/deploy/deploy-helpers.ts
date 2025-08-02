import chalk from 'chalk';
import ora from 'ora';
import { getProjectManifest, updateProjectFiles } from '../../api/api';
import {
  createProjectArchive,
  createZipFromPaths,
} from '../../file-utils/file-utils';
import { getTargetDirectory } from '../config/config-helpers';

export async function deployChangesIfNeeded(
  apiKey: string,
  projectId: string
): Promise<void> {
  const spinner = ora('Checking for local file changes...').start();
  const targetDirectory = await getTargetDirectory();
  const [remoteManifest, { fileManifest: localManifest }] = await Promise.all([
    getProjectManifest(apiKey, projectId),
    createProjectArchive(process.cwd(), targetDirectory),
  ]);
  const filesToUpdate: string[] = [];
  const manifestForUpdate: Record<string, string> = {};
  for (const [filePath, localHash] of Object.entries(localManifest)) {
    if (remoteManifest[filePath] !== localHash) {
      filesToUpdate.push(filePath);
      manifestForUpdate[filePath] = localHash;
    }
  }
  if (filesToUpdate.length > 0) {
    spinner.warn(
      chalk.yellow(
        `Found ${filesToUpdate.length} local changes. Deploying updates before analysis...`
      )
    );
    const patchZipBuffer = await createZipFromPaths(
      filesToUpdate,
      process.cwd()
    );
    await updateProjectFiles(
      apiKey,
      projectId,
      patchZipBuffer,
      manifestForUpdate
    );
    spinner.succeed('Project context updated successfully.');
  } else {
    spinner.succeed('Project is up-to-date.');
  }
}
