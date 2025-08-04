import chalk from 'chalk';
import fse from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { CodeAiConfig } from '../../models/cli.model';

/**
 * Checks if the given file path matches supported code file extensions.
 * @param {string} filePath - The file path to check.
 * @returns {boolean} True if the file is supported, false otherwise.
 */
export function isSupportedCodeFile(filePath: string): boolean {
  return /\.(js|jsx|ts|tsx|json|md|txt|cjs|mjs|css|scss|html|yml|yaml|xml|csv|py|java|go|rb|php|sh|bat|dockerfile|env|tsconfig|eslintrc|prettierrc|gitignore|lock|toml|ini|pl|swift|rs|cpp|h|hpp|c|cs|vb|fs|kt|dart|scala|sql|r|jl|ipynb|sln|props|targets|gradle|makefile|mk|cmake|asm|vue|svelte|astro|tsx|jsx)$/.test(
    filePath
  );
}

/**
 * Checks if the given file path matches excluded directories or files.
 * @param {string} filePath - The file path to check.
 * @returns {boolean} True if the path is excluded, false otherwise.
 */
export function isExcludedPath(filePath: string): boolean {
  return /(^|\/)(node_modules|\.git|dist|build|coverage|out|.next|.cache|tmp|temp|\.vscode|\.idea|\.husky|\.DS_Store|\.env.*|\.yarn|\.pnpm|\.parcel-cache|\.turbo|\.vercel|\.firebase|\.sentry|\.nyc_output|\.storybook|README\.md|package\.json|package-lock\.json|tsconfig\.json|tsconfig\..*|commitlint\.config\.json|\.[^/]+)(\/|$)/i.test(
    filePath
  );
}

/**
 * Checks the total upload size of files against the configured limit.
 * @param {string[]} filesToProcess - The list of files to process.
 * @param {Partial<CodeAiConfig>} config - The project configuration object.
 * @returns {Promise<void>} Resolves if the upload size is within the limit, otherwise throws an error.
 */
export async function checkUploadSize(
  filesToProcess: string[],
  config: Partial<CodeAiConfig>
): Promise<void> {
  const spinner = ora('Calculating total upload size...').start();
  const limitMB = config.maxUploadSizeMB || 10;
  try {
    let totalSizeBytes = 0;
    const projectRoot = process.cwd();
    for (const relativePath of filesToProcess) {
      const absolutePath = path.join(projectRoot, relativePath);
      if (await fse.pathExists(absolutePath)) {
        const stats = await fse.stat(absolutePath);
        totalSizeBytes += stats.size;
      }
    }
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    if (totalSizeMB > limitMB) {
      spinner.fail('Upload size limit exceeded.');
      console.error(
        chalk.red(
          `❌ Total size of files to upload (${totalSizeMB.toFixed(2)}MB) exceeds the project limit of ${limitMB}MB.`
        )
      );

      throw new Error(
        `Total size of files to upload (${totalSizeMB.toFixed(2)}MB) exceeds the project limit of ${limitMB}MB.`
      );
    }
    spinner.succeed(`Upload size check passed (${totalSizeMB.toFixed(2)}MB).`);
  } catch (error) {
    spinner.fail('Failed to calculate upload size.');
    console.error(chalk.red('Error calculating upload size:'), error);
    throw new Error('Failed to calculate upload size.');
  }
}
