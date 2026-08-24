import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
} from './match-config-v6.js';
import { ModeObjectivePolicyResolverV1 } from './mode-objective-policy-resolver-v1.js';
import { ModeTimelinePolicyResolverV1 } from './mode-timeline-policy-resolver-v1.js';
import {
  MODE_RUNTIME_LIFECYCLE_STATE_V1,
  type ModeRuntimeLifecycleStateV1,
  type ModeRuntimeTickResolutionV1,
  type SurvivalModeCommandV1,
  type SurvivalModeResultV1,
} from './mode-runtime-contracts-v1.js';

export const SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1 = 2 as const;

export interface SurvivalModeEnemySlotStateV1 {
  readonly slotId: string;
  readonly participantId: string;
  readonly active: boolean;
  readonly generation: number;
  readonly anchorId: string | null;
  readonly reactivationReadyTick: number | null;
}

export interface SurvivalModeStateSnapshotV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly revision: number;
  readonly lastProcessedTick: number;
  readonly playerParticipantId: string;
  readonly playerStatus: 'active' | 'respawning' | 'ended';
  readonly playerRespawnReadyTick: number | null;
  readonly fallCount: number;
  readonly terminalFallCount: 2;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly enemySlots: readonly SurvivalModeEnemySlotStateV1[];
  readonly result: SurvivalModeResultV1 | null;
}

export interface SurvivalModeFixtureV1 {
  readonly schemaVersion: 1;
  readonly fixtureDefinitionId: string;
  readonly terminalPlayerFallCount: 2;
  readonly playerRespawnDelayTicks: number;
  readonly playerRespawnProtectionTicks: number;
  readonly playerRespawnAnchorId: string;
  readonly hardLimitActiveTicks: number;
  readonly pressurePolicyDefinitionId: string;
  readonly tierPolicyDefinitionId: string;
  readonly slotActivationOrder: readonly string[];
  readonly slotEntries: readonly Readonly<{
    readonly slotId: string;
    readonly participantId: string;
    readonly anchorId: string;
  }>[];
  readonly pressureStages: readonly Readonly<{
    readonly stage: number;
    readonly startActiveTick: number;
    readonly desiredActiveEnemySlots: number;
    readonly reactivationDelayTicks: number;
  }>[];
  readonly equipmentTiers: readonly Readonly<{
    readonly minimumWaveIndex: number;
    readonly survivalLevel: number;
    readonly variants: readonly Readonly<{
      readonly collectionEquipmentDefinitionId: string;
      readonly runtimeEquipmentDefinitionId: string;
    }>[];
  }>[];
}

export interface SurvivalModeTickFactsV1 {
  readonly tick: number;
  readonly activeTick: number;
  readonly playerFell: boolean;
  readonly enemyFalls: readonly string[];
}

export interface SurvivalModeEquipmentTierResolutionV1 {
  readonly tierPolicyDefinitionId: string;
  readonly waveIndex: number;
  readonly survivalLevel: number;
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
}

interface MutableEnemySlot {
  readonly slotId: string;
  readonly participantId: string;
  readonly configuredAnchorId: string;
  active: boolean;
  generation: number;
  anchorId: string | null;
  reactivationReadyTick: number | null;
}

const FIXTURE_KEYS = new Set([
  'schemaVersion',
  'fixtureDefinitionId',
  'terminalPlayerFallCount',
  'playerRespawnDelayTicks',
  'playerRespawnProtectionTicks',
  'playerRespawnAnchorId',
  'hardLimitActiveTicks',
  'pressurePolicyDefinitionId',
  'tierPolicyDefinitionId',
  'slotActivationOrder',
  'slotEntries',
  'pressureStages',
  'equipmentTiers',
]);
const SLOT_ENTRY_KEYS = new Set(['slotId', 'participantId', 'anchorId']);
const PRESSURE_STAGE_KEYS = new Set([
  'stage',
  'startActiveTick',
  'desiredActiveEnemySlots',
  'reactivationDelayTicks',
]);
const EQUIPMENT_TIER_KEYS = new Set(['minimumWaveIndex', 'survivalLevel', 'variants']);
const EQUIPMENT_VARIANT_KEYS = new Set([
  'collectionEquipmentDefinitionId',
  'runtimeEquipmentDefinitionId',
]);
const FACT_KEYS = new Set(['tick', 'activeTick', 'playerFell', 'enemyFalls']);
const TIER_QUERY_KEYS = new Set(['waveIndex', 'collectionEquipmentDefinitionId']);
const RESTORE_STATE_KEYS = new Set([
  'kind', 'revision', 'lastProcessedTick', 'playerParticipantId', 'playerStatus',
  'playerRespawnReadyTick', 'fallCount', 'terminalFallCount', 'survivedTicks',
  'pressureStage', 'enemySlots',
]);
const RESTORE_SLOT_KEYS = new Set([
  'slotId', 'participantId', 'active', 'generation', 'anchorId', 'reactivationReadyTick',
]);
const RESTORABLE_LIFECYCLES: ReadonlySet<unknown> = new Set(['active', 'paused']);

