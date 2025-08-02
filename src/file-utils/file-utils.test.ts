/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock all modules first before importing them
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readFile: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('glob', () => ({
  glob: jest.fn(),
}));

jest.mock('archiver', () => jest.fn());

jest.mock('ignore', () => jest.fn());

jest.mock('object-hash', () => jest.fn());

// Now import everything
import archiver from 'archiver';
import * as fse from 'fs-extra';
import { glob } from 'glob';
import ignore from 'ignore';
import hash from 'object-hash';

import {
  createProjectArchive,
  createZipFromPaths,
  getFilesToUpload,
} from './file-utils';

describe('Archive and File Helpers', () => {
  const VIRTUAL_PROJECT_ROOT = '/test/project';
  let mockArchiveInstance: any;
  let mockFse: any;

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock process.cwd() for consistency
    jest.spyOn(process, 'cwd').mockReturnValue(VIRTUAL_PROJECT_ROOT);

    // Get the mocked fs-extra module
    mockFse = require('fs-extra');

    // Mock archiver
    mockArchiveInstance = {
      pipe: jest.fn().mockImplementation((stream: any) => {
        // Immediately trigger the end event to resolve the promise
        setImmediate(() => {
          stream.emit('end');
        });
      }),
      file: jest.fn(),
      directory: jest.fn(),
      append: jest.fn(),
      finalize: jest.fn().mockImplementation(() => Promise.resolve()),
      on: jest.fn().mockReturnThis(),
    };
    (archiver as any).mockReturnValue(mockArchiveInstance);

    // Mock ignore library
    const mockIgnoreInstance = {
      add: jest.fn(),
      ignores: jest.fn().mockReturnValue(false),
    };
    (ignore as any).mockReturnValue(mockIgnoreInstance);
  });

  describe('getFilesToUpload', () => {
    it('should return a list of files filtered by glob and .gitignore', async () => {
      // Setup mocks for this test
      const allFiles = [
        'src/index.js',
        'src/style.css',
        '.gitignore',
        'dist/bundle.js',
      ];

      // Mock glob
      (glob as any).mockResolvedValue(allFiles);

      // Mock fs-extra functions
      (fse.pathExists as any).mockResolvedValue(true);
      // Mock readFileSync using require syntax
      mockFse.readFileSync = jest.fn().mockReturnValue('dist/');

      // Configure the ignore mock to ignore files in 'dist'
      const mockIgnores = (p: string) => p.startsWith('dist/');
      (ignore as any).mockReturnValue({
        add: jest.fn(),
        ignores: mockIgnores,
      });

      const result = await getFilesToUpload();

      // Assertions
      expect(glob).toHaveBeenCalledWith(
        '**/*',
        expect.objectContaining({
          cwd: VIRTUAL_PROJECT_ROOT,
          nodir: true,
          dot: true,
        })
      );
      expect(mockFse.readFileSync).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
      expect(result).toHaveLength(3);
      expect(result).toContain('src/index.js');
      expect(result).toContain('src/style.css');
      expect(result).not.toContain('dist/bundle.js');
    });
  });

  describe('createZipFromPaths', () => {
    it('should add each relative path to the archive correctly', async () => {
      // Call the function without awaiting to check internal calls
      createZipFromPaths(['src/index.js', 'README.md'], VIRTUAL_PROJECT_ROOT);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockArchiveInstance.file).toHaveBeenCalledTimes(2);
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });

    it('should handle stream data events and buffer concatenation', async () => {
      let streamCallback: any;

      // Mock archiver to capture the stream and emit data events
      mockArchiveInstance.pipe = jest.fn().mockImplementation((stream: any) => {
        streamCallback = stream;
        // Emit multiple data chunks to test buffers.push(data) - line 67
        setImmediate(() => {
          stream.emit('data', Buffer.from('chunk1'));
          stream.emit('data', Buffer.from('chunk2'));
          stream.emit('end');
        });
      });

      const result = await createZipFromPaths(
        ['test.txt'],
        VIRTUAL_PROJECT_ROOT
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(streamCallback).toBeDefined();
    });

    it('should reject promise when archive.file throws an error', async () => {
      // Mock archive.file to throw an error to test reject(err) - line 86
      mockArchiveInstance.file = jest.fn().mockImplementation(() => {
        throw new Error('File access error');
      });

      await expect(
        createZipFromPaths(['nonexistent.txt'], VIRTUAL_PROJECT_ROOT)
      ).rejects.toThrow('File access error');
    });

    it('should handle stream error events', async () => {
      mockArchiveInstance.pipe = jest.fn().mockImplementation((stream: any) => {
        setImmediate(() => {
          stream.emit('error', new Error('Stream error'));
        });
      });

      await expect(
        createZipFromPaths(['test.txt'], VIRTUAL_PROJECT_ROOT)
      ).rejects.toThrow('Stream error');
    });
  });

  describe('createProjectArchive', () => {
    it('should scan and zip files correctly', async () => {
      const targetDirectory = 'src';

      // Mock glob
      (glob as any).mockResolvedValue(['index.js']);

      // Mock fs-extra functions
      (fse.pathExists as any).mockResolvedValue(false);
      (fse.readFile as any).mockResolvedValue(Buffer.from('file content'));

      // Mock hash function
      (hash as any).mockReturnValue('hash123');

      const { includedFiles, fileManifest } = await createProjectArchive(
        VIRTUAL_PROJECT_ROOT,
        targetDirectory
      );

      expect(includedFiles).toEqual(['src/index.js']);
      expect(fileManifest['src/index.js']).toBe('hash123');
      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(Buffer),
        { name: 'src/index.js' }
      );
    });

    it('should filter files using .gitignore when it exists', async () => {
      const targetDirectory = 'src';

      // Mock glob to return files including one that should be ignored
      (glob as any).mockResolvedValue(['index.js', 'dist/bundle.js']);

      // Mock fs-extra functions - .gitignore exists
      (fse.pathExists as any).mockResolvedValue(true);
      (fse.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.endsWith('.gitignore')) {
          return Promise.resolve('dist/');
        }
        return Promise.resolve(Buffer.from('file content'));
      });

      // Mock hash function
      (hash as any).mockReturnValue('hash123');

      // Configure the ignore mock to ignore files in 'dist'
      const mockIgnores = (p: string) => p.startsWith('src/dist/');
      (ignore as any).mockReturnValue({
        add: jest.fn(),
        ignores: mockIgnores,
      });

      const { includedFiles, fileManifest } = await createProjectArchive(
        VIRTUAL_PROJECT_ROOT,
        targetDirectory
      );

      // Should only include index.js, not the dist/bundle.js
      expect(includedFiles).toEqual(['src/index.js']);
      expect(fileManifest['src/index.js']).toBe('hash123');
      expect(fse.readFile).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        'utf-8'
      );
    });

    it('should handle stream data events and buffer concatenation in createProjectArchive', async () => {
      const targetDirectory = 'src';
      let streamCallback: any;

      // Mock archiver to capture the stream and emit data events
      mockArchiveInstance.pipe = jest.fn().mockImplementation((stream: any) => {
        streamCallback = stream;
        // Emit multiple data chunks to test buffers.push(data) - line 157
        setImmediate(() => {
          stream.emit('data', Buffer.from('archive-chunk1'));
          stream.emit('data', Buffer.from('archive-chunk2'));
          stream.emit('end');
        });
      });

      // Mock glob
      (glob as any).mockResolvedValue(['index.js']);

      // Mock fs-extra functions
      (fse.pathExists as any).mockResolvedValue(false);
      (fse.readFile as any).mockResolvedValue(Buffer.from('file content'));

      // Mock hash function
      (hash as any).mockReturnValue('hash123');

      const result = await createProjectArchive(
        VIRTUAL_PROJECT_ROOT,
        targetDirectory
      );

      expect(result.zipBuffer).toBeInstanceOf(Buffer);
      expect(streamCallback).toBeDefined();
    });
  });
});
