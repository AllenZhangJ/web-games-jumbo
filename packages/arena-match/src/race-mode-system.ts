import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
} from './match-config-v6.js';
import { ModeObjectivePolicyResolverV1 } from './mode-objective-policy-resolver-v1.js';
import { ModeTimelinePolicyResolverV1 } from './mode-timeline-policy-resolver-v1.js';
import {
  MODE_RUNTIME_LIFECYCLE_STATE_V1,
  type ModeRuntimeLifecycleStateV1,
  type ModeRuntimeTickResolutionV1,
  type RaceModeCommandV1,
  type RaceModeRankingV1,
  type RaceModeResultV1,
} from './mode-runtime-contracts-v1.js';

export { RACE_MODE_PREPARING_TICKS_V1, RACE_MODE_RESPAWN_DELAY_TICKS_V1 };

export interface RaceModeParticipantStateV1 {
  readonly participantId: string;
  readonly status: 'racing' | 'respawning' | 'finished';
  readonly safeAnchorId: string;
  readonly progressOrdinal: number;
  readonly respawnReadyTick: number | null;
  readonly finishTick: number | null;
  readonly rank: number | null;
}

export interface RaceModeStateSnapshotV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly revision: number;
  readonly finishGateId: string;
  readonly lastProcessedTick: number;
  readonly participants: readonly RaceModeParticipantStateV1[];
  readonly result: RaceModeResultV1 | null;
}

export interface RaceModeFixtureV1 {
  readonly schemaVersion: 1;
  readonly fixtureDefinitionId: string;
  readonly preparingTicks: typeof RACE_MODE_PREPARING_TICKS_V1;
  readonly respawnDelayTicks: typeof RACE_MODE_RESPAWN_DELAY_TICKS_V1;
  readonly respawnProtectionTicks: number;
  readonly hardLimitActiveTicks: number;
  readonly finishGateId: string;
  readonly safeAnchorIds: readonly string[];
  readonly fallbackSafeAnchorId: string;
  readonly initialSafeAnchors: readonly Readonly<{
    readonly participantId: string;
    readonly anchorId: string;
  }>[];
}

export interface RaceModeTickFactsV1 {
  readonly tick: number;
  readonly activeTick: number | null;
  readonly preparationRemainingTicks: number | null;
  readonly validSafeAnchorIds: readonly string[];
  readonly safeAnchorClaims: readonly Readonly<{
    readonly participantId: string;
    readonly anchorId: string;
    readonly progressOrdinal: number;
  }>[];
  readonly finishClaims: readonly Readonly<{
    readonly participantId: string;
    readonly finishGateId: string;
    readonly progressOrdinal: number;
  }>[];
  readonly participantFalls: readonly string[];
}

interface MutableRaceParticipant {
  readonly participantId: string;
  status: RaceModeParticipantStateV1['status'];
  safeAnchorId: string;
  progressOrdinal: number;
  respawnReadyTick: number | null;
  finishTick: number | null;
  rank: number | null;
}

const FIXTURE_KEYS = new Set([
  'schemaVersion', 'fixtureDefinitionId', 'preparingTicks', 'respawnDelayTicks',
  'respawnProtectionTicks', 'hardLimitActiveTicks', 'finishGateId', 'safeAnchorIds',
  'fallbackSafeAnchorId', 'initialSafeAnchors',
]);
const INITIAL_ANCHOR_KEYS = new Set(['participantId', 'anchorId']);
const FACT_KEYS = new Set([
  'tick', 'activeTick', 'preparationRemainingTicks', 'validSafeAnchorIds', 'safeAnchorClaims',
  'finishClaims', 'participantFalls',
]);
const SAFE_ANCHOR_KEYS = new Set(['participantId', 'anchorId', 'progressOrdinal']);
const FINISH_KEYS = new Set(['participantId', 'finishGateId', 'progressOrdinal']);
const RESTORE_STATE_KEYS = new Set([
  'kind', 'revision', 'lastProcessedTick', 'finishGateId', 'participants',
]);
const RESTORE_PARTICIPANT_KEYS = new Set([
  'participantId', 'status', 'safeAnchorId', 'progressOrdinal', 'respawnReadyTick',
  'finishTick', 'rank',
]);
const RESTORABLE_LIFECYCLES: ReadonlySet<unknown> = new Set(['active', 'paused']);

