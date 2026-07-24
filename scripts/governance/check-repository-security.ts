import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRepositoryPolicy } from './repository-policy.js';

const IGNORED_DIRECTORIES = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.sh', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const FORBIDDEN_SECRET_FILES = [
  /(^|\/)\.env(?:\..+)?$/,
  /\.(?:jks|keystore|p12|pfx|pem)$/i,
];
const SECRET_PATTERNS: readonly Readonly<{ name: string; pattern: RegExp }>[] = [
  { name: 'private-key', pattern: /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/ },
  { name: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: 'slack-token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'stripe-live-secret', pattern: /\bsk_live_[0-9A-Za-z]{16,}\b/ },
];
const RUNTIME_TELEMETRY_PATTERNS: readonly Readonly<{ name: string; pattern: RegExp }>[] = [
  { name: 'sendBeacon', pattern: /\bsendBeacon\s*\(/ },
  { name: 'WebSocket', pattern: /\bnew\s+WebSocket\s*\(/ },
  { name: 'EventSource', pattern: /\bnew\s+EventSource\s*\(/ },
  { name: 'Sentry', pattern: /(?:from\s+['"]@sentry\/|\bSentry\.init\s*\()/ },
  { name: 'analytics-sdk', pattern: /(?:from\s+['"][^'"]*(?:analytics|telemetry)[^'"]*['"]|\b(?:gtag|ga)\s*\()/i },
];

async function files(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) result.push(...await files(root, child));
    } else {
      result.push(child);
    }
  }
  return result;
}

function isRuntimeSource(relativePath: string): boolean {
  return (relativePath.startsWith('src/') || relativePath.startsWith('packages/'))
    && path.extname(relativePath) === '.ts';
}

export async function verifyRepositorySecurity(repositoryRoot = process.cwd()): Promise<Readonly<{
  scannedTextFileCount: number;
  runtimeSourceFileCount: number;
}>> {
  const root = path.resolve(repositoryRoot);
  const allFiles = await files(root);
  const forbiddenFiles = allFiles.filter((filename) => (
    filename !== '.env.example' && FORBIDDEN_SECRET_FILES.some((pattern) => pattern.test(filename))
  ));
  if (forbiddenFiles.length > 0) {
    throw new Error(`仓库禁止提交密钥或环境文件：${forbiddenFiles.sort().join(', ')}。`);
  }
  let scannedTextFileCount = 0;
  let runtimeSourceFileCount = 0;
  for (const relativePath of allFiles.sort()) {
    if (!TEXT_EXTENSIONS.has(path.extname(relativePath))) continue;
    const content = await readFile(path.join(root, relativePath), 'utf8');
    scannedTextFileCount += 1;
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(content)) {
        throw new Error(`${relativePath} 包含疑似 ${secret.name} 的高置信度密钥。`);
      }
    }
    if (!isRuntimeSource(relativePath)) continue;
    runtimeSourceFileCount += 1;
    for (const telemetry of RUNTIME_TELEMETRY_PATTERNS) {
      if (telemetry.pattern.test(content)) {
        throw new Error(`${relativePath} 违反禁用运行时遥测策略：${telemetry.name}。`);
      }
    }
  }
  const gitignore = await readFile(path.join(root, '.gitignore'), 'utf8');
  if (!/^\*\.log\s*$/m.test(gitignore)) throw new Error('.gitignore 必须排除原始 *.log 诊断文件。');
  await loadRepositoryPolicy(root);
  return Object.freeze({ scannedTextFileCount, runtimeSourceFileCount });
}

async function main(): Promise<void> {
  const report = await verifyRepositorySecurity();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
