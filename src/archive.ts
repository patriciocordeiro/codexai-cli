import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';

/**
 * Creates a ZIP archive in memory from a list of file and folder paths.
 *
 * @param paths An array of paths to files or folders.
 * @returns A Promise that resolves with a Buffer containing the ZIP file data.
 */
export async function createZipFromPaths(paths: string[]): Promise<Buffer> {
  // Input validation
  if (!paths || paths.length === 0) {
    throw new Error('No paths provided for archiving');
  }

  if (paths.some(p => !p || typeof p !== 'string')) {
    throw new Error(
      'Invalid path provided: all paths must be non-empty strings'
    );
  }

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    const buffers: Buffer[] = [];
    const converter = new PassThrough();

    converter.on('data', data => {
      buffers.push(data);
    });
    converter.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    converter.on('error', reject);

    archive.pipe(converter);

    for (const p of paths) {
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          // If it's a directory, we use glob to find all files within it
          // and add the whole directory to the archive.
          // `cwd` makes the paths inside the zip relative to the directory itself.
          // `name` is the folder name that will appear at the root of the zip.
          archive.directory(p, path.basename(p));
        } else {
          // If it's a single file, add it to the root of the archive.
          archive.file(p, { name: path.basename(p) });
        }
      } catch (error) {
        reject(new Error(`Failed to access path "${p}": ${error}`));
        return;
      }
    }

    // Check for warnings and errors during the archival process
    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', err => {
      reject(err);
    });

    // Finalize the archive. This is essential.
    archive.finalize().catch(reject);
  });
}
