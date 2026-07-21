import {
  ACTION_INPUT_CHANNEL,
  ACTION_LANE,
} from '@number-strategy-jump/arena-definitions';
import { ACTION_RESOLUTION_KIND } from './action-resolver.js';
import {
  ARENA_ACTION_PHASE,
  createActionRuntimeState,
  resetActionRuntimeState,
} from './action-state.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

const RESOLUTION_KEYS = new Set([
  'kind',
  'tick',
  'participantId',
  'inputChannel',
  'lane',
  'reason',
  'candidateId',
  'actionDefinitionId',
  'source',
]);
const HIT_KEYS = new Set(['attackerId', 'targetId', 'actionDefinitionId']);
const ACTION_LANES = new Set(Object.values(ACTION_LANE));
const INPUT_CHANNELS = new Set(Object.values(ACTION_INPUT_CHANNEL));

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareStarts(left, right) {
  return compareText(left.participantId, right.participantId)
    || compareText(left.definition.lane, right.definition.lane)
    || compareText(left.definition.id, right.definition.id)
    || compareText(left.candidateId, right.candidateId);
}

function freezeTransition(participantId, lane, definitionId, fromPhase, toPhase) {
  return Object.freeze({
    participantId,
    lane,
    actionDefinitionId: definitionId,
    fromPhase,
    toPhase,
  });
}

function snapshotState(state) {
  return Object.freeze({
    definitionId: state.definitionId,
    phase: state.phase,
    ticksRemaining: state.ticksRemaining,
    hitTargetIds: Object.freeze([...state.hitTargets].sort(compareText)),
  });
}

function intersects(left, right) {
  return left.some((value) => right.has(value));
}

function remainsOccupiedAfterAdvance(state, definition) {
  if (state.phase === ARENA_ACTION_PHASE.IDLE) return false;
  if (state.ticksRemaining > 1) return true;
  if (state.phase === ARENA_ACTION_PHASE.WINDUP) return true;
  if (state.phase === ARENA_ACTION_PHASE.ACTIVE) {
    return definition.timing.recoveryTicks > 0;
  }
  return false;
}

export class ActionExecutionSystem {
  #actionRegistry;
  #participantIds;
  #laneIds;
  #states;

  constructor({ participantIds, actionRegistry }) {
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

  #requireParticipant(participantId) {
    const states = this.#states.get(participantId);
    if (!states) throw new RangeError(`未知 action participant ${String(participantId)}。`);
    return states;
  }

