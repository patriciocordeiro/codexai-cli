import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  getProjectName,
  getProjectNameFromPackageJson,
} from '../project/project-helpers';

import fse from 'fs-extra';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readJson: jest.fn(),
}));
jest.mock('chalk', () => ({
  yellow: jest.fn(msg => msg),
}));

describe('project-helpers', () => {
  const originalCwd = process.cwd;
  beforeEach(() => {
    jest.clearAllMocks();
    // Optionally mock process.cwd if needed
  });
  afterEach(() => {
    process.cwd = originalCwd;
  });

  it('should export getProjectNameFromPackageJson and getProjectName', () => {
    expect(typeof getProjectNameFromPackageJson).toBe('function');
    expect(typeof getProjectName).toBe('function');
  });

  describe('getProjectNameFromPackageJson', () => {
    it('returns name if package.json exists and has name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({
        name: 'my-app',
      } as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBe('my-app');
      expect(fse.pathExists).toHaveBeenCalled();
      expect(fse.readJson).toHaveBeenCalled();
    });
    it('returns null if package.json exists but has no name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({} as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBeNull();
    });
    it('returns null if package.json does not exist', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const name = await getProjectNameFromPackageJson();
      expect(name).toBeNull();
    });
  });

  describe('getProjectName', () => {
    it('returns trimmed name from options if provided', async () => {
      const name = await getProjectName({ name: '  my-app  ' });
      expect(name).toBe('my-app');
    });
    it('returns name from package.json if no options.name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({
        name: 'pkg-app',
      } as never);
      const name = await getProjectName({});
      expect(name).toBe('pkg-app');
    });
    it('returns cwd basename if package.json does not exist', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({});
      expect(name).toBe('baz');
    });
    it('warns and returns cwd basename if package.json read fails', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockRejectedValue(new Error('fail') as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const name = await getProjectName({});
      expect(name).toBe('baz');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
    it('returns cwd basename if package.json exists but has no name', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(true as never);
      (fse.readJson as jest.Mock).mockResolvedValue({} as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({});
      expect(name).toBe('baz');
    });
    it('returns cwd basename if options.name is empty', async () => {
      (fse.pathExists as jest.Mock).mockResolvedValue(false as never);
      const fakeCwd = '/foo/bar/baz';
      process.cwd = () => fakeCwd;
      const name = await getProjectName({ name: '   ' });
      expect(name).toBe('baz');
    });
  });
});
