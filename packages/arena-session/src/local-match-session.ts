import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createNeutralInputFrame,
  isNormalizedInputFrame,
  normalizeInputFrame,
  normalizeThrownError,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeepReadonly,
  type MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
  MatchCore,
  type ArenaAuthorityEvent,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';
import {
  armBotMatchReadTransaction,
  invalidateBotMatchReadBundle,
  readFullAuditForSession,
  readPresentationFrameForSession,
  resolveBotMatchReadBundle,
  type BotMatchReadBundleV2,
  type BotMatchReadFullAuditResultV2,
  type BotMatchReadTransaction,
} from './bot-match-read-bundle.js';

export const LOCAL_MATCH_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  DESTROYED: 'destroyed',
} as const);

export type LocalMatchSessionState = typeof LOCAL_MATCH_SESSION_STATE[
  keyof typeof LOCAL_MATCH_SESSION_STATE
];

export interface PublicOpponentInfo {
  readonly id: string;
  readonly displayName: string;
  readonly portraitKey: string;
  readonly appearanceKey: string;
}

export interface LocalMatchPublicInfo {
  readonly matchSeed: number;
  readonly opponent: PublicOpponentInfo;
}

export interface BotInputController {
  createInput(snapshot: ArenaMatchSnapshot): ArenaInputFrame;
  attachTrustedCommandSourceReader?(reader: unknown, handle: unknown): boolean;
  createInputFromTrustedCommandSource?(): ArenaInputFrame;
  destroy(): void;
}

