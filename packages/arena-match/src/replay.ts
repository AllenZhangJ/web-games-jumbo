import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createDeterministicDataHash,
  normalizeInputFrames,
  normalizeThrownError,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  type ArenaMatchConfigOverrides,
} from './match-config.js';
import {
  MatchCore,
  type ArenaAuthorityEvent,
} from './match-core.js';
import type { MatchTimelineResult } from './match-timeline-system.js';

export const ARENA_REPLAY_SCHEMA_VERSION = 5 as const;

export const ARENA_REPLAY_ERROR_CODE = Object.freeze({
  UNSUPPORTED_SCHEMA: 'arena.replay.unsupported-schema',
} as const);

export const HEADLESS_MATCH_RUNNER_DEFAULTS = Object.freeze({
  checkpointInterval: 60,
});

const REPLAY_KEYS: ReadonlySet<string> = new Set([
  'replaySchemaVersion',
  'schemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
  'matchSeed',
  'config',
  'inputFrames',
  'checkpoints',
  'events',
  'finalHash',
  'result',
]);
const CHECKPOINT_KEYS: ReadonlySet<string> = new Set(['tick', 'hash']);
const RESULT_KEYS: ReadonlySet<string> = new Set([
  'winnerId',
  'reason',
  'isDraw',
  'endedAtTick',
]);
const RUNNER_OPTION_KEYS: ReadonlySet<string> = new Set(['checkpointInterval']);
const RUN_OPTION_KEYS: ReadonlySet<string> = new Set(['maxTicks']);
const REPLAY_MATCH_OPTION_KEYS: ReadonlySet<string> = new Set(['coreFactory', 'beforeStep']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

export interface ArenaReplayCheckpoint {
  readonly tick: number;
  readonly hash: string;
}

export interface ArenaReplay {
  readonly replaySchemaVersion: typeof ARENA_REPLAY_SCHEMA_VERSION;
  readonly schemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly matchSeed: number;
  readonly config: DeepReadonly<ArenaMatchConfigOverrides>;
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly checkpoints: readonly ArenaReplayCheckpoint[];
  readonly events: readonly ArenaAuthorityEvent[];
  readonly finalHash: string;
  readonly result: MatchTimelineResult;
}

export interface HeadlessMatchRunnerOptions {
  readonly checkpointInterval?: number;
}

export interface HeadlessRunOptions {
  readonly maxTicks?: number | null;
}

export type HeadlessInputProvider = (
  snapshot: ArenaMatchSnapshot,
) => readonly unknown[] | null | undefined;

export interface ReplayCoreFactoryOptions {
  readonly seed: number;
  readonly config: DeepReadonly<ArenaMatchConfigOverrides>;
}

export type ReplayCoreFactory = (options: ReplayCoreFactoryOptions) => unknown;

export interface ReplayBeforeStepContext {
  readonly snapshot: DeepReadonly<ArenaMatchSnapshot>;
  readonly frames: readonly ArenaInputFrame[];
}

export type ReplayBeforeStep = (context: ReplayBeforeStepContext) => unknown;

export interface ReplayMatchOptions {
  readonly coreFactory?: ReplayCoreFactory;
  readonly beforeStep?: ReplayBeforeStep | null;
}

export interface ReplayMatchResult {
  readonly finalHash: string;
  readonly result: MatchTimelineResult;
  readonly events: readonly ArenaAuthorityEvent[];
}

export type ReplayMatch = (
  replay: unknown,
  options?: ReplayMatchOptions,
) => ReplayMatchResult;

interface ParsedReplayMatchOptions {
  readonly coreFactory: ReplayCoreFactory;
  readonly beforeStep: ReplayBeforeStep | null;
}

export class ArenaReplayCompatibilityError extends RangeError {
  readonly code = ARENA_REPLAY_ERROR_CODE.UNSUPPORTED_SCHEMA;
  readonly actualSchemaVersion: unknown;
  readonly expectedSchemaVersion = ARENA_REPLAY_SCHEMA_VERSION;

  constructor(actualSchemaVersion: unknown) {
    super(
      `不支持 replay schema ${String(actualSchemaVersion)}；`
      + `当前仅支持 ${ARENA_REPLAY_SCHEMA_VERSION}。`,
    );
    this.name = 'ArenaReplayCompatibilityError';
    this.actualSchemaVersion = actualSchemaVersion;
  }
}

const EMPTY_INPUT_FRAMES: readonly unknown[] = Object.freeze([]);
const EMPTY_INPUT_PROVIDER: HeadlessInputProvider = () => EMPTY_INPUT_FRAMES;

function copyInput(frame: ArenaInputFrame): ArenaInputFrame {
  return {
    tick: frame.tick,
    participantId: frame.participantId,
    moveX: frame.moveX,
    moveZ: frame.moveZ,
    primaryPressed: frame.primaryPressed,
    primaryHeld: frame.primaryHeld,
    jumpPressed: frame.jumpPressed,
    jumpHeld: frame.jumpHeld,
    slamPressed: frame.slamPressed,
  };
}

function copyEvent(event: ArenaAuthorityEvent): ArenaAuthorityEvent {
  const copy: unknown = JSON.parse(JSON.stringify(event));
  return copy as ArenaAuthorityEvent;
}

function assertPositiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value as number;
}

function assertHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

function matchEnded(core: MatchCore): boolean {
  return core.phase === ARENA_MATCH_PHASE.ENDED;
}

function optionValue(
  descriptors: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
): unknown {
  return descriptors[key]?.value;
}

function parseRunnerOptions(options: unknown): number {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, RUNNER_OPTION_KEYS, 'HeadlessMatchRunner options');
  const candidate = optionValue(Object.getOwnPropertyDescriptors(source), 'checkpointInterval');
  return assertPositiveInteger(
    candidate === undefined ? HEADLESS_MATCH_RUNNER_DEFAULTS.checkpointInterval : candidate,
    'checkpointInterval',
  );
}

function parseRunOptions(options: unknown): number | null {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, RUN_OPTION_KEYS, 'HeadlessMatchRunner run options');
  const candidate = optionValue(Object.getOwnPropertyDescriptors(source), 'maxTicks');
  if (candidate === undefined || candidate === null) return null;
  return assertPositiveInteger(candidate, 'maxTicks');
}

export class HeadlessMatchRunner {
  #core: MatchCore | null;
  readonly #checkpointInterval: number;
  readonly #inputFrames: ArenaInputFrame[];
  readonly #events: ArenaAuthorityEvent[];
  readonly #checkpoints: ArenaReplayCheckpoint[];
  #destroyed: boolean;

  constructor(core: MatchCore, options?: HeadlessMatchRunnerOptions);
  constructor(core: MatchCore, options: unknown = undefined) {
    if (!(core instanceof MatchCore)) throw new TypeError('HeadlessMatchRunner 需要 MatchCore。');
    const checkpointInterval = parseRunnerOptions(options);
    this.#core = core;
    this.#checkpointInterval = checkpointInterval;
    this.#inputFrames = [];
    this.#events = [];
    this.#checkpoints = [{ tick: core.tick, hash: core.getStateHash() }];
    this.#destroyed = false;
  }

  get core(): MatchCore | null {
    return this.#core;
  }

  get inputFrames(): ArenaInputFrame[] {
    return this.#inputFrames.map(copyInput);
  }

  get events(): ArenaAuthorityEvent[] {
    return this.#events.map(copyEvent);
  }

  get checkpoints(): ArenaReplayCheckpoint[] {
    return this.#checkpoints.map((checkpoint) => ({ ...checkpoint }));
  }

  #assertUsable(): void {
    if (this.#destroyed || this.#core === null) throw new Error('HeadlessMatchRunner 已销毁。');
  }

  #requireCore(): MatchCore {
    this.#assertUsable();
    if (this.#core === null) throw new Error('HeadlessMatchRunner Core 不可用。');
    return this.#core;
  }

  step(frames: unknown = []): readonly ArenaAuthorityEvent[] {
    const core = this.#requireCore();
    if (core.phase === ARENA_MATCH_PHASE.ENDED) {
      throw new Error('比赛已经结束，不能继续记录。');
    }
    const normalized = normalizeInputFrames(frames, {
      tick: core.tick,
      participantIds: core.config.participantIds,
    });
    const events = core.step(normalized);
    this.#inputFrames.push(...normalized.map(copyInput));
    this.#events.push(...events.map(copyEvent));
    if (
      core.tick % this.#checkpointInterval === 0
      || matchEnded(core)
    ) this.#checkpoints.push({ tick: core.tick, hash: core.getStateHash() });
    return events;
  }

