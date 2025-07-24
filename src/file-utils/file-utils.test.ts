// import {
//   afterEach,
//   beforeEach,
//   describe,
//   expect,
//   it,
//   jest,
// } from '@jest/globals';
// import { PassThrough } from 'stream'; // Import PassThrough for type reference
// import { createZipFromPaths } from './archive';

// // --- MOCK SETUP ---

// // Mock the archiver library
// const mockArchiverInstance = {
//   pipe: jest.fn(),
//   directory: jest.fn(),
//   file: jest.fn(),
//   finalize: jest.fn().mockResolvedValue(undefined as never), // Mock finalize to be successful by default
//   on: jest.fn(),
// };
// jest.mock('archiver', () => jest.fn(() => mockArchiverInstance));

// // Mock the file system module
// jest.mock('fs', () => ({
//   statSync: jest.fn(),
// }));
// // CORRECTED: Use jest.mocked() on the specific function from the mock
// const mockedStatSync = jest.mocked(
//   (jest.requireMock('fs') as typeof import('fs')).statSync
// );

// // Mock path module for consistent behavior across platforms
// jest.mock('path', () => ({
//   basename: jest.fn((p: string) => p.split('/').pop() || ''),
// }));
// // CORRECTED: Use jest.mocked() on the specific function from the mock
// // const mockedPathBasename = jest.mocked(
// //   (jest.requireMock('path') as typeof import('path')).basename
// // );

// // Mock PassThrough to control stream events
// jest.mock('stream', () => ({
//   PassThrough: jest.fn().mockImplementation(() => {
//     const actualStream = jest.requireActual('stream') as {
//       PassThrough: typeof PassThrough;
//     };
//     const stream = new actualStream.PassThrough();
//     stream.on = jest.fn(stream.on);
//     return stream;
//   }),
// }));

// const MockPassThrough = PassThrough as jest.MockedClass<typeof PassThrough>;

// const createMockStats = (
//   options: { isFile?: boolean; isDirectory?: boolean } = {}
// ): import('fs').Stats => ({
//   isFile: () => options.isFile ?? false, // Default to false if not specified
//   isDirectory: () => options.isDirectory ?? false, // Default to false if not specified
//   isBlockDevice: () => false,
//   isCharacterDevice: () => false,
//   isFIFO: () => false,
//   isSocket: () => false,
//   isSymbolicLink: () => false,
//   dev: 0,
//   ino: 0,
//   mode: 0,
//   nlink: 0,
//   uid: 0,
//   gid: 0,
//   rdev: 0,
//   size: 0,
//   blksize: 0,
//   blocks: 0,
//   atimeMs: 0,
//   mtimeMs: 0,
//   ctimeMs: 0,
//   birthtimeMs: 0,
//   atime: new Date(0), // Using epoch date for consistency
//   mtime: new Date(0),
//   ctime: new Date(0),
//   birthtime: new Date(0),
// });

// describe('createZipFromPaths', () => {
//   let consoleWarnSpy: ReturnType<typeof jest.spyOn>;

//   beforeEach(() => {
//     jest.clearAllMocks();
//     consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
//   });

//   afterEach(() => {
//     jest.restoreAllMocks();
//   });

//   // --- Input Validation Tests ---
//   describe('Input Validation', () => {
//     it('should throw an error if no paths are provided', async () => {
//       await expect(createZipFromPaths([])).rejects.toThrow(
//         'No paths provided for archiving'
//       );
//     });

//     it('should throw an error if paths array is null or undefined', async () => {
//       // @ts-expect-error Testing invalid input
//       await expect(createZipFromPaths(null)).rejects.toThrow(
//         'No paths provided for archiving'
//       );
//     });

//     it('should throw an error if paths contain non-string values', async () => {
//       await expect(
//         // @ts-expect-error Testing invalid input
//         createZipFromPaths(['/valid/path', null, '/another/valid'])
//       ).rejects.toThrow(
//         'Invalid path provided: all paths must be non-empty strings'
//       );
//     });
//   });

//   // --- Success Path Tests ---
//   describe('Successful Archiving', () => {
//     // it('should correctly archive a mix of files and directories', async () => {
//     //   // Use the mocked statSync directly
//     //   mockedStatSync.mockImplementation((p: string) => {
//     //     if (p === 'path/to/file.txt') {
//     //       return { isDirectory: () => false };
//     //     }
//     //     if (p === 'path/to/folder') {
//     //       return { isDirectory: () => true };
//     //     }
//     //     throw new Error(`fs.statSync: Path not mocked for "${p}"`);
//     //   });
//     //   // Use the mocked path.basename directly
//     //   mockedPathBasename.mockImplementation(
//     //     (p: string) => p.split('/').pop() || ''
//     //   );
//     //   const promise = createZipFromPaths([
//     //     'path/to/file.txt',
//     //     'path/to/folder',
//     //   ]);
//     //   const passThroughInstance = MockPassThrough.mock.results[0].value as any;
//     //   passThroughInstance.emit('data', Buffer.from('zip'));
//     //   passThroughInstance.emit('data', Buffer.from('data'));
//     //   passThroughInstance.emit('end');
//     //   const buffer = await promise;
//     //   expect(buffer.toString()).toBe('zipdata');
//     //   expect(mockArchiverInstance.file).toHaveBeenCalledWith(
//     //     'path/to/file.txt',
//     //     {
//     //       name: 'file.txt',
//     //     }
//     //   );
//     //   expect(mockArchiverInstance.directory).toHaveBeenCalledWith(
//     //     'path/to/folder',
//     //     'folder'
//     //   );
//     //   expect(mockArchiverInstance.finalize).toHaveBeenCalled();
//     //   expect(mockArchiverInstance.pipe).toHaveBeenCalledWith(
//     //     passThroughInstance
//     //   );
//     // });
//     it('should call archive.directory for directory paths', async () => {
//       // Arrange: statSync returns isDirectory() === true
//       mockedStatSync.mockReturnValue(createMockStats({ isDirectory: true }));

