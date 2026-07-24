import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN_WEB_ARTIFACTS = Object.freeze([
  'greybox.html',
  'pilot.html',
  'product.html',
  'study.html',
]);

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function verifyProductionArtifacts(repositoryRoot = process.cwd()): Promise<void> {
  const webRoot = path.join(repositoryRoot, 'dist/web');
  if (!await exists(path.join(webRoot, 'index.html'))) {
    throw new Error('Web 生产产物缺少唯一入口 index.html。');
  }
  const leaked: string[] = [];
  for (const artifact of FORBIDDEN_WEB_ARTIFACTS) {
    if (await exists(path.join(webRoot, artifact))) leaked.push(artifact);
  }
  if (leaked.length > 0) throw new Error(`Web 生产产物泄漏开发页面：${leaked.join(', ')}。`);

  for (const platform of ['wechat', 'douyin']) {
    const manifestPath = path.join(repositoryRoot, `dist/${platform}/arena-build-manifest.json`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      readonly defaultEntry?: unknown;
    };
    if (manifest.defaultEntry !== 'product') {
      throw new Error(`${platform} 生产 Manifest 默认入口不是 product。`);
    }
  }
}

async function main(): Promise<void> {
  await verifyProductionArtifacts();
  console.log(JSON.stringify({ status: 'passed', forbiddenWebArtifactCount: 4 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
