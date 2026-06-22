const fs = require('fs');
const path = require('path');

const { prepareDistPackageJson } = require('./prepare-package-json.cjs');

function prepareDist(repoRoot = path.join(__dirname, '../..')) {
  const distDir = path.join(repoRoot, 'dist');
  const sourcePackage = require(path.join(repoRoot, 'package.json'));

  fs.writeFileSync(
    path.join(distDir, 'package.json'),
    `${JSON.stringify(prepareDistPackageJson(sourcePackage), null, 2)}\n`,
  );

  for (const file of ['README.md', 'LICENSE']) {
    const source = path.join(repoRoot, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(distDir, file));
    }
  }
}

if (require.main === module) {
  prepareDist();
  console.log('publish: dist package prepared');
}

module.exports = { prepareDist };
