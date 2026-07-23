import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const JAVASCRIPT_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.mjs']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
]);

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

export async function verifyJavaScriptMigration(repositoryRoot = process.cwd()): Promise<{
  readonly currentCount: number;
}> {
  const actual = await collectJavaScriptFiles(repositoryRoot);
  if (actual.length > 0) {
    throw new Error(`仓库禁止提交 JavaScript 源文件：${actual.join(', ')}。`);
  }
  return Object.freeze({
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
