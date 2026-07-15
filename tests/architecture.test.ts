import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { build as esbuild } from 'esbuild';

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function listJavaScript(directory: string): Promise<string[]> {
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
    'packages/platform/src/mini-game.ts',
    'packages/platform/src/douyin.ts',
    'packages/platform/src/wechat.ts',
    'src/entry/douyin.ts',
    'src/entry/wechat.ts',
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
  assert.equal(result.outputFiles?.length, 1);
  assert.match(result.outputFiles![0]!.text, /WebGLRenderer/);
  assert.doesNotMatch(result.outputFiles![0]!.text, /^\s*(?:import|export)\b/m);
});

test('mini-game entries bundle without importing the web platform', async () => {
  for (const entryPoint of ['src/entry/douyin.ts', 'src/entry/wechat.ts']) {
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
    const inputs = Object.keys(result.metafile!.inputs);
    assert.ok(!inputs.some((input) => input.endsWith('packages/platform/src/web.ts')));
    assert.doesNotMatch(result.outputFiles![0]!.text, /^\s*(?:import|export)\b/m);
  }
});
