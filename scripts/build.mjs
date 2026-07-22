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
} from '@number-strategy-jump/arena-device-acceptance';
import { writeArenaBuildManifest } from './lib/arena-build-manifest-files.mjs';
import { verifyArenaFormalAssetBudget } from './lib/arena-formal-asset-budget-verifier.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const execFileAsync = promisify(execFile);
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

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
    ?? `arena-${commit.slice(0, 12)}-product${sourceDirty ? '-dirty' : ''}`;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(buildId)) {
    throw new TypeError('ARENA_BUILD_ID 只能包含字母、数字、点、下划线和连字符。');
  }
  return Object.freeze({ buildId, commit, sourceDirty });
}

const buildIdentity = await resolveBuildIdentity();
const formalAssetBudget = await verifyArenaFormalAssetBudget({ repositoryRoot: root });
if (formalAssetBudget.status !== 'passed') {
  throw new Error(
    `正式资产预算失败：${formalAssetBudget.failedGateIds.join(', ')}。`,
  );
}

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
      // Three.js remains a shared production chunk and is enforced by the Arena budget.
      chunkSizeWarningLimit: 650,
    },
  });
  const outDir = path.join(dist, 'web');
  // Research-only concept captures are not runtime assets and would consume
  // more than a third of the production delivery budget.
  await rm(path.join(outDir, 'assets', 'concept'), { recursive: true, force: true });
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

async function buildMiniGame(target, productEntryPoint, config, projectConfig) {
  const outDir = path.join(dist, target);
  await mkdir(outDir, { recursive: true });
  await bundleMiniGame(
    productEntryPoint,
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
    defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
  });
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

console.log(
  `构建完成: dist/web, dist/douyin, dist/wechat（buildId：${buildIdentity.buildId}，`
  + `小游戏默认入口：product，sourceDirty：${buildIdentity.sourceDirty}，`
  + `formalAssetBudget：${formalAssetBudget.resultHash}）`,
);