type SurvivalModeSystemOperationV1 =
  | 'fixture-content-hash-read'
  | 'lifecycle-read'
  | 'start'
  | 'checkpoint-restore'
  | 'pause'
  | 'resume'
  | 'snapshot-read'
  | 'equipment-tier-resolve'
  | 'step'
  | 'destroy';

export const SURVIVAL_MODE_SYSTEM_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicReadsRejectTickAndRestoreIntermediateState: true,
  checkpointRestoreValidatesCompleteCandidateBeforeCommit: true,
  tickCommitChecksStickyReentryFact: true,
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

function fixtureId(value: unknown, name: string): string {
  const id = assertNonEmptyString(value, name);
  if (!id.includes('.test.')) throw new RangeError(`${name} 必须是显式 .test. fixture identity。`);
  return id;
}

function sortedUniqueStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能重复。`);
  return Object.freeze(result.sort(compareText));
}

function uniqueStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能重复。`);
  return Object.freeze(result);
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

function cloneFixture(value: unknown, config: ArenaMatchConfigV6): SurvivalModeFixtureV1 {
  const source = cloneFrozenData(value, 'SurvivalModeSystem fixture');
  exactRecord(source, FIXTURE_KEYS, 'SurvivalModeSystem fixture');
  if (source.schemaVersion !== 1) throw new RangeError('Survival fixture.schemaVersion 必须是 1。');
  if (source.terminalPlayerFallCount !== SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1) {
    throw new RangeError('Survival terminalPlayerFallCount 必须精确为 2。');
  }
  const enemyAssignments = config.participantAssignments.filter(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY,
  );
  const enemySlotIds = enemyAssignments.map(({ slotId }) => {
    if (slotId === null) throw new Error('Survival enemy assignment 缺少 slotId。');
    return slotId;
  }).sort(compareText);
  const slotActivationOrder = uniqueStrings(
    source.slotActivationOrder,
    'Survival fixture.slotActivationOrder',
  );
  if (
    slotActivationOrder.length !== enemySlotIds.length
    || [...slotActivationOrder].sort(compareText).some(
      (slotId, index) => slotId !== enemySlotIds[index],
    )
  ) throw new RangeError('Survival slotActivationOrder 必须精确覆盖 config enemy slots。');
  if (!Array.isArray(source.slotEntries)) throw new TypeError('Survival slotEntries 必须是数组。');
  const slotEntries = source.slotEntries.map((entry, index) => {
    const name = `Survival fixture.slotEntries[${index}]`;
    exactRecord(entry, SLOT_ENTRY_KEYS, name);
    return Object.freeze({
      slotId: assertNonEmptyString(entry.slotId, `${name}.slotId`),
      participantId: assertNonEmptyString(entry.participantId, `${name}.participantId`),
      anchorId: assertNonEmptyString(entry.anchorId, `${name}.anchorId`),
    });
  }).sort((left, right) => compareText(left.slotId, right.slotId));
  if (
    slotEntries.length !== enemyAssignments.length
    || slotEntries.some((entry, index) => (
      entry.slotId !== enemySlotIds[index]
      || entry.participantId !== enemyAssignments.find(({ slotId }) => slotId === entry.slotId)
        ?.participantId
    ))
  ) throw new RangeError('Survival slotEntries 必须与 config enemy slot/participant 双向闭合。');
  if (!Array.isArray(source.pressureStages) || source.pressureStages.length === 0) {
    throw new RangeError('Survival pressureStages 必须是显式非空 fixture。');
  }
  const pressureStages = source.pressureStages.map((entry, index) => {
    const name = `Survival fixture.pressureStages[${index}]`;
    exactRecord(entry, PRESSURE_STAGE_KEYS, name);
    const stage = assertIntegerAtLeast(entry.stage, 0, `${name}.stage`);
    const startActiveTick = assertIntegerAtLeast(
      entry.startActiveTick,
      0,
      `${name}.startActiveTick`,
    );
    const desiredActiveEnemySlots = assertIntegerAtLeast(
      entry.desiredActiveEnemySlots,
      0,
      `${name}.desiredActiveEnemySlots`,
    );
    if (desiredActiveEnemySlots > enemyAssignments.length) {
      throw new RangeError(`${name}.desiredActiveEnemySlots 超出 enemy slot 上限。`);
    }
    return Object.freeze({
      stage,
      startActiveTick,
      desiredActiveEnemySlots,
      reactivationDelayTicks: assertIntegerAtLeast(
        entry.reactivationDelayTicks,
        0,
        `${name}.reactivationDelayTicks`,
      ),
    });
  }).sort((left, right) => left.startActiveTick - right.startActiveTick);
  if (pressureStages[0]?.stage !== 0 || pressureStages[0]?.startActiveTick !== 0) {
    throw new RangeError('Survival pressureStages 必须从 stage=0/activeTick=0 开始。');
  }
  for (let index = 1; index < pressureStages.length; index += 1) {
    const previous = pressureStages[index - 1]!;
    const current = pressureStages[index]!;
    if (
      current.stage !== previous.stage + 1
      || current.startActiveTick <= previous.startActiveTick
      || current.desiredActiveEnemySlots < previous.desiredActiveEnemySlots
    ) throw new RangeError('Survival pressureStages 必须 stage 连续、tick 递增且强度不回退。');
  }
  if (!Array.isArray(source.equipmentTiers) || source.equipmentTiers.length === 0) {
    throw new RangeError('Survival equipmentTiers 必须是显式非空 fixture。');
  }
  const equipmentTiers = source.equipmentTiers.map((entry, index) => {
    const name = `Survival fixture.equipmentTiers[${index}]`;
    exactRecord(entry, EQUIPMENT_TIER_KEYS, name);
    if (!Array.isArray(entry.variants) || entry.variants.length === 0) {
      throw new RangeError(`${name}.variants 必须是非空数组。`);
    }
    const variants = entry.variants.map((variant, variantIndex) => {
      const variantName = `${name}.variants[${variantIndex}]`;
      exactRecord(variant, EQUIPMENT_VARIANT_KEYS, variantName);
      return Object.freeze({
        collectionEquipmentDefinitionId: assertNonEmptyString(
          variant.collectionEquipmentDefinitionId,
          `${variantName}.collectionEquipmentDefinitionId`,
        ),
        runtimeEquipmentDefinitionId: assertNonEmptyString(
          variant.runtimeEquipmentDefinitionId,
          `${variantName}.runtimeEquipmentDefinitionId`,
        ),
      });
    }).sort((left, right) => compareText(
      left.collectionEquipmentDefinitionId,
      right.collectionEquipmentDefinitionId,
    ));
    if (
      new Set(variants.map(({ collectionEquipmentDefinitionId }) => (
        collectionEquipmentDefinitionId
      ))).size !== variants.length
    ) throw new RangeError(`${name}.variants collection identity 不能重复。`);
    return Object.freeze({
      minimumWaveIndex: assertIntegerAtLeast(
        entry.minimumWaveIndex,
        0,
        `${name}.minimumWaveIndex`,
      ),
      survivalLevel: assertIntegerAtLeast(entry.survivalLevel, 1, `${name}.survivalLevel`),
      variants: Object.freeze(variants),
    });
  }).sort((left, right) => left.minimumWaveIndex - right.minimumWaveIndex);
  if (equipmentTiers[0]?.minimumWaveIndex !== 0) {
    throw new RangeError('Survival equipmentTiers 必须从 waveIndex=0 开始。');
  }
  for (let index = 1; index < equipmentTiers.length; index += 1) {
    if (equipmentTiers[index]!.minimumWaveIndex <= equipmentTiers[index - 1]!.minimumWaveIndex) {
      throw new RangeError('Survival equipmentTiers.minimumWaveIndex 必须严格递增。');
    }
  }
  const runtimeByCollectionAndLevel = new Map<string, string>();
  const levelsByRuntimeAndCollection = new Map<string, number>();
  for (const tier of equipmentTiers) {
    for (const variant of tier.variants) {
      const collectionAndLevel = `${variant.collectionEquipmentDefinitionId}\0${tier.survivalLevel}`;
      const existingRuntime = runtimeByCollectionAndLevel.get(collectionAndLevel);
      if (existingRuntime !== undefined && existingRuntime !== variant.runtimeEquipmentDefinitionId) {
        throw new RangeError('Survival 同一 collection/level 不能映射多个 runtime Definition。');
      }
      runtimeByCollectionAndLevel.set(collectionAndLevel, variant.runtimeEquipmentDefinitionId);
      const runtimeAndCollection = `${variant.collectionEquipmentDefinitionId}\0${variant.runtimeEquipmentDefinitionId}`;
      const existingLevel = levelsByRuntimeAndCollection.get(runtimeAndCollection);
      if (existingLevel !== undefined && existingLevel !== tier.survivalLevel) {
        throw new RangeError('Survival 不同 level 不能复用同一 runtime Equipment Definition。');
      }
      levelsByRuntimeAndCollection.set(runtimeAndCollection, tier.survivalLevel);
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    fixtureDefinitionId: fixtureId(
      source.fixtureDefinitionId,
      'Survival fixture.fixtureDefinitionId',
    ),
    terminalPlayerFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
    playerRespawnDelayTicks: assertIntegerAtLeast(
      source.playerRespawnDelayTicks,
      0,
      'Survival fixture.playerRespawnDelayTicks',
    ),
    playerRespawnProtectionTicks: assertIntegerAtLeast(
      source.playerRespawnProtectionTicks,
      0,
      'Survival fixture.playerRespawnProtectionTicks',
    ),
    playerRespawnAnchorId: assertNonEmptyString(
      source.playerRespawnAnchorId,
      'Survival fixture.playerRespawnAnchorId',
    ),
    hardLimitActiveTicks: assertIntegerAtLeast(
      source.hardLimitActiveTicks,
      1,
      'Survival fixture.hardLimitActiveTicks',
    ),
    pressurePolicyDefinitionId: fixtureId(
      source.pressurePolicyDefinitionId,
      'Survival fixture.pressurePolicyDefinitionId',
    ),
    tierPolicyDefinitionId: fixtureId(
      source.tierPolicyDefinitionId,
      'Survival fixture.tierPolicyDefinitionId',
    ),
    slotActivationOrder,
    slotEntries: Object.freeze(slotEntries),
    pressureStages: Object.freeze(pressureStages),
    equipmentTiers: Object.freeze(equipmentTiers),
  });
}