//       // Act
//       const promise = createZipFromPaths(['/some/dir']);

//       // Simulate stream end to resolve the promise
//       const passThroughInstance = MockPassThrough.mock.results[0]
//         .value as PassThrough;
//       passThroughInstance.emit('end');

//       await promise;

//       // Assert
//       expect(mockArchiverInstance.directory).toHaveBeenCalledWith(
//         '/some/dir',
//         'dir'
//       );
//       expect(mockArchiverInstance.file).not.toHaveBeenCalled();
//       expect(mockArchiverInstance.finalize).toHaveBeenCalled();
//     });
//     it('should collect data chunks from PassThrough and return concatenated buffer', async () => {
//       mockedStatSync.mockReturnValue(createMockStats({ isDirectory: false }));

//       const promise = createZipFromPaths(['/some/file.txt']);

//       const passThroughInstance = MockPassThrough.mock.results[0]
//         .value as PassThrough;
//       passThroughInstance.emit('data', Buffer.from('foo'));
//       passThroughInstance.emit('data', Buffer.from('bar'));
//       passThroughInstance.emit('end');

//       const result = await promise;
//       expect(result).toBeInstanceOf(Buffer);
//       expect(result.toString()).toBe('foobar');
//     });
//   });

//   // --- Error Handling Tests ---
//   describe('Error Handling', () => {
//     it('should reject if fs.statSync throws an error', async () => {
//       const accessError = new Error('Permission denied');
//       mockedStatSync.mockImplementation(() => {
//         // Use mockedStatSync
//         throw accessError;
//       });

//       await expect(createZipFromPaths(['/protected/file'])).rejects.toThrow(
//         `Failed to access path "/protected/file": ${accessError}`
//       );
//       expect(mockArchiverInstance.finalize).not.toHaveBeenCalled();
//     });

//     it('should reject if archiver emits a critical warning', async () => {
//       const warning = new Error('A critical warning occurred');
//       // @ts-expect-error Adding a non-standard property for the test
//       warning.code = 'CRITICAL';

//       mockedStatSync.mockReturnValue(createMockStats({ isDirectory: false }));

//       mockArchiverInstance.on.mockImplementation((event, listener) => {
//         if (event === 'warning') {
//           if (typeof listener === 'function') {
//             listener(warning);
//           }
//         }
//       });

//       await expect(createZipFromPaths(['/any/path'])).rejects.toThrow(
//         'A critical warning occurred'
//       );
//     });

//     it('should log non-critical warnings (ENOENT) but not reject', async () => {
//       const warning = new Error('File not found');
//       // @ts-expect-error ENOENT is the code for "file not found" warnings
//       warning.code = 'ENOENT';

//       mockedStatSync.mockReturnValue(createMockStats({ isFile: true })); // Use mockedStatSync

//       mockArchiverInstance.on.mockImplementation((event, listener) => {
//         if (event === 'warning') {
//           if (typeof listener === 'function') {
//             listener(warning);
//           }
//         }
//       });

//       const promise = createZipFromPaths(['/a/file']);

//       const passThroughInstance = MockPassThrough.mock.results[0]
//         .value as PassThrough;
//       passThroughInstance.emit('end');

//       await promise;

//       expect(consoleWarnSpy).toHaveBeenCalledWith('Archiver warning:', warning);
//       expect(mockArchiverInstance.finalize).toHaveBeenCalled();
//     });

//     it('should reject if archiver emits an error', async () => {
//       const archiveError = new Error('Archive stream broke');
//       mockedStatSync.mockReturnValue(createMockStats({ isDirectory: false })); // Use mockedStatSync

//       mockArchiverInstance.on.mockImplementation((event, listener) => {
//         if (event === 'error') {
//           if (typeof listener === 'function') {
//             listener(archiveError);
//           }
//         }
//       });

//       await expect(createZipFromPaths(['/a/file'])).rejects.toThrow(
//         'Archive stream broke'
//       );

//       // Ensure that the 'end' event handler is not called
//       const endHandler = jest.fn();
//       mockArchiverInstance.on.mockImplementation((event, _) => {
//         if (event === 'end') {
//           endHandler();
//         }
//       });
//       expect(endHandler).not.toHaveBeenCalled();
//     });

//     it('should reject if the PassThrough stream emits an error', async () => {
//       const streamError = new Error('Stream failed');
//       mockedStatSync.mockReturnValue(createMockStats({ isDirectory: false })); // Use mockedStatSync

//       const promise = createZipFromPaths(['/a/file']);

//       const passThroughInstance = MockPassThrough.mock.results[0]
//         .value as PassThrough;
//       passThroughInstance.emit('error', streamError);

//       const endHandler = jest.fn();
//       mockArchiverInstance.on.mockImplementation((event, _) => {
//         if (event === 'end') {
//           endHandler();
//         }
//       });

//       await expect(promise).rejects.toThrow('Stream failed');
//       expect(endHandler).not.toHaveBeenCalled();
//     });

//     // test for directory true
//   });
// });
