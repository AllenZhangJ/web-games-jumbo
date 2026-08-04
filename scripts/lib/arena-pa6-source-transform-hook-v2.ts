import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  type BigIntStats,
  type PathLike,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { MessagePort } from 'node:worker_threads';
import { transform } from 'esbuild';
import type {
  ArenaPa6LoaderConfigV2,
  ArenaPa6LoaderFileAttestationV2,
  ArenaPa6WorkspaceSourceEntryV2,
  ArenaPa6WorkspaceSourceModuleV2,
} from './arena-pa6-source-transform-register-v2.js';

const WORKSPACE_PACKAGE_PREFIX = '@number-strategy-jump/';

const LOCAL_PROFILE_ANCHOR = `        const affordance = this.#ruleEngine.getActionAffordanceProfile(
          this.#createReadActionAffordanceOptions(participantId, identity.tick),
          'local-context-primary',
        );
        const local = composeLocalActionSidecarV2(affordance, identity, participantId);`;
const LOCAL_PROFILE_REPLACEMENT = `        const affordance = this.#ruleEngine.getActionAffordanceProfile(
          this.#createReadActionAffordanceOptions(participantId, identity.tick),
          'full-audit',
        );
        const local = composeLocalActionSidecarV2(affordance, identity, participantId);`;
const BOT_PROFILE_ANCHOR = `          const affordance = this.#ruleEngine.getActionAffordanceProfile(
            this.#createReadActionAffordanceOptions(participantId, identity.tick),
            profile,
          );
          return {
            result: composeBotMobilitySidecarV2(affordance, identity, participantId),`;
const BOT_PROFILE_REPLACEMENT = `          const affordance = this.#ruleEngine.getActionAffordanceProfile(
            this.#createReadActionAffordanceOptions(participantId, identity.tick),
            'full-audit',
          );
          return {
            result: composeBotMobilitySidecarV2(affordance, identity, participantId),`;
const PREVIEW_ANCHOR = '    const previewPort = getActionResolverPreviewPort(this.#resolver);';
const PREVIEW_REPLACEMENT = '    const previewPort = null;';

interface ArenaPa6LoaderHookStateV2 {
  readonly config: ArenaPa6LoaderConfigV2;
  readonly port: MessagePort;
  readonly entries: ReadonlyMap<string, Readonly<{
    readonly url: string;
    readonly entry: ArenaPa6WorkspaceSourceEntryV2;
  }>>;
  readonly packageEntriesByDirectory: ReadonlyMap<string, ArenaPa6WorkspaceSourceEntryV2>;
  readonly targets: ReadonlyMap<string, 'matchCore' | 'actionAffordance'>;
  readonly files: Partial<Record<'matchCore' | 'actionAffordance', ArenaPa6LoaderFileAttestationV2>>;
  readonly anchorCounts: {
    localProfile: number;
    botProfile: number;
    previewDecision: number;
  };
  readonly workspaceRedirectHits: Map<string, number>;
  readonly workspaceSourceModules: Map<string, ArenaPa6WorkspaceSourceModuleV2>;
  readonly workspaceSourceLoadsInProgress: Set<string>;
  readonly replacementCounts: { profileReads: number; previewDecision: number };
  distLoads: number;
  emitted: boolean;
}

interface ArenaPa6LoaderInitializeDataV2 {
  readonly config: ArenaPa6LoaderConfigV2;
  readonly port: MessagePort;
}

let state: ArenaPa6LoaderHookStateV2 | null = null;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function countExact(source: string, fragment: string): number {
  return source.split(fragment).length - 1;
}

function sameStat(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function readStableRegularFile(filePath: PathLike): string {
  const before = lstatSync(filePath, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error('PA6 loader target 必须是普通文件。');
  }
  const descriptor = openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let content: string;
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (!sameStat(before, openedBefore)) throw new Error('PA6 loader target open identity 漂移。');
    content = readFileSync(descriptor, 'utf8');
    const openedAfter = fstatSync(descriptor, { bigint: true });
    if (!sameStat(openedBefore, openedAfter)) throw new Error('PA6 loader target 读取期间漂移。');
  } finally {
    closeSync(descriptor);
  }
  const after = lstatSync(filePath, { bigint: true });
  if (!sameStat(before, after)) throw new Error('PA6 loader target 路径读取期间漂移。');
  return content;
}

