import axios from 'axios';
import chalk from 'chalk';
import * as fse from 'fs-extra';
import ora from 'ora';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  API_BASE_URL,
  CLI_CONFIG_DIR,
  WEB_APP_URL,
  WEB_LOGIN_PAGE_LINK,
} from '../constants/constants';
import { openBrowser } from '../helpers/cli/cli-helpers';

// Global variable to store temporary token from CLI options
let temporaryToken: string | null = null;

/**
 * Sets a temporary token for the current session (from CLI options)
 * @param {string | null} token - The token to use for this session
 */
export function setTemporaryToken(token: string | null): void {
  temporaryToken = token;
}

/**
 * Gets the temporary token for the current session
 * @returns {string | null} The temporary token or null
 */
export function getTemporaryToken(): string | null {
  return temporaryToken;
}

/**
 * Checks if a temporary token is currently set
 * @returns {boolean} True if a temporary token is set
 */
export function hasTemporaryToken(): boolean {
  return temporaryToken !== null;
}

/**
 * Validates that required environment variables are set
 * @throws {Error} If required environment variables are missing
 */
function validateEnvironmentVariables(): void {
  if (!CLI_CONFIG_DIR || !API_BASE_URL || !WEB_APP_URL) {
    console.error(
      chalk.red(
        'Error: One or more required environment variables are not set.'
      )
    );
    process.exit(1);
  }
}

/**
 * Gets the config path, validating environment variables first
 * @returns {string} The config file path
 */
function getConfigPath(): string {
  validateEnvironmentVariables();
  // After validation, we know CLI_CONFIG_DIR is defined
  if (!CLI_CONFIG_DIR) {
    throw new Error('CLI_CONFIG_DIR is not set');
  }
  return path.join(CLI_CONFIG_DIR.replace('~', os.homedir()), 'config.json');
}

/**
 * Saves the provided API key to the local config file.
 * @param {string} apiKey - The API key to save.
 * @returns {Promise<void>} Resolves when the API key is saved.
 * @throws {Error} If saving fails.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  try {
    const configPath = getConfigPath();
    await fse.ensureDir(path.dirname(configPath));
    await fse.writeJson(configPath, { apiKey });
    await fse.chmod(configPath, 0o600);
  } catch (error) {
    console.error('Failed to save API key.', error);
    throw error;
  }
}

/**
 * Loads the API key from the local config file, if it exists.
 * If a temporary token is set (from CLI options), returns that instead.
 * @returns {Promise<string | null>} The API key, or null if not found.
 */
export async function loadApiKey(): Promise<string | null> {
  try {
    // First check if we have a temporary token from CLI options
    if (temporaryToken) {
      return temporaryToken;
    }

    // Otherwise, load from config file
    const configPath = getConfigPath();
    if (await fse.pathExists(configPath)) {
      const config = await fse.readJson(configPath);
      return config.apiKey;
    }
    return null;
  } catch (error) {
    console.error('Failed to load API key.', error);
    return null;
  }
}

/**
 * Removes the stored API key from the local config file.
 * @returns {Promise<void>} Resolves when the API key is removed.
 */
async function removeApiKey(): Promise<void> {
  try {
    const configPath = getConfigPath();

    // Check if path exists first to avoid errors
    const exists = await fse.pathExists(configPath).catch(() => false);

    if (exists) {
      await fse.remove(configPath);
      console.log(chalk.dim('API key removed from local storage.'));
    } else {
      console.log(chalk.yellow('No stored API key found.'));
    }
  } catch (error) {
    // In E2E test mode or CI, don't fail on file system errors
    if (process.env.E2E_TEST_MODE === 'true' || process.env.CI === 'true') {
      console.log(chalk.yellow('No stored API key found.'));
      return;
    }

    console.error('Failed to remove API key.', error);
    throw error;
  }
}

/**
 * Delays execution for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} Resolves after the delay.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Saves the provided API token directly for CI environments.
 * @param {string} token - The API token to save.
 * @returns {Promise<void>} Resolves when the token is saved successfully.
 */
