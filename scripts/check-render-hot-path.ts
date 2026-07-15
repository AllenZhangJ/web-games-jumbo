import { readFile } from 'node:fs/promises';

const allowances = new Map<string, Readonly<Record<string, number>>>([
  ['packages/renderer-three/src/effects/tail-trail.ts', { 'new THREE.Vector3(': 1 }],
  ['packages/renderer-three/src/effects/particle-burst.ts', { 'new THREE.Euler(': 1 }],
]);

const violations: string[] = [];
for (const [file, patterns] of allowances) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, maximum] of Object.entries(patterns)) {
    const count = source.split(pattern).length - 1;
    if (count > maximum) violations.push(`${file}: ${pattern} ${count} > ${maximum}`);
  }
}

if (violations.length > 0) {
  throw new Error(`渲染热路径分配守卫失败：\n${violations.join('\n')}`);
}

console.log('渲染热路径基线守卫通过：已知分配点 2，第三批目标 0');
