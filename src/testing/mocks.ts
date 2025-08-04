/**
 * Factory function to create a mock implementation of the ora spinner for testing.
 * @returns {jest.Mock} A jest mock function that returns an ora spinner mock object.
 */

import { jest } from '@jest/globals';

/**
 * Factory function to create a mock implementation of the ora spinner for testing.
 * @returns {jest.Mock} A jest mock function that returns an ora spinner mock object.
 */
export const oraMockFactory = () => {
  const oraMock = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    default: jest.fn().mockReturnThis(),
    info: jest.fn(),
  };
  return jest.fn(() => oraMock);
};

/**
 * Retrieves the ora spinner mock object from a mocked ora factory.
 * @param {jest.Mock} mockedOraFactory - The mocked ora factory function.
 * @returns {{ start: jest.Mock; succeed: jest.Mock; fail: jest.Mock; warn: jest.Mock; info: jest.Mock }} The ora spinner mock object.
 */
export function getOraSpinner(mockedOraFactory: jest.Mock): {
  start: jest.Mock;
  succeed: jest.Mock;
  fail: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
} {
  return mockedOraFactory.mock.results[0].value as {
    start: jest.Mock;
    succeed: jest.Mock;
    fail: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
  };
}
