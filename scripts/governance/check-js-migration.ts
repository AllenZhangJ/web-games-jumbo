import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const JAVASCRIPT_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.mjs']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
]);

interface JavaScriptMigrationAllowlist {
  readonly schemaVersion: 1;
  readonly baselineTag: string;
  readonly baselineFileCount: number;
  readonly policy: 'exact-decreasing-allowlist';
  readonly files: readonly string[];
}

async function collectJavaScriptFiles(
  repositoryRoot: string,
  relativeDirectory = '.',
): Promise<string[]> {
  const absoluteDirectory = path.resolve(repositoryRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relativePath = path.posix.join(
      relativeDirectory === '.' ? '' : relativeDirectory,
      entry.name,
    );
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      files.push(...await collectJavaScriptFiles(repositoryRoot, relativePath));
      continue;
    }
    if (JAVASCRIPT_EXTENSIONS.has(path.extname(entry.name))) files.push(relativePath);
  }
  return files.sort();
}

async function readAllowlist(repositoryRoot: string): Promise<JavaScriptMigrationAllowlist> {
  const file = path.join(repositoryRoot, 'governance/js-migration-allowlist.json');
  const value: unknown = JSON.parse(await readFile(file, 'utf8'));
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('JavaScript 迁移清单必须是对象。');
  }
  const candidate = value as Partial<JavaScriptMigrationAllowlist>;
  if (
    candidate.schemaVersion !== 1
    || candidate.policy !== 'exact-decreasing-allowlist'
    || typeof candidate.baselineTag !== 'string'
    || !Number.isSafeInteger(candidate.baselineFileCount)
    || !Array.isArray(candidate.files)
    || !candidate.files.every((item) => typeof item === 'string')
  ) {
    throw new TypeError('JavaScript 迁移清单合同无效。');
  }
  return candidate as JavaScriptMigrationAllowlist;
}

export async function verifyJavaScriptMigration(repositoryRoot = process.cwd()): Promise<{
  readonly baselineCount: number;
  readonly currentCount: number;
}> {
  const allowlist = await readAllowlist(repositoryRoot);
  const expected = [...allowlist.files].sort();
  if (new Set(expected).size !== expected.length) {
    throw new Error('JavaScript 迁移清单包含重复路径。');
  }
  if (expected.some((item, index) => item !== allowlist.files[index])) {
    throw new Error('JavaScript 迁移清单必须按路径排序。');
  }
  if (expected.length > allowlist.baselineFileCount) {
    throw new Error('JavaScript 迁移清单不得超过冻结基线。');
  }
  const actual = await collectJavaScriptFiles(repositoryRoot);
  const additions = actual.filter((item) => !expected.includes(item));
  const stale = expected.filter((item) => !actual.includes(item));
  if (additions.length > 0 || stale.length > 0) {
    throw new Error(
      `JavaScript 迁移清单不一致；新增/未登记：${additions.join(', ') || '无'}；`
      + `已删除但未收缩清单：${stale.join(', ') || '无'}。`,
    );
  }
  return Object.freeze({
    baselineCount: allowlist.baselineFileCount,
    currentCount: actual.length,
  });
}

async function main(): Promise<void> {
  const report = await verifyJavaScriptMigration();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