function exactReplace(options: {
  readonly source: string;
  readonly anchor: string;
  readonly replacement: string;
  readonly enabled: boolean;
  readonly name: string;
}): Readonly<{ source: string; count: number; replacementCount: number }> {
  const count = countExact(options.source, options.anchor);
  if (count !== 1) {
    throw new Error(`PA6 loader ${options.name} anchor count=${count}，要求 1。`);
  }
  return Object.freeze({
    source: options.enabled
      ? options.source.replace(options.anchor, options.replacement)
      : options.source,
    count,
    replacementCount: options.enabled ? count : 0,
  });
}

export interface ArenaPa6ExecutedSourceTransformV2 {
  readonly source: string;
  readonly sourceAnchorCounts: Readonly<{
    readonly localProfile: number;
    readonly botProfile: number;
    readonly previewDecision: number;
  }>;
  readonly replacementCounts: Readonly<{
    readonly profileReads: number;
    readonly previewDecision: number;
  }>;
}

export function transformArenaPa6TargetSourceV2(options: {
  readonly targetName: 'matchCore' | 'actionAffordance';
  readonly source: string;
  readonly profileRead: 'broad' | 'split';
  readonly resolverRead: 'sequential' | 'multi-intent';
}): ArenaPa6ExecutedSourceTransformV2 {
  if (options.targetName === 'matchCore') {
    const local = exactReplace({
      source: options.source,
      anchor: LOCAL_PROFILE_ANCHOR,
      replacement: LOCAL_PROFILE_REPLACEMENT,
      enabled: options.profileRead === 'broad',
      name: 'local profile',
    });
    const bot = exactReplace({
      source: local.source,
      anchor: BOT_PROFILE_ANCHOR,
      replacement: BOT_PROFILE_REPLACEMENT,
      enabled: options.profileRead === 'broad',
      name: 'bot profile',
    });
    return Object.freeze({
      source: bot.source,
      sourceAnchorCounts: Object.freeze({
        localProfile: local.count,
        botProfile: bot.count,
        previewDecision: 0,
      }),
      replacementCounts: Object.freeze({
        profileReads: local.replacementCount + bot.replacementCount,
        previewDecision: 0,
      }),
    });
  }
  const preview = exactReplace({
    source: options.source,
    anchor: PREVIEW_ANCHOR,
    replacement: PREVIEW_REPLACEMENT,
    enabled: options.resolverRead === 'sequential',
    name: 'resolver preview decision',
  });
  return Object.freeze({
    source: preview.source,
    sourceAnchorCounts: Object.freeze({
      localProfile: 0,
      botProfile: 0,
      previewDecision: preview.count,
    }),
    replacementCounts: Object.freeze({
      profileReads: 0,
      previewDecision: preview.replacementCount,
    }),
  });
}

function requireState(): ArenaPa6LoaderHookStateV2 {
  if (state === null) throw new Error('PA6 loader hook 尚未 initialize。');
  return state;
}