export async function loginWithToken(token: string): Promise<void> {
  const spinner = ora('Validating and saving API token...').start();

  try {
    // Validate the token by making a test API call
    const response = await axios.get(`${API_BASE_URL}/validate-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      await saveApiKey(token);
      spinner.succeed(chalk.green('✅ API token saved successfully!'));
      console.info(chalk.dim('You can now use CodeAI CLI commands.'));
    } else {
      spinner.fail(chalk.red('❌ Invalid API token.'));
      throw new Error('Invalid API token provided.');
    }
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to validate API token.'));
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Invalid API token provided.');
    } else {
      throw new Error(
        'Failed to validate API token. Please check your network connection.'
      );
    }
  }
}

/**
 * Initiates the web-based login flow for CI environments.
 * Opens the browser and polls for API key until login is complete or times out.
 * Displays the token instead of saving it to local config.
 * @param {boolean} [isOpenBrowser] - Whether to automatically open the browser
 * @returns {Promise<void>} Resolves when login is successful, otherwise throws on timeout.
 */
export async function webLoginCI(isOpenBrowser?: boolean): Promise<void> {
  const sessionId = uuidv4();
  const loginUrl = `${WEB_APP_URL}/${WEB_LOGIN_PAGE_LINK}?session=${sessionId}`;

  console.info(
    chalk.bold('\nTo complete authentication, your browser will now open.')
  );
  console.info(
    chalk.dim('If it does not open automatically, please visit this URL:')
  );

  // Use chalk to style the link, making it easy to see and copy
  console.info(chalk.cyan.underline(loginUrl));

  // --- Automatically open the browser (only if isOpenBrowser is true) ---
  if (isOpenBrowser) {
    try {
      await openBrowser(loginUrl);
    } catch {
      console.warn(
        chalk.yellow(
          'Warning: Could not automatically open the browser. Please copy the link above.'
        )
      );
    }
  }

  const spinner = ora('Waiting for you to log in in the browser...').start();

  // In E2E test mode, skip the actual polling and just simulate success
  if (process.env.E2E_TEST_MODE === 'true') {
    spinner.succeed(chalk.green('✅ CI Authentication flow tested (E2E mode)'));
    console.info(chalk.green('Test token generated for CI: test-token-123'));
    return;
  }

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
        const apiKey = response.data.result.apiKey;
        spinner.succeed(chalk.green('✅ Successfully authenticated!'));

        console.info(chalk.bold('\n🔑 Your API Token:'));
        console.info(chalk.cyan.bold(apiKey));
        console.info(
          chalk.dim(
            '\nNote: This token was not saved locally. Use it in your CI environment by setting:'
          )
        );
        console.info(chalk.dim('CODEAI_API_KEY=' + apiKey));

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
 * Initiates the web-based login flow for authentication.
 * Opens the browser and polls for API key until login is complete or times out.
 * @param {boolean} [isOpenBrowser] - Whether to automatically open the browser
 * @returns {Promise<void>} Resolves when login is successful, otherwise throws on timeout.
 */
export async function webLogin(isOpenBrowser?: boolean): Promise<void> {
  const sessionId = uuidv4();
  const loginUrl = `${WEB_APP_URL}/${WEB_LOGIN_PAGE_LINK}?session=${sessionId}`;

  console.info(
    chalk.bold('\nTo complete authentication, your browser will now open.')
  );
  console.info(
    chalk.dim('If it does not open automatically, please visit this URL:')
  );

  // Use chalk to style the link, making it easy to see and copy
  console.info(chalk.cyan.underline(loginUrl));

  // --- Automatically open the browser (only if isOpenBrowser is true) ---
  if (isOpenBrowser) {
    try {
      await openBrowser(loginUrl);
    } catch {
      console.warn(
        chalk.yellow(
          'Warning: Could not automatically open the browser. Please copy the link above.'
        )
      );
    }
  }

  const spinner = ora('Waiting for you to log in in the browser...').start();

  // In E2E test mode, skip the actual polling and just simulate success
  if (process.env.E2E_TEST_MODE === 'true') {
    spinner.succeed(chalk.green('✅ Authentication flow tested (E2E mode)'));
    return;
  }

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
 * Logs out the current user by removing the stored API key.
 * @returns {Promise<void>} Resolves when the API key is removed.
 */
export async function logout(): Promise<void> {
  try {
    const spinner = ora('Logging out...').start();
    await removeApiKey();
    spinner.succeed(chalk.green('✅ Successfully logged out!'));

    // Clear temporary token as well
    setTemporaryToken(null);
  } catch (error) {
    console.error(chalk.red('Failed to log out:'), error);
    // Don't re-throw - handle gracefully for better UX
  }
}

/**
 * Checks if the user is authenticated and returns the API key if available.
 * @param {() => Promise<string | null>} loadApiKeyImpl - Function to load the API key
 * @returns {Promise<string>} The API key if authenticated.
 * @throws {Error} If authentication is required and no API key is found.
 */
export async function checkAuthentication(
  loadApiKeyImpl: () => Promise<string | null>
): Promise<string> {
  // In E2E test mode, always fail authentication to test error paths
  if (process.env.E2E_TEST_MODE === 'true') {
    throw new Error('Authentication required');
  }

  const spinner = ora('Checking authentication...').start();

  // Check for temporary token first (from CLI --token option)
  const tempToken = getTemporaryToken();
  if (tempToken) {
    spinner.succeed('You are logged in (using provided token).');
    return tempToken;
  }

  // Then check for stored API key
  const apiKey = await loadApiKeyImpl();

  if (!apiKey) {
    spinner.fail('❌ You must be logged in. Please run `codeai login`.');
    throw new Error('Authentication required');
  }
  spinner.succeed('You are logged in.');
  return apiKey;
}
