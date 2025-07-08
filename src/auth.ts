import axios from 'axios';
import chalk from 'chalk'; // <-- Import `chalk`
import * as fse from 'fs-extra';
import open from 'open';
import ora from 'ora';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL, WEB_APP_URL, CLI_CONFIG_DIR } from './constants';

const CONFIG_PATH = path.join(
  CLI_CONFIG_DIR.replace('~', os.homedir()),
  'config.json'
);

interface Config {
  apiKey: string;
}

/**
 * Saves the API key to a local config file.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  // ... (implementation is correct, no changes needed)
  try {
    await fse.ensureDir(path.dirname(CONFIG_PATH));
    await fse.writeJson(CONFIG_PATH, { apiKey });
    await fse.chmod(CONFIG_PATH, 0o600);
  } catch (error) {
    console.error('Failed to save API key.', error);
    throw error;
  }
}

/**
 * Loads the API key from the local config file.
 */
export async function loadApiKey(): Promise<string | null> {
  try {
    if (await fse.pathExists(CONFIG_PATH)) {
      const config: Config = await fse.readJson(CONFIG_PATH);
      return config.apiKey || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to load API key.', error);
    return null;
  }
}

/**
 * Removes the local config file.
 */
async function removeApiKey(): Promise<void> {
  // This is an internal helper
  try {
    if (await fse.pathExists(CONFIG_PATH)) {
      await fse.remove(CONFIG_PATH);
    }
  } catch (error) {
    console.error('Failed to remove API key.', error);
  }
}

/**
 * Delays execution for a given number of milliseconds.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Manages the web-based login flow for the CLI.
 */
export async function webLogin(): Promise<void> {
  const sessionId = uuidv4();
  const loginUrl = `${WEB_APP_URL}/cli-login?session=${sessionId}`;

  console.log(
    chalk.bold('\nTo complete authentication, your browser will now open.')
  );
  console.log(
    chalk.dim('If it does not open automatically, please visit this URL:')
  );

  // Use chalk to style the link, making it easy to see and copy
  console.log(chalk.cyan.underline(loginUrl));

  // --- Automatically open the browser ---
  try {
    open(loginUrl);
  } catch (error) {
    console.warn(
      chalk.yellow(
        'Warning: Could not automatically open the browser. Please copy the link above.',
        error
      )
    );
  }
  // ---

  const spinner = ora('Waiting for you to log in in the browser...').start();
  const maxAttempts = 40;
  const pollInterval = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/getCliApiKeyFunction`,
        {
          data: { sessionId },
        }
      );
      if (response.data && response.data.result.apiKey) {
        await saveApiKey(response.data.result.apiKey);
        spinner.succeed(chalk.green('✅ Successfully logged in!'));
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Ignore polling errors while waiting
    }
    await delay(pollInterval);
  }

  spinner.fail(chalk.red('❌ Login timed out. Please try again.'));
  throw new Error('Login timed out.');
}

/**
 * Logs the user out by deleting their stored API key.
 */
export async function logout(): Promise<void> {
  // <-- ADDED THIS EXPORTED FUNCTION
  await removeApiKey();
}
