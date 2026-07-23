import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyFormalAssets } from './check-formal-assets.js';
import { loadRepositoryPolicy } from './repository-policy.js';

const ROOT_MARKDOWN = ['README.md', 'AGENTS.md', 'THIRD_PARTY_NOTICES.md'];
const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;
const NPM_COMMAND_PATTERN = /\bnpm run ([A-Za-z0-9:_-]+)/g;

async function markdownFiles(root: string, relative = 'docs'): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(root, child));
    else if (entry.name.endsWith('.md')) result.push(child);
  }
  return result;
}

async function exists(filename: string): Promise<boolean> {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

function localTarget(rawTarget: string): string | null {
  let target = rawTarget.trim();
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
  if (/^(?:https?:|mailto:|tel:)/i.test(target) || target.startsWith('#')) return null;
  const withoutAnchor = target.split('#', 1)[0] ?? '';
  if (withoutAnchor === '') return null;
  try {
    return decodeURIComponent(withoutAnchor);
  } catch {
    throw new RangeError(`Markdown 链接包含非法 URL 编码：${rawTarget}。`);
  }
}

function assertIncludes(content: string, expected: string, label: string): void {
  if (!content.includes(expected)) throw new RangeError(`${label} 缺少当前真值：${expected}。`);
}

export async function verifyDocumentation(options: Readonly<{
  repositoryRoot?: string;
  markdownPaths?: readonly string[];
  enforceCurrentTruth?: boolean;
}> = {}): Promise<Readonly<{
  markdownFileCount: number;
  localLinkCount: number;
  documentedCommandCount: number;
}>> {
  const root = path.resolve(options.repositoryRoot ?? process.cwd());
  const paths = options.markdownPaths
    ? [...options.markdownPaths]
    : [...ROOT_MARKDOWN, ...await markdownFiles(root)];
  const packageManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
    readonly scripts?: Readonly<Record<string, unknown>>;
  };
  const scripts = packageManifest.scripts ?? {};
  let localLinkCount = 0;
  const documentedCommands = new Set<string>();
  for (const relativePath of paths.sort()) {
    const absolutePath = path.join(root, relativePath);
    const content = await readFile(absolutePath, 'utf8');
    for (const match of content.matchAll(LINK_PATTERN)) {
      const target = localTarget(match[1] ?? '');
      if (target === null) continue;
      const resolved = target.startsWith('/')
        ? path.join(root, target.slice(1))
        : path.resolve(path.dirname(absolutePath), target);
      if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
        throw new RangeError(`${relativePath} 的链接逃逸仓库：${target}。`);
      }
      if (!await exists(resolved)) throw new RangeError(`${relativePath} 包含断链：${target}。`);
      localLinkCount += 1;
    }
    for (const match of content.matchAll(NPM_COMMAND_PATTERN)) {
      const command = match[1] ?? '';
      if (!(command in scripts)) throw new RangeError(`${relativePath} 引用不存在的 npm 命令：${command}。`);
      documentedCommands.add(command);
    }
  }
  if (options.enforceCurrentTruth ?? !options.markdownPaths) {
    const policy = await loadRepositoryPolicy(root);
    const formalAssets = await verifyFormalAssets(root);
    const read = async (relativePath: string): Promise<string> => readFile(path.join(root, relativePath), 'utf8');
    const readme = await read('README.md');
    const status = await read('docs/governance/arena-enterprise-governance-status.md');
    const acceptance = await read('docs/acceptance/stage7-formal-assets/README.md');
    const operations = await read('docs/governance/repository-operations.md');
    assertIncludes(readme, '受维护 JavaScript 为零', 'README');
    assertIncludes(readme, policy.owner.name, 'README');
    assertIncludes(status, '| G7 零 JS/完整质量门 | 已完成 |', '治理状态台账');
    assertIncludes(status, '只剩 `npm audit --omit=dev --audit-level=high`', '治理状态台账');
    assertIncludes(acceptance, formalAssets.bundleHash, 'Stage 7 资产验收手册');
    assertIncludes(operations, `@${policy.owner.githubLogin}`, '仓库运营策略');
    assertIncludes(operations, '会向 npm 服务发送依赖元数据', '仓库运营策略');
  }
  return Object.freeze({
    markdownFileCount: paths.length,
    localLinkCount,
    documentedCommandCount: documentedCommands.size,
  });
}

async function main(): Promise<void> {
  const report = await verifyDocumentation();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