  runUntilEnded(
    inputProvider?: HeadlessInputProvider,
    options?: HeadlessRunOptions,
  ): ArenaReplay;
  runUntilEnded(
    inputProvider: unknown = EMPTY_INPUT_PROVIDER,
    options: unknown = undefined,
  ): ArenaReplay {
    const core = this.#requireCore();
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    const configuredLimit = parseRunOptions(options);
    const limit = configuredLimit ?? (
      core.config.preparingTicks + core.config.hardLimitTicks + 1
    );
    while (!matchEnded(core) && core.tick < limit) {
      const frames = (inputProvider as HeadlessInputProvider)(core.getSnapshot());
      this.step(frames ?? EMPTY_INPUT_FRAMES);
    }
    if (!matchEnded(core)) {
      throw new Error(`比赛在 ${limit} tick 内未结束。`);
    }
    return this.exportReplay();
  }

  exportReplay(): ArenaReplay {
    const core = this.#requireCore();
    const result = core.result;
    if (core.phase !== ARENA_MATCH_PHASE.ENDED || result === null) {
      throw new Error('只能导出已经结算的完整比赛回放。');
    }
    const metadata = core.getReplayMetadata();
    return {
      replaySchemaVersion: ARENA_REPLAY_SCHEMA_VERSION,
      ...metadata,
      inputFrames: this.#inputFrames.map(copyInput),
      checkpoints: this.#checkpoints.map((checkpoint) => ({ ...checkpoint })),
      events: this.#events.map(copyEvent),
      finalHash: core.getStateHash(),
      result,
    };
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#inputFrames.length = 0;
    this.#events.length = 0;
    this.#checkpoints.length = 0;
    this.#core = null;
  }
}

function validateReplay(replay: unknown): ArenaReplay {
  const source = cloneFrozenData(replay, 'replay');
  assertKnownKeys(source, REPLAY_KEYS, 'replay');
  if (source.replaySchemaVersion !== ARENA_REPLAY_SCHEMA_VERSION) {
    throw new ArenaReplayCompatibilityError(source.replaySchemaVersion);
  }
  assertPositiveInteger(source.schemaVersion, 'replay.schemaVersion');
  assertNonEmptyString(source.physicsBackendVersion, 'replay.physicsBackendVersion');
  assertHash(source.configHash, 'replay.configHash');
  assertHash(source.ruleContentHash, 'replay.ruleContentHash');
  const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'replay.matchSeed');
  if (matchSeed > 0xffffffff) throw new RangeError('replay.matchSeed 必须是 uint32。');
  if (
    !Array.isArray(source.inputFrames)
    || !Array.isArray(source.checkpoints)
    || !Array.isArray(source.events)
  ) {
    throw new TypeError('replay 缺少 inputFrames、checkpoints 或 events。');
  }
  assertPlainRecord(source.config, 'replay.config');
  assertKnownKeys(source.result, RESULT_KEYS, 'replay.result');
  const winnerId = source.result.winnerId;
  if (winnerId !== null) assertNonEmptyString(winnerId, 'replay.result.winnerId');
  assertNonEmptyString(source.result.reason, 'replay.result.reason');
  if (typeof source.result.isDraw !== 'boolean') {
    throw new TypeError('replay.result.isDraw 必须是布尔值。');
  }
  assertIntegerAtLeast(source.result.endedAtTick, 0, 'replay.result.endedAtTick');
  assertHash(source.finalHash, 'replay.finalHash');

  let previousTick = -1;
  for (const checkpoint of source.checkpoints) {
    assertKnownKeys(checkpoint, CHECKPOINT_KEYS, 'replay checkpoint');
    const tick = assertIntegerAtLeast(checkpoint.tick, 0, 'replay checkpoint.tick');
    assertHash(checkpoint.hash, 'replay checkpoint.hash');
    if (tick <= previousTick) throw new RangeError('replay checkpoint tick 必须严格递增。');
    previousTick = tick;
  }
  const initialCheckpoint = source.checkpoints[0];
  if (initialCheckpoint === undefined || initialCheckpoint.tick !== 0) {
    throw new RangeError('replay 必须包含 tick 0 的初始 checkpoint。');
  }
  return source as unknown as ArenaReplay;
}

