const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function validateTarball(tarballPath) {
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vlmrun-tarball-'));

  try {
    execFileSync('tar', ['-xzf', tarballPath, '-C', extractDir], { stdio: 'pipe' });
    const packageDir = path.join(extractDir, 'package');
    const pkg = require(path.join(packageDir, 'package.json'));

    for (const key of ['main', 'module', 'types']) {
      const value = pkg[key];
      if (typeof value !== 'string' || value.includes('dist/')) {
        throw new Error(`Tarball package.json has stale entrypoint: ${key} ${value}`);
      }
      const file = value.replace(/^\.\//, '');
      if (!fs.existsSync(path.join(packageDir, file))) {
        throw new Error(`Tarball missing file for ${key}: ${value}`);
      }
    }
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    validateTarball(path.resolve(process.argv[2]));
    console.log('publish: tarball metadata OK');
  } catch (err) {
    console.error(`publish: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { validateTarball };
