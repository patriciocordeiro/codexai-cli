// Add global type for archiver mock instance
declare global {
  // eslint-disable-next-line no-var
  var __MOCK_ARCHIVE_INSTANCE__:
    | {
        append?: jest.Mock;
        finalize: jest.Mock;
        pipe: jest.Mock;
        file?: jest.Mock;
        on?: jest.Mock;
      }
    | undefined;
}
// In src/files.test.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as fse from 'fs-extra';
import { glob } from 'glob';
import ignore from 'ignore';
import Stream from 'stream';

// After all jest.mock calls, require the tested module once and use only its exports
const fileUtilsModule = require('./file-utils');

// Mock external dependencies
jest.mock('glob');
jest.mock('fs-extra');
jest.mock('ignore');
jest.mock('object-hash');
jest.mock('./file-utils', () => {
  const actual = jest.requireActual('./file-utils');
  return {
    ...(actual as object),
    getFileHash: jest.fn(),
  };
});

// Mock path and process to ensure consistent behavior across environments
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...(originalPath as object), // Keep original path functions if needed elsewhere
    join: (...args: string[]) => args.join('/'), // Force forward slashes
  };
});

let cwdSpy: ReturnType<typeof jest.spyOn>;
beforeEach(() => {
  cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/mock/project');
});
afterEach(() => {
  cwdSpy.mockRestore();
});

// Type-cast the mocked modules
const mockedGlob = glob as unknown as jest.Mock;
const mockedFse = fse as jest.Mocked<typeof fse>;
const mockedIgnore = ignore as unknown as jest.Mock;

// Use only fileUtilsModule.getFilesToUpload, fileUtilsModule.createProjectArchive, fileUtilsModule.createZipFromPaths, etc. throughout the file

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => {
    // This mock simulates the FormData interface used in the functions
    const formData = {
      _data: new Map<string, unknown>(),
      append: jest.fn((key: string, value: unknown) => {
        formData._data.set(key, value);
      }),
      getHeaders: jest.fn(() => ({ 'content-type': 'multipart/form-data' })),
    };
    return formData;
  });
});

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => {
    // This mock simulates the FormData interface used in the functions
    const formData = {
      _data: new Map<string, unknown>(),
      append: jest.fn((key: string, value: unknown) => {
        formData._data.set(key, value);
      }),
      getHeaders: jest.fn(() => ({ 'content-type': 'multipart/form-data' })),
    };
    return formData;
  });
});

