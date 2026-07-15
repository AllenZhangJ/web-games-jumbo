import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function copyThirdPartyNotices(outDir) {
  await Promise.all([
    cp(
      path.join(root, 'THIRD_PARTY_NOTICES.md'),
      path.join(outDir, 'THIRD_PARTY_NOTICES.md'),
    ),
    cp(path.join(root, 'licenses'), path.join(outDir, 'licenses'), { recursive: true }),
  ]);
}

async function buildWeb() {
  await viteBuild({
    root,
    base: './',
    publicDir: path.join(root, 'public'),
    build: {
      outDir: path.join(dist, 'web'),
      emptyOutDir: true,
      sourcemap: true,
      // Three.js is intentionally a single shared runtime; 151 kB gzip is
      // within the documented v3 budget, so use a limit that reflects it.
      chunkSizeWarningLimit: 650,
    },
  });
  await copyThirdPartyNotices(path.join(dist, 'web'));
}

async function buildMiniGame(target, entryPoint, config, projectConfig) {
  const outDir = path.join(dist, target);
  await mkdir(outDir, { recursive: true });
  await esbuild({
    entryPoints: [path.join(root, entryPoint)],
    outfile: path.join(outDir, 'game.js'),
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    charset: 'utf8',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
  });
  await cp(path.join(root, 'public/assets'), path.join(outDir, 'assets'), {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}concept`),
  });
  await writeFile(path.join(outDir, 'game.json'), `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(path.join(outDir, 'project.config.json'), `${JSON.stringify(projectConfig, null, 2)}\n`);
  await copyThirdPartyNotices(outDir);
}

await rm(dist, { recursive: true, force: true });
await buildWeb();
await Promise.all([
  buildMiniGame(
    'douyin',
    'src/entry/douyin.js',
    { deviceOrientation: 'portrait', showStatusBar: false },
    {
      appid: '',
      projectname: 'number-strategy-jump',
      setting: { urlCheck: true, es6: true, minified: true },
    },
  ),
  buildMiniGame(
    'wechat',
    'src/entry/wechat.js',
    { deviceOrientation: 'portrait', showStatusBar: false },
    {
      appid: '',
      projectname: 'number-strategy-jump',
      compileType: 'game',
      setting: { urlCheck: true, es6: true, minified: true },
    },
  ),
]);

console.log('构建完成: dist/web, dist/douyin, dist/wechat');
