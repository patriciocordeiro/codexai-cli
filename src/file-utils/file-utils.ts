import archiver from 'archiver';
import * as fse from 'fs-extra';
import { glob } from 'glob';
import ignore from 'ignore'; // A library for parsing .gitignore files
import hash from 'object-hash';
import * as path from 'path';
import Stream from 'stream';

/**
 * Normalizes path separators to always be forward slashes ('/').
 * @param {string} p - The path to normalize.
 * @returns {string} The normalized path with forward slashes.
 */
const _normalizePath = (p: string) => p.replace(/\\/g, '/');

/**
 * Gathers a list of all files to be included in the upload, respecting .gitignore.
 * @returns {Promise<string[]>} An array of file paths relative to the project root.
 */
export async function getFilesToUpload(): Promise<string[]> {
  const projectRoot = process.cwd();

  // 1. Get all files using glob, ignoring default patterns
  const allFiles = await glob('**/*', {
    cwd: projectRoot,
    nodir: true, // Only include files, not directories
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
      '**/.codeai.json', // Ignore our own config file
    ],
    dot: true, // Include dotfiles like .eslintrc
  });

  // 2. Load and parse the .gitignore file if it exists
  const ig = ignore();
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (await fse.pathExists(gitignorePath)) {
    const gitignoreContent = fse.readFileSync(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  }

  // 3. Filter the file list using the ignore patterns
  const includedFiles = allFiles.filter(file => !ig.ignores(file));

  return includedFiles;
}

/**
 * Creates a ZIP archive from the given file paths relative to the project root.
 * @param {string[]} relativePaths - The file paths relative to the project root to include in the ZIP.
 * @param {string} projectRoot - The root directory of the project.
 * @returns {Promise<Buffer>} The ZIP archive as a Buffer.
 */
export async function createZipFromPaths(
  relativePaths: string[],
  projectRoot: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers: Buffer[] = [];
    const converter = new (require('stream').PassThrough)();

    converter.on('data', (data: Buffer<ArrayBufferLike>) => buffers.push(data));
    converter.on('end', () => resolve(Buffer.concat(buffers)));
    converter.on('error', reject);

    archive.pipe(converter);

    (async () => {
      try {
        for (const relativePath of relativePaths) {
          const absolutePath = path.join(projectRoot, relativePath);

          // The `name` property is the key. It sets the file's path inside the zip.
          archive.file(absolutePath, { name: relativePath });
        }

        archive.on('error', reject);

        await archive.finalize();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

/**
 * Creates a ZIP archive and manifest for a project directory, respecting ignore rules and .gitignore.
 * @param {string} projectRoot - The root directory of the project.
 * @param {string} targetDirectory - The target directory to scan and archive.
 * @returns {Promise<{ zipBuffer: Buffer; fileManifest: Record<string, string>; includedFiles: string[] }>} An object containing the ZIP buffer, file manifest, and the list of included files.
 */
export async function createProjectArchive(
  projectRoot: string,
  targetDirectory: string
): Promise<{
  zipBuffer: Buffer;
  fileManifest: Record<string, string>;
  includedFiles: string[];
}> {
  const scanRoot = path.join(projectRoot, targetDirectory);

  // 1. Get all file paths using glob, relative to the scan directory.
  const filesRelativeToTarget = await glob('**/*', {
    cwd: scanRoot,
    nodir: true,
    dot: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.DS_Store',
      '**/.env',
      '**/.env.*',
      '**/*.log',
      '**/.codeai.json',
    ],
  });

  // 2. Load .gitignore from the project root to create ignore rules.
  const ig = ignore();
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (await fse.pathExists(gitignorePath)) {
    const gitignoreContent = await fse.readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  }

  // 3. Filter the list of files based on the ignore rules.
  const includedFilesFinal: string[] = [];
  for (const file of filesRelativeToTarget) {
    // We must check the path relative to the project root against the ignore rules.
    const pathFromProjectRoot = path.join(targetDirectory, file);
    if (!ig.ignores(pathFromProjectRoot)) {
      // If not ignored, add the final, normalized path to our list.
      includedFilesFinal.push(_normalizePath(pathFromProjectRoot));
    }
  }

  // 4. Create the manifest and the ZIP archive from the final file list.
  const fileManifest: Record<string, string> = {};
  const archive = archiver('zip', { zlib: { level: 9 } });

  // A promise that resolves with the final ZIP buffer.
  const archivePromise = new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    const streamPassThrough = new Stream.PassThrough();
    streamPassThrough.on('data', data => buffers.push(data));
    streamPassThrough.on('end', () => resolve(Buffer.concat(buffers)));
    streamPassThrough.on('error', reject);
    archive.pipe(streamPassThrough);
  });

  // Iterate over the final, clean list of relative paths.
  for (const finalRelativePath of includedFilesFinal) {
    const absolutePath = path.join(projectRoot, finalRelativePath);
    const fileContent = await fse.readFile(absolutePath);

    // a) Add the file's hash to the manifest.
    fileManifest[finalRelativePath] = hash(fileContent, { algorithm: 'sha1' });

    // b) Add the file to the zip archive with the exact same relative path.
    archive.append(fileContent, { name: finalRelativePath });
  }

  await archive.finalize();

  const zipBuffer = await archivePromise;

  // 5. Return all three artifacts: the buffer, the manifest, and the list of included files.
  return { zipBuffer, fileManifest, includedFiles: includedFilesFinal };
}
