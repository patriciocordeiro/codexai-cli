import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Import the function to be tested
import { executeCommand } from './shell-helpers'; // Adjust the path as needed

// Mock the child_process module
jest.mock('child_process');
// Mock chalk to prevent actual color codes in test snapshots/logs
jest.mock('chalk', () => ({
  red: jest.fn(str => str),
}));

// Import the mocked version of 'exec'
const { exec } = require('child_process');

describe('executeCommand', () => {
  // Clear all mocks before each test to ensure a clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test Case 1: Successful Command Execution ---
  it('should resolve the promise when the command executes successfully', async () => {
    const command = 'ls -la';

    // Configure the mock for a success scenario
    // The first argument to the callback is `error`, which should be `null` for success.
    exec.mockImplementation(
      (
        _cmd: string,
        callback: (arg0: null, arg1: string, arg2: string) => void
      ) => {
        callback(null, 'success stdout', ''); // (error, stdout, stderr)
      }
    );

    // We expect the promise to resolve without any value.
    // `resolves.toBeUndefined()` is the standard way to test a promise that resolves with `void`.
    await expect(executeCommand(command)).resolves.toBeUndefined();

    // Verify that 'exec' was called exactly once with the correct command
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(command, expect.any(Function));
  });

  // --- Test Case 2: Failed Command Execution ---
  it('should reject the promise when the command fails', async () => {
    const command = 'invalid-command';
    const mockError = new Error('Command failed');
    const mockStderr = 'command not found';

    // Spy on console.error to make sure our error messages are logged
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Configure the mock for a failure scenario
    // The first argument to the callback is now a real Error object.
    exec.mockImplementation(
      (
        _cmd: unknown,
        callback: (arg0: Error, arg1: string, arg2: string) => void
      ) => {
        callback(mockError, '', mockStderr);
      }
    );

    // We expect the promise to reject with the same error object.
    await expect(executeCommand(command)).rejects.toThrow('Command failed');

    // Verify that our specific error messages were logged to the console
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error executing command: ${command}`
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(`stderr: ${mockStderr}`);

    // Verify that 'exec' was still called correctly
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(command, expect.any(Function));

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

  // --- Test Case 3: Edge Case - Command is an empty string ---
  it('should handle an empty command string gracefully', async () => {
    const command = '';

    // Assume an empty command succeeds (or handle as an error if that's the desired behavior)
    exec.mockImplementation(
      (
        _cmd: string,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, '', '');
      }
    );

    await expect(executeCommand(command)).resolves.toBeUndefined();
    expect(exec).toHaveBeenCalledWith('', expect.any(Function));
  });
});