export interface LocalMatchSessionOptions {
  readonly core: MatchCore;
  readonly botController: BotInputController;
  readonly playerParticipantId?: string;
  readonly botParticipantId?: string;
  readonly botMatchReadBundle?: BotMatchReadBundleV2;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

export interface LocalMatchLegacyAuditStepResult {
  readonly events: readonly ArenaAuthorityEvent[];
  readonly snapshot: DeepReadonly<ArenaMatchSnapshot>;
  readonly input: ArenaInputFrame | null;
}

export interface LocalMatchPresentationStepResultV2 {
  readonly events: readonly ArenaAuthorityEvent[];
  readonly readFrame: DeepReadonly<MatchReadFrameV2>;
  readonly input: ArenaInputFrame | null;
}

export type LocalMatchFullAuditReadResultV2 = BotMatchReadFullAuditResultV2;

export type LocalMatchInputProvider = (
  snapshot: DeepReadonly<ArenaMatchSnapshot>,
) => unknown;

export interface RunLocalMatchOptions {
  readonly maxTicks?: number | null;
}

interface OwnedResource {
  destroy(): void;
}

interface BotControllerPort extends OwnedResource {
  createInput(snapshot: ArenaMatchSnapshot): ArenaInputFrame;
  attachTrustedCommandSourceReader?(reader: unknown, handle: unknown): boolean;
  createInputFromTrustedCommandSource?(): ArenaInputFrame;
}

interface NormalizedSessionOptions {
  readonly core: MatchCore;
  readonly botController: BotControllerPort;
  readonly playerParticipantId: string;
  readonly botParticipantId: string;
  readonly botMatchReadBundle: BotMatchReadBundleV2 | null;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

const SESSION_OPTION_KEYS = new Set([
  'core',
  'botController',
  'playerParticipantId',
  'botParticipantId',
  'botMatchReadBundle',
  'publicMatchInfo',
]);
const PUBLIC_INFO_KEYS = new Set(['matchSeed', 'opponent']);
const OPPONENT_KEYS = new Set(['id', 'displayName', 'portraitKey', 'appearanceKey']);
const RUN_OPTION_KEYS = new Set(['maxTicks']);
const EMPTY_EVENTS: readonly ArenaAuthorityEvent[] = Object.freeze([]);
const DEFAULT_INPUT_PROVIDER: LocalMatchInputProvider = () => null;

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function methodFromPrototypeChain(value: unknown, methodName: string): (...args: unknown[]) => unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`BotController.${methodName}() 不存在。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError('BotController 原型链无效。');
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`BotController.${methodName} 必须是数据方法。`);
      }
      return descriptor.value as (...args: unknown[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`BotController.${methodName}() 不存在。`);
}

function optionalMethodFromPrototypeChain(
  value: unknown,
  methodName: string,
): ((...args: unknown[]) => unknown) | null {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return null;
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError('BotController 原型链无效。');
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`BotController.${methodName} 必须是数据方法。`);
      }
      return descriptor.value as (...args: unknown[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function normalizeController(controller: unknown): BotControllerPort {
  const createInput = methodFromPrototypeChain(controller, 'createInput');
  const destroy = methodFromPrototypeChain(controller, 'destroy');
  const attachTrustedCommandSourceReader = optionalMethodFromPrototypeChain(
    controller,
    'attachTrustedCommandSourceReader',
  );
  const createInputFromTrustedCommandSource = optionalMethodFromPrototypeChain(
    controller,
    'createInputFromTrustedCommandSource',
  );
  return Object.freeze({
    createInput: (snapshot: ArenaMatchSnapshot): ArenaInputFrame => (
      createInput.call(controller, snapshot) as ArenaInputFrame
    ),
    ...(attachTrustedCommandSourceReader === null ? {} : {
      attachTrustedCommandSourceReader: (reader: unknown, handle: unknown): boolean => (
        attachTrustedCommandSourceReader.call(controller, reader, handle) === true
      ),
    }),
    ...(createInputFromTrustedCommandSource === null ? {} : {
      createInputFromTrustedCommandSource: (): ArenaInputFrame => (
        createInputFromTrustedCommandSource.call(controller) as ArenaInputFrame
      ),
    }),
    destroy: (): void => { destroy.call(controller); },
  });
}

function copyPublicInfo(info: unknown): LocalMatchPublicInfo {
  const source = cloneFrozenData(info, 'publicMatchInfo');
  assertKnownKeys(source, PUBLIC_INFO_KEYS, 'publicMatchInfo');
  const record = assertPlainRecord(source, 'publicMatchInfo');
  const opponent = readDataProperty(record, 'opponent', 'publicMatchInfo');
  if (typeof opponent !== 'object' || opponent === null || Array.isArray(opponent)) {
    throw new TypeError('publicMatchInfo.opponent 不存在。');
  }
  assertKnownKeys(opponent, OPPONENT_KEYS, 'publicMatchInfo.opponent');
  const opponentRecord = assertPlainRecord(opponent, 'publicMatchInfo.opponent');
  return Object.freeze({
    matchSeed: uint32(
      readDataProperty(record, 'matchSeed', 'publicMatchInfo'),
      'publicMatchInfo.matchSeed',
    ),
    opponent: Object.freeze({
      id: nonEmptyString(opponentRecord.id, 'publicMatchInfo.opponent.id'),
      displayName: nonEmptyString(
        opponentRecord.displayName,
        'publicMatchInfo.opponent.displayName',
      ),
      portraitKey: nonEmptyString(
        opponentRecord.portraitKey,
        'publicMatchInfo.opponent.portraitKey',
      ),
      appearanceKey: nonEmptyString(
        opponentRecord.appearanceKey,
        'publicMatchInfo.opponent.appearanceKey',
      ),
    }),
  });
}

function normalizeOptions(options: unknown): NormalizedSessionOptions {
  assertKnownKeys(options, SESSION_OPTION_KEYS, 'LocalMatchSession options');
  const record = assertPlainRecord(options, 'LocalMatchSession options');
  const core = readDataProperty(record, 'core', 'LocalMatchSession options');
  if (!(core instanceof MatchCore)) throw new TypeError('LocalMatchSession 需要 MatchCore。');
  const playerParticipantId = nonEmptyString(
    readOptionalDataProperty(record, 'playerParticipantId', 'LocalMatchSession options')
      ?? 'player-1',
    'playerParticipantId',
  );
  const botParticipantId = nonEmptyString(
    readOptionalDataProperty(record, 'botParticipantId', 'LocalMatchSession options')
      ?? 'player-2',
    'botParticipantId',
  );
  if (
    !core.config.participantIds.includes(playerParticipantId)
    || !core.config.participantIds.includes(botParticipantId)
    || playerParticipantId === botParticipantId
  ) throw new RangeError('LocalMatchSession 参与者身份无效。');
  const botController = normalizeController(
    readDataProperty(record, 'botController', 'LocalMatchSession options'),
  );
  const publicMatchInfo = copyPublicInfo(
    readDataProperty(record, 'publicMatchInfo', 'LocalMatchSession options'),
  );
  const botMatchReadBundle = readOptionalDataProperty(
    record,
    'botMatchReadBundle',
    'LocalMatchSession options',
  );
  if (
    botMatchReadBundle !== undefined
    && (typeof botMatchReadBundle !== 'object' || botMatchReadBundle === null)
  ) {
    throw new TypeError('LocalMatchSession botMatchReadBundle 必须是 opaque object。');
  }
  return Object.freeze({
    core,
    botController,
    playerParticipantId,
    botParticipantId,
    botMatchReadBundle: botMatchReadBundle as BotMatchReadBundleV2 | undefined ?? null,
    publicMatchInfo,
  });
}

function parseRunOptions(options: unknown): number | null {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, RUN_OPTION_KEYS, 'LocalMatchSession run options');
  const record = assertPlainRecord(source, 'LocalMatchSession run options');
  const candidate = readOptionalDataProperty(record, 'maxTicks', 'LocalMatchSession run options');
  if (candidate === undefined || candidate === null) return null;
  if (!Number.isSafeInteger(candidate) || (candidate as number) < 1) {
    throw new RangeError('maxTicks 必须是正安全整数。');
  }
  return candidate as number;
}

function destroyOwned(value: OwnedResource | null, errors: Error[]): boolean {
  if (value === null) return true;
  try {
    value.destroy();
    return true;
  } catch (error) {
    errors.push(normalizeThrownError(error, 'LocalMatchSession 清理失败'));
    return false;
  }
}

export class LocalMatchSession {
  #core: MatchCore | null;
  #runner: HeadlessMatchRunner | null;
  #botController: BotControllerPort | null;
  readonly #playerParticipantId: string;
  readonly #botParticipantId: string;
  readonly #publicMatchInfo: LocalMatchPublicInfo;
  #state: LocalMatchSessionState;
  #stepping: boolean;
  #runningUntilEnded: boolean;
  #cleaning: boolean;
  #pauseRequested: boolean;
  #botMatchReadBundle: BotMatchReadBundleV2 | null;
  #useTrustedCommandSourceInput: boolean;
  #coreDestroyed: boolean;
  #readingPresentationFrame: boolean;
  #activeStepMethod: 'stepWithLegacySnapshotForAudit()' | 'stepWithPresentationReadFrame()' | null;

  constructor(options: LocalMatchSessionOptions);
  constructor(options: unknown) {
    const normalized = normalizeOptions(options);
    const runner = new HeadlessMatchRunner(normalized.core);
    this.#core = normalized.core;
    this.#runner = runner;
    this.#botController = normalized.botController;
    this.#playerParticipantId = normalized.playerParticipantId;
    this.#botParticipantId = normalized.botParticipantId;
    this.#publicMatchInfo = normalized.publicMatchInfo;
    this.#state = LOCAL_MATCH_SESSION_STATE.CREATED;
    this.#stepping = false;
    this.#runningUntilEnded = false;
    this.#cleaning = false;
    this.#pauseRequested = false;
    this.#botMatchReadBundle = normalized.botMatchReadBundle;
    this.#useTrustedCommandSourceInput = false;
    this.#coreDestroyed = false;
    this.#readingPresentationFrame = false;
    this.#activeStepMethod = null;
    try {
      if (normalized.botMatchReadBundle !== null) {
        if (
          normalized.botController.attachTrustedCommandSourceReader === undefined
          || normalized.botController.createInputFromTrustedCommandSource === undefined
        ) {
          throw new TypeError('LocalMatchSession V5 Bot 缺少成对 command source reader handshake。');
        }
        const resolved = resolveBotMatchReadBundle(
          normalized.botMatchReadBundle,
          normalized.core,
          normalized.playerParticipantId,
          normalized.botParticipantId,
        );
        const accepted = normalized.botController.attachTrustedCommandSourceReader(
          resolved.reader,
          resolved.handle,
        );
        if (!accepted) throw new Error('LocalMatchSession V5 Bot handshake 未被接受。');
        this.#useTrustedCommandSourceInput = true;
      }
    } catch (error) {
      const cleanupErrors: Error[] = [];
      // `core` and `botController` are supplied by the caller.  A failed
      // constructor never publishes a session, so it must not take ownership
      // of either resource or race the outer composition cleanup.  The runner
      // is the only resource created by this session and only disconnects its
      // references on destroy().
      destroyOwned(this.#runner, cleanupErrors);
      this.#runner = null;
      throw combineCleanupFailure(
        normalizeThrownError(error, 'LocalMatchSession trusted Bot handshake 失败'),
        cleanupErrors,
        'LocalMatchSession 构造失败且资源清理未完整完成。',
      );
    }
  }

  get state(): LocalMatchSessionState {
    return this.#state;
  }

  #assertUsable(): void {
    if (this.#state === LOCAL_MATCH_SESSION_STATE.DESTROYED) {
      throw new Error('LocalMatchSession 已销毁。');
    }
  }

  #assertOutsideRunLoop(action: string): void {
    if (this.#runningUntilEnded) {
      throw new Error(`LocalMatchSession.runLegacyUntilEndedForAudit() 运行期间不能${action}。`);
    }
  }

  #startInternal(): void {
    if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) {
      this.#state = this.#pauseRequested
        ? LOCAL_MATCH_SESSION_STATE.PAUSED
        : LOCAL_MATCH_SESSION_STATE.RUNNING;
      return;
    }
    if (
      this.#state !== LOCAL_MATCH_SESSION_STATE.RUNNING
      && this.#state !== LOCAL_MATCH_SESSION_STATE.PAUSED
    ) {
      throw new Error(`LocalMatchSession 无法从 ${this.#state} start。`);
    }
  }

