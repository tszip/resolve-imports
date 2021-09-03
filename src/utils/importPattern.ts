/**
 * A crude RegExp to match the `from 'import-source'` part of import statements,
 * or a require(...) call.
 */
export const importPattern = (importSource: string) =>
  new RegExp(
    `(from|require\\(|import)\\s*['"]${importSource.replace('.', '\\.')}['"]`,
    'g'
  );