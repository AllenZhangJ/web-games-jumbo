import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createNeutralInputFrame,
  normalizeInputFrame,
  normalizeThrownError,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
  MatchCore,
  type ArenaAuthorityEvent,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';

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
  destroy(): void;
}

export interface LocalMatchSessionOptions {
  readonly core: MatchCore;
  readonly botController: BotInputController;
  readonly playerParticipantId?: string;
  readonly botParticipantId?: string;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

export interface LocalMatchStepResult {
  readonly events: readonly ArenaAuthorityEvent[];
  readonly snapshot: DeepReadonly<ArenaMatchSnapshot>;
  readonly input: ArenaInputFrame | null;
}

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
}

interface NormalizedSessionOptions {
  readonly core: MatchCore;
  readonly botController: BotControllerPort;
  readonly playerParticipantId: string;
  readonly botParticipantId: string;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

const SESSION_OPTION_KEYS = new Set([
  'core',
  'botController',
  'playerParticipantId',
  'botParticipantId',
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

function normalizeController(controller: unknown): BotControllerPort {
  const createInput = methodFromPrototypeChain(controller, 'createInput');
  const destroy = methodFromPrototypeChain(controller, 'destroy');
  return Object.freeze({
    createInput: (snapshot: ArenaMatchSnapshot): ArenaInputFrame => (
      createInput.call(controller, snapshot) as ArenaInputFrame
    ),
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
  return Object.freeze({
    core,
    botController,
    playerParticipantId,
    botParticipantId,
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
      throw new Error(`LocalMatchSession.runUntilEnded() 运行期间不能${action}。`);
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
    if (this.#stepping) throw new Error('step() 期间不能切换 LocalMatchSession 暂停状态。');
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

  #stepInternal(playerFrame: unknown, runLoopOwned: boolean): LocalMatchStepResult {
    this.#assertUsable();
    if (!runLoopOwned) this.#assertOutsideRunLoop('调用 step()');
    const core = this.#requireCore();
    if (this.#state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
      return Object.freeze({ events: EMPTY_EVENTS, snapshot: core.getSnapshot(), input: null });
    }
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.RUNNING) {
      throw new Error(`LocalMatchSession 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error('LocalMatchSession.step() 不可重入。');
    this.#stepping = true;
    try {
      const normalizedPlayer = this.#normalizePlayerFrame(playerFrame);
      try {
        const runner = this.#runner;
        const botController = this.#botController;
        if (runner === null || botController === null) {
          throw new Error('LocalMatchSession 内部资源不可用。');
        }
        const snapshotBeforeStep = core.getSnapshot();
        const botFrame = botController.createInput(snapshotBeforeStep);
        if (botFrame.participantId !== this.#botParticipantId) {
          throw new RangeError('BotController 返回了错误的参与者输入。');
        }
        const events = runner.step([normalizedPlayer, botFrame]);
        const snapshot = core.getSnapshot();
        if (snapshot.phase === ARENA_MATCH_PHASE.ENDED) {
          this.#state = LOCAL_MATCH_SESSION_STATE.ENDED;
        }
        return Object.freeze({ events, snapshot, input: normalizedPlayer });
      } catch (error) {
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
    }
  }

  step(playerFrame: unknown = null): LocalMatchStepResult {
    return this.#stepInternal(playerFrame, false);
  }

  runUntilEnded(
    inputProvider?: LocalMatchInputProvider,
    options?: RunLocalMatchOptions,
  ): ArenaReplay;
  runUntilEnded(
    inputProvider: unknown = DEFAULT_INPUT_PROVIDER,
    options: unknown = undefined,
  ): ArenaReplay {
    this.#assertUsable();
    this.#assertOutsideRunLoop('再次调用 runUntilEnded()');
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
          throw new Error('暂停中的 LocalMatchSession 不能 runUntilEnded。');
        }
        const frame = (inputProvider as LocalMatchInputProvider)(core.getSnapshot());
        this.#stepInternal(frame ?? null, true);
      }
      if (!this.#hasEnded()) {
        throw new Error(`本地比赛在 ${limit} tick 内未结束。`);
      }
      return this.#exportReplayInternal();
    } finally {
      this.#runningUntilEnded = false;
    }
  }

  getSnapshot(): DeepReadonly<ArenaMatchSnapshot> {
    return this.#requireCore().getSnapshot();
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
      if (destroyOwned(this.#runner, errors)) this.#runner = null;
      if (destroyOwned(this.#botController, errors)) this.#botController = null;
      if (destroyOwned(this.#core, errors)) this.#core = null;
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
    ) return;
    this.#assertOutsideRunLoop('销毁 Session');
    if (this.#stepping) throw new Error('step() 期间不能销毁 LocalMatchSession。');
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
