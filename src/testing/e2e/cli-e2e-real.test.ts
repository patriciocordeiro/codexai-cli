/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable jsdoc/require-returns */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { spawn } from 'child_process';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

// mock chalk
jest.mock('chalk', () => ({
  green: (text: string) => text,
  red: (text: string) => text,
  yellow: (text: string) => text,
}));

// mock ora as esm module
jest.mock('ora', () => {
  return {
    default: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    })),
  };
});

const cliPath = path.resolve(__dirname, '../../..', 'dist/index.js');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

describe('CodeAI CLI E2E Tests (Real)', () => {
  let tempTestDir: string;

  beforeEach(async () => {
    tempTestDir = path.join(os.tmpdir(), `codeai-cli-test-${Date.now()}`);
    await fse.ensureDir(tempTestDir);
  });

  afterEach(async () => {
    if (await fse.pathExists(tempTestDir)) {
      await fse.remove(tempTestDir);
    }
  });

  const runCli = (args: string[]): Promise<CliResult> => {
    return new Promise(resolve => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: tempTestDir,
        stdio: 'pipe',
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
    });
  };

  it('should show help when no arguments are provided', async () => {
    const result = await runCli([]);

    // The CLI should exit with 1 and show help
    expect(result.exitCode).toBe(1);
    // Check both stdout and stderr for the usage information
    const output = result.stdout + result.stderr;
    expect(output).toContain('Usage:');
    expect(output).toContain('codeai [options] [command]');
  });

  it('should show version when --version is provided', async () => {
    const result = await runCli(['--version']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
  });

  // Add more E2E tests as needed, but mock the API calls at the network level
  // or use environment variables to control behavior
});