function snapshotSlot(value: MutableEnemySlot): SurvivalModeEnemySlotStateV1 {
  return Object.freeze({
    slotId: value.slotId,
    participantId: value.participantId,
    active: value.active,
    generation: value.generation,
    anchorId: value.anchorId,
    reactivationReadyTick: value.reactivationReadyTick,
  });
}

export class SurvivalModeSystem {
  readonly #config: ArenaMatchConfigV6;
  readonly #fixture: SurvivalModeFixtureV1;
  readonly #fixtureContentHash: string;
  readonly #objectivePolicyResolver: ModeObjectivePolicyResolverV1 | null;
  readonly #timelinePolicyResolver: ModeTimelinePolicyResolverV1 | null;
  readonly #hardLimitActiveTicks: number;
  readonly #playerParticipantId: string;
  readonly #slots: Map<string, MutableEnemySlot>;
  #lifecycle: ModeRuntimeLifecycleStateV1 = MODE_RUNTIME_LIFECYCLE_STATE_V1.CREATED;
  #operation: SurvivalModeSystemOperationV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #revision = 0;
  #lastProcessedTick = -1;
  #playerStatus: SurvivalModeStateSnapshotV1['playerStatus'] = 'active';
  #playerRespawnReadyTick: number | null = null;
  #fallCount = 0;
  #survivedTicks = 0;
  #pressureStage = 0;
  #result: SurvivalModeResultV1 | null = null;

