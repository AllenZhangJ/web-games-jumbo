import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
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
  assert.equal(contracts.private, true);
  assert.equal(difficulty.private, true);
  assert.deepEqual(contracts.dependencies ?? {}, {});
  assert.deepEqual(difficulty.dependencies, {
    '@number-strategy/game-contracts': '0.1.0',
  });
});

test('contract and difficulty packages stay free of rendering and platform globals', async () => {
  for (const file of await sourceFiles('packages')) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"]three['"]/, `${file} 不得依赖 Three.js`);
    assert.doesNotMatch(
      source,
      /\b(?:window|document|navigator|localStorage|sessionStorage|tt|wx)\b/,
      `${file} 不得依赖平台全局对象`,
    );
  }
});
