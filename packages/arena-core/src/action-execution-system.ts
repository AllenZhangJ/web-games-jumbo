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
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ACTION_PHASE,
  createActionRuntimeState,
  resetActionRuntimeState,
  type ActionRuntimeState,
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
  readonly phase: ArenaActionPhase;
  readonly ticksRemaining: number;
}

export interface ActionHit {
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
}

interface PendingStart {
  readonly participantId: string;
  readonly state: ActionRuntimeState;
  readonly definition: ActionDefinition;
  readonly candidateId: string;
  readonly inputChannel: ActionInputChannel;
}

const RESOLUTION_KEYS = new Set([
  'kind', 'tick', 'participantId', 'inputChannel', 'lane',
  'reason', 'candidateId', 'actionDefinitionId', 'source',
]);
const HIT_KEYS = new Set(['attackerId', 'targetId', 'actionDefinitionId']);
const ACTION_LANES: ReadonlySet<unknown> = new Set(Object.values(ACTION_LANE));
const INPUT_CHANNELS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_CHANNEL));

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
  return Object.freeze({
    definitionId: state.definitionId,
    phase: state.phase,
    ticksRemaining: state.ticksRemaining,
    hitTargetIds: Object.freeze([...state.hitTargets].sort(compareText)),
  });
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
      assertIntegerAtLeast(resolution.tick, 0, 'ActionResolution.tick');
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
      assertNonEmptyString(resolution.source, 'ActionResolution.source');
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
      starts.push({ participantId, state, definition, candidateId, inputChannel });
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
    return Object.freeze(starts.map(({ participantId, state, definition, candidateId, inputChannel }) => {
      state.definitionId = definition.id;
      state.phase = definition.timing.windupTicks > 0
        ? ARENA_ACTION_PHASE.WINDUP
        : ARENA_ACTION_PHASE.ACTIVE;
      state.ticksRemaining = definition.timing.windupTicks > 0
        ? definition.timing.windupTicks
        : definition.timing.activeTicks;
      state.hitTargets.clear();
      return Object.freeze({
        participantId,
        inputChannel,
        lane: definition.lane,
        actionDefinitionId: definition.id,
        candidateId,
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
}
