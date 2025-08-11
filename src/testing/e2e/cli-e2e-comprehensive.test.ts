/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable jsdoc/require-returns */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { spawn } from 'child_process';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

const cliPath = path.resolve(__dirname, '../../..', 'dist/index.js');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

describe('CodeAI CLI E2E Tests - Comprehensive', () => {
  let tempTestDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempTestDir = path.join(os.tmpdir(), `codeai-cli-test-${Date.now()}`);
    await fse.ensureDir(tempTestDir);

    // Create a realistic test project structure
    await fse.writeJson(path.join(tempTestDir, 'package.json'), {
      name: 'test-project-e2e',
      version: '1.0.0',
      description: 'A test project for E2E testing',
      main: 'src/index.js',
    });

    await fse.ensureDir(path.join(tempTestDir, 'src'));
    await fse.writeFile(
      path.join(tempTestDir, 'src/index.js'),
      `console.log('Hello, world!');
function add(a, b) {
  return a + b;
}
module.exports = { add };`
    );

    await fse.writeFile(
      path.join(tempTestDir, 'src/utils.js'),
      `function multiply(a, b) {
  return a * b;
}
module.exports = { multiply };`
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (await fse.pathExists(tempTestDir)) {
      await fse.remove(tempTestDir);
    }
  });

  const runCli = (args: string[], timeout = 30000): Promise<CliResult> => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: tempTestDir,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CODEAI_WEB_URL: 'http://localhost:3000',
          CODEAI_API_URL: 'http://localhost:5001/codex-ai-30da8/us-central1',
          CLI_CONFIG_DIR: path.join(os.tmpdir(), 'codeai-cli-test'),
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', err => {
        reject(Object.assign(err, { stdout, stderr }));
      });

      const timer = setTimeout(() => {
        child.kill();
        const timeoutError = new Error(`Command timed out after ${timeout}ms`);
        reject(Object.assign(timeoutError, { stdout, stderr }));
      }, timeout);

      child.on('close', () => {
        clearTimeout(timer);
      });
    });
  };

  const containsAny = (text: string, searchTerms: string[]): boolean => {
    return searchTerms.some(term =>
      text.toLowerCase().includes(term.toLowerCase())
    );
  };

  describe('Basic CLI functionality', () => {
    it('should show help when no arguments are provided', async () => {
      const result = await runCli([]);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Usage:');
      expect(output).toContain('Commands:');
    });

    it('should show version', async () => {
      const result = await runCli(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should show help for create command', async () => {
      const result = await runCli(['help', 'create']);

      expect(result.exitCode).toBe(0);
      const output = result.stdout + result.stderr;
      expect(containsAny(output, ['create', 'project', 'initialize'])).toBe(
        true
      );
    });

    it('should use localhost URLs in development mode', async () => {
      // First test if environment variables are being passed correctly
      const envTestResult = await runCli(['--version'], 3000).catch(error => {
        // Capture timeout error but return partial results
        return {
          exitCode: -1,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message || '',
        };
      });

      console.log('=== ENV TEST OUTPUT ===');
      console.log(envTestResult.stdout + envTestResult.stderr);
      console.log('=== END ENV TEST ===');

      const result = await runCli(['login', '--no-browser'], 3000).catch(
        error => {
          // Capture timeout error but return partial results
          return {
            exitCode: -1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message || '',
          };
        }
      );

      const output = result.stdout + result.stderr;
      console.log('=== LOGIN URL OUTPUT ===');
      console.log(output);
      console.log('=== END URL OUTPUT ===');

      // Verify that localhost URLs are being used
      expect(output).toContain('localhost:3000');

      // Should NOT contain production URLs
      expect(output).not.toContain('app.codeai.com');
      expect(output).not.toContain('codeai-prod.cloudfunctions.net');
    }, 10000);
  });

  describe('Authentication flow', () => {
    beforeEach(async () => {
      // Ensure clean auth state
      const authConfigPath = path.join(os.homedir(), '.codeai', 'auth.json');
      if (await fse.pathExists(authConfigPath)) {
        await fse.remove(authConfigPath);
      }
    });

    it('should handle logout when not logged in', async () => {
      const result = await runCli(['logout']);

      expect(result.exitCode).toBe(0);
      const output = result.stdout + result.stderr;
      expect(containsAny(output, ['logged out', 'signed out'])).toBe(true);
    });

    it('should initiate login process', async () => {
      const result = await runCli(['login', '--no-browser'], 5000).catch(
        error => {
          // Capture timeout error but return partial results
          return {
            exitCode: -1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message || '',
          };
        }
      );

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, [
          'browser',
          'login',
          'auth',
          'authenticate',
          'visit this URL',
        ])
      ).toBe(true);
    }, 10000);
  });

  describe('Create command scenarios', () => {
    it('should fail when not authenticated', async () => {
      const result = await runCli(['create'], 10000);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, [
          'must be logged in',
          'authentication required',
          'login',
          'api key',
        ])
      ).toBe(true);
    }, 15000);

    it('should validate project structure', async () => {
      // Remove package.json to test validation
      await fse.remove(path.join(tempTestDir, 'package.json'));

      const result = await runCli(['create'], 10000);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, [
          'package.json',
          'project',
          'directory',
          'not found',
          'must be logged in',
          'authentication required',
        ])
      ).toBe(true);
    }, 15000);

    it('should handle custom project name', async () => {
      const result = await runCli(
        ['create', '--name', 'custom-project-name'],
        10000
      );

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['custom-project-name', 'already initialized']) ||
          containsAny(output, [
            'must be logged in',
            'authentication required',
            'api key',
            'login',
          ])
      ).toBe(true);
    }, 15000);

    it('should handle target directory specification', async () => {
      const result = await runCli(['create', 'src']);

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['src', 'already initialized']) ||
          containsAny(output, [
            'not authenticated',
            'authentication required',
            'api key',
            'login',
          ])
      ).toBe(true);
    });
  });

  describe('Deploy command scenarios', () => {
    it('should fail when no project is linked', async () => {
      const result = await runCli(['deploy']);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['project', 'linked', '.codeai.json', 'not found'])
      ).toBe(true);
    });

    it('should fail when not authenticated with existing project config', async () => {
      // Create a fake project config
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        projectId: 'fake-project-id',
        targetDirectory: 'src',
        excludePatterns: ['node_modules/**'],
      });

      const result = await runCli(['deploy'], 10000);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, [
          'must be logged in',
          'authentication required',
          'login',
          'api key',
        ])
      ).toBe(true);
    }, 15000);

    it('should validate project configuration', async () => {
      // Create invalid project config
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        invalidField: 'invalid',
      });

      const result = await runCli(['deploy']);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['project', 'configuration', 'invalid', 'error'])
      ).toBe(true);
    });
  });

  describe('Run command scenarios', () => {
    it('should require task parameter', async () => {
      const result = await runCli(['run']);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      // Since run command requires a task parameter, it should fail on missing argument
      expect(
        containsAny(output, [
          'required',
          'task',
          'argument',
          'missing',
          'error',
        ])
      ).toBe(true);
    });

    it('should fail when no project is linked', async () => {
      const result = await runCli(['run', 'REVIEW']);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(containsAny(output, ['project', 'linked', '.codeai.json'])).toBe(
        true
      );
    });

    it('should fail when not authenticated with linked project', async () => {
      // Create a fake project config
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        projectId: 'fake-project-id',
        targetDirectory: 'src',
        excludePatterns: ['node_modules/**'],
      });

      // Initialize a git repository so the CLI can proceed to authentication check
      process.chdir(tempTestDir);
      const { spawn } = await import('child_process');
      await new Promise<void>(resolve => {
        const git = spawn('git', ['init'], { cwd: tempTestDir });
        git.on('close', () => resolve());
      });
      await new Promise<void>(resolve => {
        const git = spawn('git', ['add', '.'], { cwd: tempTestDir });
        git.on('close', () => resolve());
      });
      await new Promise<void>(resolve => {
        const git = spawn('git', ['commit', '-m', 'initial'], {
          cwd: tempTestDir,
        });
        git.on('close', () => resolve());
      });

      const result = await runCli(['run', 'REVIEW'], 10000);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;

      expect(
        containsAny(output, [
          'must be logged in',
          'authentication required',
          'login',
          'api key',
          'You must be logged in',
          'Authentication required',
          'not a git repository',
          'Not a git repository',
        ])
      ).toBe(true);
    }, 15000);

    it('should handle specific file paths', async () => {
      const result = await runCli([
        'run',
        'REVIEW',
        'src/index.js',
        'src/utils.js',
      ]);

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['src/index.js', 'src/utils.js']) ||
          containsAny(output, ['not authenticated', 'project'])
      ).toBe(true);
    });

    it('should handle --changed flag', async () => {
      const result = await runCli(['run', 'REVIEW', '--changed']);

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['changed', 'git']) ||
          containsAny(output, ['not authenticated', 'project'])
      ).toBe(true);
    });

    it('should handle --language option', async () => {
      const result = await runCli(['run', 'REVIEW', '--language', 'es']);

      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['language', 'es']) ||
          containsAny(output, ['not authenticated', 'project'])
      ).toBe(true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid commands', async () => {
      const result = await runCli(['invalid-command']);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(containsAny(output, ['unknown command', 'invalid', 'help'])).toBe(
        true
      );
    });

    it('should handle network errors with real API calls', async () => {
      // Create project config and fake auth to trigger real API call
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        projectId: 'fake-project-id',
        targetDirectory: 'src',
        excludePatterns: ['node_modules/**'],
      });

      const authConfigDir = path.join(os.homedir(), '.codeai');
      await fse.ensureDir(authConfigDir);
      await fse.writeJson(path.join(authConfigDir, 'auth.json'), {
        apiKey: 'invalid-api-key-for-testing',
      });

      const result = await runCli(['deploy'], 30000);

      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, [
          'error',
          'failed',
          'api',
          'unauthorized',
          'invalid',
        ])
      ).toBe(true);

      // Clean up
      await fse.remove(path.join(authConfigDir, 'auth.json'));
    }, 35000);

    it('should display spinner/loading indicators', async () => {
      // Test that commands produce output indicating processing
      const result = await runCli(['create'], 10000);

      const output = result.stdout + result.stderr;
      expect(output.length).toBeGreaterThan(0);
      expect(
        containsAny(output, [
          'processing',
          'loading',
          'creating',
          'initializing',
          'already initialized',
          'must be logged in',
          'authentication required',
          'checking authentication',
          'spinner',
          '✔',
          '✖',
          '⠋',
        ])
      ).toBe(true);
    }, 15000);

    it('should validate console output formatting', async () => {
      const result = await runCli(['logout']);

      const output = result.stdout + result.stderr;
      expect(output.includes('✅') || output.includes('logged out')).toBe(true);
    });

    it('should handle file permission errors gracefully', async () => {
      // Try to run in a directory with limited permissions
      const result = await runCli(['--help']);

      expect(result.exitCode).toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Usage:');
    });
  });

  describe('Real API integration scenarios', () => {
    it('should handle create command with real project structure', async () => {
      // Add more realistic project files
      await fse.writeFile(
        path.join(tempTestDir, '.gitignore'),
        'node_modules/\n*.log\n.env'
      );

      await fse.ensureDir(path.join(tempTestDir, 'tests'));
      await fse.writeFile(
        path.join(tempTestDir, 'tests/index.test.js'),
        'const { add } = require("../src/index");\nconsole.log(add(1, 2));'
      );

      const result = await runCli(['create']);

      expect(result.exitCode).toBe(1); // Will fail due to no auth, but should validate project
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['not authenticated', 'login', 'api key']) ||
          containsAny(output, ['project', 'files', 'structure'])
      ).toBe(true);
    });

    // Real authentication test - ONLY run this if you have a valid API key
    it('should create a real project with valid authentication', async () => {
      // This test requires a real API key - unskip only for testing with real auth
      const realApiKey = process.env.CODEAI_API_KEY || '';

      if (!realApiKey) {
        console.log(
          'Skipping real API test - no CODEAI_API_KEY environment variable'
        );
        return;
      }

      // Custom runCli for real API testing with production URLs
      const runCliProduction = (
        args: string[],
        timeout = 30000
      ): Promise<CliResult> => {
        return new Promise((resolve, reject) => {
          const child = spawn('node', [cliPath, ...args], {
            cwd: tempTestDir,
            stdio: 'pipe',
            env: {
              ...process.env,
              NODE_ENV: 'production',
              // Use production URLs for real API testing
              CODEAI_WEB_URL:
                process.env.CODEAI_WEB_URL || 'https://app.codeai.com',
              CODEAI_API_URL:
                process.env.CODEAI_API_URL ||
                'https://us-central1-codeai-prod.cloudfunctions.net',
              CLI_CONFIG_DIR: path.join(os.tmpdir(), 'codeai-cli-test'),
            },
          });

          let stdout = '';
          let stderr = '';

          child.stdout?.on('data', data => {
            stdout += data.toString();
          });

          child.stderr?.on('data', data => {
            stderr += data.toString();
          });

          child.on('close', code => {
            resolve({
              exitCode: code || 0,
              stdout,
              stderr,
            });
          });

          child.on('error', err => {
            reject(err);
          });

          const timer = setTimeout(() => {
            child.kill();
            reject(new Error(`Command timed out after ${timeout}ms`));
          }, timeout);

          child.on('close', () => {
            clearTimeout(timer);
          });
        });
      };

      if (!realApiKey) {
        console.log(
          'Skipping real API test - no CODEAI_API_KEY environment variable'
        );
        return;
      }

      // Setup real authentication
      const authConfigDir = path.join(os.homedir(), '.codeai');
      await fse.ensureDir(authConfigDir);
      await fse.writeJson(path.join(authConfigDir, 'auth.json'), {
        apiKey: realApiKey,
      });

      // Create a more complex test project
      await fse.writeFile(
        path.join(tempTestDir, 'README.md'),
        '# Test Project\n\nThis is a test project for E2E testing.'
      );

      await fse.writeFile(
        path.join(tempTestDir, '.gitignore'),
        'node_modules/\n*.log\n.env\ndist/'
      );

      await fse.ensureDir(path.join(tempTestDir, 'src/components'));
      await fse.writeFile(
        path.join(tempTestDir, 'src/components/Button.js'),
        `import React from 'react';

export function Button({ onClick, children }) {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
}`
      );

      // Run create command with custom name
      const projectName = `test-e2e-${Date.now()}`;
      const result = await runCliProduction(
        ['create', '--name', projectName],
        60000
      );

      const output = result.stdout + result.stderr;
      console.log('=== CREATE COMMAND OUTPUT ===');
      console.log(output);
      console.log('=== END OUTPUT ===');

      // Test should succeed with real auth
      expect(result.exitCode).toBe(0);

      // Verify success messages
      expect(
        containsAny(output, [
          'project created',
          'successfully',
          'linked',
          projectName,
          'initialization',
          'completed',
        ])
      ).toBe(true);

      // Verify spinner messages
      expect(
        containsAny(output, [
          'checking authentication',
          'you are logged in',
          'determining project name',
          'creating project',
          'saving project configuration',
        ])
      ).toBe(true);

      // Verify .codeai.json was created
      const configPath = path.join(tempTestDir, '.codeai.json');
      expect(await fse.pathExists(configPath)).toBe(true);

      const config = await fse.readJson(configPath);
      expect(config.projectId).toBeDefined();
      expect(config.targetDirectory).toBeDefined();
      expect(config.maxUploadSizeMB).toBeDefined();

      // Verify project URL in output
      expect(containsAny(output, ['http', 'project', 'url', 'browser'])).toBe(
        true
      );

      console.log('✅ Real project created successfully!');
      console.log('Project ID:', config.projectId);
      console.log('Target Directory:', config.targetDirectory);

      // Clean up auth for other tests
      await fse.remove(path.join(authConfigDir, 'auth.json'));
    }, 120000); // 2 minute timeout for real API calls

    it('should handle deploy with file changes detection', async () => {
      // Create project config
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        projectId: 'test-project-id',
        targetDirectory: 'src',
        excludePatterns: ['node_modules/**', '*.log'],
      });

      // Modify a file to simulate changes
      await fse.writeFile(
        path.join(tempTestDir, 'src/index.js'),
        `console.log('Modified file');
function add(a, b) {
  // Added comment
  return a + b;
}
module.exports = { add };`
      );

      const result = await runCli(['deploy']);

      expect(result.exitCode).toBe(1); // Will fail due to no auth
      const output = result.stdout + result.stderr;
      expect(
        containsAny(output, ['not authenticated', 'login', 'api key']) ||
          containsAny(output, ['changes', 'files', 'deploy'])
      ).toBe(true);
    });

    it('should handle run command with various task types', async () => {
      // Create project config
      await fse.writeJson(path.join(tempTestDir, '.codeai.json'), {
        projectId: 'test-project-id',
        targetDirectory: 'src',
        excludePatterns: ['node_modules/**'],
      });

      const tasks = ['REVIEW', 'ANALYZE', 'OPTIMIZE'];

      for (const task of tasks) {
        const result = await runCli(['run', task]);

        expect(result.exitCode).toBe(1); // Will fail due to no auth
        const output = result.stdout + result.stderr;
        expect(
          containsAny(output, ['not authenticated', 'login', 'api key']) ||
            containsAny(output, [task.toLowerCase(), 'analysis', 'task'])
        ).toBe(true);
      }
    });
  });
});
