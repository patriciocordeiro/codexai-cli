// import axios, { AxiosError } from 'axios';
// import chalk from 'chalk';
// import { Command } from 'commander';
// import fse from 'fs-extra';
// import inquirer from 'inquirer';
// import ora from 'ora';
// import path from 'path';
// import {
//   createProjectWithFiles,
//   getProjectManifest,
//   triggerAnalysis,
//   updateProjectFiles,
// } from './api/api';
// import { checkAuthentication, logout, webLogin } from './auth/auth';
// import { logConfiguration, validateEnvironment } from './config/config';
// import {
//   CONFIG_FILE_PATH,
//   HTTP_TIMEOUT,
//   IS_PRODUCTION,
// } from './constants/constants';
// import {
//   createProjectArchive,
//   createZipFromPaths,
// } from './file-utils/file-utils';

// import { openBrowser } from './helpers/cli/cli-helpers';
// import {
//   getTargetDirectory,
//   guardAgainstExistingProject,
//   loadProjectConfig,
// } from './helpers/config/config-helpers';
// import { deployChangesIfNeeded } from './helpers/deploy/deploy-helpers';
// import { getProjectName } from './helpers/project/project-helpers';
// import {
//   determineAnalysisScope,
//   getFilesForScope,
// } from './helpers/scope/scope-helpers';

// validateEnvironment();

// if (!IS_PRODUCTION) {
//   logConfiguration();
// }

// axios.defaults.timeout = HTTP_TIMEOUT;

// const program = new Command();

// program
//   .name('codeai')
//   .description(
//     'A CLI tool for AI-powered code analysis and automated code review using AI'
//   )
//   .version('0.0.1');

// // --- Auth Commands ---
// program
//   .command('login')
//   .description('Authenticate via your web browser.')
//   .action(async () => {
//     try {
//       await webLogin();
//     } catch (error) {
//       // Error logging is handled within webLogin, so we just exit
//       console.error(chalk.red.bold('\nAuthentication failed.', error));
//       process.exit(1);
//     }
//   });

// program
//   .command('logout')
//   .description('Sign out and remove the local API key.')
//   .action(async () => {
//     await logout();
//     console.log('✅ You have been logged out.');
//   });

// program
//   .command('create')
//   .description(
//     'Initializes and creates a new CodeAI project from the current directory.'
//   )
//   .argument(
//     '[path]',
//     'Optional: The main directory to analyze (e.g., "src"). Defaults to the entire project.'
//   )
//   .option(
//     '-n, --name <name>',
//     'Override the project name (from package.json or current folder name)'
//   )
//   .action(async (targetDirectoryArg, options) => {
//     programCreateProject(targetDirectoryArg, options);
//   });

// program
//   .command('deploy')
//   .description('Deploys file changes to your linked CodeAI project.')
//   .action(async () => {
//     const spinner = ora();
//     try {
//       console.log('🚀 Deploying file changes to CodeAI...');

//       // 1. Load project config and authenticate
//       const configFilePath = path.join(process.cwd(), '.codeai.json');
//       const { projectId } = await loadProjectConfig(configFilePath);
//       const apiKey = await checkAuthentication();
//       spinner.succeed(`Deploying to project: ${chalk.bold(projectId)}`);

//       // 2. Get the current state of the backend manifest
//       spinner.start('Fetching remote project state...');
//       const remoteManifest = await getProjectManifest(apiKey, projectId);
//       spinner.succeed('Remote state fetched.');

//       // 3. Get the current state of the local files
//       spinner.start('Scanning local files and calculating hashes...');
//       // We can reuse
//       //  for this, but we only need the manifest part.
//       // (For simplicity, we'll call it and just use the manifest. This could be optimized later.)
//       const targetDirectory = await getTargetDirectory();

//       const { fileManifest: localManifest } = await createProjectArchive(
//         process.cwd(),
//         targetDirectory // <-- PASSING THE NEW ARGUMENT
//       );

//       spinner.succeed(
//         `Found ${Object.keys(localManifest).length} local files.`
//       );

//       // 4. Calculate the "diff"
//       spinner.start('Comparing local and remote files...');

//       const filesToUpdate: string[] = [];
//       const manifestForUpdate: Record<string, string> = {};

//       for (const [filePath, localHash] of Object.entries(localManifest)) {
//         // A file needs updating if it's new OR if its hash has changed
//         if (remoteManifest[filePath] !== localHash) {
//           filesToUpdate.push(filePath);
//           manifestForUpdate[filePath] = localHash;
//         }
//       }

