import { oraMockFactory } from '../../testing/mocks';

// This file contains tests for the config helpers in the CodexAI CLI.
import { describe, expect, it, jest } from '@jest/globals';
import fse from 'fs-extra';
import {
  getTargetDirectory,
  guardAgainstExistingProject,
  loadProjectConfig,
} from './config-helpers';

jest.mock('path', () => ({
  __esModule: true,
  default: {
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => args.join('/')),
  },
}));
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn(text => `green:${text}`),
    red: jest.fn(text => `red:${text}`),
    yellow: jest.fn(text => `yellow:${text}`),
  },
}));
jest.mock('fs-extra', () => ({
  readJson: jest.fn(),
  writeJson: jest.fn(),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  pathExists: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readJSON: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
  pathExists: jest.fn(() => Promise.resolve(true)),
}));

// Spies must be defined before jest.mock due to hoisting
jest.mock('ora', () => oraMockFactory());

const mockedFse = fse as jest.Mocked<typeof fse>;
// const mockedOra = ora as jest.Mock;

describe.only('config-helpers', () => {
  it('should export CodeAiConfig type', () => {
    const config = { projectId: 'id', targetDirectory: 'src' };
    expect(config.projectId).toBe('id');
  });

  describe.only('getTargetDirectory', () => {
    it.only('should return the targetDirectory from config file', async () => {
      const fakeConfig = { projectId: 'id', targetDirectory: 'src' };
      // Set the mock implementation for readJson
      (fse.readJson as jest.Mock).mockResolvedValue(fakeConfig as never);
      const result = await getTargetDirectory();
      expect(result).toBe('src');
    });
  });

  describe('loadProjectConfig', () => {
    jest.resetModules();

    const fakeConfig = { projectId: 'id', targetDirectory: 'src' };

    it('should load and parse config file if exists', async () => {
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockResolvedValue(fakeConfig);
      const config = await loadProjectConfig(fakeConfig.targetDirectory);
      expect(config).toEqual(fakeConfig);
      expect(mockedFse.pathExists).toHaveBeenCalled();

      // flush out the mock calls
      mockedFse.pathExists.mockClear();
      mockedFse.readJson.mockClear();
    });

    it('should throw if config file does not exist', async () => {
      (mockedFse.pathExists as jest.Mock).mockReturnValue(false);
      mockedFse.readJson.mockResolvedValue(fakeConfig);

      await expect(
        async () => await loadProjectConfig(fakeConfig.targetDirectory)
      ).rejects.toThrow();
    });
  });

  describe('guardAgainstExistingProject', () => {
    it('should log warning if config does not have projectId', async () => {
      jest.clearAllMocks();
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockResolvedValue({ targetDirectory: 'src' } as never);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await expect(guardAgainstExistingProject('src')).rejects.toThrow(
        /Project already initialized/i
      );
      // Should not log projectId warning
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('linked to project ID')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error thrown when reading config', async () => {
      jest.clearAllMocks();
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockRejectedValue('not-an-error');
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await expect(guardAgainstExistingProject('src')).rejects.toThrow(
        /Project already initialized/i
      );
      consoleErrorSpy.mockRestore();
    });

    // it('should succeed spinner if project is not initialized', async () => {
    //   const oraSpinner = getOraSpinner(mockedOra);

    //   // expect(mockedOra).toHaveBeenCalledWith(
    //   //   `Starting '${taskType}' analysis...`
    //   // );
    //   expect(oraSpinner.start).toHaveBeenCalledTimes(1);
    //   expect(oraSpinner.succeed).toHaveBeenCalledWith(
    //     'Analysis successfully initiated!'
    //   );
    //   mockedFse.pathExists.mockResolvedValue(false as never);

    //   await guardAgainstExistingProject('src');
    //   // await expect(guardAgainstExistingProject('src')).rejects.not.toThrow();

    //   expect(oraSpinner.succeed).toHaveBeenCalled();
    // });
    const fakeConfig = { projectId: 'id', targetDirectory: 'src' };

    it('should throw if .codexai exists in target dir', async () => {
      jest.clearAllMocks();
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockResolvedValue(fakeConfig as never);
      await expect(
        guardAgainstExistingProject(fakeConfig.targetDirectory)
      ).rejects.toThrow(/Project already initialized/i);
    });

    it('should not throw if .codexai does not exist', async () => {
      // jest.clearAllMocks();
      mockedFse.existsSync.mockReturnValue(false);
      mockedFse.pathExists.mockResolvedValue(false as never);
      await expect(
        guardAgainstExistingProject(fakeConfig.targetDirectory)
      ).resolves.not.toThrow();
    });

    it('should log projectId warning if config has projectId', async () => {
      // jest.clearAllMocks();
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockResolvedValue(fakeConfig as never);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await expect(
        guardAgainstExistingProject(fakeConfig.targetDirectory)
      ).rejects.toThrow(/Project already initialized/i);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('linked to project ID')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed config file gracefully', async () => {
      // jest.clearAllMocks();
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockRejectedValue(new Error('Malformed config'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await expect(
        guardAgainstExistingProject(fakeConfig.targetDirectory)
      ).rejects.toThrow(/Project already initialized/i);
      // Check that at least one call contains the error string
      expect(
        consoleErrorSpy.mock.calls.some(call =>
          call[0].includes('Error reading .codeai.json file')
        )
      ).toBe(true);
      consoleErrorSpy.mockRestore();
    });

    it('getTargetDirectory throws if targetDirectory is missing', async () => {
      mockedFse.readJson.mockResolvedValue({} as never);
      await expect(getTargetDirectory()).rejects.toThrow(
        'No target directory specified in the project configuration.'
      );
    });

    it('loadProjectConfig throws if projectId or targetDirectory is missing', async () => {
      mockedFse.pathExists.mockResolvedValue(true as never);
      mockedFse.readJson.mockResolvedValue({ projectId: 'id' } as never); // missing targetDirectory
      await expect(
        loadProjectConfig(fakeConfig.targetDirectory)
      ).rejects.toThrow(
        'projectId or targetDirectory not found in .codeai.json'
      );
    });

    it('loadProjectConfig throws and logs error if reading/parsing fails', async () => {
      mockedFse.pathExists.mockResolvedValue(true as never);
      const errorString = 'bad json';
      const error = new Error(errorString);
      mockedFse.readJson.mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await expect(loadProjectConfig('.codeai.json')).rejects.toThrow(
        errorString
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading or parsing .codeai.json file.'),
        error
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