function finalizeAttestation(active: ArenaPa6LoaderHookStateV2): void {
  const matchCore = active.files.matchCore;
  const actionAffordance = active.files.actionAffordance;
  if (active.emitted) throw new Error('PA6 loader attestation 不允许重复 finalize。');
  if (matchCore === undefined || actionAffordance === undefined) {
    throw new Error('PA6 loader source redirect 未实际加载两个 target。');
  }
  const expectedProfileReplacements = active.config.profileRead === 'broad' ? 2 : 0;
  const expectedPreviewReplacements = active.config.resolverRead === 'sequential' ? 1 : 0;
  const redirectHits = [...active.workspaceRedirectHits.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([packageId, count]) => Object.freeze({ packageId, count }));
  const sourceModules = [...active.workspaceSourceModules.values()]
    .sort((left, right) => left.relativePath < right.relativePath
      ? -1
      : left.relativePath > right.relativePath ? 1 : 0);
  const sourceModulesByRelativePath = new Map(
    sourceModules.map((module) => [module.relativePath, module]),
  );
  const redirectsHaveExecutedEntries = redirectHits.every(({ packageId }) => {
    const entry = active.entries.get(packageId)?.entry;
    if (entry === undefined) return false;
    const sourceModule = sourceModulesByRelativePath.get(entry.relativePath);
    return sourceModule !== undefined && sourceModule.packageId === packageId
      && sourceModule.sourceSha256 === entry.sourceSha256;
  });
  if (active.anchorCounts.localProfile !== 1 || active.anchorCounts.botProfile !== 1
    || active.anchorCounts.previewDecision !== 1
    || active.replacementCounts.profileReads !== expectedProfileReplacements
    || active.replacementCounts.previewDecision !== expectedPreviewReplacements
    || active.distLoads !== 0
    || redirectHits.length === 0
    || sourceModules.length === 0
    || !redirectsHaveExecutedEntries
    || !active.workspaceRedirectHits.has('@number-strategy-jump/arena-core')
    || !active.workspaceRedirectHits.has('@number-strategy-jump/arena-match')) {
    throw new Error('PA6 loader 实际 anchor/replace/redirect count 与 variant 不一致。');
  }
  active.emitted = true;
  active.port.postMessage({
    schemaVersion: 2,
    variantId: active.config.variantId,
    sourceFingerprint: active.config.sourceFingerprint,
    profileRead: active.config.profileRead,
    resolverRead: active.config.resolverRead,
    files: { matchCore, actionAffordance },
    sourceAnchorCounts: active.anchorCounts,
    workspaceSourceGraph: {
      redirectHits,
      sourceModules,
      sourceModuleCount: sourceModules.length,
      sourceModuleSetSha256: sha256(JSON.stringify(sourceModules)),
      distLoads: active.distLoads,
    },
    replacementCounts: active.replacementCounts,
  });
  active.port.close();
}

export function initialize(data: ArenaPa6LoaderInitializeDataV2): void {
  if (state !== null) throw new Error('PA6 loader hook 不允许重复 initialize。');
  if (data === null || typeof data !== 'object' || data.config === undefined
    || data.port === undefined || typeof data.port.postMessage !== 'function') {
    throw new Error('PA6 loader initialize data 非法。');
  }
  const root = data.config.repositoryRoot;
  const entries = new Map<string, Readonly<{
    readonly url: string;
    readonly entry: ArenaPa6WorkspaceSourceEntryV2;
  }>>();
  const packageEntriesByDirectory = new Map<string, ArenaPa6WorkspaceSourceEntryV2>();
  for (const entry of data.config.workspaceSourceEntries) {
    const url = pathToFileURL(path.join(root, entry.relativePath)).href;
    const directoryName = entry.relativePath.split('/')[1];
    if (entries.has(entry.packageId) || directoryName === undefined
      || packageEntriesByDirectory.has(directoryName)) {
      throw new Error(`PA6 loader workspace manifest 重复：${entry.packageId}`);
    }
    entries.set(entry.packageId, Object.freeze({ url, entry }));
    packageEntriesByDirectory.set(directoryName, entry);
  }
  const created: ArenaPa6LoaderHookStateV2 = {
    config: data.config,
    port: data.port,
    entries,
    packageEntriesByDirectory,
    targets: new Map([
      [data.config.targets.matchCore.relativePath, 'matchCore'],
      [data.config.targets.actionAffordance.relativePath, 'actionAffordance'],
    ]),
    files: {},
    anchorCounts: { localProfile: 0, botProfile: 0, previewDecision: 0 },
    workspaceRedirectHits: new Map(),
    workspaceSourceModules: new Map(),
    workspaceSourceLoadsInProgress: new Set(),
    replacementCounts: { profileReads: 0, previewDecision: 0 },
    distLoads: 0,
    emitted: false,
  };
  created.port.on('message', (value: unknown) => {
    try {
      if (value === null || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).length !== 2
        || Object.getOwnPropertyDescriptor(value, 'schemaVersion')?.value !== 2
        || Object.getOwnPropertyDescriptor(value, 'type')?.value !== 'finalize') {
        throw new Error('PA6 loader finalize message 非法。');
      }
      finalizeAttestation(created);
    } catch (error: unknown) {
      created.port.postMessage({
        schemaVersion: 2,
        type: 'failed',
        error: error instanceof Error ? error.message : 'PA6 loader finalize failure',
      });
      created.port.close();
    }
  });
  state = created;
}