  #requireLaneState(participantId, lane) {
    if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 action lane ${String(lane)}。`);
    return this.#requireParticipant(participantId).get(lane);
  }

  advance() {
    const transitions = [];
    for (const participantId of this.#participantIds) {
      const states = this.#states.get(participantId);
      for (const lane of this.#laneIds) {
        const state = states.get(lane);
        if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
        state.ticksRemaining -= 1;
        if (state.ticksRemaining > 0) continue;
        const definition = this.#actionRegistry.require(state.definitionId);
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
        transitions.push(freezeTransition(
          participantId,
          lane,
          definition.id,
          fromPhase,
          state.phase,
        ));
      }
    }
    return Object.freeze(transitions);
  }

  start(resolutions) {
    if (!Array.isArray(resolutions)) throw new TypeError('Action resolutions 必须是数组。');
    const starts = [];
    const seenParticipantLanes = new Set();
    const seenParticipantChannels = new Set();
    for (const resolution of resolutions) {
      assertKnownKeys(resolution, RESOLUTION_KEYS, 'ActionResolution');
      if (resolution.kind !== ACTION_RESOLUTION_KIND.SELECTED) {
        throw new RangeError('ActionExecutionSystem.start 只接受 selected resolution。');
      }
      assertIntegerAtLeast(resolution.tick, 0, 'ActionResolution.tick');
      const participantId = assertNonEmptyString(
        resolution.participantId,
        'ActionResolution.participantId',
      );
      const lane = assertNonEmptyString(resolution.lane, 'ActionResolution.lane');
      const inputChannel = assertNonEmptyString(
        resolution.inputChannel,
        'ActionResolution.inputChannel',
      );
      if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 action lane ${lane}。`);
      if (!INPUT_CHANNELS.has(inputChannel)) {
        throw new RangeError(`未知 action input channel ${inputChannel}。`);
      }
      const candidateId = assertNonEmptyString(
        resolution.candidateId,
        'ActionResolution.candidateId',
      );
      assertNonEmptyString(resolution.source, 'ActionResolution.source');
      const laneKey = `${participantId}\u0000${lane}`;
      const channelKey = `${participantId}\u0000${inputChannel}`;
      if (seenParticipantLanes.has(laneKey)) {
        throw new RangeError(`重复 action start participant/lane ${participantId}/${lane}。`);
      }
      if (seenParticipantChannels.has(channelKey)) {
        throw new RangeError(
          `重复 action start participant/input ${participantId}/${inputChannel}。`,
        );
      }
      seenParticipantLanes.add(laneKey);
      seenParticipantChannels.add(channelKey);
      const state = this.#requireLaneState(participantId, lane);
      if (state.phase !== ARENA_ACTION_PHASE.IDLE) {
        throw new Error(`participant ${participantId} 的 ${lane} ActionState 非 idle。`);
      }
      const definition = this.#actionRegistry.require(resolution.actionDefinitionId);
      if (definition.lane !== lane || definition.input.channel !== inputChannel) {
        throw new RangeError(`ActionResolution ${definition.id} 的 lane/input 与定义不一致。`);
      }
      starts.push({ participantId, state, definition, candidateId, inputChannel });
    }

    const startsByParticipant = new Map();
    for (const start of starts) {
      const grouped = startsByParticipant.get(start.participantId) ?? [];
      grouped.push(start);
      startsByParticipant.set(start.participantId, grouped);
    }
    for (const [participantId, participantStarts] of startsByParticipant) {
      const constraints = this.getConstraints(participantId);
      const activeTags = new Set(constraints.activeConflictTags);
      for (const start of participantStarts) {
        if (intersects(start.definition.conflictTags, activeTags)) {
          throw new Error(`participant ${participantId} 的 ${start.definition.id} 与活动动作冲突。`);
        }
      }
      for (let left = 0; left < participantStarts.length; left += 1) {
        const leftTags = new Set(participantStarts[left].definition.conflictTags);
        for (let right = left + 1; right < participantStarts.length; right += 1) {
          if (intersects(participantStarts[right].definition.conflictTags, leftTags)) {
            throw new Error(
              `participant ${participantId} 的同 tick actions 存在 conflictTags 冲突。`,
            );
          }
        }
      }
    }

    starts.sort(compareStarts);
    return Object.freeze(starts.map(({
      participantId,
      state,
      definition,
      candidateId,
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

  recordHits(hits) {
    if (!Array.isArray(hits)) throw new TypeError('Action hits 必须是数组。');
    const pending = [];
    const seen = new Set();
    for (const hit of hits) {
      assertKnownKeys(hit, HIT_KEYS, 'ActionHit');
      const attackerId = assertNonEmptyString(hit.attackerId, 'ActionHit.attackerId');
      const targetId = assertNonEmptyString(hit.targetId, 'ActionHit.targetId');
      const actionDefinitionId = assertNonEmptyString(
        hit.actionDefinitionId,
        'ActionHit.actionDefinitionId',
      );
      const key = `${attackerId}\u0000${targetId}\u0000${actionDefinitionId}`;
      if (seen.has(key)) {
        throw new RangeError(`重复 ActionHit ${attackerId} -> ${targetId}/${actionDefinitionId}。`);
      }
      seen.add(key);
      const definition = this.#actionRegistry.require(actionDefinitionId);
      const state = this.#requireLaneState(attackerId, definition.lane);
      this.#requireParticipant(targetId);
      if (
        state.phase !== ARENA_ACTION_PHASE.ACTIVE
        || state.definitionId !== actionDefinitionId
      ) throw new Error(`ActionHit 与 ${attackerId} 的 active action 不一致。`);
      if (state.hitTargets.has(targetId)) {
        throw new Error(`ActionHit ${attackerId} -> ${targetId} 已在本动作结算。`);
      }
      pending.push({ state, targetId });
    }
    for (const { state, targetId } of pending) state.hitTargets.add(targetId);
  }

  interrupt(participantIds) {
    if (!Array.isArray(participantIds)) {
      throw new TypeError('interrupt participantIds 必须是数组。');
    }
    const uniqueIds = [...new Set(participantIds)].sort(compareText);
    for (const participantId of uniqueIds) this.#requireParticipant(participantId);
    const interrupted = [];
    for (const participantId of uniqueIds) {
      const states = this.#states.get(participantId);
      for (const lane of this.#laneIds) {
        const state = states.get(lane);
        if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
        interrupted.push(Object.freeze({
          participantId,
          lane,
          actionDefinitionId: state.definitionId,
          phase: state.phase,
        }));
        resetActionRuntimeState(state);
      }
    }
    return Object.freeze(interrupted);
  }

  reset(participantId) {
    for (const state of this.#requireParticipant(participantId).values()) {
      resetActionRuntimeState(state);
    }
  }

  getConstraints(participantId) {
    const states = this.#requireParticipant(participantId);
    const occupiedLanes = [];
    const activeConflictTags = new Set();
    for (const lane of this.#laneIds) {
      const state = states.get(lane);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      occupiedLanes.push(lane);
      const definition = this.#actionRegistry.require(state.definitionId);
      for (const tag of definition.conflictTags) activeConflictTags.add(tag);
    }
    return Object.freeze({
      occupiedLanes: Object.freeze(occupiedLanes),
      activeConflictTags: Object.freeze([...activeConflictTags].sort(compareText)),
    });
  }

  getNextTickConstraints(participantId) {
    const states = this.#requireParticipant(participantId);
    const occupiedLanes = [];
    const activeConflictTags = new Set();
    for (const lane of this.#laneIds) {
      const state = states.get(lane);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      const definition = this.#actionRegistry.require(state.definitionId);
      if (!remainsOccupiedAfterAdvance(state, definition)) continue;
      occupiedLanes.push(lane);
      for (const tag of definition.conflictTags) activeConflictTags.add(tag);
    }
    return Object.freeze({
      occupiedLanes: Object.freeze(occupiedLanes),
      activeConflictTags: Object.freeze([...activeConflictTags].sort(compareText)),
    });
  }

  getLaneSnapshot(participantId, lane) {
    return snapshotState(this.#requireLaneState(participantId, lane));
  }

  getSnapshot(participantId) {
    return this.getLaneSnapshot(participantId, ACTION_LANE.COMBAT);
  }

  listSnapshots() {
    return Object.freeze(this.#participantIds.map((participantId) => Object.freeze({
      participantId,
      ...this.getSnapshot(participantId),
    })));
  }

  listAllSnapshots() {
    return Object.freeze(this.#participantIds.flatMap((participantId) => (
      this.#laneIds.map((lane) => Object.freeze({
        participantId,
        lane,
        ...this.getLaneSnapshot(participantId, lane),
      }))
    )));
  }
}
