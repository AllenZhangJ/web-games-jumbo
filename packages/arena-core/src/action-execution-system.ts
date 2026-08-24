import {
  ACTION_INPUT_CHANNEL,
  ACTION_LANE,
  type ActionDefinition,
  type ActionInputChannel,
  type ActionLane,
} from '@number-strategy-jump/arena-definitions';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ACTION_PHASE,
  createActionRuntimeState,
  resetActionRuntimeState,
  type ActionRuntimeState,
  type ActionCommitmentFacing,
  type ActionCommitmentStatus,
  type ArenaActionPhase,
} from './action-state.js';
import {
  ACTION_RESOLUTION_KIND,
  type ActionRegistryContract,
} from './action-resolver.js';

export interface ActionStateSnapshot {
  readonly definitionId: string | null;
  readonly phase: ArenaActionPhase;
  readonly ticksRemaining: number;
  readonly hitTargetIds: readonly string[];
  readonly commitment?: ActionCommitmentStateSnapshot;
}

export interface ActionCommitmentStateSnapshot {
  readonly status: ActionCommitmentStatus;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
  readonly facingAtStart: Readonly<ActionCommitmentFacing>;
  readonly facingAtResult: Readonly<ActionCommitmentFacing>;
}

export interface ActionCommitmentActor {
  readonly id: string;
  readonly facing: Readonly<ActionCommitmentFacing>;
}

export type ActionCommitmentTransitionKind = 'cancelled' | 'committed';

export interface ActionCommitmentTransition {
  readonly participantId: string;
  readonly lane: ActionLane;
  readonly actionDefinitionId: string;
  readonly kind: ActionCommitmentTransitionKind;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
  readonly facingAtStart: Readonly<ActionCommitmentFacing>;
  readonly facingAtResult: Readonly<ActionCommitmentFacing>;
}

export interface ActionConstraints {
  readonly occupiedLanes: readonly ActionLane[];
  readonly activeConflictTags: readonly string[];
}

export interface ActionTransition {
  readonly participantId: string;
  readonly lane: ActionLane;
  readonly actionDefinitionId: string;
  readonly fromPhase: ArenaActionPhase;
  readonly toPhase: ArenaActionPhase;
}

export interface ActionStart {
  readonly participantId: string;
  readonly inputChannel: ActionInputChannel;
  readonly lane: ActionLane;
  readonly actionDefinitionId: string;
  readonly candidateId: string;
  readonly source: string;
  readonly phase: ArenaActionPhase;
  readonly ticksRemaining: number;
}

export interface ActionHit {
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
}

export const ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface ActionExecutionStateCheckpointV1 {
  readonly participantId: string;
  readonly lane: ActionLane;
  readonly definitionId: string | null;
  readonly definitionIdentityHash: string | null;
  readonly phase: ArenaActionPhase;
  readonly ticksRemaining: number;
  readonly hitTargetIds: readonly string[];
  readonly commitmentStartedTick: number | null;
  readonly commitmentStatus: ActionCommitmentStatus | null;
  readonly commitmentChargeTicks: number;
  readonly commitmentChargeLevel: number;
  readonly commitmentFacingAtStart: Readonly<ActionCommitmentFacing> | null;
  readonly commitmentFacingAtResult: Readonly<ActionCommitmentFacing> | null;
}

export interface ActionExecutionSystemCheckpointV1 {
  readonly schemaVersion: typeof ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantIds: readonly string[];
  readonly laneIds: readonly ActionLane[];
  readonly states: readonly ActionExecutionStateCheckpointV1[];
  readonly checkpointIdentityHash: string;
}

interface PendingStart {
  readonly participantId: string;
  readonly tick: number;
  readonly state: ActionRuntimeState;
  readonly definition: ActionDefinition;
  readonly candidateId: string;
  readonly source: string;
  readonly inputChannel: ActionInputChannel;
}

const RESOLUTION_KEYS = new Set([
  'kind', 'tick', 'participantId', 'inputChannel', 'lane',
  'reason', 'candidateId', 'actionDefinitionId', 'source',
]);
const HIT_KEYS = new Set(['attackerId', 'targetId', 'actionDefinitionId']);
const ACTION_LANES: ReadonlySet<unknown> = new Set(Object.values(ACTION_LANE));
const INPUT_CHANNELS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_CHANNEL));
const CHECKPOINT_CORE_KEYS = new Set(['schemaVersion', 'participantIds', 'laneIds', 'states']);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const CHECKPOINT_STATE_KEYS = new Set([
  'participantId',
  'lane',
  'definitionId',
  'definitionIdentityHash',
  'phase',
  'ticksRemaining',
  'hitTargetIds',
  'commitmentStartedTick',
  'commitmentStatus',
  'commitmentChargeTicks',
  'commitmentChargeLevel',
  'commitmentFacingAtStart',
  'commitmentFacingAtResult',
]);
const CHECKPOINT_FACING_KEYS = new Set(['x', 'z']);
const CHECKPOINT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const ACTION_PHASES: ReadonlySet<unknown> = new Set(Object.values(ARENA_ACTION_PHASE));

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareStarts(left: PendingStart, right: PendingStart): number {
  return compareText(left.participantId, right.participantId)
    || compareText(left.definition.lane, right.definition.lane)
    || compareText(left.definition.id, right.definition.id)
    || compareText(left.candidateId, right.candidateId);
}

function checkpointDataField(source: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function exactCheckpointRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) checkpointDataField(source, key, name);
  return source;
}

