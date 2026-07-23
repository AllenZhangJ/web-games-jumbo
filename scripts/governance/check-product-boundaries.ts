import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RETIRED_PRODUCT_PATHS = Object.freeze([
  'docs/architecture.md',
  'docs/design-system-v3.md',
  'docs/gameplay-rules.md',
  'docs/product/number-strategy-jump-v3.md',
  'product.html',
  'public/assets/concept/web-jump-three-v3.png',
  'src/config.ts',
  'src/core',
  'src/render3d',
  'src/runtime',
  'tests/game-state.test.js',
  'tests/jump-physics.test.js',
  'tests/operations.test.js',
  'tests/render3d.test.js',
  'tests/runtime-game.test.js',
  'tests/world-state.test.js',
]);

async function hasContent(target: string): Promise<boolean> {
  try {
    const metadata = await stat(target);
    if (!metadata.isDirectory()) return true;
    const children = await readdir(target);
    for (const child of children) {
      if (await hasContent(path.join(target, child))) return true;
    }
    return false;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function verifyRetiredProductBoundaries(
  repositoryRoot = process.cwd(),
): Promise<void> {
  const remaining: string[] = [];
  for (const relativePath of RETIRED_PRODUCT_PATHS) {
    if (await hasContent(path.join(repositoryRoot, relativePath))) remaining.push(relativePath);
  }
  if (remaining.length > 0) {
    throw new Error(`旧数值跳台生产边界仍存在：${remaining.join(', ')}。`);
  }

  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
  ) as { readonly description?: unknown; readonly scripts?: Record<string, unknown> };
  if (typeof packageJson.description !== 'string' || !packageJson.description.includes('Arena')) {
    throw new Error('package.json 必须把 Arena 声明为产品身份。');
  }
  if (Object.hasOwn(packageJson.scripts ?? {}, 'build:greybox')) {
    throw new Error('生产脚本不得提供 Greybox 小游戏构建开关。');
  }

  const readme = await readFile(path.join(repositoryRoot, 'README.md'), 'utf8');
  const product = await readFile(path.join(repositoryRoot, 'PRODUCT.md'), 'utf8');
  if (!readme.startsWith('# 深渊竞技场')) throw new Error('README 产品标题尚未归一为 Arena。');
  if (!product.includes('唯一生产产品：Arena')) {
    throw new Error('PRODUCT.md 尚未声明 Arena 唯一生产产品。');
  }
}

async function main(): Promise<void> {
  await verifyRetiredProductBoundaries();
  console.log(JSON.stringify({
    status: 'passed',
    retiredPathCount: RETIRED_PRODUCT_PATHS.length,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
