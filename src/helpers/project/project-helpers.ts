import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';

export async function getProjectNameFromPackageJson(): Promise<string | null> {
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (await fse.pathExists(pkgJsonPath)) {
    const pkg = await fse.readJson(pkgJsonPath);
    return pkg.name || null;
  }
  return null;
}

export async function getProjectName(options: {
  name?: string;
}): Promise<string> {
  if (options.name && typeof options.name === 'string' && options.name.trim()) {
    return options.name.trim();
  }
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (await fse.pathExists(pkgJsonPath)) {
    try {
      const pkg = await fse.readJson(pkgJsonPath);
      if (pkg.name) {
        return pkg.name;
      }
    } catch (error) {
      console.warn(
        chalk.yellow('Could not read "name" from package.json.'),
        error
      );
    }
  }
  return path.basename(process.cwd());
}
