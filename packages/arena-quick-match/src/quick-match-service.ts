import {
  BotController,
  type BotControllerOptions,
} from '@number-strategy-jump/arena-bot';
import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createMatchContentPublicView,
  createMatchContentSelection,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import type {
  MatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import {
  MatchCore,
} from '@number-strategy-jump/arena-match';
import {
  copyMatchAssignmentDiagnostics,
  createMatchAssignment,
  type MatchAssignmentDiagnostics,
  type OpponentProfile,
} from '@number-strategy-jump/arena-matchmaking';
import {
  LocalMatchSession,
  type BotInputController,
  type LocalMatchSessionOptions,
} from '@number-strategy-jump/arena-session';

export interface MatchSeedSource {
  nextSeed(): number;
}

export interface QuickMatchContentPool {
  readonly matchSeed: number;
  readonly selection: MatchContentSelection;
}

export interface ContentPoolProvider {
  resolve(options: Readonly<{ matchSeed: number }>): QuickMatchContentPool;
}

export type QuickMatchCoreFactory = (
  options: Readonly<{ seed: number; config: Readonly<Record<string, unknown>> }>,
) => MatchCore;

export interface QuickMatchServiceOptions {
  readonly seedSource?: MatchSeedSource | null;
  readonly coreFactory?: QuickMatchCoreFactory;
  readonly botControllerFactory?: (options: BotControllerOptions) => BotInputController;
  readonly sessionFactory?: (options: LocalMatchSessionOptions) => LocalMatchSession;
  readonly diagnosticSink?: ((diagnostics: MatchAssignmentDiagnostics) => void) | null;
  readonly allowDifficultyOverride?: boolean;
  readonly contentPoolProvider?: ContentPoolProvider | null;
}

export interface QuickMatchServiceDefaults {
  readonly coreFactory?: QuickMatchCoreFactory;
}

export interface QuickMatchCreateOptions {
  readonly matchSeed?: number;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly difficultyOverride?: 'easy' | 'normal' | 'hard' | null;
}

export interface QuickMatch {
  readonly matchSeed: number;
  readonly opponent: OpponentProfile;
  readonly content: MatchContentSelection | null;
  readonly session: LocalMatchSession;
}

interface OwnedCleanup {
  readonly label: string;
  cleanup(): void;
}

interface NormalizedServiceOptions {
  readonly nextSeed: (() => number) | null;
  readonly coreFactory: QuickMatchCoreFactory;
  readonly botControllerFactory: (options: BotControllerOptions) => BotInputController;
  readonly sessionFactory: (options: LocalMatchSessionOptions) => LocalMatchSession;
  readonly diagnosticSink: ((diagnostics: MatchAssignmentDiagnostics) => void) | null;
  readonly allowDifficultyOverride: boolean;
  readonly resolveContentPool: ((options: Readonly<{ matchSeed: number }>) => QuickMatchContentPool) | null;
}

const SERVICE_OPTION_KEYS = new Set([
  'seedSource',
  'coreFactory',
  'botControllerFactory',
  'sessionFactory',
  'diagnosticSink',
  'allowDifficultyOverride',
  'contentPoolProvider',
]);
const DEFAULT_OPTION_KEYS = new Set(['coreFactory']);
const CREATE_OPTION_KEYS = new Set(['matchSeed', 'config', 'difficultyOverride']);
const SESSION_METHODS = Object.freeze([
  'start',
  'setPaused',
  'step',
  'runUntilEnded',
  'getSnapshot',
  'getPublicMatchInfo',
  'exportReplay',
  'destroy',
]);
const MATCH_CORE_CONFIG_GETTER = Object.getOwnPropertyDescriptor(
  MatchCore.prototype,
  'config',
)?.get;

function nativeMatchCoreConfig(core: MatchCore): MatchCore['config'] {
  const getter = MATCH_CORE_CONFIG_GETTER;
  if (typeof getter !== 'function') throw new Error('MatchCore.config 数据合同缺失。');
  return getter.call(core) as MatchCore['config'];
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(value: unknown, methodName: string, ownerName: string): (...args: never[]) => unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${ownerName} 必须实现 ${methodName}()。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${ownerName} 原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as (...args: never[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${ownerName} 必须实现 ${methodName}()。`);
}

function optionalFactory(value: unknown, fallback: unknown, name: string): (...args: never[]) => unknown {
  const selected = value === undefined ? fallback : value;
  if (typeof selected !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return selected as (...args: never[]) => unknown;
}

function normalizeServiceOptions(
  options: unknown,
  defaults: unknown,
): NormalizedServiceOptions {
  const source = options === undefined ? {} : options;
  const defaultSource = defaults === undefined ? {} : defaults;
  assertKnownKeys(source, SERVICE_OPTION_KEYS, 'QuickMatchService options');
  assertKnownKeys(defaultSource, DEFAULT_OPTION_KEYS, 'QuickMatchService defaults');
  const record = assertPlainRecord(source, 'QuickMatchService options');
  const defaultRecord = assertPlainRecord(defaultSource, 'QuickMatchService defaults');

  const seedSource = readOptionalDataProperty(record, 'seedSource', 'QuickMatchService options') ?? null;
  const nextSeed = seedSource === null
    ? null
    : dataMethod(seedSource, 'nextSeed', 'seedSource') as () => number;

  const coreFactory = optionalFactory(
    readOptionalDataProperty(record, 'coreFactory', 'QuickMatchService options'),
    readOptionalDataProperty(defaultRecord, 'coreFactory', 'QuickMatchService defaults'),
    'coreFactory',
  ) as QuickMatchCoreFactory;
  const botControllerFactory = optionalFactory(
    readOptionalDataProperty(record, 'botControllerFactory', 'QuickMatchService options'),
    (factoryOptions: BotControllerOptions) => new BotController(factoryOptions),
    'botControllerFactory',
  ) as (factoryOptions: BotControllerOptions) => BotInputController;
  const sessionFactory = optionalFactory(
    readOptionalDataProperty(record, 'sessionFactory', 'QuickMatchService options'),
    (factoryOptions: LocalMatchSessionOptions) => new LocalMatchSession(factoryOptions),
    'sessionFactory',
  ) as (factoryOptions: LocalMatchSessionOptions) => LocalMatchSession;

  const diagnosticSink = readOptionalDataProperty(
    record,
    'diagnosticSink',
    'QuickMatchService options',
  ) ?? null;
  if (diagnosticSink !== null && typeof diagnosticSink !== 'function') {
    throw new TypeError('diagnosticSink 必须是函数。');
  }
  const allowDifficultyOverride = readOptionalDataProperty(
    record,
    'allowDifficultyOverride',
    'QuickMatchService options',
  ) ?? false;
  if (typeof allowDifficultyOverride !== 'boolean') {
    throw new TypeError('allowDifficultyOverride 必须是布尔值。');
  }
  const contentPoolProvider = readOptionalDataProperty(
    record,
    'contentPoolProvider',
    'QuickMatchService options',
  ) ?? null;
  const resolveContentPool = contentPoolProvider === null
    ? null
    : dataMethod(contentPoolProvider, 'resolve', 'contentPoolProvider') as (
      providerOptions: Readonly<{ matchSeed: number }>,
    ) => QuickMatchContentPool;

  return Object.freeze({
    nextSeed,
    coreFactory,
    botControllerFactory,
    sessionFactory,
    diagnosticSink: diagnosticSink as ((diagnostics: MatchAssignmentDiagnostics) => void) | null,
    allowDifficultyOverride,
    resolveContentPool,
  });
}

function normalizeCreateOptions(options: unknown): Readonly<{
  matchSeed: unknown;
  config: Readonly<Record<string, unknown>>;
  difficultyOverride: unknown;
}> {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, CREATE_OPTION_KEYS, 'QuickMatchService create options');
  const record = assertPlainRecord(source, 'QuickMatchService create options');
  const rawConfig = readOptionalDataProperty(record, 'config', 'QuickMatchService create options') ?? {};
  const config = cloneFrozenData(rawConfig, 'QuickMatch config');
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new TypeError('QuickMatch config 必须是普通数据对象。');
  }
  return Object.freeze({
    matchSeed: readOptionalDataProperty(record, 'matchSeed', 'QuickMatchService create options'),
    config: config as Readonly<Record<string, unknown>>,
    difficultyOverride: readOptionalDataProperty(
      record,
      'difficultyOverride',
      'QuickMatchService create options',
    ) ?? null,
  });
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function cleanupHandle(value: unknown, label: string): OwnedCleanup | null {
  try {
    const cleanup = dataMethod(value, 'destroy', label) as () => void;
    return Object.freeze({ label, cleanup });
  } catch {
    return null;
  }
}

function validateForeignSessionCandidate(value: unknown): never {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('sessionFactory 必须返回 LocalMatchSession 合同。');
  }
  for (const methodName of SESSION_METHODS) {
    try {
      dataMethod(value, methodName, 'sessionFactory 返回值');
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('必须实现')) {
        throw new TypeError(`sessionFactory 返回值缺少 ${methodName}()。`);
      }
      throw error;
    }
  }
  throw new TypeError('sessionFactory 必须返回原生 LocalMatchSession。');
}

function assertNativeSessionSurface(session: LocalMatchSession): void {
  for (const methodName of SESSION_METHODS) {
    if (Object.prototype.hasOwnProperty.call(session, methodName)) {
      throw new TypeError(`LocalMatchSession 不得覆盖自身 ${methodName}()。`);
    }
  }
}

function coreCleanup(core: MatchCore): OwnedCleanup {
  return Object.freeze({
    label: 'MatchCore',
    cleanup: () => MatchCore.prototype.destroy.call(core),
  });
}

function sessionCleanup(session: LocalMatchSession): OwnedCleanup {
  return Object.freeze({
    label: 'LocalMatchSession',
    cleanup: () => LocalMatchSession.prototype.destroy.call(session),
  });
}

function resolveContentPool(
  resolver: NormalizedServiceOptions['resolveContentPool'],
  matchSeed: number,
  config: Readonly<Record<string, unknown>>,
): Readonly<{
  config: Readonly<Record<string, unknown>>;
  content: MatchContentSelection | null;
}> {
  if (resolver === null) return Object.freeze({ config, content: null });
  if (Object.prototype.hasOwnProperty.call(config, 'contentSelection')) {
    throw new RangeError('启用 contentPoolProvider 时不能由调用者覆盖 contentSelection。');
  }
  const pool = cloneFrozenData(
    resolver(Object.freeze({ matchSeed })),
    'QuickMatch frozen content pool',
  ) as QuickMatchContentPool;
  if (pool.matchSeed !== matchSeed) {
    throw new RangeError('QuickMatch content pool matchSeed 与匹配分配不一致。');
  }
  const selection = createMatchContentSelection(pool.selection);
  return Object.freeze({
    config: Object.freeze({ ...config, contentSelection: selection }),
    content: createMatchContentPublicView(selection),
  });
}

export class QuickMatchService {
  readonly #options: NormalizedServiceOptions;
  #retainedCleanup: OwnedCleanup[];
  #operation: string | null;
  #destroyRequested: boolean;
  #destroyed: boolean;

  constructor(options?: QuickMatchServiceOptions, defaults?: QuickMatchServiceDefaults);
  constructor(options?: unknown, defaults?: unknown) {
    this.#options = normalizeServiceOptions(options, defaults);
    this.#retainedCleanup = [];
    this.#operation = null;
    this.#destroyRequested = false;
    this.#destroyed = false;
  }

  #enter(operation: string): void {
    if (this.#operation !== null) {
      throw new Error(`QuickMatchService ${this.#operation} 期间不能调用 ${operation}。`);
    }
    if (this.#destroyed || (this.#destroyRequested && operation !== 'destroy')) {
      throw new Error('QuickMatchService 已销毁。');
    }
    this.#operation = operation;
  }

  #leave(): void {
    this.#operation = null;
  }

  #cleanupRetained(): readonly Error[] {
    const failures: Error[] = [];
    const retry: OwnedCleanup[] = [];
    for (let index = this.#retainedCleanup.length - 1; index >= 0; index -= 1) {
      const owned = this.#retainedCleanup[index];
      if (!owned) continue;
      try {
        owned.cleanup();
      } catch (error) {
        failures.push(normalizeThrownError(error, `${owned.label} 清理失败`));
        retry.unshift(owned);
      }
    }
    this.#retainedCleanup = retry;
    return Object.freeze(failures);
  }

  #nextMatchSeed(explicitSeed: unknown): number {
    if (explicitSeed !== undefined) return uint32(explicitSeed, 'matchSeed');
    if (this.#options.nextSeed === null) {
      throw new Error('快速匹配需要显式 matchSeed 或 seedSource。');
    }
    return uint32(this.#options.nextSeed(), 'seedSource.nextSeed() 返回值');
  }

  create(options?: QuickMatchCreateOptions): QuickMatch;
  create(options?: unknown): QuickMatch {
    this.#enter('create');
    let core: MatchCore | null = null;
    let controller: BotInputController | null = null;
    let session: LocalMatchSession | null = null;
    let failureCleanupAlreadyAttempted = false;
    try {
      const previousCleanupErrors = this.#cleanupRetained();
      if (previousCleanupErrors.length > 0) {
        failureCleanupAlreadyAttempted = true;
        throw combineCleanupFailure(
          new Error('QuickMatchService 上次失败资源尚未释放。'),
          previousCleanupErrors,
          'QuickMatchService 上次失败资源仍无法释放。',
        );
      }
      const copiedOptions = normalizeCreateOptions(options);
      if (
        copiedOptions.difficultyOverride !== null
        && !this.#options.allowDifficultyOverride
      ) {
        throw new Error('生产 QuickMatchService 不允许覆盖隐藏难度。');
      }
      const assignment = createMatchAssignment({
        matchSeed: this.#nextMatchSeed(copiedOptions.matchSeed),
        difficultyOverride: copiedOptions.difficultyOverride as never,
      });
      const publicMatchInfo = Object.freeze({
        matchSeed: assignment.matchSeed,
        opponent: assignment.opponent,
      });
      const resolvedContent = resolveContentPool(
        this.#options.resolveContentPool,
        assignment.matchSeed,
        copiedOptions.config,
      );
      const coreCandidate = this.#options.coreFactory(Object.freeze({
        seed: assignment.matchSeed,
        config: resolvedContent.config,
      }));
      if (!(coreCandidate instanceof MatchCore) || Object.getPrototypeOf(coreCandidate) !== MatchCore.prototype) {
        const invalidCleanup = cleanupHandle(coreCandidate, 'coreFactory 返回值');
        if (invalidCleanup) this.#retainedCleanup.push(invalidCleanup);
        throw new TypeError('coreFactory 必须返回原生 MatchCore。');
      }
      core = coreCandidate;
      this.#retainedCleanup.push(coreCleanup(core));

      const botCharacter = MatchCore.prototype.getCharacterDefinition.call(core, 'player-2');
      const coreConfig = nativeMatchCoreConfig(core);
      controller = this.#options.botControllerFactory(Object.freeze({
        participantId: 'player-2',
        difficultyId: assignment.effectiveDifficultyId,
        behaviorSeed: assignment.seeds.botBehavior,
        personalitySeed: assignment.seeds.botPersonality,
        arena: coreConfig.arena,
        characterRadius: botCharacter.collision.radius,
        maximumStepHeight: botCharacter.movement.automaticStepHeight,
      }));
      const controllerCleanup = cleanupHandle(controller, 'botControllerFactory 返回值');
      if (controllerCleanup === null) {
        throw new TypeError('botControllerFactory 返回值必须实现数据方法 destroy()。');
      }
      this.#retainedCleanup.push(controllerCleanup);

      const sessionCandidate = this.#options.sessionFactory(Object.freeze({
        core,
        botController: controller,
        playerParticipantId: 'player-1',
        botParticipantId: 'player-2',
        publicMatchInfo,
      }));
      if (sessionCandidate instanceof LocalMatchSession) {
        this.#retainedCleanup.splice(-2, 2, sessionCleanup(sessionCandidate));
        core = null;
        controller = null;
      } else {
        const invalidCleanup = cleanupHandle(sessionCandidate, 'sessionFactory 返回值');
        if (invalidCleanup) this.#retainedCleanup.push(invalidCleanup);
        validateForeignSessionCandidate(sessionCandidate);
      }
      if (Object.getPrototypeOf(sessionCandidate) !== LocalMatchSession.prototype) {
        throw new TypeError('sessionFactory 必须返回原生 LocalMatchSession。');
      }
      assertNativeSessionSurface(sessionCandidate);
      session = sessionCandidate;

      this.#retainedCleanup.length = 0;
      try {
        this.#options.diagnosticSink?.(copyMatchAssignmentDiagnostics(assignment));
      } catch {
        // Diagnostics are observational and never cancel an otherwise valid match.
      }
      return Object.freeze({
        matchSeed: assignment.matchSeed,
        opponent: assignment.opponent,
        content: resolvedContent.content,
        session,
      });
    } catch (error) {
      const cleanupErrors = failureCleanupAlreadyAttempted
        ? Object.freeze([])
        : this.#cleanupRetained();
      core = null;
      controller = null;
      session = null;
      const failure = normalizeThrownError(error, 'QuickMatchService 创建失败');
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'QuickMatchService 创建失败且清理未完整完成。',
      );
    } finally {
      this.#leave();
    }
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#enter('destroy');
    this.#destroyRequested = true;
    try {
      const cleanupErrors = this.#cleanupRetained();
      if (cleanupErrors.length > 0) {
        throw combineCleanupFailure(
          new Error('QuickMatchService 销毁失败。'),
          cleanupErrors,
          'QuickMatchService 销毁失败且资源仍待重试。',
        );
      }
      this.#destroyed = true;
    } finally {
      this.#leave();
    }
  }
}
