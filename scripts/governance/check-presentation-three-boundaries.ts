import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_DEPENDENCIES = Object.freeze({
  '@number-strategy-jump/arena-contracts': '0.1.0',
  '@number-strategy-jump/arena-presentation-contracts': '0.1.0',
  '@number-strategy-jump/arena-presentation-runtime': '0.1.0',
  three: '0.185.1',
});

const FORBIDDEN_SOURCE_PATTERNS = Object.freeze([
  'MatchCore',
  'ArenaRuleEngine',
  'applyImpulse(',
  'setMovementIntent(',
  'resolveEquipmentPickups(',
  'Math.random(',
  'document.',
  'window.',
  'requestAnimationFrame(',
  '/arena-product-',
  '/arena-session',
  '/arena-match',
]);

export async function verifyPresentationThreeBoundaries(
  repositoryRoot = process.cwd(),
): Promise<{ readonly sourceFileCount: number }> {
  const packageRoot = path.join(repositoryRoot, 'packages/arena-presentation-three');
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as {
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
  };
  expectExactRecord(manifest.dependencies, EXPECTED_DEPENDENCIES, 'dependencies');
  if (manifest.devDependencies && Object.keys(manifest.devDependencies).length > 0) {
    throw new Error('arena-presentation-three 不得声明包级 devDependencies。');
  }
  const sourceRoot = path.join(packageRoot, 'src');
  const files = (await readdir(sourceRoot)).filter((file) => file.endsWith('.ts')).sort();
  if (files.length === 0) throw new Error('arena-presentation-three 必须包含 TypeScript 源码。');
  for (const file of files) {
    const source = await readFile(path.join(sourceRoot, file), 'utf8');
    for (const forbidden of FORBIDDEN_SOURCE_PATTERNS) {
      if (source.includes(forbidden)) throw new Error(`${file} 不得包含 ${forbidden}。`);
    }
  }
  return Object.freeze({ sourceFileCount: files.length });
}

function expectExactRecord(
  actual: Record<string, string> | undefined,
  expected: Readonly<Record<string, string>>,
  name: string,
): void {
  const actualEntries = Object.entries(actual ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const expectedEntries = Object.entries(expected).sort(([left], [right]) => left.localeCompare(right));
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    throw new Error(`arena-presentation-three ${name} 必须精确匹配治理白名单。`);
  }
}

async function main(): Promise<void> {
  const report = await verifyPresentationThreeBoundaries();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