function checkpointStringArray(
  value: unknown,
  name: string,
  { allowEmpty = false }: Readonly<{ allowEmpty?: boolean }> = {},
): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new RangeError(`${name}必须是${allowEmpty ? '' : '非空'}数组。`);
  }
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  for (let index = 1; index < result.length; index += 1) {
    if (result[index - 1]! >= result[index]!) {
      throw new RangeError(`${name}必须唯一且按字典序稳定升序。`);
    }
  }
  return Object.freeze(result);
}

function checkpointNullableTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function checkpointFacing(
  value: unknown,
  name: string,
): Readonly<ActionCommitmentFacing> | null {
  if (value === null) return null;
  const source = exactCheckpointRecord(value, CHECKPOINT_FACING_KEYS, name);
  const x = checkpointDataField(source, 'x', name);
  const z = checkpointDataField(source, 'z', name);
  if (typeof x !== 'number' || !Number.isFinite(x) || typeof z !== 'number' || !Number.isFinite(z)) {
    throw new TypeError(`${name}.x/z必须是有限数。`);
  }
  return Object.freeze({ x, z });
}

function definitionIdentityHash(definition: ActionDefinition): string {
  return createDeterministicDataHash(
    definition,
    `ActionExecution ActionDefinition ${definition.id}`,
  );
}

function phaseDuration(definition: ActionDefinition, phase: ArenaActionPhase): number {
  if (phase === ARENA_ACTION_PHASE.WINDUP) return definition.timing.windupTicks;
  if (phase === ARENA_ACTION_PHASE.ACTIVE) return definition.timing.activeTicks;
  if (phase === ARENA_ACTION_PHASE.RECOVERY) return definition.timing.recoveryTicks;
  return 0;
}

function assertNeutralCommitmentState(
  state: ActionExecutionStateCheckpointV1,
  name: string,
): void {
  if (
    state.commitmentStartedTick !== null
    || state.commitmentStatus !== null
    || state.commitmentChargeTicks !== 0
    || state.commitmentChargeLevel !== 0
    || state.commitmentFacingAtStart !== null
    || state.commitmentFacingAtResult !== null
  ) throw new RangeError(`${name}不得保留commitment运行状态。`);
}

function validateCommitmentState(
  state: ActionExecutionStateCheckpointV1,
  definition: ActionDefinition,
  name: string,
): void {
  const commitment = definition.commitment;
  if (commitment === undefined) {
    assertNeutralCommitmentState(state, name);
    return;
  }
  if (state.commitmentStartedTick === null) {
    throw new RangeError(`${name}.commitmentStartedTick不得缺失。`);
  }
  if (state.commitmentStatus !== 'charging' && state.commitmentStatus !== 'committed') {
    throw new RangeError(`${name}.commitmentStatus无效。`);
  }
  const expectedChargeLevel = commitment.levelThresholds.reduce(
    (level, threshold) => state.commitmentChargeTicks >= threshold ? level + 1 : level,
    0,
  );
  if (state.commitmentChargeLevel !== expectedChargeLevel) {
    throw new RangeError(`${name}.commitmentChargeLevel与Definition阈值不一致。`);
  }
  const facingPairClosed = (state.commitmentFacingAtStart === null)
    === (state.commitmentFacingAtResult === null);
  if (!facingPairClosed) throw new RangeError(`${name}.commitment facing必须成对存在或成对为空。`);
  if (state.commitmentStatus === 'committed') {
    if (state.commitmentChargeTicks < commitment.commitTicks) {
      throw new RangeError(`${name}.committed chargeTicks低于Definition.commitTicks。`);
    }
    if (state.commitmentFacingAtStart === null) {
      throw new RangeError(`${name}.committed状态缺少facing。`);
    }
  }
}