export function resolve(
  specifier: string,
  context: unknown,
  nextResolve: (value: string, innerContext: unknown) => unknown,
): unknown {
  const active = requireState();
  const redirected = active.entries.get(specifier);
  if (redirected !== undefined) {
    active.workspaceRedirectHits.set(
      specifier,
      (active.workspaceRedirectHits.get(specifier) ?? 0) + 1,
    );
    return { url: redirected.url, format: 'module', shortCircuit: true };
  }
  if (specifier.startsWith(WORKSPACE_PACKAGE_PREFIX)) {
    throw new Error(`PA6 loader 拒绝未纳入 manifest 的 workspace specifier/subpath：${specifier}`);
  }
  assertWorkspaceSourceSpecifierDoesNotEscape(active, specifier, context);
  return nextResolve(specifier, context);
}

function assertWorkspaceSourceSpecifierDoesNotEscape(
  active: ArenaPa6LoaderHookStateV2,
  specifier: string,
  context: unknown,
): void {
  if (context === null || typeof context !== 'object') return;
  const parentUrl = Object.getOwnPropertyDescriptor(context, 'parentURL')?.value;
  if (typeof parentUrl !== 'string') return;
  const parent = locateWorkspaceSourceUrl(parentUrl, active.config.repositoryRoot);
  if (parent === null) return;
  if (!active.packageEntriesByDirectory.has(parent.packageDirectory)) {
    throw new Error(`PA6 loader workspace source parent 未纳入 manifest：${parent.relativePath}`);
  }
  const isPathSpecifier = specifier.startsWith('.') || specifier.startsWith('/')
    || specifier.startsWith('file:');
  if (!isPathSpecifier) return;
  let requestedPath: string;
  try {
    requestedPath = fileURLToPath(new URL(specifier, parentUrl));
  } catch {
    throw new Error(`PA6 loader workspace source path specifier 非法：${specifier}`);
  }
  const sourceRoot = path.join(
    active.config.repositoryRoot,
    'packages',
    parent.packageDirectory,
    'src',
  );
  const relative = path.relative(sourceRoot, requestedPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`PA6 loader workspace source relative import 逃逸 src：${specifier}`);
  }
}

function isWorkspaceDistUrl(url: string, repositoryRoot: string): boolean {
  if (!url.startsWith('file:')) return false;
  let filePath: string;
  try {
    filePath = fileURLToPath(url);
  } catch {
    return false;
  }
  const candidates = [filePath];
  try {
    const canonical = realpathSync.native(filePath);
    if (canonical !== filePath) candidates.push(canonical);
  } catch {
    // A missing target still needs lexical dist rejection before the delegated loader sees it.
  }
  return candidates.some((candidate) => {
    const relative = path.relative(repositoryRoot, candidate);
    if (relative.length === 0 || path.isAbsolute(relative)
      || relative === '..' || relative.startsWith(`..${path.sep}`)) return false;
    const segments = relative.split(path.sep);
    return segments.length >= 4 && segments[0] === 'packages' && segments[2] === 'dist';
  });
}

interface ArenaPa6WorkspaceSourceLocationV2 {
  readonly filePath: string;
  readonly canonicalPath: string | null;
  readonly relativePath: string;
  readonly packageDirectory: string;
}

function parseWorkspaceSourceRelativePath(relativePath: string): Readonly<{
  relativePath: string;
  packageDirectory: string;
}> | null {
  if (relativePath.length === 0 || path.isAbsolute(relativePath)
    || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)) return null;
  const segments = relativePath.split(path.sep);
  if (segments.length < 4 || segments[0] !== 'packages' || segments[2] !== 'src') return null;
  return Object.freeze({
    relativePath: segments.join('/'),
    packageDirectory: segments[1]!,
  });
}

