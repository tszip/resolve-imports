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
 * Matches a complete import statement, including the import keyword, as well as
 * dynamic imports and requires.
 */
export const importPattern = (importSource: string) => {
  const exprBreak = '[^\n\r;]*';
  const escaped = importSource.replace('.', '\\.').replace('/', '\\/');
  const padded = `${exprBreak}["']${escaped}["']${exprBreak}`;

  const importFrom = `(import${exprBreak}from)`;
  const dynamicImport = `(import|require)${exprBreak}\\(`;
  const exportFrom = `(export${exprBreak}from)`;
  return new RegExp(
    `(${importFrom}|${dynamicImport}|${exportFrom})${padded}`,
    'g',
  );
};
