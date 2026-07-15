import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function copyThirdPartyNotices(outDir: string): Promise<void> {
  await Promise.all([
    cp(
      path.join(root, 'THIRD_PARTY_NOTICES.md'),
      path.join(outDir, 'THIRD_PARTY_NOTICES.md'),
    ),
    cp(path.join(root, 'licenses'), path.join(outDir, 'licenses'), { recursive: true }),
  ]);
}

async function buildWeb(): Promise<void> {
  await viteBuild({
    root,
    base: './',
    publicDir: path.join(root, 'public'),
    build: {
      outDir: path.join(dist, 'web'),
      emptyOutDir: true,
      sourcemap: true,
      // Three.js is intentionally a single shared runtime. The hard gzip
      // budget below is the release gate; this warning limit matches the
      // uncompressed bundle shape without replacing that gate.
      chunkSizeWarningLimit: 700,
    },
  });
  await copyThirdPartyNotices(path.join(dist, 'web'));
}

async function enforceArtifactBudgets(): Promise<void> {
  const webAssets = await readdir(path.join(dist, 'web', 'assets'));
  const webEntry = webAssets.find((name) => /^index-.*\.js$/.test(name) && !name.endsWith('.map'));
  if (!webEntry) throw new Error('Web 构建缺少 JavaScript 入口产物');
  const webGzipBytes = gzipSync(await readFile(path.join(dist, 'web', 'assets', webEntry))).byteLength;
  const webGzipLimit = 180 * 1024;
  if (webGzipBytes > webGzipLimit) {
    throw new Error(`Web JS gzip ${webGzipBytes} bytes 超过 ${webGzipLimit} bytes 预算`);
  }

  const miniGameLimit = 700 * 1024;
  for (const target of ['douyin', 'wechat']) {
    const bytes = (await stat(path.join(dist, target, 'game.js'))).size;
    if (bytes > miniGameLimit) {
      throw new Error(`${target} game.js ${bytes} bytes 超过 ${miniGameLimit} bytes 预算`);
    }
  }
  console.log(`产物预算通过: Web gzip ${webGzipBytes} bytes，小游戏 game.js 上限 ${miniGameLimit} bytes`);
}

async function buildMiniGame(
  target: string,
  entryPoint: string,
  config: Record<string, unknown>,
  projectConfig: Record<string, unknown>,
): Promise<void> {
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
await enforceArtifactBudgets();

console.log('构建完成: dist/web, dist/douyin, dist/wechat');