function locateWorkspaceSourceUrl(
  url: string,
  repositoryRoot: string,
): ArenaPa6WorkspaceSourceLocationV2 | null {
  if (!url.startsWith('file:')) return null;
  let filePath: string;
  try {
    filePath = fileURLToPath(url);
  } catch {
    return null;
  }
  const lexical = parseWorkspaceSourceRelativePath(path.relative(repositoryRoot, filePath));
  let canonicalPath: string | null = null;
  let canonical: ReturnType<typeof parseWorkspaceSourceRelativePath> = null;
  try {
    canonicalPath = realpathSync.native(filePath);
    canonical = parseWorkspaceSourceRelativePath(path.relative(repositoryRoot, canonicalPath));
  } catch {
    // A missing or unsafe lexical workspace source still fails closed in load().
  }
  const identity = lexical ?? canonical;
  if (identity === null) return null;
  return Object.freeze({
    filePath,
    canonicalPath,
    relativePath: identity.relativePath,
    packageDirectory: identity.packageDirectory,
  });
}

export async function load(
  url: string,
  context: unknown,
  nextLoad: (value: string, innerContext: unknown) => unknown,
): Promise<unknown> {
  const active = requireState();
  if (isWorkspaceDistUrl(url, active.config.repositoryRoot)) {
    active.distLoads += 1;
    throw new Error(`PA6 loader 拒绝 workspace dist load：${url}`);
  }
  const location = locateWorkspaceSourceUrl(url, active.config.repositoryRoot);
  if (location === null) return nextLoad(url, context);
  const packageEntry = active.packageEntriesByDirectory.get(location.packageDirectory);
  if (packageEntry === undefined) {
    throw new Error(`PA6 loader workspace src package 未纳入固定 manifest：${location.relativePath}`);
  }
  if (location.canonicalPath !== location.filePath
    || path.extname(location.filePath) !== '.ts'
    || location.relativePath.endsWith('.d.ts')) {
    throw new Error(`PA6 loader workspace src 路径/扩展/链接不受支持：${location.relativePath}`);
  }
  if (!location.relativePath.startsWith(`packages/${location.packageDirectory}/src/`)
    || active.workspaceSourceModules.has(location.relativePath)
    || active.workspaceSourceLoadsInProgress.has(location.relativePath)) {
    throw new Error(`PA6 loader workspace src identity 重复或逃逸：${location.relativePath}`);
  }
  active.workspaceSourceLoadsInProgress.add(location.relativePath);
  try {
    let source = readStableRegularFile(location.filePath);
    if (realpathSync.native(location.filePath) !== location.filePath) {
      throw new Error(`PA6 loader workspace src 读取后路径漂移：${location.relativePath}`);
    }
    const sourceSha256 = sha256(source);
    const targetName = active.targets.get(location.relativePath);
    if (targetName !== undefined) {
      const target = active.config.targets[targetName];
      if (active.files[targetName] !== undefined || sourceSha256 !== target.sourceSha256) {
        throw new Error(`PA6 loader ${targetName} target identity/hash 漂移。`);
      }
      const transformed = transformArenaPa6TargetSourceV2({
        targetName,
        source,
        profileRead: active.config.profileRead,
        resolverRead: active.config.resolverRead,
      });
      source = transformed.source;
      if (targetName === 'matchCore') {
        active.anchorCounts.localProfile = transformed.sourceAnchorCounts.localProfile;
        active.anchorCounts.botProfile = transformed.sourceAnchorCounts.botProfile;
        active.replacementCounts.profileReads = transformed.replacementCounts.profileReads;
      } else {
        active.anchorCounts.previewDecision = transformed.sourceAnchorCounts.previewDecision;
        active.replacementCounts.previewDecision = transformed.replacementCounts.previewDecision;
      }
      active.files[targetName] = Object.freeze({
        relativePath: target.relativePath,
        sourceSha256,
        transformedSha256: sha256(source),
      });
    }
    const executable = await transform(source, {
      format: 'esm',
      loader: 'ts',
      platform: 'node',
      target: 'node20',
      sourcefile: location.relativePath,
      sourcemap: 'inline',
    });
    active.workspaceSourceModules.set(location.relativePath, Object.freeze({
      packageId: packageEntry.packageId,
      relativePath: location.relativePath,
      sourceSha256,
    }));
    return { format: 'module', source: executable.code, shortCircuit: true };
  } finally {
    active.workspaceSourceLoadsInProgress.delete(location.relativePath);
  }
}