function normalizeCheckpointStateV1(
  value: unknown,
  index: number,
  expectedParticipantId: string,
  expectedLane: ActionLane,
  participantIds: ReadonlySet<string>,
  actionRegistry: ActionRegistryContract,
): ActionExecutionStateCheckpointV1 {
  const name = `ActionExecutionSystemCheckpointV1.states[${index}]`;
  const source = exactCheckpointRecord(value, CHECKPOINT_STATE_KEYS, name);
  const participantId = assertNonEmptyString(
    checkpointDataField(source, 'participantId', name),
    `${name}.participantId`,
  );
  const laneValue = assertNonEmptyString(
    checkpointDataField(source, 'lane', name),
    `${name}.lane`,
  );
  if (participantId !== expectedParticipantId || laneValue !== expectedLane) {
    throw new RangeError(`${name}必须按participantId/lane稳定顺序完整覆盖。`);
  }
  if (!ACTION_LANES.has(laneValue)) throw new RangeError(`${name}.lane未知。`);
  const lane = laneValue as ActionLane;
  const rawDefinitionId = checkpointDataField(source, 'definitionId', name);
  const definitionId = rawDefinitionId === null
    ? null
    : assertNonEmptyString(rawDefinitionId, `${name}.definitionId`);
  const rawDefinitionIdentityHash = checkpointDataField(source, 'definitionIdentityHash', name);
  const definitionIdentityHashValue = rawDefinitionIdentityHash === null
    ? null
    : assertNonEmptyString(rawDefinitionIdentityHash, `${name}.definitionIdentityHash`);
  if (
    definitionIdentityHashValue !== null
    && !CHECKPOINT_HASH_PATTERN.test(definitionIdentityHashValue)
  ) throw new TypeError(`${name}.definitionIdentityHash无效。`);
  const phaseValue = checkpointDataField(source, 'phase', name);
  if (!ACTION_PHASES.has(phaseValue)) throw new RangeError(`${name}.phase未知。`);
  const phase = phaseValue as ArenaActionPhase;
  const ticksRemaining = assertIntegerAtLeast(
    checkpointDataField(source, 'ticksRemaining', name),
    0,
    `${name}.ticksRemaining`,
  );
  const hitTargetIds = checkpointStringArray(
    checkpointDataField(source, 'hitTargetIds', name),
    `${name}.hitTargetIds`,
    { allowEmpty: true },
  );
  if (hitTargetIds.some((targetId) => !participantIds.has(targetId))) {
    throw new RangeError(`${name}.hitTargetIds引用checkpoint外participant。`);
  }
  const commitmentStartedTick = checkpointNullableTick(
    checkpointDataField(source, 'commitmentStartedTick', name),
    `${name}.commitmentStartedTick`,
  );
  const rawCommitmentStatus = checkpointDataField(source, 'commitmentStatus', name);
  const commitmentStatus = rawCommitmentStatus === null
    ? null
    : assertNonEmptyString(rawCommitmentStatus, `${name}.commitmentStatus`);
  if (
    commitmentStatus !== null
    && commitmentStatus !== 'charging'
    && commitmentStatus !== 'committed'
  ) throw new RangeError(`${name}.commitmentStatus未知。`);
  const commitmentChargeTicks = assertIntegerAtLeast(
    checkpointDataField(source, 'commitmentChargeTicks', name),
    0,
    `${name}.commitmentChargeTicks`,
  );
  const commitmentChargeLevel = assertIntegerAtLeast(
    checkpointDataField(source, 'commitmentChargeLevel', name),
    0,
    `${name}.commitmentChargeLevel`,
  );
  const normalized = Object.freeze({
    participantId,
    lane,
    definitionId,
    definitionIdentityHash: definitionIdentityHashValue,
    phase,
    ticksRemaining,
    hitTargetIds,
    commitmentStartedTick,
    commitmentStatus: commitmentStatus as ActionCommitmentStatus | null,
    commitmentChargeTicks,
    commitmentChargeLevel,
    commitmentFacingAtStart: checkpointFacing(
      checkpointDataField(source, 'commitmentFacingAtStart', name),
      `${name}.commitmentFacingAtStart`,
    ),
    commitmentFacingAtResult: checkpointFacing(
      checkpointDataField(source, 'commitmentFacingAtResult', name),
      `${name}.commitmentFacingAtResult`,
    ),
  }) satisfies ActionExecutionStateCheckpointV1;
  if (phase === ARENA_ACTION_PHASE.IDLE) {
    if (
      definitionId !== null
      || definitionIdentityHashValue !== null
      || ticksRemaining !== 0
      || hitTargetIds.length !== 0
    ) throw new RangeError(`${name}.idle状态必须完全中性。`);
    assertNeutralCommitmentState(normalized, name);
    return normalized;
  }
  if (definitionId === null || definitionIdentityHashValue === null) {
    throw new RangeError(`${name}.非idle状态缺少Definition身份。`);
  }
  const definition = actionRegistry.require(definitionId);
  if (definition.id !== definitionId || definition.lane !== lane) {
    throw new RangeError(`${name}.Definition id/lane引用不闭合。`);
  }
  if (definitionIdentityHash(definition) !== definitionIdentityHashValue) {
    throw new RangeError(`${name}.Definition identity hash漂移。`);
  }
  const duration = phaseDuration(definition, phase);
  if (duration < 1 || ticksRemaining < 1 || ticksRemaining > duration) {
    throw new RangeError(`${name}.ticksRemaining与Definition timing/phase不一致。`);
  }
  if (phase === ARENA_ACTION_PHASE.WINDUP && hitTargetIds.length !== 0) {
    throw new RangeError(`${name}.windup状态不得已有hitTargets。`);
  }
  validateCommitmentState(normalized, definition, name);
  return normalized;
}

