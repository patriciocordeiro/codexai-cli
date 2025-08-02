import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fse from 'fs-extra';
import path from 'path';
import {
  checkUploadSize,
  isExcludedPath,
  isSupportedCodeFile,
} from '../file/file-helpers';

jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    pathExists: jest.fn(),
    stat: jest.fn(),
    readJson: jest.fn(),
    writeJson: jest.fn(),
  },
}));

jest.mock('ora', () => () => ({
  start: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
}));
jest.mock('chalk', () => ({
  red: jest.fn(s => s),
  yellow: jest.fn(s => s),
  dim: jest.fn(s => s),
}));

describe('file-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export isSupportedCodeFile, isExcludedPath and checkUploadSize', () => {
    expect(typeof isSupportedCodeFile).toBe('function');
    expect(typeof isExcludedPath).toBe('function');
    expect(typeof checkUploadSize).toBe('function');
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

  describe('checkUploadSize', () => {
    const projectRoot = process.cwd();
    const file1 = 'file1.txt';
    const file2 = 'file2.txt';
    const filePaths = [file1, file2];
    const absFile1 = path.join(projectRoot, file1);
    const absFile2 = path.join(projectRoot, file2);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should pass when total size is under the limit', async () => {
      (fse.pathExists as unknown as jest.Mock).mockImplementation(
        p => p === absFile1 || p === absFile2
      );
      (fse.stat as unknown as jest.Mock).mockImplementation(p =>
        Promise.resolve({
          size: p === absFile1 ? 2 * 1024 * 1024 : 3 * 1024 * 1024,
        })
      );
      const config = { maxUploadSizeMB: 10 };
      await expect(checkUploadSize(filePaths, config)).resolves.toBeUndefined();
    });

    it('should fail when total size exceeds the limit', async () => {
      (fse.pathExists as unknown as jest.Mock).mockImplementation(
        p => p === absFile1 || p === absFile2
      );
      (fse.stat as unknown as jest.Mock).mockImplementation(p =>
        Promise.resolve({
          size: p === absFile1 ? 6 * 1024 * 1024 : 5 * 1024 * 1024,
        })
      );
      const config = { maxUploadSizeMB: 10 };
      await expect(checkUploadSize(filePaths, config)).rejects.toThrow();
    });

    it('should use default limit if not provided', async () => {
      (fse.pathExists as unknown as jest.Mock).mockImplementation(
        p => p === absFile1
      );
      (fse.stat as unknown as jest.Mock).mockImplementation(() =>
        Promise.resolve({ size: 5 * 1024 * 1024 })
      );
      await expect(checkUploadSize([file1], {})).resolves.toBeUndefined();
    });

    it('should handle file not existing', async () => {
      (fse.pathExists as unknown as jest.Mock).mockImplementation(() => false);
      await expect(
        checkUploadSize([file1], { maxUploadSizeMB: 10 })
      ).resolves.toBeUndefined();
    });

    it('should catch and log errors', async () => {
      (fse.pathExists as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('fail');
      });
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(
        checkUploadSize([file1], { maxUploadSizeMB: 10 })
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
