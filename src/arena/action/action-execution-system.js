import { ACTION_RESOLUTION_KIND } from './action-resolver.js';
import {
  ARENA_ACTION_PHASE,
  createActionRuntimeState,
  resetActionRuntimeState,
} from './action-state.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
} from '../rules/definition-utils.js';

const RESOLUTION_KEYS = new Set([
  'kind',
  'tick',
  'participantId',
  'reason',
  'candidateId',
  'actionDefinitionId',
  'source',
]);
const HIT_KEYS = new Set(['attackerId', 'targetId', 'actionDefinitionId']);

function compareIds(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function freezeTransition(participantId, definitionId, fromPhase, toPhase) {
  return Object.freeze({ participantId, actionDefinitionId: definitionId, fromPhase, toPhase });
}

export class ActionExecutionSystem {
  #actionRegistry;
  #participantIds;
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
    this.#participantIds = Object.freeze([...participantIds].sort(compareIds));
    this.#states = new Map(this.#participantIds.map((id) => [id, createActionRuntimeState()]));
    Object.freeze(this);
  }

  #requireParticipant(participantId) {
    const state = this.#states.get(participantId);
    if (!state) throw new RangeError(`未知 action participant ${String(participantId)}。`);
    return state;
  }

  advance() {
    const transitions = [];
    for (const participantId of this.#participantIds) {
      const state = this.#states.get(participantId);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      state.ticksRemaining -= 1;
      if (state.ticksRemaining > 0) continue;
      const definition = this.#actionRegistry.require(state.definitionId);
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
        definition.id,
        fromPhase,
        state.phase,
      ));
    }
    return Object.freeze(transitions);
  }

  start(resolutions) {
    if (!Array.isArray(resolutions)) throw new TypeError('Action resolutions 必须是数组。');
    const starts = [];
    const seenParticipants = new Set();
    for (const resolution of resolutions) {
      assertKnownKeys(resolution, RESOLUTION_KEYS, 'ActionResolution');
      if (resolution.kind !== ACTION_RESOLUTION_KIND.SELECTED) {
        throw new RangeError('ActionExecutionSystem.start 只接受 selected resolution。');
      }
      assertNonEmptyString(resolution.candidateId, 'ActionResolution.candidateId');
      assertNonEmptyString(resolution.source, 'ActionResolution.source');
      const participantId = assertNonEmptyString(
        resolution.participantId,
        'ActionResolution.participantId',
      );
      if (seenParticipants.has(participantId)) {
        throw new RangeError(`重复 action start participant ${participantId}。`);
      }
      seenParticipants.add(participantId);
      const state = this.#requireParticipant(participantId);
      if (state.phase !== ARENA_ACTION_PHASE.IDLE) {
        throw new Error(`participant ${participantId} 的 ActionState 非 idle。`);
      }
      const definition = this.#actionRegistry.require(resolution.actionDefinitionId);
      starts.push({ participantId, state, definition, candidateId: resolution.candidateId });
    }

    return Object.freeze(starts.map(({ participantId, state, definition, candidateId }) => {
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
      const key = `${attackerId}\u0000${targetId}`;
      if (seen.has(key)) throw new RangeError(`重复 ActionHit ${attackerId} -> ${targetId}。`);
      seen.add(key);
      const state = this.#requireParticipant(attackerId);
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
    if (!Array.isArray(participantIds)) throw new TypeError('interrupt participantIds 必须是数组。');
    const uniqueIds = [...new Set(participantIds)].sort(compareIds);
    for (const participantId of uniqueIds) this.#requireParticipant(participantId);
    const interrupted = [];
    for (const participantId of uniqueIds) {
      const state = this.#states.get(participantId);
      if (state.phase === ARENA_ACTION_PHASE.IDLE) continue;
      interrupted.push(Object.freeze({
        participantId,
        actionDefinitionId: state.definitionId,
        phase: state.phase,
      }));
      resetActionRuntimeState(state);
    }
    return Object.freeze(interrupted);
  }

  reset(participantId) {
    resetActionRuntimeState(this.#requireParticipant(participantId));
  }

  getSnapshot(participantId) {
    const state = this.#requireParticipant(participantId);
    return Object.freeze({
      definitionId: state.definitionId,
      phase: state.phase,
      ticksRemaining: state.ticksRemaining,
      hitTargetIds: Object.freeze([...state.hitTargets].sort(compareIds)),
    });
  }

  listSnapshots() {
    return Object.freeze(this.#participantIds.map((participantId) => Object.freeze({
      participantId,
      ...this.getSnapshot(participantId),
    })));
  }
}