function normalizeActionExecutionCheckpointCoreV1(
  value: unknown,
  actionRegistry: ActionRegistryContract,
): Omit<ActionExecutionSystemCheckpointV1, 'checkpointIdentityHash'> {
  const source = exactCheckpointRecord(
    value,
    CHECKPOINT_CORE_KEYS,
    'ActionExecutionSystemCheckpointV1',
  );
  if (checkpointDataField(source, 'schemaVersion', 'ActionExecutionSystemCheckpointV1')
    !== ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('ActionExecutionSystemCheckpointV1.schemaVersion必须是1。');
  }
  const participantIds = checkpointStringArray(
    checkpointDataField(source, 'participantIds', 'ActionExecutionSystemCheckpointV1'),
    'ActionExecutionSystemCheckpointV1.participantIds',
  );
  const rawLaneIds = checkpointDataField(
    source,
    'laneIds',
    'ActionExecutionSystemCheckpointV1',
  );
  if (!Array.isArray(rawLaneIds)) {
    throw new TypeError('ActionExecutionSystemCheckpointV1.laneIds必须是数组。');
  }
  const expectedLaneIds = Object.freeze(Object.values(ACTION_LANE).sort(compareText));
  const laneIds = Object.freeze(rawLaneIds.map((value, index) => {
    const lane = assertNonEmptyString(value, `ActionExecutionSystemCheckpointV1.laneIds[${index}]`);
    if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 ActionExecution lane ${lane}。`);
    return lane as ActionLane;
  }));
  if (
    laneIds.length !== expectedLaneIds.length
    || laneIds.some((lane, index) => lane !== expectedLaneIds[index])
  ) throw new RangeError('ActionExecutionSystemCheckpointV1.laneIds必须完整稳定覆盖。');
  const rawStates = checkpointDataField(
    source,
    'states',
    'ActionExecutionSystemCheckpointV1',
  );
  const expectedStateCount = participantIds.length * laneIds.length;
  if (!Array.isArray(rawStates) || rawStates.length !== expectedStateCount) {
    throw new RangeError('ActionExecutionSystemCheckpointV1.states必须完整覆盖participant×lane。');
  }
  const participantIdSet = new Set(participantIds);
  const states = Object.freeze(rawStates.map((state, index) => {
    const participantIndex = Math.floor(index / laneIds.length);
    const laneIndex = index % laneIds.length;
    return normalizeCheckpointStateV1(
      state,
      index,
      participantIds[participantIndex]!,
      laneIds[laneIndex]!,
      participantIdSet,
      actionRegistry,
    );
  }));
  return Object.freeze({
    schemaVersion: ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
    participantIds,
    laneIds,
    states,
  });
}

function withActionExecutionCheckpointIdentityV1(
  core: Omit<ActionExecutionSystemCheckpointV1, 'checkpointIdentityHash'>,
): ActionExecutionSystemCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ActionExecutionSystemCheckpointV1 identity',
    ),
  });
}

function validateActionExecutionSystemCheckpointV1(
  value: unknown,
  actionRegistry: ActionRegistryContract,
): DeepReadonly<ActionExecutionSystemCheckpointV1> {
  if (!actionRegistry || typeof actionRegistry.require !== 'function') {
    throw new TypeError('ActionExecutionSystemCheckpointV1恢复需要只读ActionRegistry。');
  }
  const source = exactCheckpointRecord(
    cloneFrozenData(value, 'ActionExecutionSystemCheckpointV1'),
    CHECKPOINT_KEYS,
    'ActionExecutionSystemCheckpointV1',
  );
  const checkpointIdentityHash = checkpointDataField(
    source,
    'checkpointIdentityHash',
    'ActionExecutionSystemCheckpointV1',
  );
  if (
    typeof checkpointIdentityHash !== 'string'
    || !CHECKPOINT_HASH_PATTERN.test(checkpointIdentityHash)
  ) throw new TypeError('ActionExecutionSystemCheckpointV1.checkpointIdentityHash无效。');
  const core = Object.fromEntries([...CHECKPOINT_CORE_KEYS].map((key) => [
    key,
    checkpointDataField(source, key, 'ActionExecutionSystemCheckpointV1'),
  ]));
  const normalized = withActionExecutionCheckpointIdentityV1(
    normalizeActionExecutionCheckpointCoreV1(core, actionRegistry),
  );
  if (normalized.checkpointIdentityHash !== checkpointIdentityHash) {
    throw new RangeError('ActionExecutionSystemCheckpointV1 identity hash漂移。');
  }
  return normalized;
}

function freezeTransition(
  participantId: string,
  lane: ActionLane,
  definitionId: string,
  fromPhase: ArenaActionPhase,
  toPhase: ArenaActionPhase,
): ActionTransition {
  return Object.freeze({
    participantId,
    lane,
    actionDefinitionId: definitionId,
    fromPhase,
    toPhase,
  });
}

function snapshotState(state: ActionRuntimeState): ActionStateSnapshot {
  const snapshot: ActionStateSnapshot = {
    definitionId: state.definitionId,
    phase: state.phase,
    ticksRemaining: state.ticksRemaining,
    hitTargetIds: Object.freeze([...state.hitTargets].sort(compareText)),
    ...(state.commitmentStatus !== null
      && state.commitmentFacingAtStart !== null
      && state.commitmentFacingAtResult !== null
      ? {
        commitment: Object.freeze({
          status: state.commitmentStatus,
          chargeTicks: state.commitmentChargeTicks,
          chargeLevel: state.commitmentChargeLevel,
          facingAtStart: Object.freeze({ ...state.commitmentFacingAtStart }),
          facingAtResult: Object.freeze({ ...state.commitmentFacingAtResult }),
        }),
      }
      : {}),
  };
  return Object.freeze(snapshot);
}

function intersects(left: readonly string[], right: ReadonlySet<string>): boolean {
  return left.some((value) => right.has(value));
}

function remainsOccupiedAfterAdvance(
  state: ActionRuntimeState,
  definition: ActionDefinition,
): boolean {
  if (state.phase === ARENA_ACTION_PHASE.IDLE) return false;
  if (state.ticksRemaining > 1) return true;
  if (state.phase === ARENA_ACTION_PHASE.WINDUP) return true;
  if (state.phase === ARENA_ACTION_PHASE.ACTIVE) return definition.timing.recoveryTicks > 0;
  return false;
}

function requireMapEntry<K, V>(map: ReadonlyMap<K, V>, key: K, message: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(message);
  return value;
}

function requireActiveDefinitionId(state: ActionRuntimeState): string {
  if (state.definitionId === null) throw new Error('非 idle ActionState 缺少 definitionId。');
  return state.definitionId;
}

export class ActionExecutionSystem {
  readonly #actionRegistry: ActionRegistryContract;
  readonly #participantIds: readonly string[];
  readonly #laneIds: readonly ActionLane[];
  readonly #states: ReadonlyMap<string, ReadonlyMap<ActionLane, ActionRuntimeState>>;

  constructor(options: {
    readonly participantIds: readonly string[];
    readonly actionRegistry: ActionRegistryContract;
  }) {
    const { participantIds, actionRegistry } = options;
    if (
      !Array.isArray(participantIds)
      || participantIds.length === 0
      || participantIds.some((id) => typeof id !== 'string' || id.trim().length === 0)
      || new Set(participantIds).size !== participantIds.length
    ) throw new RangeError('ActionExecutionSystem 需要唯一非空 participantIds。');
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('ActionExecutionSystem 需要只读 ActionRegistry。');
    }
    this.#actionRegistry = actionRegistry;
    this.#participantIds = Object.freeze([...participantIds].sort(compareText));
    this.#laneIds = Object.freeze(Object.values(ACTION_LANE).sort(compareText));
    this.#states = new Map(this.#participantIds.map((participantId) => [
      participantId,
      new Map(this.#laneIds.map((lane) => [lane, createActionRuntimeState()])),
    ]));
    Object.freeze(this);
  }

  static restoreFromCheckpointV1(
    checkpointValue: unknown,
    actionRegistry: ActionRegistryContract,
  ): ActionExecutionSystem {
    const checkpoint = validateActionExecutionSystemCheckpointV1(
      checkpointValue,
      actionRegistry,
    );
    const system = new ActionExecutionSystem({
      participantIds: checkpoint.participantIds,
      actionRegistry,
    });
    try {
      for (const checkpointState of checkpoint.states) {
        const state = system.#requireLaneState(
          checkpointState.participantId,
          checkpointState.lane,
        );
        state.definitionId = checkpointState.definitionId;
        state.phase = checkpointState.phase;
        state.ticksRemaining = checkpointState.ticksRemaining;
        state.hitTargets.clear();
        checkpointState.hitTargetIds.forEach((targetId) => state.hitTargets.add(targetId));
        state.commitmentStartedTick = checkpointState.commitmentStartedTick;
        state.commitmentStatus = checkpointState.commitmentStatus;
        state.commitmentChargeTicks = checkpointState.commitmentChargeTicks;
        state.commitmentChargeLevel = checkpointState.commitmentChargeLevel;
        state.commitmentFacingAtStart = checkpointState.commitmentFacingAtStart === null
          ? null
          : { ...checkpointState.commitmentFacingAtStart };
        state.commitmentFacingAtResult = checkpointState.commitmentFacingAtResult === null
          ? null
          : { ...checkpointState.commitmentFacingAtResult };
      }
      return system;
    } catch (error) {
      for (const participantId of checkpoint.participantIds) system.reset(participantId);
      throw error;
    }
  }

  #requireParticipant(participantId: string): ReadonlyMap<ActionLane, ActionRuntimeState> {
    const states = this.#states.get(participantId);
    if (!states) throw new RangeError(`未知 action participant ${String(participantId)}。`);
    return states;
  }

  #requireLaneState(participantId: string, laneValue: string): ActionRuntimeState {
    if (!ACTION_LANES.has(laneValue)) throw new RangeError(`未知 action lane ${String(laneValue)}。`);
    const lane = laneValue as ActionLane;
    return requireMapEntry(
      this.#requireParticipant(participantId),
      lane,
      `participant ${participantId} 缺少 action lane ${lane}。`,
    );
  }

  advance(): readonly ActionTransition[] {
    const transitions: ActionTransition[] = [];
    for (const participantId of this.#participantIds) {
      const states = this.#requireParticipant(participantId);
      for (const lane of this.#laneIds) {
        const state = requireMapEntry(states, lane, `participant ${participantId} 缺少 action lane ${lane}。`);
        if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
        state.ticksRemaining -= 1;
        if (state.ticksRemaining > 0) continue;
        const definition = this.#actionRegistry.require(requireActiveDefinitionId(state));
        if (definition.lane !== lane) {
          throw new Error(`ActionState ${definition.id} 与 lane ${lane} 不一致。`);
        }
        const fromPhase = state.phase;
        if (fromPhase === ARENA_ACTION_PHASE.WINDUP) {
          state.phase = ARENA_ACTION_PHASE.ACTIVE;
          state.ticksRemaining = definition.timing.activeTicks;
          state.hitTargets.clear();
        } else if (fromPhase === ARENA_ACTION_PHASE.ACTIVE) {
          if (definition.timing.recoveryTicks > 0) {
            state.phase = ARENA_ACTION_PHASE.RECOVERY;
            state.ticksRemaining = definition.timing.recoveryTicks;
          } else {
            resetActionRuntimeState(state);
          }
        } else {
          resetActionRuntimeState(state);
        }
        transitions.push(freezeTransition(participantId, lane, definition.id, fromPhase, state.phase));
      }
    }
    return Object.freeze(transitions);
  }

  applyCommitmentInputs(options: {
    readonly tick: number;
    readonly actors: readonly ActionCommitmentActor[];
    readonly inputFrames: readonly ArenaInputFrame[];
  }): readonly ActionCommitmentTransition[] {
    assertIntegerAtLeast(options.tick, 0, 'ActionCommitmentInput.tick');
    if (!Array.isArray(options.actors) || options.actors.length !== this.#participantIds.length) {
      throw new RangeError('ActionCommitmentInput.actors 必须覆盖全部 participants。');
    }
    if (!Array.isArray(options.inputFrames) || options.inputFrames.length !== this.#participantIds.length) {
      throw new RangeError('ActionCommitmentInput.inputFrames 必须覆盖全部 participants。');
    }
    const actorsById = new Map(options.actors.map((actor) => [actor.id, actor]));
    const framesById = new Map(options.inputFrames.map((frame) => [frame.participantId, frame]));
    if (
      actorsById.size !== this.#participantIds.length
      || this.#participantIds.some((id) => !actorsById.has(id))
      || framesById.size !== this.#participantIds.length
      || this.#participantIds.some((id) => !framesById.has(id))
    ) throw new RangeError('ActionCommitmentInput 的 actors/inputFrames ID 必须与 participants 一致。');

    const transitions: ActionCommitmentTransition[] = [];
    for (const participantId of this.#participantIds) {
      const states = this.#requireParticipant(participantId);
      const frame = requireMapEntry(framesById, participantId, `缺少 ${participantId} InputFrame。`);
      const actor = requireMapEntry(actorsById, participantId, `缺少 ${participantId} ActionCommitmentActor。`);
      for (const lane of this.#laneIds) {
        const state = requireMapEntry(states, lane, `participant ${participantId} 缺少 action lane ${lane}。`);
        if (
          state.phase !== ARENA_ACTION_PHASE.WINDUP
          || state.definitionId === null
          || state.commitmentStatus === null
        ) continue;
        const definition = this.#actionRegistry.require(state.definitionId);
        const commitment = definition.commitment;
        if (!commitment) continue;
        const startedTick = state.commitmentStartedTick;
        if (startedTick === null || options.tick < startedTick) {
          throw new Error(`ActionCommitment ${definition.id} 缺少有效 startedTick。`);
        }
        const facing = Object.freeze({ x: actor.facing.x, z: actor.facing.z });
        if (state.commitmentFacingAtStart === null) {
          state.commitmentFacingAtStart = facing;
          state.commitmentFacingAtResult = facing;
        }
        const chargeTicks = options.tick - startedTick;
        state.commitmentChargeTicks = chargeTicks;
        state.commitmentChargeLevel = commitment.levelThresholds.reduce(
          (level, threshold) => chargeTicks >= threshold ? level + 1 : level,
          0,
        );
        if (state.commitmentStatus === 'charging' && commitment.canTurn) {
          state.commitmentFacingAtResult = facing;
        }
        const facingAtStart = state.commitmentFacingAtStart;
        const facingAtResult = state.commitmentFacingAtResult;
        if (facingAtStart === null || facingAtResult === null) {
          throw new Error(`ActionCommitment ${definition.id} 缺少 facing 状态。`);
        }

        if (state.commitmentStatus === 'charging') {
          const expired = chargeTicks >= commitment.expireTicks;
          if (expired && commitment.expireOutcome === 'cancel') {
            transitions.push(Object.freeze({
              participantId,
              lane,
              actionDefinitionId: definition.id,
              kind: 'cancelled',
              chargeTicks,
              chargeLevel: state.commitmentChargeLevel,
              facingAtStart: Object.freeze({ ...facingAtStart }),
              facingAtResult: Object.freeze({ ...facingAtResult }),
            }));
            resetActionRuntimeState(state);
            continue;
          }
          if (expired || !frame.primaryHeld) {
            if (chargeTicks < commitment.commitTicks) {
              transitions.push(Object.freeze({
                participantId,
                lane,
                actionDefinitionId: definition.id,
                kind: 'cancelled',
                chargeTicks,
                chargeLevel: state.commitmentChargeLevel,
                facingAtStart: Object.freeze({ ...facingAtStart }),
                facingAtResult: Object.freeze({ ...facingAtResult }),
              }));
              resetActionRuntimeState(state);
              continue;
            }
            state.commitmentStatus = 'committed';
            transitions.push(Object.freeze({
              participantId,
              lane,
              actionDefinitionId: definition.id,
              kind: 'committed',
              chargeTicks,
              chargeLevel: state.commitmentChargeLevel,
              facingAtStart: Object.freeze({ ...facingAtStart }),
              facingAtResult: Object.freeze({ ...facingAtResult }),
            }));
          }
        }
      }
    }
    return Object.freeze(transitions);
  }

  start(resolutions: unknown): readonly ActionStart[] {
    if (!Array.isArray(resolutions)) throw new TypeError('Action resolutions 必须是数组。');
    const starts: PendingStart[] = [];
    const seenParticipantLanes = new Set<string>();
    const seenParticipantChannels = new Set<string>();
    for (const resolution of resolutions) {
      assertKnownKeys(resolution, RESOLUTION_KEYS, 'ActionResolution');
      if (resolution.kind !== ACTION_RESOLUTION_KIND.SELECTED) {
        throw new RangeError('ActionExecutionSystem.start 只接受 selected resolution。');
      }
      const tick = assertIntegerAtLeast(resolution.tick, 0, 'ActionResolution.tick');
      const participantId = assertNonEmptyString(resolution.participantId, 'ActionResolution.participantId');
      const laneValue = assertNonEmptyString(resolution.lane, 'ActionResolution.lane');
      const inputChannelValue = assertNonEmptyString(resolution.inputChannel, 'ActionResolution.inputChannel');
      if (!ACTION_LANES.has(laneValue)) throw new RangeError(`未知 action lane ${laneValue}。`);
      if (!INPUT_CHANNELS.has(inputChannelValue)) {
        throw new RangeError(`未知 action input channel ${inputChannelValue}。`);
      }
      const lane = laneValue as ActionLane;
      const inputChannel = inputChannelValue as ActionInputChannel;
      const candidateId = assertNonEmptyString(resolution.candidateId, 'ActionResolution.candidateId');
      const source = assertNonEmptyString(resolution.source, 'ActionResolution.source');
      const laneKey = `${participantId}\u0000${lane}`;
      const channelKey = `${participantId}\u0000${inputChannel}`;
      if (seenParticipantLanes.has(laneKey)) {
        throw new RangeError(`重复 action start participant/lane ${participantId}/${lane}。`);
      }
      if (seenParticipantChannels.has(channelKey)) {
        throw new RangeError(`重复 action start participant/input ${participantId}/${inputChannel}。`);
      }
      seenParticipantLanes.add(laneKey);
      seenParticipantChannels.add(channelKey);
      const state = this.#requireLaneState(participantId, lane);
      if (state.phase !== ARENA_ACTION_PHASE.IDLE) {
        throw new Error(`participant ${participantId} 的 ${lane} ActionState 非 idle。`);
      }
      const actionDefinitionId = assertNonEmptyString(
        resolution.actionDefinitionId,
        'ActionResolution.actionDefinitionId',
      );
      const definition = this.#actionRegistry.require(actionDefinitionId);
      if (definition.lane !== lane || definition.input.channel !== inputChannel) {
        throw new RangeError(`ActionResolution ${definition.id} 的 lane/input 与定义不一致。`);
      }
      starts.push({
        participantId,
        tick,
        state,
        definition,
        candidateId,
        source,
        inputChannel,
      });
    }

    const startsByParticipant = new Map<string, PendingStart[]>();
    for (const start of starts) {
      const grouped = startsByParticipant.get(start.participantId) ?? [];
      grouped.push(start);
      startsByParticipant.set(start.participantId, grouped);
    }
    for (const [participantId, participantStarts] of startsByParticipant) {
      const activeTags = new Set(this.getConstraints(participantId).activeConflictTags);
      for (const start of participantStarts) {
        if (intersects(start.definition.conflictTags, activeTags)) {
          throw new Error(`participant ${participantId} 的 ${start.definition.id} 与活动动作冲突。`);
        }
      }
      for (let left = 0; left < participantStarts.length; left += 1) {
        const leftStart = participantStarts[left];
        if (!leftStart) throw new Error('Action start batch left index 越界。');
        const leftTags = new Set(leftStart.definition.conflictTags);
        for (let right = left + 1; right < participantStarts.length; right += 1) {
          const rightStart = participantStarts[right];
          if (!rightStart) throw new Error('Action start batch right index 越界。');
          if (intersects(rightStart.definition.conflictTags, leftTags)) {
            throw new Error(`participant ${participantId} 的同 tick actions 存在 conflictTags 冲突。`);
          }
        }
      }
    }

    starts.sort(compareStarts);
    return Object.freeze(starts.map(({
      participantId,
      tick,
      state,
      definition,
      candidateId,
      source,
      inputChannel,
    }) => {
      state.definitionId = definition.id;
      state.phase = definition.timing.windupTicks > 0
        ? ARENA_ACTION_PHASE.WINDUP
        : ARENA_ACTION_PHASE.ACTIVE;
      state.ticksRemaining = definition.timing.windupTicks > 0
        ? definition.timing.windupTicks
        : definition.timing.activeTicks;
      state.hitTargets.clear();
      if (definition.commitment) {
        state.commitmentStartedTick = tick;
        state.commitmentStatus = 'charging';
        state.commitmentChargeTicks = 0;
        state.commitmentChargeLevel = 0;
        state.commitmentFacingAtStart = null;
        state.commitmentFacingAtResult = null;
      }
      return Object.freeze({
        participantId,
        inputChannel,
        lane: definition.lane,
        actionDefinitionId: definition.id,
        candidateId,
        source,
        phase: state.phase,
        ticksRemaining: state.ticksRemaining,
      });
    }));
  }

  recordHits(hits: unknown): void {
    if (!Array.isArray(hits)) throw new TypeError('Action hits 必须是数组。');
    const pending: Array<{ readonly state: ActionRuntimeState; readonly targetId: string }> = [];
    const seen = new Set<string>();
    for (const hit of hits) {
      assertKnownKeys(hit, HIT_KEYS, 'ActionHit');
      const attackerId = assertNonEmptyString(hit.attackerId, 'ActionHit.attackerId');
      const targetId = assertNonEmptyString(hit.targetId, 'ActionHit.targetId');
      const actionDefinitionId = assertNonEmptyString(hit.actionDefinitionId, 'ActionHit.actionDefinitionId');
      const key = `${attackerId}\u0000${targetId}\u0000${actionDefinitionId}`;
      if (seen.has(key)) {
        throw new RangeError(`重复 ActionHit ${attackerId} -> ${targetId}/${actionDefinitionId}。`);
      }
      seen.add(key);
      const definition = this.#actionRegistry.require(actionDefinitionId);
      const state = this.#requireLaneState(attackerId, definition.lane);
      this.#requireParticipant(targetId);
      if (state.phase !== ARENA_ACTION_PHASE.ACTIVE || state.definitionId !== actionDefinitionId) {
        throw new Error(`ActionHit 与 ${attackerId} 的 active action 不一致。`);
      }
      if (state.hitTargets.has(targetId)) {
        throw new Error(`ActionHit ${attackerId} -> ${targetId} 已在本动作结算。`);
      }
      pending.push({ state, targetId });
    }
    pending.forEach(({ state, targetId }) => state.hitTargets.add(targetId));
  }

  interrupt(participantIdsValue: unknown): readonly Readonly<{
    participantId: string;
    lane: ActionLane;
    actionDefinitionId: string;
    phase: ArenaActionPhase;
  }>[] {
    if (!Array.isArray(participantIdsValue)) throw new TypeError('interrupt participantIds 必须是数组。');
    const participantIds = participantIdsValue.map((value, index) => (
      assertNonEmptyString(value, `interrupt participantIds[${index}]`)
    ));
    const uniqueIds = [...new Set(participantIds)].sort(compareText);
    uniqueIds.forEach((participantId) => this.#requireParticipant(participantId));
    const interrupted: Array<Readonly<{
      participantId: string;
      lane: ActionLane;
      actionDefinitionId: string;
      phase: ArenaActionPhase;
    }>> = [];
    for (const participantId of uniqueIds) {
      const states = this.#requireParticipant(participantId);
      for (const lane of this.#laneIds) {
        const state = requireMapEntry(states, lane, `participant ${participantId} 缺少 action lane ${lane}。`);
        if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
        interrupted.push(Object.freeze({
          participantId,
          lane,
          actionDefinitionId: requireActiveDefinitionId(state),
          phase: state.phase,
        }));
        resetActionRuntimeState(state);
      }
    }
    return Object.freeze(interrupted);
  }

  interruptLane(
    participantIdsValue: unknown,
    laneValue: unknown,
  ): readonly Readonly<{
    participantId: string;
    lane: ActionLane;
    actionDefinitionId: string;
    phase: ArenaActionPhase;
  }>[] {
    if (!Array.isArray(participantIdsValue)) {
      throw new TypeError('interruptLane participantIds 必须是数组。');
    }
    if (typeof laneValue !== 'string' || !ACTION_LANES.has(laneValue)) {
      throw new RangeError(`interruptLane lane ${String(laneValue)} 未知。`);
    }
    const lane = laneValue as ActionLane;
    const participantIds = participantIdsValue.map((value, index) => (
      assertNonEmptyString(value, `interruptLane participantIds[${index}]`)
    ));
    const uniqueIds = [...new Set(participantIds)].sort(compareText);
    uniqueIds.forEach((participantId) => this.#requireParticipant(participantId));
    const interrupted: Array<Readonly<{
      participantId: string;
      lane: ActionLane;
      actionDefinitionId: string;
      phase: ArenaActionPhase;
    }>> = [];
    for (const participantId of uniqueIds) {
      const state = this.#requireLaneState(participantId, lane);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      interrupted.push(Object.freeze({
        participantId,
        lane,
        actionDefinitionId: requireActiveDefinitionId(state),
        phase: state.phase,
      }));
      resetActionRuntimeState(state);
    }
    return Object.freeze(interrupted);
  }

  reset(participantId: string): void {
    for (const state of this.#requireParticipant(participantId).values()) resetActionRuntimeState(state);
  }

  getConstraints(participantId: string): ActionConstraints {
    return this.#projectConstraints(participantId, false);
  }

  getNextTickConstraints(participantId: string): ActionConstraints {
    return this.#projectConstraints(participantId, true);
  }

  #projectConstraints(participantId: string, nextTick: boolean): ActionConstraints {
    const states = this.#requireParticipant(participantId);
    const occupiedLanes: ActionLane[] = [];
    const activeConflictTags = new Set<string>();
    for (const lane of this.#laneIds) {
      const state = requireMapEntry(states, lane, `participant ${participantId} 缺少 action lane ${lane}。`);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      const definition = this.#actionRegistry.require(requireActiveDefinitionId(state));
      if (nextTick && !remainsOccupiedAfterAdvance(state, definition)) continue;
      occupiedLanes.push(lane);
      definition.conflictTags.forEach((tag) => activeConflictTags.add(tag));
    }
    return Object.freeze({
      occupiedLanes: Object.freeze(occupiedLanes),
      activeConflictTags: Object.freeze([...activeConflictTags].sort(compareText)),
    });
  }

  getLaneSnapshot(participantId: string, lane: string): ActionStateSnapshot {
    return snapshotState(this.#requireLaneState(participantId, lane));
  }

  getSnapshot(participantId: string): ActionStateSnapshot {
    return this.getLaneSnapshot(participantId, ACTION_LANE.COMBAT);
  }

  listSnapshots(): readonly Readonly<{ participantId: string } & ActionStateSnapshot>[] {
    return Object.freeze(this.#participantIds.map((participantId) => Object.freeze({
      participantId,
      ...this.getSnapshot(participantId),
    })));
  }

  listAllSnapshots(): readonly Readonly<{
    participantId: string;
    lane: ActionLane;
  } & ActionStateSnapshot>[] {
    return Object.freeze(this.#participantIds.flatMap((participantId) => (
      this.#laneIds.map((lane) => Object.freeze({
        participantId,
        lane,
        ...this.getLaneSnapshot(participantId, lane),
      }))
    )));
  }

  exportCheckpointV1(): ActionExecutionSystemCheckpointV1 {
    const states = Object.freeze(this.#participantIds.flatMap((participantId) => (
      this.#laneIds.map((lane) => {
        const state = this.#requireLaneState(participantId, lane);
        const definition = state.definitionId === null
          ? null
          : this.#actionRegistry.require(state.definitionId);
        return Object.freeze({
          participantId,
          lane,
          definitionId: state.definitionId,
          definitionIdentityHash: definition === null
            ? null
            : definitionIdentityHash(definition),
          phase: state.phase,
          ticksRemaining: state.ticksRemaining,
          hitTargetIds: Object.freeze([...state.hitTargets].sort(compareText)),
          commitmentStartedTick: state.commitmentStartedTick,
          commitmentStatus: state.commitmentStatus,
          commitmentChargeTicks: state.commitmentChargeTicks,
          commitmentChargeLevel: state.commitmentChargeLevel,
          commitmentFacingAtStart: state.commitmentFacingAtStart === null
            ? null
            : Object.freeze({ ...state.commitmentFacingAtStart }),
          commitmentFacingAtResult: state.commitmentFacingAtResult === null
            ? null
            : Object.freeze({ ...state.commitmentFacingAtResult }),
        });
      })
    )));
    const core = normalizeActionExecutionCheckpointCoreV1({
      schemaVersion: ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
      participantIds: this.#participantIds,
      laneIds: this.#laneIds,
      states,
    }, this.#actionRegistry);
    return withActionExecutionCheckpointIdentityV1(core);
  }
}
