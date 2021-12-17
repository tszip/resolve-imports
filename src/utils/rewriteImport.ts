export const createDynamicImport = (
  identifiers: string[],
  source: string,
  type: 'default' | 'named' | 'star',
) => {
  switch (type) {
    case 'default':
      return `const { default: ${identifiers[0]} } = await import(${source})`;
    case 'named':
      return `const { ${identifiers.join(',')} } = await import(${source})`;
    case 'star':
      return `const ${identifiers[0]} = await import(${source})`;
    default:
      throw new Error(`Unknown import type: ${type}`);
  }
};

export const rewriteImport = (
  importStatement: string,
  importToReplace: string,
  importReplacement: string,
) => {
  const [identifierPart, sourcePart] = importStatement.split(/from|\(/);
  /**
   * Always rewrite the source.
   */
  const rewrittenSource = sourcePart
    .replace(importToReplace, importReplacement)
    .trim();

  if (!importStatement.includes('import')) {
    /**
     * `export from` statement.
     */
    return importStatement.replace(sourcePart, rewrittenSource);
  } else if (!importStatement.includes('(')) {
    if (importStatement.includes('*')) {
      /**
       * Star import detected.
       */
      const identifierParts = identifierPart.split('as');
      const starIdentifier = identifierParts[1].trim();
      const identifiers = [starIdentifier];

      return createDynamicImport(identifiers, rewrittenSource, 'star');
    } else if (importStatement.includes('{')) {
      /**
       * Named import detected.
       */
      const identifiers = identifierPart
        .replace(/^.+{/, '')
        .replace(/}.+$/, '')
        .split(',')
        .map((identifier) => identifier.trim());

      return createDynamicImport(identifiers, rewrittenSource, 'named');
    } else {
      /**
       * Default import detected.
       */
      const [, identifier] = identifierPart.split('import');
      const identifiers = [identifier];

      return createDynamicImport(identifiers, rewrittenSource, 'default');
    }
  }

  return importStatement.replace(sourcePart, rewrittenSource);
};
