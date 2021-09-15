import { extname, resolve, sep } from 'path';
import { stat } from 'fs/promises';

export const exists = async (file: string) => {
  try {
    await stat(file);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Get the package.json for a given absolute entry point.
 */
export const getPackageJson = (absPath: string) => {
  const parts = absPath.split('node_modules');
  const rootPath = parts[0];

  if (parts.length < 2) return null;
  const moduleParts = parts[1].split(sep);

  /**
   * node_modules/name => name
   * node_modules/@test/test => @test/test
   */
  const moduleName = moduleParts[1].startsWith('@')
    ? moduleParts.slice(1, 3).join(sep)
    : moduleParts[1];

  return resolve(rootPath, 'node_modules', moduleName, 'package.json');
};

export const renameExtension = (file: string, dotExtension: string) => {
  const oldExt = extname(file);
  return file.replace(new RegExp(`\\${oldExt}$`), dotExtension);
};

/**
 * A crude RegExp to match the `from 'import-source'` part of import statements,
 * or a require(...) call.
 */
export const importPattern = (importSource: string) =>
  new RegExp(
    `(from|require\\(|import)\\s*['"]${importSource.replace('.', '\\.')}['"]`,
    'g',
  );
