import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maintainedRoots = ['packages', 'src', 'tests', 'scripts'];
const ignoredDirectories = new Set(['dist', 'node_modules', 'coverage']);
const legacyExtensions = new Set(['.js', '.mjs', '.cjs', '.jsx']);
const violations: string[] = [];

async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

for (const maintainedRoot of maintainedRoots) {
  for (const file of await walk(path.join(root, maintainedRoot))) {
    const relative = path.relative(root, file);
    if (legacyExtensions.has(path.extname(file))) violations.push(`${relative}: 人工维护 JavaScript`);
    if (/\.(?:ts|tsx)$/.test(file)) {
      const source = await readFile(file, 'utf8');
      if (/^\s*\/\/\s*@ts-nocheck/m.test(source)) violations.push(`${relative}: 禁止 @ts-nocheck`);
    }
  }
}

for (const file of [
  'tsconfig.base.json',
  'tsconfig.app.json',
  ...await walk(path.join(root, 'packages'))
    .then((files) => files
      .filter((candidate) => path.basename(candidate) === 'tsconfig.json')
      .map((candidate) => path.relative(root, candidate))),
]) {
  const source = await readFile(path.join(root, file), 'utf8');
  if (/"(?:allowJs|checkJs)"\s*:\s*true/.test(source)) violations.push(`${file}: 禁止 allowJs/checkJs`);
  if (/"strict"\s*:\s*false/.test(source)) violations.push(`${file}: 禁止 strict=false`);
}

if (violations.length > 0) {
  throw new Error(`零旧 JS / strict TypeScript 门禁失败：\n${violations.join('\n')}`);
}

console.log('零旧 JS / strict TypeScript 门禁通过');