  #hasEnded(): boolean {
    return this.#state === LOCAL_MATCH_SESSION_STATE.ENDED;
  }

  start(): void {
    this.#assertUsable();
    this.#assertOutsideRunLoop('调用 start()');
    this.#startInternal();
  }

  setPaused(paused: unknown): void {
    this.#assertUsable();
    this.#assertOutsideRunLoop('切换暂停状态');
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) {
      throw new Error(
        `LocalMatchSession ${this.#activeStepMethod ?? 'stepWithLegacySnapshotForAudit()'} 期间不能切换暂停状态。`,
      );
    }
    if (this.#state === LOCAL_MATCH_SESSION_STATE.ENDED) return;
    this.#pauseRequested = paused;
    if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) return;
    this.#state = paused
      ? LOCAL_MATCH_SESSION_STATE.PAUSED
      : LOCAL_MATCH_SESSION_STATE.RUNNING;
  }

  #requireCore(): MatchCore {
    this.#assertUsable();
    if (this.#core === null) throw new Error('LocalMatchSession Core 不可用。');
    return this.#core;
  }

  #normalizePlayerFrame(frame: unknown): ArenaInputFrame {
    const core = this.#requireCore();
    const candidate = frame ?? createNeutralInputFrame(core.tick, this.#playerParticipantId);
    const normalized = normalizeInputFrame(candidate, {
      expectedTick: core.tick,
      participantIds: core.config.participantIds,
    });
    if (normalized.participantId !== this.#playerParticipantId) {
      throw new RangeError('玩家输入不能控制隐藏对手。');
    }
    return normalized;
  }

  #requirePresentationBundle(): BotMatchReadBundleV2 {
    this.#assertUsable();
    if (!this.#useTrustedCommandSourceInput || this.#botMatchReadBundle === null) {
      throw new Error('LocalMatchSession V2 presentation frame 需要 botMatchReadBundle。');
    }
    return this.#botMatchReadBundle;
  }

  #readPresentationFrame(): DeepReadonly<MatchReadFrameV2> {
    const core = this.#requireCore();
    const bundle = this.#requirePresentationBundle();
    if (this.#readingPresentationFrame) {
      throw new Error('LocalMatchSession presentation frame 读取不可重入。');
    }
    this.#readingPresentationFrame = true;
    try {
      return readPresentationFrameForSession(
        bundle,
        core,
        this.#playerParticipantId,
        this.#botParticipantId,
      ) as DeepReadonly<MatchReadFrameV2>;
    } finally {
      this.#readingPresentationFrame = false;
    }
  }

  #createV5BotFrame(botController: BotInputController): ArenaInputFrame {
    const createInputFromTrustedCommandSource =
      botController.createInputFromTrustedCommandSource;
    if (createInputFromTrustedCommandSource === undefined) {
      throw new Error('LocalMatchSession V5 command-source reader 不可用。');
    }
    return createInputFromTrustedCommandSource();
  }

  #createLegacyBotFrame(
    core: MatchCore,
    botController: BotInputController,
  ): ArenaInputFrame {
    return botController.createInput(core.getLegacyFullSnapshotForAudit());
  }

  #stepInternal(playerFrame: unknown, runLoopOwned: boolean, projection: 'legacy'): LocalMatchLegacyAuditStepResult;
  #stepInternal(playerFrame: unknown, runLoopOwned: boolean, projection: 'presentation'): LocalMatchPresentationStepResultV2;
  #stepInternal(
    playerFrame: unknown,
    runLoopOwned: boolean,
    projection: 'legacy' | 'presentation',
  ): LocalMatchLegacyAuditStepResult | LocalMatchPresentationStepResultV2 {
    const stepMethod = projection === 'presentation'
      ? 'stepWithPresentationReadFrame()'
      : 'stepWithLegacySnapshotForAudit()';
    this.#assertUsable();
    if (!runLoopOwned) this.#assertOutsideRunLoop(`调用 ${stepMethod}`);
    const core = this.#requireCore();
    if (this.#state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
      if (projection === 'presentation') {
        return Object.freeze({ events: EMPTY_EVENTS, readFrame: this.#readPresentationFrame(), input: null });
      }
      return Object.freeze({
        events: EMPTY_EVENTS,
        snapshot: core.getLegacyFullSnapshotForAudit(),
        input: null,
      });
    }
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.RUNNING) {
      throw new Error(`LocalMatchSession 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error(`LocalMatchSession.${stepMethod} 不可重入。`);
    this.#stepping = true;
    this.#activeStepMethod = stepMethod;
    let retryableSourceFailure = false;
    try {
      const normalizedPlayer = this.#normalizePlayerFrame(playerFrame);
      try {
        const runner = this.#runner;
        const botController = this.#botController;
        if (runner === null || botController === null) {
          throw new Error('LocalMatchSession 内部资源不可用。');
        }
        let trustedTransaction: BotMatchReadTransaction | null = null;
        let trustedSourceCommitted = false;
        if (this.#useTrustedCommandSourceInput) {
          const bundle = this.#botMatchReadBundle;
          if (bundle === null) throw new Error('LocalMatchSession V5 bundle 不可用。');
          trustedTransaction = armBotMatchReadTransaction(
            bundle,
            core,
            this.#playerParticipantId,
            this.#botParticipantId,
          );
        }
        try {
          const botFrame = this.#useTrustedCommandSourceInput
            ? this.#createV5BotFrame(botController)
            : this.#createLegacyBotFrame(core, botController);
        const normalizedBot = this.#useTrustedCommandSourceInput
          ? normalizeInputFrame(botFrame, {
            expectedTick: core.tick,
            participantIds: core.config.participantIds,
          })
          : isNormalizedInputFrame(botFrame)
          ? botFrame
          : normalizeInputFrame(botFrame, {
            expectedTick: core.tick,
            participantIds: core.config.participantIds,
          });
        if (normalizedBot.participantId !== this.#botParticipantId) {
          throw new RangeError('BotController 返回了错误的参与者输入。');
        }
        if (trustedTransaction !== null) {
          trustedTransaction.completeSuccess();
          trustedSourceCommitted = true;
        }
        const orderedFrames = Object.freeze(core.config.participantIds.map((participantId) => {
          if (participantId === normalizedPlayer.participantId) return normalizedPlayer;
          if (participantId === normalizedBot.participantId) return normalizedBot;
          throw new RangeError(`participant ${participantId} 缺少当前 tick 输入。`);
        }));
        const batch = core.createTrustedInputFrameBatch(orderedFrames);
        const events = runner.stepTrustedInputFrameBatch(batch);
        if (projection === 'presentation') {
          const readFrame = this.#readPresentationFrame();
          if (readFrame.worldSnapshot.phase === ARENA_MATCH_PHASE.ENDED) {
            this.#state = LOCAL_MATCH_SESSION_STATE.ENDED;
          }
          return Object.freeze({ events, readFrame, input: normalizedPlayer });
        }
        const snapshot = core.getLegacyFullSnapshotForAudit();
        if (snapshot.phase === ARENA_MATCH_PHASE.ENDED) {
          this.#state = LOCAL_MATCH_SESSION_STATE.ENDED;
        }
        return Object.freeze({ events, snapshot, input: normalizedPlayer });
        } catch (error) {
          if (trustedTransaction !== null && !trustedSourceCommitted) {
            const classification = trustedTransaction.classifyFailure();
            if (classification.retryable) {
              retryableSourceFailure = true;
              throw error;
            }
          }
          throw error;
        }
      } catch (error) {
        if (retryableSourceFailure) throw error;
        const failure = normalizeThrownError(error, 'LocalMatchSession step 失败');
        const cleanupErrors = this.#cleanup();
        throw combineCleanupFailure(
          failure,
          cleanupErrors,
          'LocalMatchSession step 失败且清理未完整完成。',
        );
      }
    } finally {
      this.#stepping = false;
      this.#activeStepMethod = null;
    }
  }

  stepWithLegacySnapshotForAudit(playerFrame: unknown = null): LocalMatchLegacyAuditStepResult {
    return this.#stepInternal(playerFrame, false, 'legacy');
  }

  getPresentationReadFrame(): DeepReadonly<MatchReadFrameV2> {
    this.#assertUsable();
    this.#assertOutsideRunLoop('读取 presentation frame');
    if (this.#stepping) {
      throw new Error(
        `LocalMatchSession ${this.#activeStepMethod ?? 'stepWithPresentationReadFrame()'} 期间不能读取 presentation frame。`,
      );
    }
    return this.#readPresentationFrame();
  }

  /**
   * Reads the full-audit sidecars owned by the existing bundle. The Session
   * deliberately exposes no schedule or evidence schema; the runner owns
   * when this capability is requested.
   */
  readFullAuditForEvidence(): LocalMatchFullAuditReadResultV2 {
    this.#assertUsable();
    this.#assertOutsideRunLoop('读取 full-audit');
    if (this.#stepping) {
      throw new Error(
        `LocalMatchSession ${this.#activeStepMethod ?? 'stepWithPresentationReadFrame()'} 期间不能读取 full-audit。`,
      );
    }
    const core = this.#requireCore();
    const bundle = this.#requirePresentationBundle();
    if (this.#readingPresentationFrame) {
      throw new Error('LocalMatchSession full-audit 读取不可重入。');
    }
    this.#readingPresentationFrame = true;
    try {
      return readFullAuditForSession(
        bundle,
        core,
        this.#playerParticipantId,
        this.#botParticipantId,
      );
    } finally {
      this.#readingPresentationFrame = false;
    }
  }

  stepWithPresentationReadFrame(input?: ArenaInputFrame | null): LocalMatchPresentationStepResultV2;
  stepWithPresentationReadFrame(input: unknown = null): LocalMatchPresentationStepResultV2 {
    if (arguments.length > 1) throw new TypeError('stepWithPresentationReadFrame() 只接受一个 input 参数。');
    this.#requirePresentationBundle();
    return this.#stepInternal(input, false, 'presentation');
  }

  runLegacyUntilEndedForAudit(
    inputProvider?: LocalMatchInputProvider,
    options?: RunLocalMatchOptions,
  ): ArenaReplay;
  runLegacyUntilEndedForAudit(
    inputProvider: unknown = DEFAULT_INPUT_PROVIDER,
    options: unknown = undefined,
  ): ArenaReplay {
    this.#assertUsable();
    this.#assertOutsideRunLoop('再次调用 runLegacyUntilEndedForAudit()');
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    this.#runningUntilEnded = true;
    try {
      const configuredLimit = parseRunOptions(options);
      const core = this.#requireCore();
      const limit = configuredLimit ?? (
        core.config.preparingTicks + core.config.hardLimitTicks + 1
      );
      if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) this.#startInternal();
      if (this.#hasEnded()) return this.#exportReplayInternal();
      while (!this.#hasEnded() && core.tick < limit) {
        if (this.#state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
          throw new Error('暂停中的 LocalMatchSession 不能 runLegacyUntilEndedForAudit。');
        }
        const frame = (inputProvider as LocalMatchInputProvider)(
          core.getLegacyFullSnapshotForAudit(),
        );
        this.#stepInternal(frame ?? null, true, 'legacy');
      }
      if (!this.#hasEnded()) {
        throw new Error(`本地比赛在 ${limit} tick 内未结束。`);
      }
      return this.#exportReplayInternal();
    } finally {
      this.#runningUntilEnded = false;
    }
  }

  getLegacyFullSnapshotForAudit(): DeepReadonly<ArenaMatchSnapshot> {
    return this.#requireCore().getLegacyFullSnapshotForAudit();
  }


  getPublicMatchInfo(): LocalMatchPublicInfo {
    this.#assertUsable();
    return this.#publicMatchInfo;
  }

  #exportReplayInternal(): ArenaReplay {
    this.#assertUsable();
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.ENDED) {
      throw new Error('只能导出已结算的 LocalMatchSession。');
    }
    const runner = this.#runner;
    if (runner === null) throw new Error('LocalMatchSession Runner 不可用。');
    return runner.exportReplay();
  }

  exportReplay(): ArenaReplay {
    return this.#exportReplayInternal();
  }

  #cleanup(): Error[] {
    if (this.#cleaning) throw new Error('LocalMatchSession 清理期间不允许重入。');
    this.#cleaning = true;
    this.#state = LOCAL_MATCH_SESSION_STATE.DESTROYED;
    this.#pauseRequested = true;
    const errors: Error[] = [];
    try {
      let bundleInvalidated = this.#botMatchReadBundle === null;
      if (this.#botMatchReadBundle !== null && this.#core !== null) {
        try {
          invalidateBotMatchReadBundle(
            this.#botMatchReadBundle,
            this.#core,
            this.#playerParticipantId,
            this.#botParticipantId,
          );
          bundleInvalidated = true;
        } catch (error) {
          errors.push(normalizeThrownError(error, 'LocalMatchSession Bot match read bundle 失效失败'));
        }
        if (bundleInvalidated) {
          this.#botMatchReadBundle = null;
        }
      }
      if (destroyOwned(this.#runner, errors)) this.#runner = null;
      if (destroyOwned(this.#botController, errors)) this.#botController = null;
      if (!this.#coreDestroyed && destroyOwned(this.#core, errors)) {
        this.#coreDestroyed = true;
      }
      if (bundleInvalidated && this.#coreDestroyed) this.#core = null;
      return errors;
    } finally {
      this.#cleaning = false;
    }
  }

  destroy(): void {
    if (this.#cleaning) throw new Error('LocalMatchSession 清理期间不允许重入。');
    if (
      this.#state === LOCAL_MATCH_SESSION_STATE.DESTROYED
      && this.#runner === null
      && this.#botController === null
      && this.#core === null
      && this.#botMatchReadBundle === null
    ) return;
    this.#assertOutsideRunLoop('销毁 Session');
    if (this.#stepping) {
      throw new Error(
        `LocalMatchSession ${this.#activeStepMethod ?? 'stepWithLegacySnapshotForAudit()'} 期间不能销毁 LocalMatchSession。`,
      );
    }
    const errors = this.#cleanup();
    if (errors.length > 0) {
      const cleanupError = new Error('LocalMatchSession 清理未完整完成。') as Error & {
        causes?: Error[];
      };
      cleanupError.causes = errors;
      throw cleanupError;
    }
  }
}
