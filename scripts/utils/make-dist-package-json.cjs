function prepareDistPackageJson(pkgJson) {
  const result = JSON.parse(JSON.stringify(pkgJson));

  function processExportMap(m) {
    for (const key in m) {
      const value = m[key];
      if (typeof value === 'string') m[key] = value.replace(/^\.\/dist\//, './');
      else processExportMap(value);
    }
  }

  if (result.exports) {
    processExportMap(result.exports);
  }

  for (const key of ['types', 'main', 'module']) {
    if (typeof result[key] === 'string') {
      result[key] = result[key].replace(/^(\.\/)?dist\//, './');
    }
  }

  delete result.devDependencies;
  delete result.scripts;
  delete result.packageManager;
  delete result.overrides;

  return result;
}

if (require.main === module) {
  const pkgJson = require(process.env.PKG_JSON_PATH || '../../package.json');
  console.log(JSON.stringify(prepareDistPackageJson(pkgJson), null, 2));
}

module.exports = { prepareDistPackageJson };
