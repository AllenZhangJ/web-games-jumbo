import { cp, lstat, mkdir, mkdtemp, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build as viteBuild } from 'vite';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '@number-strategy-jump/arena-device-acceptance';
import { writeArenaBuildManifest } from './lib/arena-build-manifest-files.js';
import { verifyArenaFormalAssetBudget } from './lib/arena-formal-asset-budget-verifier.js';
import {
  buildArenaMiniGameChunkBuild,
  publishArenaMiniGameCandidateDirectory,
  writeArenaMiniGameJavaScriptBatch,
} from './lib/arena-mini-game-chunk-build.js';
import {
  ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH,
  createArenaProductionErrorCatalogForProductEntriesV1,
  createArenaProductionErrorCatalogVitePluginV1,
  rewriteArenaProductionErrorWebSourceMapsV1,
  verifyArenaProductionErrorCatalogFileV1,
  writeArenaProductionErrorCatalogReferenceFileV1,
  type ArenaProductionErrorCatalogV1,
} from './lib/arena-production-error-catalog-v1.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const execFileAsync = promisify(execFile);
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

interface ArenaBuildIdentity {
  readonly buildId: string;
  readonly commit: string;
  readonly sourceDirty: boolean;
}

async function gitText(args: readonly string[]): Promise<string> {
  const result = await execFileAsync('git', [...args], { cwd: root, encoding: 'utf8' });
  return result.stdout.trim();
}

async function resolveBuildIdentity(): Promise<ArenaBuildIdentity> {
  const explicitCommit = process.env.ARENA_BUILD_COMMIT ?? null;
  let repositoryCommit: string | null = null;
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

const productionErrorCatalog = await createArenaProductionErrorCatalogForProductEntriesV1({
  repositoryRoot: root,
  entryPoints: Object.freeze({
    douyin: path.join(root, 'src/entry/douyin.ts'),
    web: path.join(root, 'src/entry/web.ts'),
    wechat: path.join(root, 'src/entry/wechat.ts'),
  }),
});

async function copyThirdPartyNotices(outDir: string): Promise<void> {
  await Promise.all([
    cp(
      path.join(root, 'THIRD_PARTY_NOTICES.md'),
      path.join(outDir, 'THIRD_PARTY_NOTICES.md'),
    ),
    cp(path.join(root, 'licenses'), path.join(outDir, 'licenses'), { recursive: true }),
  ]);
}

async function publishWebCandidate(
  populate: (candidateDirectory: string) => Promise<void>,
): Promise<void> {
  const canonicalParent = await realpath(dist);
  if (canonicalParent !== dist) throw new TypeError('Web 发布父目录必须是 canonical 路径。');
  const candidate = await mkdtemp(path.join(canonicalParent, '.web-candidate-'));
  const target = path.join(canonicalParent, 'web');
  let published = false;
  let primaryFailure: unknown = null;
  try {
    await populate(candidate);
    const metadata = await lstat(candidate);
    if (!metadata.isDirectory() || metadata.isSymbolicLink() || await realpath(candidate) !== candidate) {
      throw new TypeError('Web 候选目录不安全。');
    }
    try {
      await lstat(target);
      throw new Error('Web 发布目标已存在。');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(candidate, target);
    published = true;
  } catch (error) {
    primaryFailure = error;
    throw error;
  } finally {
    if (!published) {
      try {
        await rm(candidate, { recursive: true, force: true });
      } catch (cleanupError) {
        if (primaryFailure !== null) {
          throw new AggregateError([primaryFailure, cleanupError], 'Web 候选失败且清理失败。');
        }
        throw cleanupError;
      }
    }
  }
}

async function buildWeb(errorCatalog: ArenaProductionErrorCatalogV1): Promise<void> {
  await publishWebCandidate(async (candidateDirectory) => {
    await viteBuild({
      root,
      base: './',
      publicDir: path.join(root, 'public'),
      plugins: [createArenaProductionErrorCatalogVitePluginV1({
        catalog: errorCatalog,
        repositoryRoot: root,
        target: 'web',
      })],
      build: {
        outDir: candidateDirectory,
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
    await rewriteArenaProductionErrorWebSourceMapsV1({
      outputDirectory: candidateDirectory,
      repositoryRoot: root,
    });
    // Research-only concept captures are not runtime assets and would consume
    // more than a third of the production delivery budget.
    await rm(path.join(candidateDirectory, 'assets', 'concept'), { recursive: true, force: true });
    await copyThirdPartyNotices(candidateDirectory);
    await writeArenaBuildManifest({
      outDir: candidateDirectory,
      ...buildIdentity,
      target: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    });
    await verifyArenaProductionErrorCatalogFileV1(
      path.join(candidateDirectory, ...ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH.split('/')),
      errorCatalog,
    );
  });
}

async function buildMiniGame(
  target: 'douyin' | 'wechat',
  productEntryPoint: string,
  config: Readonly<Record<string, unknown>>,
  projectConfig: Readonly<Record<string, unknown>>,
): Promise<void> {
  await publishArenaMiniGameCandidateDirectory({
    parentDirectory: dist,
    targetName: target,
    async populate(candidateDirectory) {
      const chunkBuild = await buildArenaMiniGameChunkBuild({
        errorCatalog: productionErrorCatalog,
        repositoryRoot: root,
        entryPoint: path.join(root, productEntryPoint),
        target,
      });
      await writeArenaMiniGameJavaScriptBatch(candidateDirectory, chunkBuild.files);
      await cp(path.join(root, 'public/assets'), path.join(candidateDirectory, 'assets'), {
        recursive: true,
        filter: (source) => !source.includes(`${path.sep}concept`),
      });
      await writeFile(
        path.join(candidateDirectory, 'game.json'),
        `${JSON.stringify(config, null, 2)}\n`,
      );
      await writeFile(
        path.join(candidateDirectory, 'project.config.json'),
        `${JSON.stringify(projectConfig, null, 2)}\n`,
      );
      await copyThirdPartyNotices(candidateDirectory);
      await writeArenaProductionErrorCatalogReferenceFileV1(
        candidateDirectory,
        productionErrorCatalog,
      );
      await writeArenaBuildManifest({
        outDir: candidateDirectory,
        ...buildIdentity,
        target,
        defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
      });
    },
  });
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await buildWeb(productionErrorCatalog);
await Promise.all([
  buildMiniGame(
    'douyin',
    'src/entry/douyin.ts',
    { deviceOrientation: 'portrait', showStatusBar: false },
    {
      appid: '',
      projectname: 'number-strategy-jump',
      setting: { urlCheck: true, es6: true, minified: true },
    },
  ),
  buildMiniGame(
    'wechat',
    'src/entry/wechat.ts',
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
  + `formalAssetBudget：${formalAssetBudget.resultHash}，`
  + `errorCatalog：${productionErrorCatalog.catalogHash} / `
  + `${productionErrorCatalog.dispositionCounts.transformed} replacements）`,
);
