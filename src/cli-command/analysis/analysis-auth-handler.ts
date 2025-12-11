import chalk from 'chalk';
import { hasTemporaryToken, webLogin } from '../../auth/auth';
import { setupAnalysisContext } from '../../helpers/analysis/analysis-helpers';
import {
  promptForLogin,
  promptForProjectCreation,
} from '../../helpers/prompts/prompt-helpers';
import { AnalysisAuthContext } from './analysis-strategy.interface';

/**
 * Handles authentication and project setup for analysis commands
 */
export class AnalysisAuthHandler {
  /**
   *
   * @param isNonInteractive
   */
  constructor(private readonly isNonInteractive: boolean) {}

  /**
   * Ensures user is authenticated and project is configured
   * @returns Authentication context with apiKey and projectId
   */
  async ensureAuthContext(): Promise<AnalysisAuthContext> {
    try {
      return await this.tryGetAuthContext();
    } catch (error) {
      return await this.handleAuthError(error as never);
    }
  }

  /**
   * Attempts to get authentication context from existing configuration
   */
  private async tryGetAuthContext(): Promise<AnalysisAuthContext> {
    const context = await setupAnalysisContext();
    return {
      apiKey: context.apiKey,
      projectId: context.projectId,
    };
  }

  /**
   * Handles authentication errors with appropriate fallbacks
   * @param error
   */
  private async handleAuthError(error: Error): Promise<AnalysisAuthContext> {
    if (this.isAuthenticationError(error)) {
      return await this.handleAuthenticationError();
    }

    if (this.isProjectConfigError(error)) {
      return await this.handleProjectConfigError();
    }

    throw error;
  }

  /**
   * Handles authentication errors (invalid or missing tokens)
   */
  private async handleAuthenticationError(): Promise<AnalysisAuthContext> {
    if (hasTemporaryToken()) {
      this.exitWithInvalidTokenError();
    }

    if (this.isNonInteractive) {
      this.exitWithNonInteractiveAuthError();
    }

    await this.performInteractiveLogin();
    return await this.tryGetAuthContextAfterLogin();
  }

  /**
   * Handles project configuration errors (missing .codeai.json)
   */
  private async handleProjectConfigError(): Promise<AnalysisAuthContext> {
    if (this.isNonInteractive) {
      this.exitWithNonInteractiveProjectError();
    }

    await this.performInteractiveProjectCreation();
    return await this.tryGetAuthContext();
  }

  /**
   * Performs interactive login flow
   */
  private async performInteractiveLogin(): Promise<void> {
    const shouldLogin = await promptForLogin();
    if (!shouldLogin) {
      console.info(chalk.yellow('Analysis cancelled.'));
      process.exit(0);
    }

    await webLogin(true);
  }

  /**
   * Performs interactive project creation flow
   */
  private async performInteractiveProjectCreation(): Promise<void> {
    const shouldCreateProject = await promptForProjectCreation();
    if (!shouldCreateProject) {
      console.info(chalk.yellow('Analysis cancelled.'));
      process.exit(0);
    }

    // Import programCreateProject to avoid circular dependency
    const { programCreateProject } = await import('../cli-command-helpers');
    await programCreateProject({
      targetDirectoryArg: '',
      options: {},
    });
  }

  /**
   * Attempts to get auth context after login, with project creation fallback
   */
  private async tryGetAuthContextAfterLogin(): Promise<AnalysisAuthContext> {
    try {
      return await this.tryGetAuthContext();
    } catch (projectError) {
      if (this.isProjectConfigError(projectError as Error)) {
        if (this.isNonInteractive) {
          this.exitWithNonInteractiveProjectError();
        }

        await this.performInteractiveProjectCreation();
        return await this.tryGetAuthContext();
      }
      throw projectError;
    }
  }

  /**
   * Checks if error is an authentication error
   * @param error
   */
  private isAuthenticationError(error: Error): boolean {
    return error.message === 'Authentication required';
  }

  /**
   * Checks if error is a project configuration error
   * @param error
   */
  private isProjectConfigError(error: Error): boolean {
    return error.message.includes('.codeai.json');
  }

  /**
   * Exits with invalid token error message
   */
  private exitWithInvalidTokenError(): never {
    console.error(
      chalk.red.bold(
        '\n❌ Invalid API token provided. Please check your token and try again.'
      )
    );
    process.exit(1);
  }

  /**
   * Exits with non-interactive authentication error message
   */
  private exitWithNonInteractiveAuthError(): never {
    console.error(
      chalk.red.bold(
        '\n❌ Authentication required but CLI is running in non-interactive/CI mode. Please provide valid authentication before running analysis.'
      )
    );
    process.exit(1);
  }

  /**
   * Exits with non-interactive project configuration error message
   */
  private exitWithNonInteractiveProjectError(): never {
    console.error(
      chalk.red.bold(
        '\n❌ Project configuration not found and CLI is running in non-interactive/CI mode. Please create a project before running analysis.'
      )
    );
    process.exit(1);
  }
}
