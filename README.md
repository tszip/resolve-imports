# Resolve Imports

This is a Rollup plugin that resolves import specifiers in input files:

```ts
import packageSubdir from 'my-package/something'
import packageDefault from 'my-package'
import relativeImport from './relative'
```

To fully ESM-compatible specifiers including file extensions, deferring to
package.json `exports` field for imported modules:

```js
// package.json exports: ./* -> ./*/index.js
import packageSubdir from 'my-package/something/index.js'
// package entry is OK
import packageDefault from 'my-package'
// resolve relative import
import relativeImport from './relative.js'
```

This plugin was developed to turn TypeScript's `module: esnext` into valid ESM.
By default, TS emits relative imports like `import stuff from
'./myModule'`, which must be resolved at build-time in order for it to execute
in an ESM context. 

### Further reading
#### Issues
- https://github.com/microsoft/TypeScript/issues/42151
- https://github.com/microsoft/TypeScript/issues/16577
- https://github.com/microsoft/TypeScript/issues/33588

#### Comments
- https://github.com/microsoft/TypeScript/issues/15479#issuecomment-300240856
- https://github.com/microsoft/TypeScript/issues/16577#issuecomment-754941937
- https://github.com/microsoft/TypeScript/issues/26722#issuecomment-580975983