  constructor(
    config: unknown,
    fixture: unknown,
    objectivePolicyBundle?: unknown,
    timelinePolicyBundle?: unknown,
  ) {
    this.#config = createArenaMatchConfigV6(config);
    if (this.#config.modeKind !== 'survival') {
      throw new RangeError('SurvivalModeSystem 只接受 Survival config。');
    }
    this.#fixture = cloneFixture(fixture, this.#config);
    this.#objectivePolicyResolver = objectivePolicyBundle === undefined
      ? null
      : new ModeObjectivePolicyResolverV1(this.#config, objectivePolicyBundle);
    this.#timelinePolicyResolver = timelinePolicyBundle === undefined
      ? null
      : new ModeTimelinePolicyResolverV1(this.#config, timelinePolicyBundle);
    const timeline = this.#timelinePolicyResolver?.assertRuntimeMirror({
      preparingTicks: 0,
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
      }, 'SurvivalModeSystem normalized fixture, timeline and objective policy');
    } else if (this.#objectivePolicyResolver !== null) {
      this.#fixtureContentHash = createDeterministicDataHash({
        fixture: this.#fixture,
        objectivePolicy: this.#objectivePolicyResolver.definitionBundle,
      }, 'SurvivalModeSystem normalized fixture and objective policy');
    } else {
      this.#fixtureContentHash = createDeterministicDataHash(
        this.#fixture,
        'SurvivalModeSystem normalized fixture',
      );
    }
    const player = this.#config.participantAssignments.find(
      ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER,
    );
    if (!player) throw new Error('Survival config 缺少 player。');
    this.#playerParticipantId = player.participantId;
    const assignmentsBySlot = new Map(this.#config.participantAssignments.flatMap((assignment) => (
      assignment.slotId === null ? [] : [[assignment.slotId, assignment] as const]
    )));
    this.#slots = new Map(this.#fixture.slotEntries.map((entry) => {
      const assignment = assignmentsBySlot.get(entry.slotId);
      if (!assignment) throw new Error(`Survival slot ${entry.slotId} 缺少 assignment。`);
      return [entry.slotId, {
        slotId: entry.slotId,
        participantId: entry.participantId,
        configuredAnchorId: entry.anchorId,
        active: false,
        generation: assignment.slotGeneration,
        anchorId: null,
        reactivationReadyTick: null,
      }] as const;
    }));
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

  #recordReentry(requestedOperation: SurvivalModeSystemOperationV1): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `SurvivalModeSystem ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(sequence: number, operation: string, failClosed = false): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed && this.#lifecycle !== 'destroyed') {
      this.#lifecycle = MODE_RUNTIME_LIFECYCLE_STATE_V1.FAILED;
    }
    throw this.#reentryError ?? new Error(`SurvivalModeSystem ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: SurvivalModeSystemOperationV1,
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
        throw new Error('SurvivalModeSystem 已销毁。');
      }
      if (!options.allowFailed && this.#lifecycle === 'failed') {
        throw new Error('SurvivalModeSystem 已失败关闭。');
      }
      try {
        const result = callback();
        this.#assertReentryFree(
          sequence,
          operation,
          options.failClosedOnReentry === true,
        );
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
    operation: SurvivalModeSystemOperationV1,
    failClosedOnReentry = false,
  ): void {
    if (this.#reentryError !== null) {
      if (failClosedOnReentry && this.#lifecycle !== 'destroyed') {
        this.#lifecycle = MODE_RUNTIME_LIFECYCLE_STATE_V1.FAILED;
      }
      throw this.#reentryError;
    }
    if (this.#operation !== operation) {
      throw new Error(`SurvivalModeSystem ${operation}缺少权威操作所有权。`);
    }
  }

  #createSnapshotInsideOperation(): SurvivalModeStateSnapshotV1 {
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: this.#revision,
      lastProcessedTick: this.#lastProcessedTick,
      playerParticipantId: this.#playerParticipantId,
      playerStatus: this.#playerStatus,
      playerRespawnReadyTick: this.#playerRespawnReadyTick,
      fallCount: this.#fallCount,
      terminalFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
      survivedTicks: this.#survivedTicks,
      pressureStage: this.#pressureStage,
      enemySlots: Object.freeze([...this.#slots.values()]
        .sort((left, right) => compareText(left.slotId, right.slotId))
        .map(snapshotSlot)),
      result: this.#result,
    });
  }

  start(): void {
    this.#runOperation('start', () => {
      if (this.#lifecycle !== 'created') throw new Error('SurvivalModeSystem 只能从 created 启动。');
      this.#assertAuthorityCommitReady('start', true);
      this.#lifecycle = 'active';
    }, { failClosedOnReentry: true });
  }

  restoreFromCheckpointState(value: unknown, lifecycleValue: unknown): void {
    this.#runOperation('checkpoint-restore', () => {
      if (this.#lifecycle !== 'created') {
        throw new Error('SurvivalModeSystem只能从created恢复。');
      }
      if (!RESTORABLE_LIFECYCLES.has(lifecycleValue)) {
        throw new RangeError('SurvivalModeSystem恢复生命周期必须是active/paused。');
      }
      const source = cloneFrozenData(value, 'SurvivalModeSystem checkpoint state');
      exactRecord(source, RESTORE_STATE_KEYS, 'SurvivalModeSystem checkpoint state');
      if (source.kind !== 'survival' || source.playerParticipantId !== this.#playerParticipantId) {
        throw new RangeError('Survival checkpoint kind/player身份漂移。');
      }
      if (source.playerStatus !== 'active' && source.playerStatus !== 'respawning') {
        throw new RangeError('Survival checkpoint非终局playerStatus无效。');
      }
      const revision = assertIntegerAtLeast(
        source.revision,
        0,
        'Survival checkpoint revision',
      );
      const lastProcessedTick = integerAtLeastMinusOne(
        source.lastProcessedTick,
        'Survival checkpoint lastProcessedTick',
      );
      const survivedTicks = assertIntegerAtLeast(
        source.survivedTicks,
        0,
        'Survival checkpoint survivedTicks',
      );
      if (survivedTicks !== Math.max(0, lastProcessedTick)) {
        throw new RangeError('Survival checkpoint survivedTicks/tick游标不一致。');
      }
      const playerRespawnReadyTick = nullableTick(
        source.playerRespawnReadyTick,
        'Survival checkpoint playerRespawnReadyTick',
      );
      if (
        (source.playerStatus === 'active' && playerRespawnReadyTick !== null)
        || (source.playerStatus === 'respawning'
          && (playerRespawnReadyTick === null || playerRespawnReadyTick <= lastProcessedTick))
      ) throw new RangeError('Survival checkpoint player respawn身份不闭合。');
      const fallCount = assertIntegerAtLeast(source.fallCount, 0, 'Survival checkpoint fallCount');
      if (
        source.terminalFallCount !== SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1
        || fallCount >= SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1
      ) throw new RangeError('Survival checkpoint非终局fall计数无效。');
      const pressureStage = assertIntegerAtLeast(
        source.pressureStage,
        0,
        'Survival checkpoint pressureStage',
      );
      const expectedPressureStage = [...this.#fixture.pressureStages]
        .reverse()
        .find(({ startActiveTick }) => startActiveTick <= Math.max(0, lastProcessedTick))?.stage;
      if (pressureStage !== expectedPressureStage) {
        throw new RangeError('Survival checkpoint pressure stage与fixture/tick不一致。');
      }
      if (!Array.isArray(source.enemySlots)) {
        throw new TypeError('Survival checkpoint enemySlots必须是数组。');
      }
      const fixtureEntries = [...this.#fixture.slotEntries]
        .sort((left, right) => compareText(left.slotId, right.slotId));
      const restoredSlots = source.enemySlots.map((entry, index) => {
        const name = `Survival checkpoint enemySlots[${index}]`;
        exactRecord(entry, RESTORE_SLOT_KEYS, name);
        const fixtureEntry = fixtureEntries[index];
        if (
          !fixtureEntry
          || entry.slotId !== fixtureEntry.slotId
          || entry.participantId !== fixtureEntry.participantId
          || typeof entry.active !== 'boolean'
        ) throw new RangeError(`${name}与fixture身份不一致。`);
        const anchorId = entry.anchorId === null
          ? null
          : assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
        const reactivationReadyTick = nullableTick(
          entry.reactivationReadyTick,
          `${name}.reactivationReadyTick`,
        );
        if (
          (entry.active && (anchorId !== fixtureEntry.anchorId || reactivationReadyTick !== null))
          || (!entry.active && anchorId !== null)
          || (reactivationReadyTick !== null && reactivationReadyTick <= lastProcessedTick)
        ) throw new RangeError(`${name} active/anchor/reactivation身份不闭合。`);
        return [fixtureEntry.slotId, {
          slotId: fixtureEntry.slotId,
          participantId: fixtureEntry.participantId,
          configuredAnchorId: fixtureEntry.anchorId,
          active: entry.active,
          generation: assertIntegerAtLeast(entry.generation, 0, `${name}.generation`),
          anchorId,
          reactivationReadyTick,
        }] as const;
      });
      if (restoredSlots.length !== fixtureEntries.length) {
        throw new RangeError('Survival checkpoint enemy slot数量与fixture不一致。');
      }
      this.#assertAuthorityCommitReady('checkpoint-restore', true);
      this.#slots.clear();
      for (const [slotId, slot] of restoredSlots) this.#slots.set(slotId, slot);
      this.#revision = revision;
      this.#lastProcessedTick = lastProcessedTick;
      this.#playerStatus = source.playerStatus;
      this.#playerRespawnReadyTick = playerRespawnReadyTick;
      this.#fallCount = fallCount;
      this.#survivedTicks = survivedTicks;
      this.#pressureStage = pressureStage;
      this.#result = null;
      this.#lifecycle = lifecycleValue as 'active' | 'paused';
    }, { failClosedOnReentry: true });
  }

  pause(): void {
    this.#runOperation('pause', () => {
      if (this.#lifecycle !== 'active') throw new Error('SurvivalModeSystem 只能从 active 暂停。');
      this.#assertAuthorityCommitReady('pause', true);
      this.#lifecycle = 'paused';
    }, { failClosedOnReentry: true });
  }

  resume(): void {
    this.#runOperation('resume', () => {
      if (this.#lifecycle !== 'paused') throw new Error('SurvivalModeSystem 只能从 paused 恢复。');
      this.#assertAuthorityCommitReady('resume', true);
      this.#lifecycle = 'active';
    }, { failClosedOnReentry: true });
  }

  getSnapshot(): SurvivalModeStateSnapshotV1 {
    return this.#runOperation('snapshot-read', () => this.#createSnapshotInsideOperation());
  }

  resolveEquipmentTier(value: unknown): SurvivalModeEquipmentTierResolutionV1 {
    return this.#runOperation('equipment-tier-resolve', () => {
      const source = cloneFrozenData(value, 'Survival equipment tier query');
      exactRecord(source, TIER_QUERY_KEYS, 'Survival equipment tier query');
      const waveIndex = assertIntegerAtLeast(source.waveIndex, 0, 'Survival waveIndex');
      const collectionEquipmentDefinitionId = assertNonEmptyString(
        source.collectionEquipmentDefinitionId,
        'Survival collectionEquipmentDefinitionId',
      );
      const tier = [...this.#fixture.equipmentTiers]
        .reverse()
        .find(({ minimumWaveIndex }) => minimumWaveIndex <= waveIndex);
      if (!tier) throw new Error('Survival equipment tier fixture 缺少 wave 映射。');
      const variant = tier.variants.find((entry) => (
        entry.collectionEquipmentDefinitionId === collectionEquipmentDefinitionId
      ));
      if (!variant) throw new RangeError('Survival equipment tier fixture 缺少 collection 显式映射。');
      return Object.freeze({
        tierPolicyDefinitionId: this.#fixture.tierPolicyDefinitionId,
        waveIndex,
        survivalLevel: tier.survivalLevel,
        collectionEquipmentDefinitionId,
        runtimeEquipmentDefinitionId: variant.runtimeEquipmentDefinitionId,
      });
    });
  }

  step(value: unknown): ModeRuntimeTickResolutionV1<
    SurvivalModeStateSnapshotV1,
    SurvivalModeCommandV1
  > {
    return this.#runOperation('step', () => {
      if (this.#lifecycle !== 'active') {
        throw new Error('SurvivalModeSystem 只在 active 状态接受 step。');
      }
      const source = cloneFrozenData(value, 'SurvivalModeSystem facts');
      exactRecord(source, FACT_KEYS, 'SurvivalModeSystem facts');
      const tick = assertIntegerAtLeast(source.tick, 0, 'Survival tick');
      const activeTick = assertIntegerAtLeast(source.activeTick, 0, 'Survival activeTick');
      if (tick !== this.#lastProcessedTick + 1 || activeTick !== tick) {
        throw new RangeError('Survival tick/activeTick 必须从0严格同步递增1。');
      }
      if (typeof source.playerFell !== 'boolean') {
        throw new TypeError('Survival playerFell 必须是布尔值。');
      }
      const enemyFalls = sortedUniqueStrings(source.enemyFalls, 'Survival enemyFalls');
      const stage = [...this.#fixture.pressureStages]
        .reverse()
        .find(({ startActiveTick }) => startActiveTick <= activeTick);
      if (!stage) throw new Error('Survival pressure fixture 缺少当前 tick 映射。');

      const draftSlots = new Map<string, MutableEnemySlot>(
        [...this.#slots].map(([slotId, slot]): [string, MutableEnemySlot] => [
          slotId,
          { ...slot },
        ]),
      );
      const slotByParticipant = new Map([...draftSlots.values()].map((slot) => [
        slot.participantId,
        slot,
      ]));
      let playerStatus = this.#playerStatus;
      let playerRespawnReadyTick = this.#playerRespawnReadyTick;
      let fallCount = this.#fallCount;
      const previousSurvivedTicks = this.#survivedTicks;
      const hardLimitReached = activeTick >= this.#hardLimitActiveTicks;
      const commands: SurvivalModeCommandV1[] = [];
      let changed = stage.stage !== this.#pressureStage;

      for (const participantId of enemyFalls) {
        const slot = slotByParticipant.get(participantId);
        if (!slot) throw new RangeError(`未知 Survival enemy ${participantId}。`);
        if (!slot.active) throw new Error(`Survival enemy ${participantId} 不在 active slot。`);
        const readyTick = tick + stage.reactivationDelayTicks;
        if (!Number.isSafeInteger(readyTick)) {
          throw new RangeError('Survival enemy reactivationReadyTick 超出安全整数。');
        }
        const previousGeneration = slot.generation;
        slot.active = false;
        slot.anchorId = null;
        slot.reactivationReadyTick = readyTick;
        commands.push(Object.freeze({
          kind: 'change-enemy-slot',
          participantId: slot.participantId,
          slotId: slot.slotId,
          previousGeneration,
          generation: slot.generation,
          active: false,
          anchorId: null,
          reason: 'fell',
        }));
        changed = true;
      }

      if (source.playerFell) {
        if (playerStatus !== 'active') throw new Error('Survival 只有 active player 可记录 fall。');
        fallCount += 1;
        if (fallCount > SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1) {
          throw new Error('Survival player fall 超过冻结终局计数。');
        }
        const terminal = fallCount === SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1;
        commands.push(Object.freeze({
          kind: 'count-player-fall',
          participantId: this.#playerParticipantId,
          fallCount,
          terminalFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
          terminal,
        }));
        if (terminal || hardLimitReached) {
          playerStatus = 'ended';
          playerRespawnReadyTick = null;
        } else {
          const readyTick = tick + this.#fixture.playerRespawnDelayTicks;
          if (!Number.isSafeInteger(readyTick)) {
            throw new RangeError('Survival player readyTick 超出安全整数。');
          }
          playerStatus = 'respawning';
          playerRespawnReadyTick = readyTick;
          commands.push(Object.freeze({
            kind: 'schedule-player-respawn',
            participantId: this.#playerParticipantId,
            readyTick,
            anchorId: this.#fixture.playerRespawnAnchorId,
            protectionTicks: this.#fixture.playerRespawnProtectionTicks,
          }));
        }
        changed = true;
      }

      let result: SurvivalModeResultV1 | null = null;
      const terminalByPlayer = fallCount === SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1;
      const terminalByHardLimit = !terminalByPlayer && hardLimitReached;
      if (terminalByPlayer || terminalByHardLimit) {
        playerStatus = 'ended';
        playerRespawnReadyTick = null;
        const candidateResult: SurvivalModeResultV1 = Object.freeze({
          kind: 'survival',
          playerParticipantId: this.#playerParticipantId,
          survivedTicks: activeTick,
          pressureStage: stage.stage,
          fallCount,
          reason: terminalByPlayer ? 'terminal-player-fall' : 'survival-time-cap',
          endedAtTick: tick,
        });
        result = this.#objectivePolicyResolver === null
          ? candidateResult
          : this.#objectivePolicyResolver.assertTerminalObjective({
            kind: 'survival',
            tick,
            activeTick,
            hardLimitActiveTicks: this.#hardLimitActiveTicks,
            playerFell: source.playerFell,
            fallCount,
          }, candidateResult) as SurvivalModeResultV1;
        commands.push(Object.freeze({ kind: 'end-survival', result }));
        changed = true;
      } else {
        if (
          playerStatus === 'respawning'
          && playerRespawnReadyTick !== null
          && playerRespawnReadyTick <= tick
        ) {
          playerStatus = 'active';
          playerRespawnReadyTick = null;
          commands.push(Object.freeze({
            kind: 'respawn-player',
            participantId: this.#playerParticipantId,
            anchorId: this.#fixture.playerRespawnAnchorId,
            protectionTicks: this.#fixture.playerRespawnProtectionTicks,
          }));
          changed = true;
        }
        let activeSlots = [...draftSlots.values()].filter(({ active }) => active).length;
        for (const slotId of this.#fixture.slotActivationOrder) {
          if (activeSlots >= stage.desiredActiveEnemySlots) break;
          const slot = draftSlots.get(slotId);
          if (!slot) throw new Error(`Survival activation slot ${slotId} 丢失。`);
          if (slot.active) continue;
          if (slot.reactivationReadyTick !== null && slot.reactivationReadyTick > tick) continue;
          const previousGeneration = slot.generation;
          const generation = previousGeneration + 1;
          if (!Number.isSafeInteger(generation)) {
            throw new RangeError('Survival enemy slot generation 超出安全整数。');
          }
          const reason = slot.reactivationReadyTick === null
            ? 'pressure-stage'
            : 'reactivation-ready';
          slot.active = true;
          slot.generation = generation;
          slot.anchorId = slot.configuredAnchorId;
          slot.reactivationReadyTick = null;
          activeSlots += 1;
          commands.push(Object.freeze({
            kind: 'change-enemy-slot',
            participantId: slot.participantId,
            slotId: slot.slotId,
            previousGeneration,
            generation,
            active: true,
            anchorId: slot.configuredAnchorId,
            reason,
          }));
          changed = true;
        }
      }

      const revision = this.#revision + (
        changed || activeTick !== previousSurvivedTicks ? 1 : 0
      );
      if (!Number.isSafeInteger(revision)) {
        throw new RangeError('SurvivalModeSystem revision 超出安全整数。');
      }
      this.#assertAuthorityCommitReady('step', true);
      this.#slots.clear();
      for (const [slotId, slot] of draftSlots) this.#slots.set(slotId, slot);
      this.#playerStatus = playerStatus;
      this.#playerRespawnReadyTick = playerRespawnReadyTick;
      this.#fallCount = fallCount;
      this.#survivedTicks = activeTick;
      this.#pressureStage = stage.stage;
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
      this.#slots.clear();
      this.#result = null;
      this.#lifecycle = 'destroyed';
    }, { allowDestroyed: true, allowFailed: true, failClosedOnReentry: true });
  }
}
