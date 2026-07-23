import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(root, 'dist', 'arena-poc');
const entryPoint = path.join(root, 'src/arena/entry/match-core-poc.ts');

type ArenaPocTarget = 'web' | 'wechat' | 'douyin';

async function bundle(target: ArenaPocTarget): Promise<void> {
  const outputDirectory = path.join(outputRoot, target);
  await mkdir(outputDirectory, { recursive: true });
  await build({
    entryPoints: [entryPoint],
    outfile: path.join(outputDirectory, target === 'web' ? 'match-core-poc.js' : 'game.js'),
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    minify: true,
    legalComments: 'none',
    logLevel: 'silent',
  });
  if (target === 'web') {
    await writeFile(
      path.join(outputDirectory, 'index.html'),
      await readFile(path.join(root, 'scripts', 'arena-poc-index.html'), 'utf8'),
    );
  } else {
    await writeFile(
      path.join(outputDirectory, 'game.json'),
      `${JSON.stringify({ deviceOrientation: 'portrait', showStatusBar: false }, null, 2)}\n`,
    );
    await writeFile(
      path.join(outputDirectory, 'project.config.json'),
      `${JSON.stringify({
        appid: '',
        projectname: `arena-match-core-poc-${target}`,
        compileType: target === 'wechat' ? 'game' : undefined,
        setting: { urlCheck: true, es6: true, minified: true },
      }, null, 2)}\n`,
    );
  }
}

await rm(outputRoot, { recursive: true, force: true });
await Promise.all((['web', 'wechat', 'douyin'] as const).map(bundle));
console.log('竞技场 MatchCore POC 构建完成: dist/arena-poc/{web,wechat,douyin}');
