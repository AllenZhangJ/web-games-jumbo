import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const targets = new Map<string, ReadonlySet<string>>([
  ['packages/renderer-three/src/effects/tail-trail.ts', new Set([
    'update', 'shiftLeft', 'writeGeometry',
  ])],
  ['packages/renderer-three/src/effects/particle-burst.ts', new Set([
    'update', 'refreshInstances',
  ])],
  ['packages/renderer-three/src/facade/renderer3d.ts', new Set([
    'updateWorldLayer', 'updateCharacterLayer', 'updateEffectsLayer',
    'updateCameraLayer', 'updateHudLayer',
  ])],
]);

const violations: string[] = [];
for (const [file, methods] of targets) {
  const source = await readFile(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  function inspect(node: ts.Node, method = ''): void {
    const currentMethod = ts.isMethodDeclaration(node) && node.name
      ? node.name.getText(tree)
      : method;
    if (
      methods.has(currentMethod)
      && ts.isNewExpression(node)
      && node.expression.getText(tree).startsWith('THREE.')
    ) {
      violations.push(`${file}:${currentMethod} 禁止 ${node.getText(tree)}`);
    }
    ts.forEachChild(node, (child) => inspect(child, currentMethod));
  }
  inspect(tree);
}

if (violations.length > 0) {
  throw new Error(`渲染热路径分配守卫失败：\n${violations.join('\n')}`);
}

console.log('渲染热路径分配守卫通过：受检更新方法中的 Three 对象分配为 0');
