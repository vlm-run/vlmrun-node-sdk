const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function resolveEntry(pkg, distDir, field) {
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

async function validateDistPackage(distDir) {
  const resolvedDistDir = path.resolve(distDir);
  const pkgPath = path.join(resolvedDistDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`missing ${pkgPath}`);
  }

  const pkg = require(pkgPath);
  const mainPath = resolveEntry(pkg, resolvedDistDir, 'main');
  const modulePath = resolveEntry(pkg, resolvedDistDir, 'module');
  resolveEntry(pkg, resolvedDistDir, 'types');

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
}

if (require.main === module) {
  const distDir = process.argv[2] || process.env.DIST_DIR || 'dist';

  validateDistPackage(distDir)
    .then(() => {
      console.log('publish: dist layout OK');
    })
    .catch((err) => {
      console.error(`publish: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { resolveEntry, validateDistPackage };
