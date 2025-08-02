// @ts-ignore
import { execSync } from 'child_process';

export function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only', { encoding: 'utf-8' });
    const files = output.split('\n').filter((f: string) => f.trim().length > 0);
    return files.map((f: string) => f.trim().replace(/\\/g, '/'));
  } catch (err) {
    console.error(
      'Failed to get changed files from git. Is this a git repository?',
      err
    );
    return [];
  }
}