function findPropertyDescriptor(value: unknown, name: string): PropertyDescriptor | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  let target: object | null = value;
  while (target !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor !== undefined) return descriptor;
    target = Object.getPrototypeOf(target) as object | null;
  }
  return null;
}

function findDataMethod(value: unknown, name: string): ((...args: unknown[]) => unknown) | null {
  const descriptor = findPropertyDescriptor(value, name);
  return descriptor !== null
    && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    && typeof descriptor.value === 'function'
    ? descriptor.value as (...args: unknown[]) => unknown
    : null;
}

function adoptReplayCore(candidate: unknown): MatchCore {
  if (candidate instanceof MatchCore) return candidate;
  const cleanupErrors: Error[] = [];
  try {
    findDataMethod(candidate, 'destroy')?.call(candidate);
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'Replay Core factory 候选清理失败'));
  }
  throw combineCleanupFailure(
    new TypeError('coreFactory 必须返回 MatchCore。'),
    cleanupErrors,
    'Replay Core factory 合同无效且清理未完整完成。',
  );
}

function rejectThenable(verification: unknown): void {
  const descriptor = findPropertyDescriptor(verification, 'then');
  if (descriptor === null) return;
  if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError('replay beforeStep 必须同步完成。');
  }
  if (typeof descriptor.value !== 'function') return;
  try {
    descriptor.value.call(verification, undefined, () => undefined);
  } catch {
    // The synchronous contract rejects the thenable independently. Any
    // synchronous failure while attaching containment must not replace it.
  }
  throw new TypeError('replay beforeStep 必须同步完成。');
}

function runReplay(
  core: MatchCore,
  replay: ArenaReplay,
  beforeStep: ReplayBeforeStep | null,
): ReplayMatchResult {
  if (core.config.schemaVersion !== replay.schemaVersion) {
    throw new Error(
      `回放规则版本 ${replay.schemaVersion} 与当前 ${core.config.schemaVersion} 不一致。`,
    );
  }
  if (core.config.physicsBackendVersion !== replay.physicsBackendVersion) {
    throw new Error(
      `回放物理版本 ${replay.physicsBackendVersion} 与当前 ${core.config.physicsBackendVersion} 不一致。`,
    );
  }
  if (core.configHash !== replay.configHash) {
    throw new Error(`回放配置签名 ${replay.configHash} 与当前 ${core.configHash} 不一致。`);
  }
  if (core.ruleContentHash !== replay.ruleContentHash) {
    throw new Error(
      `回放规则内容签名 ${replay.ruleContentHash} 与当前 ${core.ruleContentHash} 不一致。`,
    );
  }

  const checkpointByTick = new Map<number, string>(replay.checkpoints.map((checkpoint) => [
    checkpoint.tick,
    checkpoint.hash,
  ]));
  const initialExpected = checkpointByTick.get(core.tick);
  if (initialExpected === undefined || core.getStateHash() !== initialExpected) {
    throw new Error('回放初始状态 hash 不一致。');
  }

  let inputIndex = 0;
  const replayedEvents: ArenaAuthorityEvent[] = [];
  while (inputIndex < replay.inputFrames.length) {
    const tick = core.tick;
    const frames: ArenaInputFrame[] = [];
    while (inputIndex < replay.inputFrames.length) {
      const frame = replay.inputFrames[inputIndex];
      if (frame === undefined || frame.tick !== tick) break;
      frames.push(frame);
      inputIndex += 1;
    }
    if (frames.length !== core.config.participantIds.length) {
      throw new Error(`回放输入在 tick ${tick} 不完整或不连续。`);
    }
    if (beforeStep !== null) {
      const verification = beforeStep(Object.freeze({
        snapshot: cloneFrozenData(core.getSnapshot(), 'replay beforeStep snapshot'),
        frames: Object.freeze(frames.map((frame) => Object.freeze(copyInput(frame)))),
      }));
      rejectThenable(verification);
    }
    replayedEvents.push(...core.step(frames));
    const expected = checkpointByTick.get(core.tick);
    if (expected !== undefined && core.getStateHash() !== expected) {
      const actual = core.getStateHash();
      throw new Error(`回放在 tick ${core.tick} 分叉：期望 ${expected}，实际 ${actual}。`);
    }
  }
  const result = core.result;
  if (core.phase !== ARENA_MATCH_PHASE.ENDED || result === null) {
    throw new Error('回放输入已耗尽，但比赛尚未结算。');
  }
  const finalCheckpoint = replay.checkpoints[replay.checkpoints.length - 1];
  if (finalCheckpoint === undefined || finalCheckpoint.tick !== core.tick) {
    throw new Error(
      `回放最终 checkpoint tick ${String(finalCheckpoint?.tick)} 与比赛 ${core.tick} 不一致。`,
    );
  }
  const finalHash = core.getStateHash();
  if (finalHash !== replay.finalHash) {
    throw new Error(`回放最终 hash 不一致：期望 ${replay.finalHash}，实际 ${finalHash}。`);
  }
  if (
    createDeterministicDataHash(replayedEvents, 'replayed events')
    !== createDeterministicDataHash(replay.events, 'recorded events')
  ) {
    throw new Error('回放事件序列不一致。');
  }
  if (
    createDeterministicDataHash(result, 'replayed result')
    !== createDeterministicDataHash(replay.result, 'recorded result')
  ) {
    throw new Error('回放结算结果不一致。');
  }
  return { finalHash, result, events: replayedEvents };
}

