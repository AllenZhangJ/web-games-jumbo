import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
} from '../src/arena/presentation/acceptance/arena-build-manifest.js';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-definition.js';
import { writeArenaBuildManifest } from './lib/arena-build-manifest-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const execFileAsync = promisify(execFile);
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const miniEntryMode = process.env.ARENA_MINI_ENTRY_MODE ?? 'product';
if (!['product', 'greybox'].includes(miniEntryMode)) {
  throw new RangeError('ARENA_MINI_ENTRY_MODE 只支持 product 或 greybox。');
}

async function gitText(args) {
  const result = await execFileAsync('git', args, { cwd: root, encoding: 'utf8' });
  return result.stdout.trim();
}

async function resolveBuildIdentity() {
  const explicitCommit = process.env.ARENA_BUILD_COMMIT ?? null;
  let repositoryCommit = null;
  try {
    repositoryCommit = await gitText(['rev-parse', 'HEAD']);
  } catch {
    repositoryCommit = null;
  }
  if (
    explicitCommit !== null
    && repositoryCommit !== null
    && explicitCommit !== repositoryCommit
  ) throw new RangeError('ARENA_BUILD_COMMIT 与当前 Git HEAD 不一致。');
  const commit = explicitCommit ?? repositoryCommit;
  if (commit === null) {
    throw new Error('无法读取 Git HEAD；源码归档构建必须显式提供 ARENA_BUILD_COMMIT。');
  }
  if (!GIT_COMMIT_PATTERN.test(commit)) {
    throw new TypeError('ARENA_BUILD_COMMIT/Git HEAD 必须是 40 位小写 commit。');
  }
  let sourceDirty = true;
  try {
    sourceDirty = (await gitText(['status', '--porcelain'])) !== '';
  } catch {
    // A source archive without .git can still build with an explicit commit,
    // but it cannot be accepted as clean evidence without independent proof.
  }
  const buildId = process.env.ARENA_BUILD_ID
    ?? `arena-${commit.slice(0, 12)}-${miniEntryMode}${sourceDirty ? '-dirty' : ''}`;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(buildId)) {
    throw new TypeError('ARENA_BUILD_ID 只能包含字母、数字、点、下划线和连字符。');
  }
  return Object.freeze({ buildId, commit, sourceDirty });
}

const buildIdentity = await resolveBuildIdentity();

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
      rollupOptions: {
        input: {
          game: path.join(root, 'index.html'),
          pilot: path.join(root, 'pilot.html'),
          product: path.join(root, 'product.html'),
          greybox: path.join(root, 'greybox.html'),
        },
        output: {
          manualChunks(id) {
            return id.includes(`${path.sep}node_modules${path.sep}three${path.sep}`)
              ? 'three'
              : undefined;
          },
        },
      },
      // Three.js is intentionally one shared runtime chunk; the current
      // production artifact is about 131 kB gzip, within the v3 budget.
      chunkSizeWarningLimit: 650,
    },
  });
  const outDir = path.join(dist, 'web');
  await copyThirdPartyNotices(outDir);
  await writeArenaBuildManifest({
    outDir,
    ...buildIdentity,
    target: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
    defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
  });
}

async function bundleMiniGame(entryPoint, outfile) {
  await esbuild({
    entryPoints: [path.join(root, entryPoint)],
    outfile,
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
}

async function buildMiniGame(target, productEntryPoint, greyboxEntryPoint, config, projectConfig) {
  const outDir = path.join(dist, target);
  await mkdir(outDir, { recursive: true });
  const productBundle = path.join(outDir, 'game-product.js');
  const greyboxBundle = path.join(outDir, 'game-greybox.js');
  await Promise.all([
    bundleMiniGame(productEntryPoint, productBundle),
    bundleMiniGame(greyboxEntryPoint, greyboxBundle),
  ]);
  await cp(
    miniEntryMode === 'greybox' ? greyboxBundle : productBundle,
    path.join(outDir, 'game.js'),
  );
  await cp(path.join(root, 'public/assets'), path.join(outDir, 'assets'), {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}concept`),
  });
  await writeFile(path.join(outDir, 'game.json'), `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(path.join(outDir, 'project.config.json'), `${JSON.stringify(projectConfig, null, 2)}\n`);
  await copyThirdPartyNotices(outDir);
  await writeArenaBuildManifest({
    outDir,
    ...buildIdentity,
    target,
    defaultEntry: miniEntryMode,
  });
}

await rm(dist, { recursive: true, force: true });
await buildWeb();
await Promise.all([
  buildMiniGame(
    'douyin',
    'src/entry/douyin.js',
    'src/entry/douyin-greybox.js',
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
    'src/entry/wechat-greybox.js',
    { deviceOrientation: 'portrait', showStatusBar: false },
    {
      appid: '',
      projectname: 'number-strategy-jump',
      compileType: 'game',
      setting: { urlCheck: true, es6: true, minified: true },
    },
  ),
]);

console.log(
  `构建完成: dist/web, dist/douyin, dist/wechat（buildId：${buildIdentity.buildId}，`
  + `小游戏默认入口：${miniEntryMode}，sourceDirty：${buildIdentity.sourceDirty}）`,
);
