import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { types as utilTypes } from 'node:util';
import {
  runArenaPa7FormalEvidenceV1,
  validateArenaPa7FormalGateConfigurationV1,
} from './lib/arena-pa7-formal-evidence-v1.js';
import type {
  ArenaPa7FormalEvidenceDependenciesV1,
  ArenaPa7FormalGateConfigurationV1,
  ArenaPa7FormalRunResultV1,
} from './lib/arena-pa7-formal-evidence-v1.js';

const MAX_CONFIGURATION_BYTES = 4 * 1_024 * 1_024;

function sameFileIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

export interface ArenaPa7FormalGateCliOptionsV1 {
  readonly configPath: string;
  readonly outputPath: string;
}

function normalizedAbsolutePath(value: string, name: string): string {
  if (!path.isAbsolute(value) || value.includes('\0') || path.normalize(value) !== value) {
    throw new TypeError(`${name} 必须是无逃逸段的绝对路径。`);
  }
  return value;
}

export function parseArenaPa7FormalGateCliV1(args: readonly string[]): ArenaPa7FormalGateCliOptionsV1 {
  const values = new Map<string, string>();
  for (const argument of args) {
    if (typeof argument !== 'string' || !argument.startsWith('--')) {
      throw new TypeError('PA7 gate CLI 参数必须使用 --key=value。');
    }
    const separator = argument.indexOf('=');
    if (separator <= 2) throw new TypeError('PA7 gate CLI 参数必须使用 --key=value。');
    const key = argument.slice(2, separator);
    const value = argument.slice(separator + 1);
    if (key !== 'config' && key !== 'output') throw new Error(`PA7 gate CLI 未知参数 --${key}。`);
    if (values.has(key)) throw new Error(`PA7 gate CLI 参数 --${key} 不得重复。`);
    if (value.length === 0) throw new Error(`PA7 gate CLI 参数 --${key} 不能为空。`);
    values.set(key, value);
  }
  if (values.size !== 2 || !values.has('config') || !values.has('output')) {
    throw new Error('PA7 gate CLI 必须且仅能提供 --config 与 --output。');
  }
  return Object.freeze({
    configPath: normalizedAbsolutePath(values.get('config')!, 'PA7 --config'),
    outputPath: normalizedAbsolutePath(values.get('output')!, 'PA7 --output'),
  });
}

export function readArenaPa7FormalGateConfigurationFileV1(
  configPath: string,
): ArenaPa7FormalGateConfigurationV1 {
  const normalized = normalizedAbsolutePath(configPath, 'PA7 configuration path');
  const pathBefore = lstatSync(normalized, { bigint: true });
  if (!pathBefore.isFile() || pathBefore.isSymbolicLink() || realpathSync(normalized) !== normalized) {
    throw new Error('PA7 configuration 必须是非符号链接普通文件。');
  }
  if (pathBefore.size < 2n || pathBefore.size > BigInt(MAX_CONFIGURATION_BYTES)) {
    throw new Error('PA7 configuration 文件大小不受支持。');
  }
  const descriptor = openSync(normalized, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let text: string;
  try {
    const fdBefore = fstatSync(descriptor, { bigint: true });
    if (!fdBefore.isFile() || !sameFileIdentity(pathBefore, fdBefore)) {
      throw new Error('PA7 configuration path/fd identity 在打开时漂移。');
    }
    text = readFileSync(descriptor, 'utf8');
    const fdAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(normalized, { bigint: true });
    if (!fdAfter.isFile() || !pathAfter.isFile() || pathAfter.isSymbolicLink()
      || !sameFileIdentity(fdBefore, fdAfter) || !sameFileIdentity(fdAfter, pathAfter)) {
      throw new Error('PA7 configuration path/fd identity 在读取期间漂移。');
    }
  } finally {
    closeSync(descriptor);
  }
  if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) {
    throw new Error('PA7 configuration 必须是单行完整 JSON。');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1)) as unknown;
  } catch {
    throw new Error('PA7 configuration JSON 不完整或损坏。');
  }
  return validateArenaPa7FormalGateConfigurationV1(parsed);
}

export async function runArenaPa7FormalGateCliV1(
  args: readonly string[],
  dependencies: ArenaPa7FormalEvidenceDependenciesV1 = {},
): Promise<ArenaPa7FormalRunResultV1> {
  const cli = parseArenaPa7FormalGateCliV1(args);
  const configuration = readArenaPa7FormalGateConfigurationFileV1(cli.configPath);
  return runArenaPa7FormalEvidenceV1({
    cwd: process.cwd(),
    outputPath: cli.outputPath,
    productionModulePaths: configuration.productionModulePaths,
    buildAttestation: configuration.buildAttestation,
    isolationAttestation: configuration.isolationAttestation,
    gateAttestation: configuration.gateAttestation,
    worker: configuration.worker,
    inactivityTimeoutMs: configuration.inactivityTimeoutMs,
    outputCapBytes: configuration.outputCapBytes,
    progressPollMs: configuration.progressPollMs,
    termGraceMs: configuration.termGraceMs,
    killWaitMs: configuration.killWaitMs,
  }, dependencies);
}

function minimalFailureMessage(value: unknown): string {
  if (value !== null && typeof value === 'object' && !utilTypes.isProxy(value)
    && utilTypes.isNativeError(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, 'message');
    if (descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string'
      && descriptor.value.trim().length > 0) {
      return descriptor.value.trim().replaceAll(/\s+/g, ' ').slice(0, 512);
    }
  }
  return 'PA7 formal gate failed before evidence publication.';
}

async function main(): Promise<void> {
  const result = await runArenaPa7FormalGateCliV1(process.argv.slice(2));
  if (result.publishedPath === null) {
    throw new Error('PA7 failed evidence could not be published.');
  }
  process.stdout.write(`${JSON.stringify(result.evidence)}\n`);
  if (result.evidence.status === 'formal-failed') process.exitCode = 1;
}

const invokedScript = process.argv[1] === undefined
  ? false
  : pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedScript) void main().catch((error: unknown) => {
  process.stderr.write(`${minimalFailureMessage(error)}\n`);
  process.exitCode = 1;
});
