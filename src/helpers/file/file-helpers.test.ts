import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { isExcludedPath, isSupportedCodeFile } from '../file/file-helpers';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
}));
jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
  }))
);
jest.mock('chalk', () => ({
  red: jest.fn(msg => msg),
  yellow: jest.fn(msg => msg),
  dim: jest.fn(msg => msg),
}));

describe('file-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export isSupportedCodeFile and isExcludedPath', () => {
    expect(typeof isSupportedCodeFile).toBe('function');
    expect(typeof isExcludedPath).toBe('function');
  });

  describe('isSupportedCodeFile', () => {
    it('returns true for supported extensions', () => {
      expect(isSupportedCodeFile('foo.ts')).toBe(true);
      expect(isSupportedCodeFile('bar.py')).toBe(true);
      expect(isSupportedCodeFile('baz.java')).toBe(true);
      expect(isSupportedCodeFile('file.md')).toBe(true);
      expect(isSupportedCodeFile('file.json')).toBe(true);
    });
    it('returns false for unsupported extensions', () => {
      expect(isSupportedCodeFile('foo.exe')).toBe(false);
      expect(isSupportedCodeFile('bar.zip')).toBe(false);
      expect(isSupportedCodeFile('baz.unknown')).toBe(false);
    });
  });

  describe('isExcludedPath', () => {
    it('returns true for excluded paths', () => {
      expect(isExcludedPath('node_modules/foo.js')).toBe(true);
      expect(isExcludedPath('.git/config')).toBe(true);
      expect(isExcludedPath('dist/bundle.js')).toBe(true);
      expect(isExcludedPath('README.md')).toBe(true);
      expect(isExcludedPath('package.json')).toBe(true);
      expect(isExcludedPath('tsconfig.json')).toBe(true);
    });
    it('returns false for non-excluded paths', () => {
      expect(isExcludedPath('src/app.ts')).toBe(false);
      expect(isExcludedPath('lib/utils.js')).toBe(false);
      expect(isExcludedPath('main.py')).toBe(false);
    });
  });
});