type RaceModeSystemOperationV1 =
  | 'fixture-content-hash-read'
  | 'lifecycle-read'
  | 'start'
  | 'checkpoint-restore'
  | 'pause'
  | 'resume'
  | 'snapshot-read'
  | 'step'
  | 'destroy';

export const RACE_MODE_SYSTEM_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicReadsRejectStepAndRestoreIntermediateState: true,
  checkpointRestoreValidatesCompleteCandidateBeforeCommit: true,
  stepCommitChecksStickyReentryFact: true,
  internalSnapshotAvoidsPublicReentry: true,
  revisionOverflowRejectedBeforeAuthorityCommit: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function sortedUniqueStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能重复。`);
  return Object.freeze(result.sort(compareText));
}

function integerAtLeastMinusOne(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < -1) {
    throw new RangeError(`${name}必须是大于等于-1的安全整数。`);
  }
  return value as number;
}

function nullableTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function cloneFixture(value: unknown, config: ArenaMatchConfigV6): RaceModeFixtureV1 {
  const source = cloneFrozenData(value, 'RaceModeSystem fixture');
  exactRecord(source, FIXTURE_KEYS, 'RaceModeSystem fixture');
  if (source.schemaVersion !== 1) throw new RangeError('Race fixture.schemaVersion 必须是 1。');
  const fixtureDefinitionId = assertNonEmptyString(
    source.fixtureDefinitionId,
    'Race fixture.fixtureDefinitionId',
  );
  if (!fixtureDefinitionId.includes('.test.')) {
    throw new RangeError(
      'Race hard-limit 仍只能来自显式 .test. fixture；重生保护由产品候选单独绑定。',
    );
  }
  if (source.preparingTicks !== RACE_MODE_PREPARING_TICKS_V1) {
    throw new RangeError(
      `Race preparingTicks 必须精确为 ${RACE_MODE_PREPARING_TICKS_V1}。`,
    );
  }
  if (source.respawnDelayTicks !== RACE_MODE_RESPAWN_DELAY_TICKS_V1) {
    throw new RangeError(
      `Race respawnDelayTicks 必须精确为 ${RACE_MODE_RESPAWN_DELAY_TICKS_V1}。`,
    );
  }
  const safeAnchorIds = sortedUniqueStrings(source.safeAnchorIds, 'Race fixture.safeAnchorIds');
  if (safeAnchorIds.length === 0) throw new RangeError('Race fixture 至少需要一个安全锚。');
  const fallbackSafeAnchorId = assertNonEmptyString(
    source.fallbackSafeAnchorId,
    'Race fixture.fallbackSafeAnchorId',
  );
  if (!safeAnchorIds.includes(fallbackSafeAnchorId)) {
    throw new RangeError('Race fixture.fallbackSafeAnchorId 未注册。');
  }
  if (!Array.isArray(source.initialSafeAnchors)) {
    throw new TypeError('Race fixture.initialSafeAnchors 必须是数组。');
  }
  const initialSafeAnchors = source.initialSafeAnchors.map((entry, index) => {
    const name = `Race fixture.initialSafeAnchors[${index}]`;
    exactRecord(entry, INITIAL_ANCHOR_KEYS, name);
    const participantId = assertNonEmptyString(entry.participantId, `${name}.participantId`);
    const anchorId = assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
    if (!safeAnchorIds.includes(anchorId)) throw new RangeError(`${name}.anchorId 未注册。`);
    return Object.freeze({ participantId, anchorId });
  }).sort((left, right) => compareText(left.participantId, right.participantId));
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  if (
    initialSafeAnchors.length !== participantIds.length
    || initialSafeAnchors.some((entry, index) => entry.participantId !== participantIds[index])
  ) throw new RangeError('Race fixture.initialSafeAnchors 必须与 participant 集合一一对应。');
  return Object.freeze({
    schemaVersion: 1,
    fixtureDefinitionId,
    preparingTicks: RACE_MODE_PREPARING_TICKS_V1,
    respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
    respawnProtectionTicks: assertIntegerAtLeast(
      source.respawnProtectionTicks, 0, 'Race fixture.respawnProtectionTicks',
    ),
    hardLimitActiveTicks: assertIntegerAtLeast(
      source.hardLimitActiveTicks, 1, 'Race fixture.hardLimitActiveTicks',
    ),
    finishGateId: assertNonEmptyString(source.finishGateId, 'Race fixture.finishGateId'),
    safeAnchorIds,
    fallbackSafeAnchorId,
    initialSafeAnchors: Object.freeze(initialSafeAnchors),
  });
}

function cloneParticipant(value: MutableRaceParticipant): MutableRaceParticipant {
  return { ...value };
}

function snapshotParticipant(value: MutableRaceParticipant): RaceModeParticipantStateV1 {
  return Object.freeze({ ...value });
}

function createRankings(
  participants: readonly MutableRaceParticipant[],
  finishers: ReadonlySet<string>,
): readonly RaceModeRankingV1[] {
  const finisherEntries = participants
    .filter(({ participantId }) => finishers.has(participantId))
    .sort((left, right) => compareText(left.participantId, right.participantId));
  const unfinished = participants
    .filter(({ participantId }) => !finishers.has(participantId))
    .sort((left, right) => (
      right.progressOrdinal - left.progressOrdinal
      || compareText(left.participantId, right.participantId)
    ));
  const rankings: RaceModeRankingV1[] = finisherEntries.map((participant) => Object.freeze({
    participantId: participant.participantId,
    rank: 1,
    finishTick: participant.finishTick,
    progressOrdinal: participant.progressOrdinal,
  }));
  let previousProgress: number | null = null;
  let rank = finisherEntries.length + 1;
  for (let index = 0; index < unfinished.length; index += 1) {
    const participant = unfinished[index]!;
    if (previousProgress !== null && participant.progressOrdinal !== previousProgress) {
      rank = finisherEntries.length + index + 1;
    }
    previousProgress = participant.progressOrdinal;
    rankings.push(Object.freeze({
      participantId: participant.participantId,
      rank,
      finishTick: participant.finishTick,
      progressOrdinal: participant.progressOrdinal,
    }));
  }
  return Object.freeze(rankings.sort((left, right) => compareText(
    left.participantId,
    right.participantId,
  )));
}

export class RaceModeSystem {
  readonly #config: ArenaMatchConfigV6;
  readonly #fixture: RaceModeFixtureV1;
  readonly #fixtureContentHash: string;
  readonly #objectivePolicyResolver: ModeObjectivePolicyResolverV1 | null;
  readonly #timelinePolicyResolver: ModeTimelinePolicyResolverV1 | null;
  readonly #hardLimitActiveTicks: number;
  readonly #participants: Map<string, MutableRaceParticipant>;
  #lifecycle: ModeRuntimeLifecycleStateV1 = MODE_RUNTIME_LIFECYCLE_STATE_V1.CREATED;
  #revision = 0;
  #lastProcessedTick = -1;
  #operation: RaceModeSystemOperationV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #result: RaceModeResultV1 | null = null;

  constructor(
    config: unknown,
    fixture: unknown,
    objectivePolicyBundle?: unknown,
    timelinePolicyBundle?: unknown,
  ) {
    this.#config = createArenaMatchConfigV6(config);
    if (this.#config.modeKind !== 'race') throw new RangeError('RaceModeSystem 只接受 Race config。');
    this.#fixture = cloneFixture(fixture, this.#config);
    this.#objectivePolicyResolver = objectivePolicyBundle === undefined
      ? null
      : new ModeObjectivePolicyResolverV1(this.#config, objectivePolicyBundle);
    this.#timelinePolicyResolver = timelinePolicyBundle === undefined
      ? null
      : new ModeTimelinePolicyResolverV1(this.#config, timelinePolicyBundle);
    const timeline = this.#timelinePolicyResolver?.assertRuntimeMirror({
      preparingTicks: this.#fixture.preparingTicks,
      hardLimitActiveTicks: this.#fixture.hardLimitActiveTicks,
      suddenDeathStartActiveTick: null,
    }) ?? null;
    this.#hardLimitActiveTicks = timeline?.hardLimitActiveTicks
      ?? this.#fixture.hardLimitActiveTicks;
    if (this.#timelinePolicyResolver !== null) {
      this.#fixtureContentHash = createDeterministicDataHash({
        fixture: this.#fixture,
        timelinePolicy: this.#timelinePolicyResolver.definitionBundle,
        objectivePolicy: this.#objectivePolicyResolver?.definitionBundle ?? null,
      }, 'RaceModeSystem normalized fixture, timeline and objective policy');
    } else if (this.#objectivePolicyResolver !== null) {
      this.#fixtureContentHash = createDeterministicDataHash({
        fixture: this.#fixture,
        objectivePolicy: this.#objectivePolicyResolver.definitionBundle,
      }, 'RaceModeSystem normalized fixture and objective policy');
    } else {
      this.#fixtureContentHash = createDeterministicDataHash(
        this.#fixture,
        'RaceModeSystem normalized fixture',
      );
    }
    this.#participants = new Map(this.#fixture.initialSafeAnchors.map((entry) => [
      entry.participantId,
      {
        participantId: entry.participantId,
        status: 'racing',
        safeAnchorId: entry.anchorId,
        progressOrdinal: 0,
        respawnReadyTick: null,
        finishTick: null,
        rank: null,
      },
    ] as const));
  }

  get fixtureContentHash(): string {
    return this.#runOperation('fixture-content-hash-read', () => this.#fixtureContentHash, {
      allowDestroyed: true,
      allowFailed: true,
    });
  }

  get lifecycle(): ModeRuntimeLifecycleStateV1 {
    return this.#runOperation('lifecycle-read', () => this.#lifecycle, {
      allowDestroyed: true,
      allowFailed: true,
    });
  }

  #recordReentry(requestedOperation: RaceModeSystemOperationV1): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `RaceModeSystem ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(sequence: number, operation: string, failClosed = false): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed && this.#lifecycle !== 'destroyed') {
      this.#lifecycle = MODE_RUNTIME_LIFECYCLE_STATE_V1.FAILED;
    }
    throw this.#reentryError ?? new Error(`RaceModeSystem ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: RaceModeSystemOperationV1,
    callback: () => T,
    options: Readonly<{
      allowDestroyed?: boolean;
      allowFailed?: boolean;
      failClosedOnReentry?: boolean;
    }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (!options.allowDestroyed && this.#lifecycle === 'destroyed') {
        throw new Error('RaceModeSystem 已销毁。');
      }
      if (!options.allowFailed && this.#lifecycle === 'failed') {
        throw new Error('RaceModeSystem 已失败关闭。');
      }
      try {
        const result = callback();
        this.#assertReentryFree(sequence, operation, options.failClosedOnReentry === true);
        return result;
      } catch (error) {
        if (
          options.failClosedOnReentry === true
          && this.#reentrySequence !== sequence
          && this.#lifecycle !== 'destroyed'
        ) this.#lifecycle = MODE_RUNTIME_LIFECYCLE_STATE_V1.FAILED;
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertAuthorityCommitReady(
    operation: RaceModeSystemOperationV1,
    failClosedOnReentry = false,
  ): void {
    if (this.#reentryError !== null) {
      if (failClosedOnReentry && this.#lifecycle !== 'destroyed') {
        this.#lifecycle = MODE_RUNTIME_LIFECYCLE_STATE_V1.FAILED;
      }
      throw this.#reentryError;
    }
    if (this.#operation !== operation) {
      throw new Error(`RaceModeSystem ${operation}缺少权威操作所有权。`);
    }
  }

  #createSnapshotInsideOperation(): RaceModeStateSnapshotV1 {
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: this.#revision,
      finishGateId: this.#fixture.finishGateId,
      lastProcessedTick: this.#lastProcessedTick,
      participants: Object.freeze([...this.#participants.values()]
        .sort((left, right) => compareText(left.participantId, right.participantId))
        .map(snapshotParticipant)),
      result: this.#result,
    });
  }

  start(): void {
    this.#runOperation('start', () => {
      if (this.#lifecycle !== 'created') throw new Error('RaceModeSystem 只能从 created 启动。');
      this.#assertAuthorityCommitReady('start', true);
      this.#lifecycle = 'active';
    }, { failClosedOnReentry: true });
  }

  restoreFromCheckpointState(value: unknown, lifecycleValue: unknown): void {
    this.#runOperation('checkpoint-restore', () => {
      if (this.#lifecycle !== 'created') {
        throw new Error('RaceModeSystem只能从created恢复。');
      }
      if (!RESTORABLE_LIFECYCLES.has(lifecycleValue)) {
        throw new RangeError('RaceModeSystem恢复生命周期必须是active/paused。');
      }
      const source = cloneFrozenData(value, 'RaceModeSystem checkpoint state');
      exactRecord(source, RESTORE_STATE_KEYS, 'RaceModeSystem checkpoint state');
      if (source.kind !== 'race' || source.finishGateId !== this.#fixture.finishGateId) {
        throw new RangeError('RaceModeSystem checkpoint kind/finishGate身份漂移。');
      }
      const revision = assertIntegerAtLeast(source.revision, 0, 'Race checkpoint revision');
      if (!Number.isSafeInteger(revision)) {
        throw new RangeError('Race checkpoint revision必须是安全整数。');
      }
      const lastProcessedTick = integerAtLeastMinusOne(
        source.lastProcessedTick,
        'Race checkpoint lastProcessedTick',
      );
      if (!Array.isArray(source.participants)) {
        throw new TypeError('Race checkpoint participants必须是数组。');
      }
      const expectedIds = this.#config.participantAssignments
        .map(({ participantId }) => participantId);
      const restored = source.participants.map((entry, index) => {
        const name = `Race checkpoint participants[${index}]`;
        exactRecord(entry, RESTORE_PARTICIPANT_KEYS, name);
        const participantId = assertNonEmptyString(entry.participantId, `${name}.participantId`);
        if (participantId !== expectedIds[index]) {
          throw new RangeError('Race checkpoint participant集合/顺序与config不一致。');
        }
        if (entry.status !== 'racing' && entry.status !== 'respawning') {
          throw new RangeError(`${name}.status在非终局恢复点无效。`);
        }
        const safeAnchorId = assertNonEmptyString(entry.safeAnchorId, `${name}.safeAnchorId`);
        if (!this.#fixture.safeAnchorIds.includes(safeAnchorId)) {
          throw new RangeError(`${name}.safeAnchorId未注册。`);
        }
        const respawnReadyTick = nullableTick(entry.respawnReadyTick, `${name}.respawnReadyTick`);
        if (
          entry.finishTick !== null
          || entry.rank !== null
          || (entry.status === 'racing' && respawnReadyTick !== null)
          || (entry.status === 'respawning'
            && (respawnReadyTick === null || respawnReadyTick <= lastProcessedTick))
        ) throw new RangeError(`${name}非终局status/tick/rank身份不闭合。`);
        return [participantId, {
          participantId,
          status: entry.status,
          safeAnchorId,
          progressOrdinal: assertIntegerAtLeast(
            entry.progressOrdinal,
            0,
            `${name}.progressOrdinal`,
          ),
          respawnReadyTick,
          finishTick: null,
          rank: null,
        }] as const;
      });
      if (restored.length !== expectedIds.length) {
        throw new RangeError('Race checkpoint participant数量与config不一致。');
      }
      this.#assertAuthorityCommitReady('checkpoint-restore', true);
      this.#participants.clear();
      for (const [participantId, participant] of restored) {
        this.#participants.set(participantId, participant);
      }
      this.#revision = revision;
      this.#lastProcessedTick = lastProcessedTick;
      this.#result = null;
      this.#lifecycle = lifecycleValue as 'active' | 'paused';
    }, { failClosedOnReentry: true });
  }

  pause(): void {
    this.#runOperation('pause', () => {
      if (this.#lifecycle !== 'active') throw new Error('RaceModeSystem 只能从 active 暂停。');
      this.#assertAuthorityCommitReady('pause', true);
      this.#lifecycle = 'paused';
    }, { failClosedOnReentry: true });
  }

  resume(): void {
    this.#runOperation('resume', () => {
      if (this.#lifecycle !== 'paused') throw new Error('RaceModeSystem 只能从 paused 恢复。');
      this.#assertAuthorityCommitReady('resume', true);
      this.#lifecycle = 'active';
    }, { failClosedOnReentry: true });
  }

  getSnapshot(): RaceModeStateSnapshotV1 {
    return this.#runOperation('snapshot-read', () => this.#createSnapshotInsideOperation());
  }

  step(value: unknown): ModeRuntimeTickResolutionV1<RaceModeStateSnapshotV1, RaceModeCommandV1> {
    return this.#runOperation('step', () => {
      if (this.#lifecycle !== 'active') {
        throw new Error('RaceModeSystem 只在 active 状态接受 step。');
      }
      const source = cloneFrozenData(value, 'RaceModeSystem facts');
      exactRecord(source, FACT_KEYS, 'RaceModeSystem facts');
      const tick = assertIntegerAtLeast(source.tick, 0, 'RaceModeSystem tick');
      if (tick !== this.#lastProcessedTick + 1) throw new RangeError('Race tick 必须从0严格递增1。');
      const preparing = tick < RACE_MODE_PREPARING_TICKS_V1;
      const expectedPreparation = tick <= RACE_MODE_PREPARING_TICKS_V1
        ? RACE_MODE_PREPARING_TICKS_V1 - tick
        : null;
      const activeTick = source.activeTick === null
        ? null
        : assertIntegerAtLeast(source.activeTick, 0, 'Race activeTick');
      if (
        source.preparationRemainingTicks !== expectedPreparation
        || activeTick !== (preparing ? null : tick - RACE_MODE_PREPARING_TICKS_V1)
      ) throw new RangeError('Race 60 tick preparation/active timeline identity 不一致。');
      const validSafeAnchorIds = sortedUniqueStrings(
        source.validSafeAnchorIds,
        'Race validSafeAnchorIds',
      );
      if (validSafeAnchorIds.some((anchorId) => !this.#fixture.safeAnchorIds.includes(anchorId))) {
        throw new RangeError('Race validSafeAnchorIds 包含未注册安全锚。');
      }
      const validSafeAnchors = new Set(validSafeAnchorIds);
      if (!Array.isArray(source.safeAnchorClaims) || !Array.isArray(source.finishClaims)) {
        throw new TypeError('Race safeAnchorClaims/finishClaims 必须是数组。');
      }
      const safeAnchorClaims = source.safeAnchorClaims.map((entry, index) => {
        const name = `Race safeAnchorClaims[${index}]`;
        exactRecord(entry, SAFE_ANCHOR_KEYS, name);
        const anchorId = assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
        if (!this.#fixture.safeAnchorIds.includes(anchorId)) throw new RangeError(`${name} 未注册。`);
        if (!validSafeAnchors.has(anchorId)) throw new RangeError(`${name} 当前不是合法安全锚。`);
        return Object.freeze({
          participantId: assertNonEmptyString(entry.participantId, `${name}.participantId`),
          anchorId,
          progressOrdinal: assertIntegerAtLeast(entry.progressOrdinal, 0, `${name}.progressOrdinal`),
        });
      }).sort((left, right) => compareText(left.participantId, right.participantId));
      const finishClaims = source.finishClaims.map((entry, index) => {
        const name = `Race finishClaims[${index}]`;
        exactRecord(entry, FINISH_KEYS, name);
        if (entry.finishGateId !== this.#fixture.finishGateId) {
          throw new RangeError(`${name}.finishGateId 不匹配。`);
        }
        return Object.freeze({
          participantId: assertNonEmptyString(entry.participantId, `${name}.participantId`),
          finishGateId: this.#fixture.finishGateId,
          progressOrdinal: assertIntegerAtLeast(entry.progressOrdinal, 0, `${name}.progressOrdinal`),
        });
      }).sort((left, right) => compareText(left.participantId, right.participantId));
      const participantFalls = sortedUniqueStrings(source.participantFalls, 'Race participantFalls');
      for (const values of [safeAnchorClaims, finishClaims]) {
        if (new Set(values.map(({ participantId }) => participantId)).size !== values.length) {
          throw new RangeError('Race 同类 fact 的 participantId 不能重复。');
        }
      }
      if (preparing && (safeAnchorClaims.length || finishClaims.length || participantFalls.length)) {
        throw new Error('Race preparation 期间不能提交比赛事实。');
      }

      const draft = new Map([...this.#participants].map(([id, participant]) => [
        id,
        cloneParticipant(participant),
      ] as const));
      const commands: RaceModeCommandV1[] = [];
      let changed = false;
      for (const claim of safeAnchorClaims) {
        const participant = draft.get(claim.participantId);
        if (!participant) throw new RangeError(`未知 Race participant ${claim.participantId}。`);
        if (participant.status !== 'racing') throw new Error('只有 racing participant 可提交安全锚。');
        if (claim.progressOrdinal < participant.progressOrdinal) {
          throw new RangeError('Race progressOrdinal 不能回退。');
        }
        if (
          claim.progressOrdinal === participant.progressOrdinal
          && claim.anchorId === participant.safeAnchorId
        ) continue;
        participant.progressOrdinal = claim.progressOrdinal;
        participant.safeAnchorId = claim.anchorId;
        commands.push(Object.freeze({ kind: 'commit-safe-anchor', ...claim }));
        changed = true;
      }
      for (const claim of finishClaims) {
        const participant = draft.get(claim.participantId);
        if (!participant) throw new RangeError(`未知 Race participant ${claim.participantId}。`);
        if (participant.status !== 'racing' || participant.finishTick !== null) {
          throw new Error(`Race participant ${claim.participantId} 重复或非法 finish claim。`);
        }
        if (claim.progressOrdinal < participant.progressOrdinal) {
          throw new RangeError('Race finish progressOrdinal 不能回退。');
        }
        participant.status = 'finished';
        participant.progressOrdinal = claim.progressOrdinal;
        participant.finishTick = tick;
        participant.respawnReadyTick = null;
        commands.push(Object.freeze({
          kind: 'record-finish-claim',
          participantId: claim.participantId,
          finishTick: tick,
          progressOrdinal: claim.progressOrdinal,
        }));
        changed = true;
      }

      const terminalByFinish = finishClaims.length > 0;
      const terminalByHardLimit = !preparing
        && activeTick !== null
        && activeTick >= this.#hardLimitActiveTicks;
      if (!terminalByFinish && !terminalByHardLimit) {
        const dueRespawns: MutableRaceParticipant[] = [];
        for (const participant of draft.values()) {
          if (
            participant.status === 'respawning'
            && participant.respawnReadyTick !== null
            && participant.respawnReadyTick <= tick
          ) dueRespawns.push(participant);
        }
        for (const participantId of participantFalls) {
          const participant = draft.get(participantId);
          if (!participant) throw new RangeError(`未知 Race participant ${participantId}。`);
          if (participant.status !== 'racing') throw new Error('只有 racing participant 可掉落。');
          const anchorId = validSafeAnchors.has(participant.safeAnchorId)
            ? participant.safeAnchorId
            : validSafeAnchors.has(this.#fixture.fallbackSafeAnchorId)
              ? this.#fixture.fallbackSafeAnchorId
              : null;
          if (anchorId === null) throw new Error('Race participant 缺少合法安全锚与公共兜底锚。');
          const readyTick = tick + RACE_MODE_RESPAWN_DELAY_TICKS_V1;
          if (!Number.isSafeInteger(readyTick)) throw new RangeError('Race readyTick 超出安全整数。');
          participant.status = 'respawning';
          participant.safeAnchorId = anchorId;
          participant.respawnReadyTick = readyTick;
          commands.push(Object.freeze({
            kind: 'schedule-respawn',
            participantId,
            readyTick,
            anchorId,
            protectionTicks: this.#fixture.respawnProtectionTicks,
          }));
          changed = true;
        }
        for (const participant of dueRespawns.sort((left, right) => compareText(
          left.participantId,
          right.participantId,
        ))) {
          if (participantFalls.includes(participant.participantId)) continue;
          const anchorId = validSafeAnchors.has(participant.safeAnchorId)
            ? participant.safeAnchorId
            : validSafeAnchors.has(this.#fixture.fallbackSafeAnchorId)
              ? this.#fixture.fallbackSafeAnchorId
              : null;
          if (anchorId === null) {
            throw new Error('Race respawn 时缺少合法安全锚与公共兜底锚。');
          }
          participant.status = 'racing';
          participant.safeAnchorId = anchorId;
          participant.respawnReadyTick = null;
          commands.push(Object.freeze({
            kind: 'respawn-participant',
            participantId: participant.participantId,
            anchorId,
            protectionTicks: this.#fixture.respawnProtectionTicks,
          }));
          changed = true;
        }
      }

      let result: RaceModeResultV1 | null = null;
      if (terminalByFinish || terminalByHardLimit) {
        const finishers = new Set(finishClaims.map(({ participantId }) => participantId));
        const rankings = createRankings([...draft.values()], finishers);
        for (const ranking of rankings) {
          const participant = draft.get(ranking.participantId);
          if (!participant) throw new Error('Race ranking participant 丢失。');
          participant.rank = ranking.rank;
        }
        const candidateResult: RaceModeResultV1 = Object.freeze({
          kind: 'race',
          winnerParticipantIds: Object.freeze([...finishers].sort(compareText)),
          rankings,
          reason: terminalByFinish ? 'finish-claimed' : 'no-finisher',
          endedAtTick: tick,
        });
        if (activeTick === null) throw new Error('Race终局缺少activeTick。');
        result = this.#objectivePolicyResolver === null
          ? candidateResult
          : this.#objectivePolicyResolver.assertTerminalObjective({
            kind: 'race',
            tick,
            activeTick,
            hardLimitActiveTicks: this.#hardLimitActiveTicks,
            finishClaimParticipantIds: Object.freeze([...finishers].sort(compareText)),
          }, candidateResult) as RaceModeResultV1;
        commands.push(Object.freeze({ kind: 'end-race', result }));
        changed = true;
      }
      const revision = this.#revision + (
        changed || source.preparationRemainingTicks !== null ? 1 : 0
      );
      if (!Number.isSafeInteger(revision)) {
        throw new RangeError('RaceModeSystem revision 超出安全整数。');
      }
      this.#assertAuthorityCommitReady('step', true);
      this.#participants.clear();
      for (const [id, participant] of draft) this.#participants.set(id, participant);
      this.#lastProcessedTick = tick;
      this.#revision = revision;
      if (result) {
        this.#result = result;
        this.#lifecycle = 'ended';
      }
      return Object.freeze({
        tick,
        commands: Object.freeze(commands),
        state: this.#createSnapshotInsideOperation(),
      });
    }, { failClosedOnReentry: true });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#lifecycle === 'destroyed') return;
      this.#assertAuthorityCommitReady('destroy', true);
      this.#participants.clear();
      this.#result = null;
      this.#lifecycle = 'destroyed';
    }, { allowDestroyed: true, allowFailed: true, failClosedOnReentry: true });
  }
}
