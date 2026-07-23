import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface RepositoryPolicy {
  readonly schemaVersion: 1;
  readonly owner: Readonly<{
    name: string;
    githubLogin: string;
  }>;
  readonly defaultBranch: string;
  readonly dependencyVersionPolicy: 'exact';
  readonly githubActionRefPolicy: 'full-commit-sha';
  readonly runtimeTelemetry: 'disabled';
  readonly localDiagnostics: Readonly<{
    commitRawLogs: false;
    retentionDays: number;
  }>;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(source: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(source).sort();
  const expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) throw new RangeError(`${label} 字段不符合契约。`);
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} 不能为空。`);
  return value;
}

export async function loadRepositoryPolicy(repositoryRoot: string): Promise<RepositoryPolicy> {
  const raw = JSON.parse(await readFile(
    path.join(repositoryRoot, 'governance/repository-policy.json'),
    'utf8',
  )) as unknown;
  const source = object(raw, 'RepositoryPolicy');
  exactKeys(source, [
    'schemaVersion',
    'owner',
    'defaultBranch',
    'dependencyVersionPolicy',
    'githubActionRefPolicy',
    'runtimeTelemetry',
    'localDiagnostics',
  ], 'RepositoryPolicy');
  if (source.schemaVersion !== 1) throw new RangeError('RepositoryPolicy.schemaVersion 必须为 1。');
  const owner = object(source.owner, 'RepositoryPolicy.owner');
  exactKeys(owner, ['name', 'githubLogin'], 'RepositoryPolicy.owner');
  const localDiagnostics = object(source.localDiagnostics, 'RepositoryPolicy.localDiagnostics');
  exactKeys(localDiagnostics, ['commitRawLogs', 'retentionDays'], 'RepositoryPolicy.localDiagnostics');
  if (source.dependencyVersionPolicy !== 'exact') throw new RangeError('依赖版本策略必须为 exact。');
  if (source.githubActionRefPolicy !== 'full-commit-sha') throw new RangeError('Action 必须固定到完整 commit SHA。');
  if (source.runtimeTelemetry !== 'disabled') throw new RangeError('Arena 运行时遥测必须保持 disabled。');
  if (localDiagnostics.commitRawLogs !== false) throw new RangeError('原始诊断日志不得提交。');
  if (!Number.isSafeInteger(localDiagnostics.retentionDays)
    || Number(localDiagnostics.retentionDays) < 1
    || Number(localDiagnostics.retentionDays) > 30) {
    throw new RangeError('本地诊断保留天数必须为 1–30 天。');
  }
  return Object.freeze({
    schemaVersion: 1,
    owner: Object.freeze({
      name: text(owner.name, 'RepositoryPolicy.owner.name'),
      githubLogin: text(owner.githubLogin, 'RepositoryPolicy.owner.githubLogin'),
    }),
    defaultBranch: text(source.defaultBranch, 'RepositoryPolicy.defaultBranch'),
    dependencyVersionPolicy: 'exact',
    githubActionRefPolicy: 'full-commit-sha',
    runtimeTelemetry: 'disabled',
    localDiagnostics: Object.freeze({
      commitRawLogs: false,
      retentionDays: Number(localDiagnostics.retentionDays),
    }),
  });
}
