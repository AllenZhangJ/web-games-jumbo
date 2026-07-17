import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { build as esbuild } from 'esbuild';

async function directoryExists(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function listJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listJavaScript(target));
    else if (entry.name.endsWith('.js')) result.push(target);
  }
  return result;
}

test('core and runtime layers never call tt.* or wx.* directly', async () => {
  const root = path.resolve('src');
  const directories = ['core', 'runtime', 'render', 'render3d']
    .map((directory) => path.join(root, directory));
  const existingDirectories = [];
  for (const directory of directories) {
    if (await directoryExists(directory)) existingDirectories.push(directory);
  }
  const files = (await Promise.all(existingDirectories.map(listJavaScript))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\b(?:tt|wx)\s*\./, `${file} 泄漏了平台 API`);
  }
});

test('mini-game platform and entries do not depend on browser DOM globals', async () => {
  const files = [
    'src/platform/mini-game.js',
    'src/platform/douyin.js',
    'src/platform/wechat.js',
    'src/entry/douyin.js',
    'src/entry/wechat.js',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /\b(?:window|document|navigator|localStorage|sessionStorage|HTMLElement)\b/,
      `${file} 不应依赖浏览器 DOM/BOM`,
    );
  }
});

test('Three.js can be bundled as a mini-game IIFE', async () => {
  const result = await esbuild({
    stdin: {
      contents: "import { Scene, WebGLRenderer } from 'three'; globalThis.__threeSmoke = { Scene, WebGLRenderer };",
      resolveDir: path.resolve('.'),
      sourcefile: 'three-mini-game-smoke.js',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1);
  assert.match(result.outputFiles[0].text, /WebGLRenderer/);
  assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
});

test('mini-game entries bundle without importing the web platform', async () => {
  for (const entryPoint of ['src/entry/douyin.js', 'src/entry/wechat.js']) {
    const result = await esbuild({
      entryPoints: [path.resolve(entryPoint)],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'neutral',
      target: 'es2020',
      metafile: true,
      logLevel: 'silent',
    });
    const inputs = Object.keys(result.metafile.inputs);
    assert.ok(!inputs.some((input) => input.endsWith('src/platform/web.js')));
    assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
  }
});

test('Arena authority has no renderer, browser, platform or host API dependency', async () => {
  const files = await listJavaScript(path.resolve('src/arena'));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"]three['"]|render3d|src\/platform|\.\.\/platform|\bwindow\b|\bdocument\b|\bnavigator\b|\b(?:tt|wx)\s*\.)/,
      `${file} 泄漏了渲染、浏览器或平台依赖`,
    );
    assert.doesNotMatch(source, /@dimforge\/rapier/, `${file} 仍依赖已拒绝的 Rapier POC`);
    assert.doesNotMatch(
      source,
      /(?:\.at\s*\(|\bAggregateError\b|\bstructuredClone\b)/,
      `${file} 使用了超出 ES2020 且未提供 polyfill 的内建 API`,
    );
  }
});

test('Arena MatchCore POC bundles and executes as a standalone mini-game IIFE', async () => {
  const result = await esbuild({
    entryPoints: [path.resolve('src/arena/entry/match-core-poc.js')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    minify: true,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1);
  assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
  const previous = globalThis.__arenaMatchPoc;
  try {
    Function(result.outputFiles[0].text)();
    assert.equal(globalThis.__arenaMatchPoc?.ok, true);
    assert.equal(globalThis.__arenaMatchPoc?.backend, 'lightweight-v1');
  } finally {
    if (previous === undefined) delete globalThis.__arenaMatchPoc;
    else globalThis.__arenaMatchPoc = previous;
  }
});
