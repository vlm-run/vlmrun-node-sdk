const pkgJson = require(process.env['PKG_JSON_PATH'] || '../../package.json');

function processExportMap(m) {
  for (const key in m) {
    const value = m[key];
    if (typeof value === 'string') m[key] = value.replace(/^\.\/dist\//, './');
    else processExportMap(value);
  }
}
if (pkgJson.exports) {
  processExportMap(pkgJson.exports);
}

for (const key of ['types', 'main', 'module']) {
  if (typeof pkgJson[key] === 'string') pkgJson[key] = pkgJson[key].replace(/^(\.\/)?dist\//, './');
}

delete pkgJson.devDependencies;
delete pkgJson.scripts;
delete pkgJson.packageManager;
delete pkgJson.overrides;

console.log(JSON.stringify(pkgJson, null, 2));
