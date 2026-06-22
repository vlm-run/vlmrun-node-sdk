const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const VITEST_CONFIG = `import { defineConfig } from 'vitest/config';
export default defineConfig({});
`;

const CONSUMER_TEST = `import { describe, it, expect } from 'vitest';
import { VlmRun } from 'vlmrun';

describe('vlmrun consumer resolution', () => {
  it('loads through Vite/Vitest 3.x package entry resolution', () => {
    expect(VlmRun).toBeDefined();
    expect(typeof VlmRun).toBe('function');
  });
});
`;

function runConsumerSmoke(tarballPath) {
  const consumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vlmrun-consumer-'));

  try {
    execFileSync('npm', ['init', '-y'], { cwd: consumerDir, stdio: 'pipe' });
    execFileSync(
      'npm',
      ['install', tarballPath, 'vitest@3.2.4', 'vite@6', 'typescript@5'],
      { cwd: consumerDir, stdio: 'pipe' },
    );
    fs.writeFileSync(path.join(consumerDir, 'vitest.config.ts'), VITEST_CONFIG);
    fs.writeFileSync(path.join(consumerDir, 'consumer-resolve.test.ts'), CONSUMER_TEST);
    execFileSync('npx', ['vitest', 'run'], { cwd: consumerDir, stdio: 'pipe' });
  } finally {
    fs.rmSync(consumerDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    runConsumerSmoke(path.resolve(process.argv[2]));
    console.log('publish: consumer Vitest smoke OK');
  } catch (err) {
    console.error(`publish: consumer smoke failed`);
    if (err.stderr) process.stderr.write(err.stderr);
    if (err.stdout) process.stdout.write(err.stdout);
    process.exit(1);
  }
}

module.exports = { runConsumerSmoke };