describe('files', () => {
  describe('getFilesToUpload', () => {
    // This object will simulate the instance returned by the `ignore()` factory
    const mockIgnoreInstance = {
      add: jest.fn(),
      ignores: jest.fn(),
    };

    beforeEach(() => {
      // Clear mocks before each test
      jest.clearAllMocks();
      // Ensure that every time `ignore()` is called in the SUT, it returns our mock instance
      mockedIgnore.mockReturnValue(mockIgnoreInstance);
    });

    it('should return a list of files filtered by .gitignore content', async () => {
      // Arrange
      // 1. Glob finds these files (already excluding node_modules etc. from its own ignore)
      const globResult = ['src/index.ts', 'dist/bundle.js', '.env'];
      mockedGlob.mockResolvedValue(globResult as never);

      // 2. A .gitignore file exists
      mockedFse.pathExists.mockResolvedValue(true as never);
      const gitignoreContent = 'dist/\n.env';
      mockedFse.readFile.mockResolvedValue(gitignoreContent as never);

      // 3. The ignore() instance will filter based on the .gitignore content
      mockIgnoreInstance.ignores.mockImplementation((file: unknown) => {
        const f = file as string;
        return f.startsWith('dist/') || f === '.env';
      });

      // Act
      const files = await fileUtilsModule.getFilesToUpload();

      // Assert
      // Check that glob was called correctly
      expect(mockedGlob).toHaveBeenCalledWith('**/*', {
        cwd: '/mock/project',
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/.DS_Store',
          '**/.codeai.json',
        ],
        dot: true,
      });

      // Check that .gitignore was found and processed
      expect(mockedFse.pathExists).toHaveBeenCalledWith(
        '/mock/project/.gitignore'
      );
      expect(mockedFse.readFile).toHaveBeenCalledWith(
        '/mock/project/.gitignore',
        'utf-8'
      );
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith(gitignoreContent);

      // Check that the filtering happened
      expect(mockIgnoreInstance.ignores).toHaveBeenCalledWith('src/index.ts');
      expect(mockIgnoreInstance.ignores).toHaveBeenCalledWith('dist/bundle.js');
      expect(mockIgnoreInstance.ignores).toHaveBeenCalledWith('.env');

      // Check the final result
      expect(files).toEqual(['src/index.ts']);
    });

    it('should not read .gitignore if it does not exist and return all globbed files', async () => {
      // Arrange
      const globResult = ['src/index.ts', 'README.md'];
      mockedGlob.mockResolvedValue(globResult as never);
      mockedFse.pathExists.mockResolvedValue(false as never);

      // If no rules are added, `ignores` should always return false
      mockIgnoreInstance.ignores.mockReturnValue(false);

      // Act
      const files = await fileUtilsModule.getFilesToUpload();

      // Assert
      expect(mockedFse.pathExists).toHaveBeenCalledWith(
        '/mock/project/.gitignore'
      );
      // Ensure these were NOT called
      expect(mockedFse.readFile).not.toHaveBeenCalled();
      expect(mockIgnoreInstance.add).not.toHaveBeenCalled();

      // The result should be exactly what glob returned
      expect(files).toEqual(globResult);
    });

    it('should return an empty array if glob finds no files', async () => {
      // Arrange
      mockedGlob.mockResolvedValue([] as never);
      mockedFse.pathExists.mockResolvedValue(false as never); // Assume no .gitignore

      // Act
      const files = await fileUtilsModule.getFilesToUpload();

      // Assert
      expect(files).toEqual([]);
      // .gitignore logic is still checked, but filter loop doesn't run
      expect(mockedFse.pathExists).toHaveBeenCalledTimes(1);
      expect(mockIgnoreInstance.ignores).not.toHaveBeenCalled();
    });
  });
  describe('createProjectArchive', () => {
    const projectRoot = '/mock/project';
    const mockIgnoreInstance: { add: jest.Mock; ignores: jest.Mock } = {
      add: jest.fn(),
      ignores: jest.fn(),
    };

    // Use a real PassThrough stream for the mock stream instance
    // const mockStreamInstance: Stream.PassThrough;
    let pipedStream: Stream.PassThrough | null = null;
    // Define a mock archive instance for use in tests
    type ArchiveMock = {
      append: jest.Mock;
      finalize: jest.Mock;
      pipe: jest.Mock;
    };
    let mockArchiveInstance: ArchiveMock;

    // Mock the hash function used in createProjectArchive
    const mockedHash: jest.Mock = jest.fn();
    // Set up the mock for object-hash default export
    const objectHash = require('object-hash');

    beforeEach(() => {
      jest.clearAllMocks();
      mockedIgnore.mockReturnValue(mockIgnoreInstance);
      // Initialize the mock stream instance before each test
      //   mockStreamInstance = new Stream.PassThrough();
      pipedStream = null;
      // Initialize the mock archive instance before each test
      mockArchiveInstance = {
        append: jest.fn(),
        finalize: jest.fn(() => {
          if (pipedStream) pipedStream.emit('end');
        }),
        pipe: jest.fn((stream?: unknown) => {
          pipedStream = stream as Stream.PassThrough;
        }),
      };
      (
        globalThis as { __MOCK_ARCHIVE_INSTANCE__?: ArchiveMock }
      ).__MOCK_ARCHIVE_INSTANCE__ = mockArchiveInstance;

      // Patch object-hash default export to use our mock
      objectHash.default = mockedHash;
    });

    it.skip('should correctly scan, filter, hash, and archive files', async () => {
      // Arrange
      const targetDirectory = 'src';
      const finalBuffer = Buffer.from('final-zip-content');
      const bufferConcatSpy = jest
        .spyOn(Buffer, 'concat')
        .mockReturnValue(finalBuffer);

      // 1. Glob results
      mockedGlob.mockResolvedValue([
        'index.js',
        'utils/helper.js',
        'temp/data.log',
      ] as never);

      // 2. .gitignore exists and has content
      mockedFse.pathExists.mockResolvedValue(true as never);
      // Overload signatures to match fs-extra.readFile
      const readFileMock = (
        path: fse.PathOrFileDescriptor,
        options?:
          | { encoding?: null | undefined; flag?: string | undefined }
          | null
          | string
          | { encoding: string; flag?: string | undefined }
          | undefined
      ): Promise<Buffer> | Promise<string> => {
        const pathStr = path.toString();
        // If encoding is specified, return string
        let encoding: string | undefined;
        if (typeof options === 'string') encoding = options;
        else if (
          options &&
          typeof options === 'object' &&
          'encoding' in options &&
          (options as { encoding?: string }).encoding
        ) {
          encoding = (options as { encoding?: string }).encoding;
        }
        if (encoding) {
          if (pathStr.endsWith('.gitignore')) {
            return Promise.resolve('**/*.log');
          }
          return Promise.resolve('');
        }
        if (pathStr.endsWith('index.js')) {
          return Promise.resolve(Buffer.from('main content'));
        }
        if (pathStr.endsWith('helper.js')) {
          return Promise.resolve(Buffer.from('helper content'));
        }
        return Promise.resolve(Buffer.from(''));
      };
      mockedFse.readFile.mockImplementation(
        readFileMock as unknown as typeof mockedFse.readFile
      );

      mockIgnoreInstance.ignores.mockImplementation(
        (p: unknown) => typeof p === 'string' && p.endsWith('.log')
      );

      // 3. Hashing
      mockedHash.mockImplementation(
        (buffer: unknown) => `hash-of-${(buffer as Buffer).toString()}`
      );

      // Act
      const result = await fileUtilsModule.createProjectArchive(
        projectRoot,
        targetDirectory
      );

      // Assert
      // Verify file scanning
      expect(mockedGlob).toHaveBeenCalledWith('**/*', {
        cwd: `${projectRoot}/${targetDirectory}`,
        nodir: true,
        dot: true,
        ignore: expect.any(Array),
      });

      // Verify filtering
      expect(mockIgnoreInstance.ignores).toHaveBeenCalledWith(
        'src/temp/data.log'
      );
      expect(result.includedFiles).toEqual([
        'src/index.js',
        'src/utils/helper.js',
      ]);

      // Verify manifest creation
      expect(result.fileManifest).toEqual({
        'src/index.js': 'hash-of-main content',
        'src/utils/helper.js': 'hash-of-helper content',
      });

      // Verify archiving
      const archiveAppend = mockArchiveInstance.append as jest.Mock;
      expect(archiveAppend).toHaveBeenCalledWith(Buffer.from('main content'), {
        name: 'src/index.js',
      });
      expect(archiveAppend).toHaveBeenCalledWith(
        Buffer.from('helper content'),
        {
          name: 'src/utils/helper.js',
        }
      );
      expect(archiveAppend).toHaveBeenCalledTimes(2);
      expect(mockArchiveInstance.finalize).toHaveBeenCalledTimes(1);

      // Verify final result
      expect(result.zipBuffer).toBe(finalBuffer);

      bufferConcatSpy.mockRestore();
    });

    it.skip('should accumulate buffers when PassThrough emits multiple data events (coverage for buffers.push(data) in createProjectArchive)', async () => {
      const targetDirectory = 'src';
      const bufferChunks = [Buffer.from('chunkA'), Buffer.from('chunkB')];
      const finalBuffer = Buffer.from('chunkAchunkB');
      const bufferConcatSpy = jest
        .spyOn(Buffer, 'concat')
        .mockReturnValue(finalBuffer);

      mockedGlob.mockResolvedValue(['index.js'] as never);
      mockedFse.pathExists.mockResolvedValue(false as never);
      mockedFse.readFile.mockResolvedValue(
        Buffer.from('file-content') as never
      );
      mockedHash.mockReturnValue('hash123');
      mockIgnoreInstance.ignores.mockReturnValue(false);

      let pipedStream: any = null;
      mockArchiveInstance.pipe.mockImplementation((stream: any) => {
        pipedStream = stream;
      });
      mockArchiveInstance.finalize.mockImplementation(() => {
        pipedStream.emit('data', bufferChunks[0]);
        pipedStream.emit('data', bufferChunks[1]);
        pipedStream.emit('end');
      });

      const result = await fileUtilsModule.createProjectArchive(
        projectRoot,
        targetDirectory
      );
      expect(result.zipBuffer).toBe(finalBuffer);
      expect(Buffer.concat).toHaveBeenCalledWith(bufferChunks);
      bufferConcatSpy.mockRestore();
    });

    it.skip('should accumulate buffers when PassThrough emits multiple data events (coverage for buffers.push(data))', async () => {
      const relativePaths = ['src/index.ts'];
      const finalBuffer = Buffer.from('chunk1chunk2');
      const bufferChunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];
      const bufferConcatSpy = jest
        .spyOn(Buffer, 'concat')
        .mockReturnValue(finalBuffer);

      let pipedStream: any = null;
      global.__MOCK_ARCHIVE_INSTANCE__ = {
        file: jest.fn(),
        on: jest.fn(),
        pipe: jest.fn((stream: any) => {
          pipedStream = stream;
        }),
        finalize: jest.fn(async () => {
          pipedStream.emit('data', bufferChunks[0]);
          pipedStream.emit('data', bufferChunks[1]);
          pipedStream.emit('end');
        }),
      };

      const result = await fileUtilsModule.createZipFromPaths(
        relativePaths,
        '/mock/project'
      );
      expect(result).toBe(finalBuffer);
      expect(Buffer.concat).toHaveBeenCalledWith(bufferChunks);
      bufferConcatSpy.mockRestore();
    });

    // In src/files.test.ts, inside describe('createProjectArchive', ...)

    it.skip('should proceed without filtering if .gitignore does not exist', async () => {
      // No ignore rules should be applied if .gitignore does not exist
      mockIgnoreInstance.ignores.mockReturnValue(false);
      // Arrange
      const targetDirectory = 'src';
      const finalBuffer = Buffer.from('final-zip-no-gitignore');
      const bufferConcatSpy = jest
        .spyOn(Buffer, 'concat')
        .mockReturnValue(finalBuffer);

      // 1. Glob returns all files, including one that would have been ignored.
      const globResult = ['index.js', 'temp/data.log'];
      mockedGlob.mockResolvedValue(globResult as never);

      // 2. Mock that .gitignore does NOT exist.
      mockedFse.pathExists.mockResolvedValue(false as never);

      // 3. Mock file reads for the files that will be included.
      const readFileMock = (
        path: fse.PathOrFileDescriptor
      ): Promise<Buffer> => {
        const pathStr = path.toString();
        if (pathStr.endsWith('index.js')) {
          return Promise.resolve(Buffer.from('main content'));
        }
        if (pathStr.endsWith('data.log')) {
          return Promise.resolve(Buffer.from('log content'));
        }
        return Promise.resolve(Buffer.from(''));
      };
      mockedFse.readFile.mockImplementation(
        readFileMock as unknown as typeof mockedFse.readFile
      );

      // 4. Mock hashing
      mockedHash.mockImplementation(
        (buffer: unknown) => `hash-of-${(buffer as Buffer).toString()}`
      );

      // Act
      const result = await fileUtilsModule.createProjectArchive(
        projectRoot,
        targetDirectory
      );

      // Assert
      // Verify .gitignore was checked but not read.
      expect(mockedFse.pathExists).toHaveBeenCalledWith(
        '/mock/project/.gitignore'
      );
      // Confirm that readFile was NOT called for .gitignore.
      expect(mockedFse.readFile).not.toHaveBeenCalledWith(
        '/mock/project/.gitignore',
        expect.any(String)
      );

      // Verify that the ignore instance was not given any rules.
      expect(mockIgnoreInstance.add).not.toHaveBeenCalled();

      // Verify that since no rules were added, no files were filtered.
      expect(result.includedFiles).toEqual([
        'src/index.js',
        'src/temp/data.log',
      ]);
      expect(result.fileManifest).toEqual({
        'src/index.js': 'hash-of-main content',
        'src/temp/data.log': 'hash-of-log content',
      });
      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(2);

      bufferConcatSpy.mockRestore();
    });
  });
  describe.skip('createZipFromPaths', () => {
    const projectRoot = '/mock/project';
    let pipedStream: Stream.PassThrough | null;

    beforeEach(() => {
      pipedStream = null;
      // Set up the global mock instance for archiver
      global.__MOCK_ARCHIVE_INSTANCE__ = {
        file: jest.fn(),
        on: jest.fn(),
        pipe: jest.fn((stream: unknown) => {
          pipedStream = stream as Stream.PassThrough;
        }),
        finalize: jest.fn(async () => {
          // When finalize is called, immediately end the stream to resolve the promise.
          pipedStream?.emit('end');
        }),
      };
    });

    it('should create a zip buffer by adding the specified files', async () => {
      // Arrange
      const relativePaths = ['src/index.ts', 'docs/guide.md'];
      const finalBuffer = Buffer.from('final-zip-content-123');
      const bufferConcatSpy = jest
        .spyOn(Buffer, 'concat')
        .mockReturnValue(finalBuffer);

      // Act
      const result = await fileUtilsModule.createZipFromPaths(
        relativePaths,
        projectRoot
      );

      // Assert
      expect(global.__MOCK_ARCHIVE_INSTANCE__?.pipe).toHaveBeenCalled();
      expect(global.__MOCK_ARCHIVE_INSTANCE__?.file).toHaveBeenCalledWith(
        '/mock/project/src/index.ts',
        { name: 'src/index.ts' }
      );
      expect(global.__MOCK_ARCHIVE_INSTANCE__?.file).toHaveBeenCalledWith(
        '/mock/project/docs/guide.md',
        { name: 'docs/guide.md' }
      );
      expect(global.__MOCK_ARCHIVE_INSTANCE__?.finalize).toHaveBeenCalledTimes(
        1
      );
      expect(result).toBe(finalBuffer);

      bufferConcatSpy.mockRestore();
    });

    it('should reject the promise if the archiver emits an error', async () => {
      // Arrange
      const archiveError = new Error('Zip creation failed');
      // Modify finalize to do nothing so we can control the error event manually
      global.__MOCK_ARCHIVE_INSTANCE__?.finalize.mockImplementation(
        async () => {}
      );
      // Capture the error handler attached by the function
      let errorHandler: ((err: Error) => void) | null = null;
      global.__MOCK_ARCHIVE_INSTANCE__?.on?.mockImplementation((event, cb) => {
        if (event === 'error') {
          errorHandler = cb as (err: Error) => void;
        }
      });

      // Act
      const promise = fileUtilsModule.createZipFromPaths(
        ['file.txt'],
        projectRoot
      );
      // Manually trigger the captured error handler
      errorHandler!(archiveError);

      // Assert
      await expect(promise).rejects.toThrow(archiveError);
    });

    it('should reject the promise if adding a file throws an error', async () => {
      // Arrange
      const fileError = new Error('Cannot read file');
      global.__MOCK_ARCHIVE_INSTANCE__?.file?.mockImplementation(() => {
        throw fileError;
      });

      // Act & Assert
      await expect(
        fileUtilsModule.createZipFromPaths(['bad-file.txt'], projectRoot)
      ).rejects.toThrow(fileError);
    });
  });
});
