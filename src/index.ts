import { readFile } from 'fs/promises';
import { dirname, extname, isAbsolute, relative } from 'path';
import { resolve as resolveExports } from 'resolve.exports';
import {
  importPattern,
  getPackageJson,
  renameExtension,
  exists,
} from './utils/filesystem';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Resolve every relative import in output to their entry points.
 *
 * TypeScript loves to leave things like `import { jsx } from
 * 'react/jsx-runtime` when react/jsx-runtime isn't a valid import
 * source:  react/jsx-runtime.js *is*.
 */
export const resolveImports = (opts: any) => {
  const fileExtensions = ['.mjs', '.js', '.jsx', '.cjs'];

  return {
    name: 'Resolve final runtime imports to files',
    renderChunk: async (code: string, chunk: any) => {
      console.time(`resolveImports ${chunk.facadeModuleId}`);
      /**
       * Iterate over imports and rewrite all import sources to entry
       * points.
       */
      for await (let chunkImport of chunk.imports) {
        /**
         * If the import already has a file extension, do not touch.
         */
        if (extname(chunkImport)) continue;
        /**
         * Coerce require('.') -> require('./'), ../.. -> ../../, etc for
         * compatibility with the require.resolve() algorithm.
         */
        if (chunkImport.endsWith('.')) chunkImport += '/';
        /**
         * Otherwise, resolve the import relative to the compiled entry point.
         */
        let absEntryPoint;
        try {
          absEntryPoint = require.resolve(chunkImport, {
            paths: [dirname(chunk.facadeModuleId)],
          });
        } catch (error) {
          console.log({ chunkImport }, dirname(chunk.facadeModuleId));
          console.log(error);
          continue;
        }
        /**
         * The absolute location of the module entry point.
         * `require.resolve` logic can be used to resolve the "vanilla"
         * entry point as the output will be ES, and then module-specific
         * extensions (.mjs, .cjs) will be tried.
         */
        const originalFileExt = extname(chunkImport);
        const absEntryWithoutExtension = absEntryPoint.replace(
          originalFileExt,
          '',
        );
        /**
         * Try to resolve ESM/CJS-specific extensions over .js when bundling
         * for those formats.
         */
        for (const fileExtension of fileExtensions) {
          const withExtension = absEntryWithoutExtension + fileExtension;
          if (await exists(withExtension)) {
            absEntryPoint = withExtension;
            break;
          }
        }
        /**
         * The pattern matching the "from ..." import statement for this
         * import.
         */
        let importToReplace;
        /**
         * The path to replace this import with.
         */
        let importReplacement;
        /**
         * Crawl package.json.
         */
        const packageJsonPath = getPackageJson(absEntryPoint);
        if (packageJsonPath && await exists(packageJsonPath)) {
          /**
           * Check if there's `exports` package.json logic. if there is, it
           * controls the flow.
           */
          const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);
          const exportsFieldResolution = resolveExports(
            packageJson,
            chunkImport,
          );
          /**
           * If there is `exports` logic that resolves this import, do not
           * rewrite it.
           */
          if (exportsFieldResolution) continue;
          importToReplace = chunkImport;
          importReplacement = absEntryPoint.slice(
            absEntryPoint.indexOf(chunkImport),
          );
        } else {
          /**
           * If package.json not found, bail if the path is relative (implies
           * builtin, i.e. { absEntryPoint: 'path' }).
           */
          if (!isAbsolute(absEntryPoint)) continue;
          /**
           * Otherwise, this is a relative import specified absolutely by
           * Rollup.
           */
          const baseDir = dirname(opts.input);
          let relativeEntry = relative(baseDir, absEntryPoint);
          if (!relativeEntry.startsWith('.')) {
            relativeEntry = './' + relativeEntry;
          }
          const relativeImportNoExt = renameExtension(relativeEntry, '');
          importToReplace = relativeImportNoExt;
          /**
           * ./path/to/module/index will be in TS output as ./path/to/module.
           */
          if (importToReplace.endsWith('/index')) {
            importToReplace = importToReplace.slice(0, -'/index'.length);
          }
          importReplacement = `${relativeImportNoExt}.mjs`;
          // console.log(opts.input, { baseDir, relativeImportNoExt });
          // console.log({ importToReplace, importReplacement });
          // console.log(opts.input, {
          //   absEntryPoint,
          //   importToReplace,
          //   importReplacement,
          // });
        }
        if (!importToReplace || !importReplacement) continue;
        /**
         * Read the matched import/require statements and replace them.
         */
        const importMatch = importPattern(importToReplace);
        const matches = code.match(importMatch) ?? [];
        for (const match of matches) {
          const rewritten = match.replace(importToReplace, importReplacement);
          code = code.replace(match, rewritten);
        }
      }

      console.timeEnd(`resolveImports ${chunk.facadeModuleId}`);

      return {
        code,
        map: null,
      };
    },
  };
};
