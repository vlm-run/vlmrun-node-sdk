# npm publish architecture

This folder is the **only supported path** for preparing and validating npm releases.

## Layout

| File | Role |
|------|------|
| `index.cjs` | Orchestrator — runs the full publish validation pipeline |
| `prepare-package-json.cjs` | Rewrites repo `package.json` entrypoints for publish-from-`dist/` |
| `prepare-dist.cjs` | Writes `dist/package.json` and copies README/LICENSE |
| `validate-dist.cjs` | Validates `dist/` entrypoints and loads CJS + ESM |
| `validate-tarball.cjs` | Validates the contents of `npm pack` output |
| `consumer-smoke.cjs` | Installs the tarball in a temp project and runs Vitest 3.x |

## Supported commands

```bash
npm run build              # tsup -> dist/index.{js,mjs,d.ts}
npm run prepare:dist       # write dist/package.json for publish root
npm run validate:publish   # full pipeline (build + prepare + all checks)
```

Release publish flow (`bin/publish-npm`):

```bash
npm run validate:publish   # must pass before publish
cd dist && npm publish
```

## Repo layout vs publish layout

During development the repo root has:

```text
package.json   main: dist/index.js
dist/index.js
```

The published tarball is built **from `dist/`**, so publish metadata must use:

```text
package.json   main: ./index.js
index.js
```

`prepare-package-json.cjs` performs that rewrite.

## Legacy (not used for npm publish)

`scripts/build` is the older tsc-multi pipeline retained for reference. **Do not use it for npm releases.** Use `npm run build` (tsup) instead.

## Tests

Jest regression tests live in `tests/unit/publish/` and import modules from this folder.
