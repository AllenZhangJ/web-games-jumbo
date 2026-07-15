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
const dependencies: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
  diagnostics: new Set(['diagnostics', 'root']),
  resources: new Set(['resources', 'root']),
  frame: new Set(['frame', 'root']),
  hud: new Set(['hud', 'resources', 'root']),
  effects: new Set(['effects', 'diagnostics', 'frame', 'root']),
  scene: new Set(['scene', 'root']),
  character: new Set(['character', 'root']),
  world: new Set(['world', 'resources', 'root']),
  facade: new Set([
    'facade', 'frame', 'resources', 'hud', 'effects', 'scene', 'character', 'world',
    'diagnostics', 'root',
  ]),
});

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const relative = path.relative(rendererRoot, file);
  if (forbiddenHostApi.test(source)) violations.push(`${relative}: 渲染包泄漏宿主 API`);
  const [moduleName] = relative.split(path.sep);
  const allowed = moduleName ? dependencies[moduleName] : undefined;
  if (!allowed) continue;
  const importPattern = /from\s+['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    const resolved = path.relative(
      rendererRoot,
      path.resolve(path.dirname(file), specifier),
    );
    const [targetFirst, ...targetRest] = resolved.split(path.sep);
    const targetModule = targetRest.length === 0 ? 'root' : targetFirst;
    if (targetModule && !allowed.has(targetModule)) {
      violations.push(`${relative}: ${moduleName} 不能依赖 ${targetModule}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(`渲染架构守卫失败：\n${violations.join('\n')}`);
}

console.log(`渲染架构守卫通过：检查 ${files.length} 个 TypeScript 文件`);