//       // --- NEW SIZE CHECK LOGIC ---
//       // if (filesToUpdate.length > 0 && !options.force) {
//       //   spinner.start('Calculating upload size...');
//       //   let totalSize = 0;
//       //   for (const file of filesToUpdate) {
//       //     const stats = await fse.stat(file);
//       //     totalSize += stats.size;
//       //   }
//       //   const totalSizeMB = totalSize / (1024 * 1024);
//       //   const limitMB = config.maxUploadSizeMB || 10;

//       //   spinner.stop();
//       //   if (totalSizeMB > limitMB) {
//       //     console.error(
//       //       chalk.red(
//       //         `❌ Upload size (${totalSizeMB.toFixed(2)}MB) exceeds the project limit of ${limitMB}MB.`
//       //       )
//       //     );
//       //     console.error(
//       //       chalk.yellow(
//       //         `To override this, you can edit '.codeai.json' or use the --force flag.`
//       //       )
//       //     );
//       //     process.exit(1);
//       //   }
//       //   console.log(
//       //     `✅ Upload size check passed (${totalSizeMB.toFixed(2)}MB).`
//       //   );
//       // }
//       // --- END OF SIZE CHECK LOGIC ---

//       if (filesToUpdate.length === 0) {
//         spinner.succeed(
//           'No file changes detected. Your project is already up to date!'
//         );
//         return; // Exit gracefully
//       }
//       spinner.succeed(
//         `Found ${filesToUpdate.length} new or modified files to deploy.`
//       );

//       // 5. Create a "patch" ZIP containing only the changed files
//       spinner.start('Compressing changed files...');
//       const patchZipBuffer = await createZipFromPaths(
//         filesToUpdate,
//         process.cwd()
//       ); // createZipFromPaths is perfect for this
//       spinner.succeed(
//         `Compressed patch file (${(patchZipBuffer.length / 1024).toFixed(2)} KB).`
//       );

//       // 6. Upload the patch
//       spinner.start('Uploading patch to the server...');
//       await updateProjectFiles(
//         apiKey,
//         projectId,
//         patchZipBuffer,
//         manifestForUpdate
//       );
//       spinner.succeed(chalk.green('✅ Project successfully deployed!'));

//       console.log('\nYou can now run an analysis on the updated project:');
//       console.log(chalk.cyan(`  codeai run REVIEW`));
//     } catch (error) {
//       console.error(chalk.red('Error during deployment:'), error);
//       spinner.fail('An error occurred during deployment.');
//       process.exit(1);
//     }
//   });

// program
//   .command('run')
//   .description(
//     'Run a new analysis on the linked project after deploying any local changes.'
//   )
//   .argument('<task>', 'The analysis task to run (e.g., REVIEW)')
//   .argument(
//     '[paths...]',
//     'Optional: Specific files or folders to analyze. If omitted, uses the target directory from .codeai.json.'
//   )
//   .option(
//     '-c, --changed',
//     'Analyze only the files changed in your local git repository.'
//   )
//   .option(
//     '-l, --language <lang>',
//     'Specify language for analysis results',
//     'en'
//   )
//   .action(async (task, paths, options) => {
//     try {
//       // 1. Load project and authenticate
//       const { projectId } = await loadProjectConfig(CONFIG_FILE_PATH);
//       console.log(
//         `🚀 Starting analysis for project ${chalk.bold(projectId)}...`
//       );
//       const apiKey = await checkAuthentication();

//       // 2. Determine and VALIDATE the scope of files for this run.
//       const { scope, targetFilePaths } = await determineAnalysisScope(
//         paths,
//         options,
//         getFilesForScope
//       );

//       // If scope analysis resulted in no files (e.g., no git changes), exit.
//       if (scope === 'SELECTED_FILES' && targetFilePaths.length === 0) {
//         console.log(
//           chalk.yellow('No files to analyze in the specified scope.')
//         );
//         return;
//       }

//       // 3. Check for and deploy any out-of-sync files to update project context.
//       await deployChangesIfNeeded(apiKey, projectId);

//       // 4. Trigger the analysis with the determined scope.
//       const spinner = ora('Sending analysis request to the server...').start();
//       const { resultsUrl } = await triggerAnalysis(
//         apiKey,
//         projectId,
//         task,
//         options.language,
//         scope,
//         targetFilePaths
//       );

//       spinner.succeed('Analysis successfully initiated!');

//       // 5. Display results.
//       console.log('\n✅ View analysis progress and results at:');
//       console.log(chalk.blue.underline(resultsUrl));

