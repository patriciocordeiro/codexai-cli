import { getOraSpinner, oraMockFactory } from '../../testing/mocks';
//
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import ora from 'ora';
import {
  getProjectManifest as getProjectManifestImport,
  updateProjectFiles as updateProjectFilesImport,
} from '../../api/api';
import {
  createProjectArchive as createProjectArchiveImport,
  createZipFromPaths as createZipFromPathsImport,
} from '../../file-utils/file-utils';
import * as configHelpers from '../config/config-helpers';
import { deployChangesIfNeeded } from '../deploy/deploy-helpers';

jest.mock('../config/config-helpers', () => {
  const getTargetDirectory = jest.fn();
  return { getTargetDirectory, __esModule: true };
});

jest.mock('../../api/api', () => ({
  getProjectManifest: jest.fn(),
  updateProjectFiles: jest.fn(),
}));
jest.mock('../../file-utils/file-utils', () => ({
  createProjectArchive: jest.fn(),
  createZipFromPaths: jest.fn(),
}));
jest.mock('chalk', () => ({
  yellow: jest.fn(text => text),
  green: jest.fn(text => text),
  red: jest.fn(text => text),
}));

jest.mock('ora', () => oraMockFactory());

const mockedOra = ora as jest.Mock;
const createProjectArchive = createProjectArchiveImport as jest.Mock;
const createZipFromPaths = createZipFromPathsImport as jest.Mock;
const getProjectManifest = getProjectManifestImport as jest.Mock;
const updateProjectFiles = updateProjectFilesImport as jest.Mock;

describe('deploy-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export deployChangesIfNeeded', () => {
    expect(typeof deployChangesIfNeeded).toBe('function');
  });

  it('should deploy changes if files differ', async () => {
    (configHelpers.getTargetDirectory as any).mockResolvedValue('src');
    getProjectManifest.mockResolvedValue({
      'a.txt': 'hash1',
      'b.txt': 'hash2',
    } as never);
    createProjectArchive.mockResolvedValue({
      fileManifest: { 'a.txt': 'hash1', 'b.txt': 'DIFF' },
    } as never);
    createZipFromPaths.mockResolvedValue(Buffer.from('zipdata') as never);
    updateProjectFiles.mockResolvedValue(null as never);

    await deployChangesIfNeeded('api-key', 'proj-id');

    const spinner = getOraSpinner(mockedOra);

    expect(configHelpers.getTargetDirectory).toHaveBeenCalled();
    expect(getProjectManifest).toHaveBeenCalledWith('api-key', 'proj-id');
    expect(createProjectArchive).toHaveBeenCalledWith(process.cwd(), 'src');
    expect(createZipFromPaths).toHaveBeenCalledWith(['b.txt'], process.cwd());
    expect(updateProjectFiles).toHaveBeenCalledWith(
      'api-key',
      'proj-id',
      Buffer.from('zipdata'),
      { 'b.txt': 'DIFF' }
    );
    expect(spinner.warn).toHaveBeenCalledWith(
      expect.stringContaining('Found 1 local changes')
    );
    expect(spinner.succeed).toHaveBeenCalledWith(
      'Project context updated successfully.'
    );
  });

  it('should not deploy if no files differ', async () => {
    (configHelpers.getTargetDirectory as any).mockResolvedValue('src');
    getProjectManifest.mockResolvedValue({ 'a.txt': 'hash1' } as never);
    createProjectArchive.mockResolvedValue({
      fileManifest: { 'a.txt': 'hash1' },
    } as never);

    await deployChangesIfNeeded('api-key', 'proj-id');

    const spinner = getOraSpinner(mockedOra);

    expect(updateProjectFiles).not.toHaveBeenCalled();
    expect(spinner.succeed).toHaveBeenCalledWith('Project is up-to-date.');
  });
});
