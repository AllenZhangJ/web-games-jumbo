import {
  createMovementRuntimeSnapshot,
  createMovementRuntimeState,
} from './movement-runtime.js';

function compareParticipantIds(left, right) {
  if (left.participantId < right.participantId) return -1;
  if (left.participantId > right.participantId) return 1;
  return 0;
}

export function serializeMovementRuntimeStates(states, { characterDefinitionById }) {
  if (!Array.isArray(states)) throw new TypeError('MovementSerializer states 必须是数组。');
  if (typeof characterDefinitionById !== 'function') {
    throw new TypeError('MovementSerializer 需要 characterDefinitionById()。');
  }
  const snapshots = states.map((state) => createMovementRuntimeSnapshot(
    state,
    characterDefinitionById(state.characterDefinitionId),
  )).sort(compareParticipantIds);
  if (new Set(snapshots.map(({ participantId }) => participantId)).size !== snapshots.length) {
    throw new RangeError('MovementSerializer 不能序列化重复 participantId。');
  }
  return Object.freeze(snapshots);
}

export function deserializeMovementRuntimeState(snapshot, { characterDefinitionById }) {
  if (typeof characterDefinitionById !== 'function') {
    throw new TypeError('MovementSerializer 需要 characterDefinitionById()。');
  }
  const definition = characterDefinitionById(snapshot?.characterDefinitionId);
  const validated = createMovementRuntimeSnapshot(snapshot, definition);
  const state = createMovementRuntimeState({
    participantId: validated.participantId,
    characterDefinition: definition,
  });
  state.mode = validated.mode;
  state.coyoteTicksRemaining = validated.coyoteTicksRemaining;
  state.jumpBufferTicksRemaining = validated.jumpBufferTicksRemaining;
  state.airJumpsUsed = validated.airJumpsUsed;
  state.crouchChargeTicks = validated.crouchChargeTicks;
  state.crouchActionId = validated.crouchActionId;
  state.downSmashActionId = validated.downSmashActionId;
  state.revision = validated.revision;
  createMovementRuntimeSnapshot(state, definition);
  return state;
}