//       // Optionally open the results in the browser
//       if (!IS_PRODUCTION) {
//         openBrowser(resultsUrl);
//       }
//     } catch (error) {
//       // The helpers will have already logged specific spinner failures.
//       // This is a final catch-all.
//       const axiosError = error as AxiosError;
//       if (axiosError?.response) {
//         const errorMessage =
//           (axiosError.response.data as any)?.error?.message ||
//           JSON.stringify(axiosError.response.data);
//         console.error(
//           chalk.red.bold(`\n❌ A backend error occurred: ${errorMessage}`)
//         );
//       } else {
//         console.error(
//           chalk.red.bold('\n❌ An unexpected error occurred:'),
//           error
//         );
//       }
//       process.exit(1);
//     }
//   });

// // Only run the CLI if this file is being executed directly, not when imported for testing
// if (require.main === module) {
//   program.parse(process.argv);
// }

// async function programCreateProject(
//   targetDirectoryArg: string,
//   options: { name?: string }
// ) {
//   const spinner = ora();

//   try {
//     // 1. Guard: Check if a project is already initialized here.
//     spinner.start('Initializing new CodeAI project...');
//     await guardAgainstExistingProject(CONFIG_FILE_PATH);
//     spinner.succeed(
//       'No existing project found. Proceeding with initialization.'
//     );

//     // 2. Authenticate
//     const apiKey = await checkAuthentication();

//     // 3. Determine Project Name
//     spinner.start('Determining project name...');
//     const projectName = await getProjectName(options);
//     spinner.succeed(`Project name set to: ${chalk.bold(projectName)}`);

//     // 4. Determine Target Directory
//     let targetDirectory = targetDirectoryArg;
//     if (!targetDirectory) {
//       const answers = await inquirer.prompt([
//         {
//           type: 'input',
//           name: 'targetDir',
//           message:
//             'Enter the primary directory to analyze, or leave blank for the entire project:',
//           default: '.',
//         },
//       ]);
//       targetDirectory =
//         answers.targetDir.trim() === '' ? '.' : answers.targetDir.trim();
//     }

//     if (!(await fse.pathExists(targetDirectory))) {
//       spinner.fail(
//         `The specified target directory "${targetDirectory}" does not exist.`
//       );
//       process.exit(1);
//     }
//     spinner.succeed(
//       `Project target directory set to: ${chalk.bold(targetDirectory)}`
//     );

//     // 5. Scan, Hash, and Zip Project Files
//     spinner.start('Scanning and preparing project files...');
//     const { zipBuffer, fileManifest, includedFiles } =
//       await createProjectArchive(process.cwd(), targetDirectory);

//     if (includedFiles.length === 0) {
//       spinner.fail('No files found to upload.');
//       console.error(
//         chalk.red(
//           'No files were found in the target directory after applying ignore rules.'
//         )
//       );
//       process.exit(1);
//     }

//     // 6. Check Upload Size (No user override)
//     // await checkUploadSize(includedFiles, { maxUploadSizeMB: 10 }); // Using default 10MB limit for create

//     spinner.succeed(
//       `Prepared ${includedFiles.length} files for upload (${(zipBuffer.length / 1024).toFixed(2)} KB).`
//     );

//     // 7. Call Backend to Create Project
//     spinner.start('Creating project on the server...');
//     const { projectId, projectUrl } = await createProjectWithFiles(
//       apiKey,
//       projectName,
//       zipBuffer,
//       fileManifest
//     );
//     spinner.succeed(`Project created with ID: ${chalk.bold(projectId)}`);

//     // 8. Create Local Config File
//     const configFilePath = path.join(process.cwd(), '.codeai.json');
//     const DEFAULT_UPLOAD_LIMIT_MB = 10;
//     await fse.writeJson(
//       configFilePath,
//       {
//         projectId,
//         targetDirectory,
//         maxUploadSizeMB: DEFAULT_UPLOAD_LIMIT_MB,
//       },
//       { spaces: 2 }
//     );
//     console.log(
//       `✅ Configuration file created at ${chalk.green('.codeai.json')}`
//     );

//     // 9. Final Instructions
//     console.log(chalk.bold.green('\nProject created and linked successfully!'));
//     console.log('To run your first analysis, use the command:');
//     console.log(chalk.cyan('  codeai run REVIEW'));

//     openBrowser(projectUrl).catch(() => {
//       console.warn(
//         chalk.yellow(
//           `Could not automatically open browser. Please visit: ${projectUrl}`
//         )
//       );
//     });
//   } catch (error: any) {
//     if (!spinner.isSpinning) {
//       // If a spinner wasn't active, we need to log the error title
//       console.error(
//         chalk.red.bold('\n❌ An error occurred during project creation.')
//       );
//     } else {
//       spinner.fail('An error occurred during project creation.');
//     }

//     if (error.isAxiosError) {
//       console.error(
//         chalk.red(`API Error: ${error.response?.data?.error || error.message}`)
//       );
//     } else {
//       console.error(chalk.red(`Error: ${error.message}`));
//     }
//     process.exit(1);
//   }
// }
