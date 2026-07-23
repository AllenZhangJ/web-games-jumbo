import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRepositoryPolicy } from './repository-policy.js';

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;
const REGISTRY_PREFIX = 'https://registry.npmjs.org/';

interface PackageManifest {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly scripts?: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly optionalDependencies?: unknown;
  readonly peerDependencies?: unknown;
}

function verifyCleanInstallCheckOrder(rootManifest: PackageManifest): void {
  const scripts = record(rootManifest.scripts, 'package.json.scripts');
  const governanceCheck = scripts['check:governance'];
  if (
    typeof governanceCheck !== 'string'
    || !governanceCheck.startsWith('npm run build:packages && ')
  ) {
    throw new RangeError(
      'check:governance 必须先执行 npm run build:packages，确保干净安装后可运行。',
    );
  }
  const check = scripts.check;
  const auditCommand = scripts['audit:dependencies'];
  if (auditCommand !== 'npm audit --omit=dev --audit-level=high') {
    throw new RangeError('audit:dependencies 必须保持唯一的生产依赖联网审计命令。');
  }
  if (
    typeof check !== 'string'
    || (check.match(/npm run audit:dependencies/g) ?? []).length !== 1
  ) {
    throw new RangeError('check 必须且只能调用一次 audit:dependencies。');
  }
}

interface LockPackage {
  readonly version?: unknown;
  readonly resolved?: unknown;
  readonly integrity?: unknown;
  readonly link?: unknown;
}

interface PackageLock {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly lockfileVersion?: unknown;
  readonly packages?: unknown;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

async function json<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(filename, 'utf8')) as T;
}

async function packageManifestPaths(repositoryRoot: string): Promise<string[]> {
  const packageRoot = path.join(repositoryRoot, 'packages');
  const directories = await readdir(packageRoot, { withFileTypes: true });
  const result = [path.join(repositoryRoot, 'package.json')];
  for (const directory of directories) {
    if (!directory.isDirectory() || directory.isSymbolicLink()) continue;
    result.push(path.join(packageRoot, directory.name, 'package.json'));
  }
  return result.sort();
}

function dependencyGroups(manifest: PackageManifest): readonly Readonly<{
  name: string;
  values: unknown;
}>[] {
  return [
    { name: 'dependencies', values: manifest.dependencies },
    { name: 'devDependencies', values: manifest.devDependencies },
    { name: 'optionalDependencies', values: manifest.optionalDependencies },
    { name: 'peerDependencies', values: manifest.peerDependencies },
  ];
}

function verifyManifestVersions(manifest: PackageManifest, relativePath: string): number {
  let count = 0;
  for (const group of dependencyGroups(manifest)) {
    if (group.values === undefined) continue;
    const dependencies = record(group.values, `${relativePath}.${group.name}`);
    for (const [name, versionValue] of Object.entries(dependencies)) {
      if (typeof versionValue !== 'string' || !EXACT_VERSION.test(versionValue)) {
        throw new RangeError(
          `${relativePath} 的 ${group.name}.${name} 必须固定到精确 semver，当前为 ${String(versionValue)}。`,
        );
      }
      count += 1;
    }
  }
  return count;
}

function verifyLockfile(lock: PackageLock, rootManifest: PackageManifest): number {
  if (lock.lockfileVersion !== 3) throw new RangeError('package-lock.json 必须使用 lockfileVersion 3。');
  const packages = record(lock.packages, 'package-lock.json.packages');
  const lockRoot = record(packages[''], 'package-lock.json.packages[""]');
  for (const group of dependencyGroups(rootManifest)) {
    const manifestValues = group.values === undefined ? {} : record(group.values, `package.json.${group.name}`);
    const lockValues = lockRoot[group.name] === undefined
      ? {}
      : record(lockRoot[group.name], `package-lock.json root ${group.name}`);
    const manifestEntries = Object.entries(manifestValues).sort(([left], [right]) => left.localeCompare(right));
    const lockEntries = Object.entries(lockValues).sort(([left], [right]) => left.localeCompare(right));
    if (JSON.stringify(lockEntries) !== JSON.stringify(manifestEntries)) {
      throw new RangeError(`package-lock.json root ${group.name} 与 package.json 不一致。`);
    }
  }
  let externalCount = 0;
  for (const [packagePath, value] of Object.entries(packages)) {
    if (!packagePath.startsWith('node_modules/')) continue;
    if (packagePath.startsWith('node_modules/@number-strategy-jump/')) continue;
    const item = record(value, `package-lock.json ${packagePath}`) as LockPackage;
    if (item.link === true) continue;
    if (typeof item.version !== 'string' || !EXACT_VERSION.test(item.version)) {
      throw new RangeError(`${packagePath} 缺少精确版本。`);
    }
    if (typeof item.resolved !== 'string' || !item.resolved.startsWith(REGISTRY_PREFIX)) {
      throw new RangeError(`${packagePath} 不是固定的 npm 官方 registry 产物。`);
    }
    if (typeof item.integrity !== 'string' || !item.integrity.startsWith('sha512-')) {
      throw new RangeError(`${packagePath} 缺少 SHA-512 integrity。`);
    }
    externalCount += 1;
  }
  return externalCount;
}