function parseReplayMatchOptions(
  options: unknown,
  defaultCoreFactory: ReplayCoreFactory,
): ParsedReplayMatchOptions {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, REPLAY_MATCH_OPTION_KEYS, 'ReplayMatch options');
  const descriptors = Object.getOwnPropertyDescriptors(source);
  const coreFactoryCandidate = optionValue(descriptors, 'coreFactory');
  const coreFactory = coreFactoryCandidate === undefined
    ? defaultCoreFactory
    : coreFactoryCandidate;
  if (typeof coreFactory !== 'function') throw new TypeError('coreFactory 必须是函数。');
  const beforeStepCandidate = optionValue(descriptors, 'beforeStep');
  const beforeStep = beforeStepCandidate === undefined ? null : beforeStepCandidate;
  if (beforeStep !== null && typeof beforeStep !== 'function') {
    throw new TypeError('beforeStep 必须是函数或 null。');
  }
  return {
    coreFactory: coreFactory as ReplayCoreFactory,
    beforeStep: beforeStep as ReplayBeforeStep | null,
  };
}

function executeReplay(
  replayValue: unknown,
  { coreFactory, beforeStep }: ParsedReplayMatchOptions,
): ReplayMatchResult {
  const replay = validateReplay(replayValue);
  const core = adoptReplayCore(coreFactory({ seed: replay.matchSeed, config: replay.config }));
  let result: ReplayMatchResult | null = null;
  let failure: Error | null = null;
  try {
    result = runReplay(core, replay, beforeStep);
  } catch (error) {
    failure = normalizeThrownError(error, 'Replay 验证失败');
  }
  const cleanupErrors: Error[] = [];
  try {
    core.destroy();
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'Replay Core 清理失败'));
  }
  if (failure !== null) {
    throw combineCleanupFailure(
      failure,
      cleanupErrors,
      'Replay 验证失败且 Core 清理未完整完成。',
    );
  }
  if (cleanupErrors[0] !== undefined) throw cleanupErrors[0];
  if (result === null) throw new Error('Replay 验证未产生结果。');
  return result;
}

export function createReplayMatch(defaultCoreFactory: ReplayCoreFactory): ReplayMatch {
  if (typeof defaultCoreFactory !== 'function') {
    throw new TypeError('defaultCoreFactory 必须是函数。');
  }
  return (replay: unknown, options: unknown = undefined): ReplayMatchResult => (
    executeReplay(replay, parseReplayMatchOptions(options, defaultCoreFactory))
  );
}
