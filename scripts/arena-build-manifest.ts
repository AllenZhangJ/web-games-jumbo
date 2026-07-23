import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  verifyArenaBuildManifestDirectory,
} from './lib/arena-build-manifest-files.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const requireCleanSource = process.argv.includes('--require-clean-source');
  const unknown = process.argv.slice(2).filter((value) => value !== '--require-clean-source');
  if (unknown.length > 0) throw new Error(`未知参数：${unknown.join('、')}。`);
  const targets = ['web', 'douyin', 'wechat'];
  const manifests = await Promise.all(targets.map((target) => (
    verifyArenaBuildManifestDirectory(path.join(root, 'dist', target), { requireCleanSource })
  )));
  const [first] = manifests;
  if (!first) throw new Error('没有可验证的构建 Manifest。');
  for (let index = 0; index < manifests.length; index += 1) {
    const manifest = manifests[index];
    if (!manifest) throw new Error(`缺少 ${targets[index] ?? index} Manifest。`);
    if (manifest.target !== targets[index]) {
      throw new Error(`目录 ${targets[index]} 的 Manifest target 为 ${manifest.target}。`);
    }
    if (
      manifest.buildId !== first.buildId
      || manifest.commit !== first.commit
      || manifest.sourceDirty !== first.sourceDirty
    ) throw new Error('三端构建 Manifest 未绑定到同一 buildId/commit/源码状态。');
  }
  console.log(JSON.stringify({
    status: 'ready',
    buildId: first.buildId,
    commit: first.commit,
    sourceDirty: first.sourceDirty,
    targets: manifests.map((manifest) => ({
      target: manifest.target,
      defaultEntry: manifest.defaultEntry,
      artifactCount: manifest.artifacts.length,
      manifestHash: manifest.getContentHash(),
    })),
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