function verifyWorkflowActions(workflow: string): number {
  const uses = [...workflow.matchAll(/^\s*-\s+uses:\s+([^\s#]+)(?:\s+#\s*(\S+))?\s*$/gm)];
  if (uses.length === 0) throw new RangeError('CI workflow 必须至少使用一个 Action。');
  for (const match of uses) {
    const specification = match[1] ?? '';
    const separator = specification.lastIndexOf('@');
    const ref = separator < 0 ? '' : specification.slice(separator + 1);
    if (!FULL_COMMIT_SHA.test(ref)) {
      throw new RangeError(`GitHub Action ${specification} 必须固定到 40 位 commit SHA。`);
    }
    if (!match[2] || !/^v\d+(?:\.\d+){1,2}$/.test(match[2])) {
      throw new RangeError(`GitHub Action ${specification} 必须用注释标明对应发布版本。`);
    }
  }
  return uses.length;
}

function verifyWorkflowQualityContract(workflow: string): void {
  if (!/^\s*-\s+run:\s+npm ci --ignore-scripts --no-audit\s*$/m.test(workflow)) {
    throw new RangeError('CI 必须使用 npm ci --ignore-scripts --no-audit 禁止安装阶段隐式审计。');
  }
  if (!/^\s*-\s+run:\s+npm run check\s*$/m.test(workflow)) {
    throw new RangeError('CI 必须执行统一 npm run check 门禁。');
  }
}

export async function verifySupplyChain(repositoryRoot = process.cwd()): Promise<Readonly<{
  packageManifestCount: number;
  declaredDependencyCount: number;
  lockedExternalPackageCount: number;
  pinnedActionCount: number;
}>> {
  const root = path.resolve(repositoryRoot);
  const manifestPaths = await packageManifestPaths(root);
  let declaredDependencyCount = 0;
  let rootManifest: PackageManifest | null = null;
  for (const manifestPath of manifestPaths) {
    const manifest = await json<PackageManifest>(manifestPath);
    const relativePath = path.relative(root, manifestPath);
    declaredDependencyCount += verifyManifestVersions(manifest, relativePath);
    if (manifestPath === path.join(root, 'package.json')) rootManifest = manifest;
  }
  if (!rootManifest) throw new Error('缺少根 package.json。');
  verifyCleanInstallCheckOrder(rootManifest);
  const lock = await json<PackageLock>(path.join(root, 'package-lock.json'));
  const lockedExternalPackageCount = verifyLockfile(lock, rootManifest);
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const pinnedActionCount = verifyWorkflowActions(workflow);
  verifyWorkflowQualityContract(workflow);
  const npmConfiguration = await readFile(path.join(root, '.npmrc'), 'utf8');
  if (npmConfiguration.trim() !== 'audit=false') {
    throw new RangeError('.npmrc 必须禁止安装阶段隐式 audit。');
  }
  const policy = await loadRepositoryPolicy(root);
  const codeowners = await readFile(path.join(root, '.github/CODEOWNERS'), 'utf8');
  const globalOwner = new RegExp(`^\\*\\s+@${policy.owner.githubLogin}\\s*$`, 'm');
  if (!globalOwner.test(codeowners)) {
    throw new RangeError(`CODEOWNERS 必须由 @${policy.owner.githubLogin} 全局托底。`);
  }
  return Object.freeze({
    packageManifestCount: manifestPaths.length,
    declaredDependencyCount,
    lockedExternalPackageCount,
    pinnedActionCount,
  });
}

async function main(): Promise<void> {
  const report = await verifySupplyChain();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
