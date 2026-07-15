import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createBuiltinCharacterRegistry } from '@number-strategy/content';

const root = path.resolve(import.meta.dirname, '..');
const allowedRuntimeDependencies = new Map([
  ['three', {
    licenseFile: 'licenses/three-LICENSE',
    noticeToken: 'Three.js',
  }],
]);

async function packageManifests(): Promise<Array<Record<string, unknown>>> {
  const manifests: Array<Record<string, unknown>> = [
    JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as Record<string, unknown>,
  ];
  for (const entry of await readdir(path.join(root, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(root, 'packages', entry.name, 'package.json');
    try {
      manifests.push(JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>);
    } catch {
      // A directory without a package manifest is not a workspace package.
    }
  }
  return manifests;
}

const failures: string[] = [];
const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
const runtimeDependencies = new Set<string>();

for (const manifest of await packageManifests()) {
  const dependencies = manifest.dependencies as Record<string, string> | undefined;
  for (const dependency of Object.keys(dependencies ?? {})) {
    if (!dependency.startsWith('@number-strategy/')) runtimeDependencies.add(dependency);
  }
}

for (const dependency of runtimeDependencies) {
  const attribution = allowedRuntimeDependencies.get(dependency);
  if (!attribution) {
    failures.push(`运行时依赖 ${dependency} 尚未加入许可证白名单`);
    continue;
  }
  try {
    if (!(await stat(path.join(root, attribution.licenseFile))).isFile()) {
      failures.push(`${dependency} 缺少许可证文件 ${attribution.licenseFile}`);
    }
  } catch {
    failures.push(`${dependency} 缺少许可证文件 ${attribution.licenseFile}`);
  }
  if (!notices.includes(attribution.noticeToken) || !notices.includes(attribution.licenseFile)) {
    failures.push(`${dependency} 未完整登记到 THIRD_PARTY_NOTICES.md`);
  }
}

if (!notices.includes('web-jump') || !notices.includes('licenses/web-jump-LICENSE')) {
  failures.push('参考项目 web-jump 的 MIT 归属不完整');
}

for (const character of createBuiltinCharacterRegistry().list()) {
  const manifest = character.assetManifest;
  if (manifest.model || manifest.textures.length > 0 || manifest.audio.length > 0) {
    failures.push(`内置角色 ${character.id} 引入了未审计的外部资源`);
  }
}

const contentSource = await readFile(path.join(root, 'packages/content/src/registry.ts'), 'utf8');
if (/https?:\/\//i.test(contentSource)) {
  failures.push('内容注册表包含运行时外链资源');
}

if (failures.length > 0) {
  throw new Error(`资源与许可证审计失败：\n- ${failures.join('\n- ')}`);
}

console.log(`资源与许可证审计通过：${runtimeDependencies.size} 个第三方运行时依赖，内置角色均为程序化资源`);
