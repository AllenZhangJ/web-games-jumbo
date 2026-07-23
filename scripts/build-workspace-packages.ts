import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const INTERNAL_SCOPE = '@number-strategy-jump/';

interface PackageManifest {
  readonly name?: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly optionalDependencies?: unknown;
  readonly peerDependencies?: unknown;
}

interface WorkspacePackage {
  readonly name: string;
  readonly projectPath: string;
  readonly internalDependencies: readonly string[];
}

export interface WorkspaceBuildPlan {
  readonly packageCount: number;
  readonly waves: readonly (readonly WorkspacePackage[])[];
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function internalDependencies(manifest: PackageManifest, label: string): string[] {
  const result = new Set<string>();
  for (const groupName of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ] as const) {
    const groupValue = manifest[groupName];
    if (groupValue === undefined) continue;
    for (const dependencyName of Object.keys(object(groupValue, `${label}.${groupName}`))) {
      if (dependencyName.startsWith(INTERNAL_SCOPE)) result.add(dependencyName);
    }
  }
  return [...result].sort();
}

export async function createWorkspaceBuildPlan(
  repositoryRoot = process.cwd(),
): Promise<WorkspaceBuildPlan> {
  const root = path.resolve(repositoryRoot);
  const packagesRoot = path.join(root, 'packages');
  const directories = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .sort((left, right) => left.name.localeCompare(right.name));
  const packages: WorkspacePackage[] = [];

  for (const directory of directories) {
    const projectPath = path.join(packagesRoot, directory.name);
    const manifestPath = path.join(projectPath, 'package.json');
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    await access(tsconfigPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest;
    if (typeof manifest.name !== 'string' || !manifest.name.startsWith(INTERNAL_SCOPE)) {
      throw new RangeError(`${path.relative(root, manifestPath)} 缺少合法的内部包名。`);
    }
    packages.push(Object.freeze({
      name: manifest.name,
      projectPath,
      internalDependencies: Object.freeze(internalDependencies(manifest, manifest.name)),
    }));
  }

  const byName = new Map<string, WorkspacePackage>();
  for (const workspacePackage of packages) {
    if (byName.has(workspacePackage.name)) {
      throw new RangeError(`内部包名重复：${workspacePackage.name}。`);
    }
    byName.set(workspacePackage.name, workspacePackage);
  }

  const remainingDependencies = new Map<string, Set<string>>();
  const consumers = new Map<string, Set<string>>(
    packages.map((workspacePackage) => [workspacePackage.name, new Set<string>()]),
  );
  for (const workspacePackage of packages) {
    const dependencies = new Set<string>();
    for (const dependencyName of workspacePackage.internalDependencies) {
      if (!byName.has(dependencyName)) {
        throw new RangeError(
          `${workspacePackage.name} 声明了不存在的内部依赖 ${dependencyName}。`,
        );
      }
      dependencies.add(dependencyName);
      consumers.get(dependencyName)?.add(workspacePackage.name);
    }
    remainingDependencies.set(workspacePackage.name, dependencies);
  }

  const waves: Array<readonly WorkspacePackage[]> = [];
  let ready = packages
    .filter((workspacePackage) => remainingDependencies.get(workspacePackage.name)?.size === 0)
    .sort((left, right) => left.name.localeCompare(right.name));
  let scheduledCount = 0;

  while (ready.length > 0) {
    const wave = ready;
    waves.push(Object.freeze([...wave]));
    scheduledCount += wave.length;
    const nextNames = new Set<string>();
    for (const workspacePackage of wave) {
      for (const consumerName of consumers.get(workspacePackage.name) ?? []) {
        const dependencies = remainingDependencies.get(consumerName);
        dependencies?.delete(workspacePackage.name);
        if (dependencies?.size === 0) nextNames.add(consumerName);
      }
      remainingDependencies.delete(workspacePackage.name);
    }
    ready = [...nextNames]
      .map((name) => byName.get(name))
      .filter((workspacePackage): workspacePackage is WorkspacePackage => workspacePackage !== undefined)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  if (scheduledCount !== packages.length) {
    const cycleMembers = [...remainingDependencies.keys()].sort();
    throw new RangeError(`内部包依赖图存在环：${cycleMembers.join(', ')}。`);
  }

  return Object.freeze({
    packageCount: packages.length,
    waves: Object.freeze(waves.map((wave) => Object.freeze([...wave]))),
  });
}

async function runTypeScriptBuild(
  repositoryRoot: string,
  projectPaths: readonly string[],
): Promise<void> {
  const compilerPath = path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  await access(compilerPath);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [compilerPath, '-b', ...projectPaths, '--pretty', 'false'],
      { cwd: repositoryRoot, stdio: 'inherit' },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal
          ? `TypeScript workspace 构建被信号 ${signal} 中止。`
          : `TypeScript workspace 构建失败，退出码 ${String(code)}。`,
      ));
    });
  });
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  const plan = await createWorkspaceBuildPlan(repositoryRoot);
  for (const wave of plan.waves) {
    await runTypeScriptBuild(
      repositoryRoot,
      wave.map((workspacePackage) => workspacePackage.projectPath),
    );
  }
  console.log(JSON.stringify({
    status: 'passed',
    packageCount: plan.packageCount,
    waveCount: plan.waves.length,
  }));
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
