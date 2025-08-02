import { jest } from '@jest/globals';

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

export function getOraSpinner(mockedOraFactory: jest.Mock) {
  return mockedOraFactory.mock.results[0].value as {
    start: jest.Mock;
    succeed: jest.Mock;
    fail: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
  };
}
