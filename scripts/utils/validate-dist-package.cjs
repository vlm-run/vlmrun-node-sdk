const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const distDir = path.resolve(process.argv[2] || process.env.DIST_DIR || 'dist');
const pkgPath = path.join(distDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error(`validate-dist-package: missing ${pkgPath}`);
  process.exit(1);
}

const pkg = require(pkgPath);

function resolveEntry(field) {
  const value = pkg[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`package.json ${field} must be a non-empty string`);
  }
  if (value.includes('dist/')) {
    throw new Error(`package.json ${field} still points under dist/: ${value}`);
  }
  const rel = value.replace(/^\.\//, '');
  const abs = path.join(distDir, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`package.json ${field} file missing: ${value} (${abs})`);
  }
  return abs;
}

async function main() {
  const mainPath = resolveEntry('main');
  const modulePath = resolveEntry('module');
  resolveEntry('types');

  const cjs = require(mainPath);
  const VlmRun = cjs.VlmRun || cjs.default?.VlmRun || cjs.default;
  if (typeof VlmRun !== 'function') {
    throw new Error('CJS entry missing VlmRun export');
  }

  const esm = await import(pathToFileURL(modulePath).href);
  const EsmVlmRun = esm.VlmRun || esm.default?.VlmRun || esm.default;
  if (typeof EsmVlmRun !== 'function') {
    throw new Error('ESM entry missing VlmRun export');
  }

  console.log('validate-dist-package: OK');
}

main().catch((err) => {
  console.error(`validate-dist-package: ${err.message}`);
  process.exit(1);
});
