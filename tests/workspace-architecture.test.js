import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !['dist', 'node_modules'].includes(entry.name)) {
      files.push(...await sourceFiles(target));
    }
    else if (/\.(?:ts|js)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test('workspace packages are private and follow the declared dependency direction', async () => {
  const root = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(root.private, true);
  assert.deepEqual(root.workspaces, ['packages/*']);

  const contracts = JSON.parse(await readFile('packages/game-contracts/package.json', 'utf8'));
  const difficulty = JSON.parse(await readFile('packages/difficulty/package.json', 'utf8'));
  const jumpEngine = JSON.parse(await readFile('packages/jump-engine/package.json', 'utf8'));
  const gameplay = JSON.parse(await readFile('packages/gameplay/package.json', 'utf8'));
  const application = JSON.parse(await readFile('packages/application/package.json', 'utf8'));
  assert.equal(contracts.private, true);
  assert.equal(difficulty.private, true);
  assert.equal(jumpEngine.private, true);
  assert.equal(gameplay.private, true);
  assert.equal(application.private, true);
  assert.deepEqual(contracts.dependencies ?? {}, {});
  assert.deepEqual(difficulty.dependencies, {
    '@number-strategy/game-contracts': '0.1.0',
  });
  assert.deepEqual(jumpEngine.dependencies ?? {}, {});
  assert.deepEqual(gameplay.dependencies, {
    '@number-strategy/difficulty': '0.1.0',
    '@number-strategy/game-contracts': '0.1.0',
    '@number-strategy/jump-engine': '0.1.0',
  });
  assert.deepEqual(application.dependencies, {
    '@number-strategy/difficulty': '0.1.0',
    '@number-strategy/game-contracts': '0.1.0',
    '@number-strategy/gameplay': '0.1.0',
    '@number-strategy/jump-engine': '0.1.0',
  });
});

test('domain and application packages stay free of rendering and host platform access', async () => {
  for (const file of await sourceFiles('packages')) {
    if (!file.includes(`${path.sep}src${path.sep}`)) continue;
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"]three['"]/, `${file} 不得依赖 Three.js`);
    assert.doesNotMatch(
      source,
      /\b(?:window|document|navigator|localStorage|sessionStorage)\s*(?:\.|\[)|\b(?:tt|wx)\s*\./,
      `${file} 不得依赖平台全局对象`,
    );
  }
});
