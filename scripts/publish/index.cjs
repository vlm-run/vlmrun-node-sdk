#!/usr/bin/env node

/**
 * npm publish validation pipeline.
 *
 * Flow:
 *   1. build (tsup)              -> dist/index.{js,mjs,d.ts}
 *   2. prepare dist metadata     -> dist/package.json with ./index.* entrypoints
 *   3. validate dist layout      -> files exist, CJS/ESM export VlmRun
 *   4. validate tarball          -> npm pack contents match publish layout
 *   5. consumer smoke            -> Vitest 3.x can import the packed tarball
 *
 * Used by: npm run validate:publish, bin/publish-npm, CI
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const { prepareDist } = require('./prepare-dist.cjs');
const { validateDistPackage } = require('./validate-dist.cjs');
const { validateTarball } = require('./validate-tarball.cjs');
const { runConsumerSmoke } = require('./consumer-smoke.cjs');

const repoRoot = path.join(__dirname, '../..');
const distDir = path.join(repoRoot, 'dist');

function shouldSkipBuild() {
  return process.argv.includes('--skip-build') || process.env.SKIP_BUILD === '1';
}

async function runPublishValidation() {
  if (!shouldSkipBuild()) {
    execSync('npm run build', { cwd: repoRoot, stdio: 'inherit' });
  }

  prepareDist(repoRoot);
  console.log('publish: dist package prepared');

  await validateDistPackage(distDir);
  console.log('publish: dist layout OK');

  for (const file of fs.readdirSync(distDir)) {
    if (file.endsWith('.tgz')) {
      fs.unlinkSync(path.join(distDir, file));
    }
  }

  const tarballName = execSync('npm pack --silent', {
    cwd: distDir,
    encoding: 'utf8',
  }).trim();
  const tarballPath = path.join(distDir, tarballName);

  validateTarball(tarballPath);
  console.log('publish: tarball metadata OK');

  runConsumerSmoke(tarballPath);
  console.log('publish: consumer Vitest smoke OK');
  console.log('publish: all checks passed');
}

if (require.main === module) {
  runPublishValidation().catch((err) => {
    console.error(`publish: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runPublishValidation, shouldSkipBuild };
