import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const rendererRoot = path.join(root, 'packages/renderer-three/src');

async function collect(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if (entry.name.endsWith('.ts')) files.push(absolute);
  }
  return files;
}

const files = await collect(rendererRoot);
const violations: string[] = [];
const forbiddenHostApi = /\b(?:document|window|localStorage|wx|tt)\s*[.[]/;
const lowLevelModules = new Set(['resources', 'diagnostics']);

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const relative = path.relative(rendererRoot, file);
  if (forbiddenHostApi.test(source)) violations.push(`${relative}: 渲染包泄漏宿主 API`);
  const [moduleName] = relative.split(path.sep);
  if (!moduleName || !lowLevelModules.has(moduleName)) continue;
  for (const highLevel of ['facade', 'frame', 'hud', 'effects', 'scene', 'character', 'world']) {
    if (source.includes(`../${highLevel}/`) || source.includes(`./${highLevel}/`)) {
      violations.push(`${relative}: 低层模块不能依赖 ${highLevel}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(`渲染架构守卫失败：\n${violations.join('\n')}`);
}

console.log(`渲染架构守卫通过：检查 ${files.length} 个 TypeScript 文件`);
