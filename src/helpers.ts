import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import { exec, execSync } from 'child_process';
import ora from 'ora';
import * as os from 'os';
import { createZipFromPaths } from './archive';
import { loadApiKey } from './auth';
import { API_BASE_URL } from './constants';

export async function checkAuthentication(): Promise<string> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('❌ You must be logged in. Please run `codeai login`.');
    process.exit(1);
  }
  console.log('✅ Authenticated.');
  return apiKey;
}

export async function compressProject(paths: string[]): Promise<Buffer> {
  const zipSpinner = ora('Compressing project files...').start();
  try {
    const zipBuffer = await createZipFromPaths(paths);
    zipSpinner.succeed(
      `Project compressed (${(zipBuffer.length / 1024).toFixed(2)} KB).`
    );
    return zipBuffer;
  } catch (err) {
    zipSpinner.fail('Error during file compression.');
    console.error(err);
    process.exit(1);
  }
}

export async function createProjectWithFiles(
  zipBuffer: Buffer,
  apiKey: string,
  projectName?: string,
  taskType: string = 'REVIEW',
  language: string = 'en'
): Promise<{ resultsUrl: string; projectId: string }> {
  const uploadSpinner = ora(
    'Uploading project and starting analysis...'
  ).start();
  try {
    const endpointUrl = `${API_BASE_URL}/createProjectWithFilesFunction`;
    const response = await axios.post(endpointUrl, zipBuffer, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/zip',
        'X-Project-Name': projectName || '',
        'X-Task-Type': taskType.toUpperCase(),
        'X-Language': language.toLowerCase(),
        'X-CLI-Version': '1.0.0',
        'User-Agent': 'CodeAI-CLI/1.0.0',
      },
    });

    uploadSpinner.succeed('Analysis successfully initiated!');
    return response.data;
  } catch (error) {
    uploadSpinner.fail('Failed to start analysis.');
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const errorMessage = axiosError.response.data;
      console.error(`❌ Error ${axiosError.response.status}: ${errorMessage}`);
      if (
        axiosError.response.status === 401 ||
        axiosError.response.status === 403
      ) {
        console.error(
          '❌ Unauthorized: Please check your API key or logout and login again.'
        );
      }
    } else {
      console.error('An unexpected error occurred:', axiosError.message);
    }
    process.exit(1);
  }
}

export async function openBrowser(url: string): Promise<void> {
  if (url.length) {
    if (os.platform() === 'darwin') {
      // macOS
      await executeCommand(`open ${url}`);
    } else if (os.platform() === 'win32') {
      // Windows
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

// Helper function to execute commands and handle errors
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

/**
 * Filter and sanitize input file paths for compression.
 * Removes excluded folders/files and unsupported file types.
 */
function collectFilesToCompress(inputPaths: string[]): string[] {
  const path = require('path');
  const fs = require('fs');
  const files: string[] = [];

  function walk(p: string) {
    const absPath = path.resolve(p);
    if (isExcludedPath(absPath)) return;
    if (!fs.existsSync(absPath)) return;
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absPath)) {
        walk(path.join(absPath, entry));
      }
    } else if (isSupportedCodeFile(absPath)) {
      files.push(absPath);
    }
  }

  for (const p of inputPaths) {
    walk(p);
  }
  // Remove duplicates
  return Array.from(new Set(files));
}

/**
 * Returns an array of changed files in the current git repository.
 * @param options Options for filtering (e.g., staged, unstaged, etc.)
 */
export function getChangedFiles(options: { staged?: boolean } = {}): string[] {
  let cmd = 'git diff --name-only';
  if (options.staged) {
    cmd = 'git diff --cached --name-only';
  }
  try {
    const output = execSync(cmd, { encoding: 'utf-8' });
    return output.split('\n').filter(f => f.trim().length > 0);
  } catch (err) {
    console.error('Failed to get changed files from git:', err);
    return [];
  }
}

export function getFilesToCompress(paths: string[], options: any) {
  let filesToCompress: string[];
  if (options.changed) {
    const changedFiles = getChangedFiles({ staged: false });
    filesToCompress = collectFilesToCompress(changedFiles);
    if (filesToCompress.length === 0) {
      console.error(chalk.red('No valid changed files found in git.'));
      process.exit(1);
    }
    console.log(
      chalk.yellow(
        `Analyzing only changed files:\n${filesToCompress.join('\n')}`
      )
    );
  } else {
    filesToCompress = collectFilesToCompress(paths);
    if (filesToCompress.length === 0) {
      console.error(chalk.red('No valid files found in provided paths.'));
      process.exit(1);
    }
  }

  return filesToCompress;
}

/**
 * Returns true if the file is a supported code file.
 */
export function isSupportedCodeFile(filePath: string): boolean {
  return /\.(js|jsx|ts|tsx|json|md|txt|cjs|mjs|css|scss|html|yml|yaml|xml|csv|py|java|go|rb|php|sh|bat|dockerfile|env|tsconfig|eslintrc|prettierrc|gitignore|lock|toml|ini|pl|swift|rs|cpp|h|hpp|c|cs|vb|fs|kt|dart|scala|sql|r|jl|ipynb|sln|props|targets|gradle|makefile|mk|cmake|asm|vue|svelte|astro|tsx|jsx)$/.test(
    filePath
  );
}

/**
 * Returns true if the path should be excluded (e.g., node_modules, .git, dist, etc.)
 */
export function isExcludedPath(filePath: string): boolean {
  return /(^|\/)(node_modules|\.git|dist|build|coverage|out|.next|.cache|tmp|temp|\.vscode|\.idea|\.husky|\.DS_Store|\.env.*|\.yarn|\.pnpm|\.parcel-cache|\.turbo|\.vercel|\.firebase|\.sentry|\.nyc_output|\.storybook|README\.md|package\.json|package-lock\.json|tsconfig\.json|tsconfig\..*|commitlint\.config\.json|\.[^/]+)(\/|$)/i.test(
    filePath
  );
}
