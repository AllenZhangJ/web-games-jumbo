import {
  createMovementRuntimeSnapshot,
  createMovementRuntimeState,
  type MovementRuntimeSnapshot,
  type MovementRuntimeState,
} from './movement-runtime.js';

import type { CharacterDefinition } from '@number-strategy-jump/arena-definitions';

export interface MovementDefinitionResolver {
  readonly characterDefinitionById: (characterDefinitionId: string) => CharacterDefinition;
}

function compareParticipantIds(
  left: MovementRuntimeSnapshot,
  right: MovementRuntimeSnapshot,
): number {
  if (left.participantId < right.participantId) return -1;
  if (left.participantId > right.participantId) return 1;
  return 0;
}

export function serializeMovementRuntimeStates(
  states: readonly MovementRuntimeState[],
  { characterDefinitionById }: MovementDefinitionResolver,
): readonly MovementRuntimeSnapshot[] {
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

export function deserializeMovementRuntimeState(
  snapshot: unknown,
  { characterDefinitionById }: MovementDefinitionResolver,
): MovementRuntimeState {
  if (typeof characterDefinitionById !== 'function') {
    throw new TypeError('MovementSerializer 需要 characterDefinitionById()。');
  }
  const characterDefinitionId = snapshot !== null && typeof snapshot === 'object'
    ? Reflect.get(snapshot, 'characterDefinitionId')
    : undefined;
  const definition = characterDefinitionById(characterDefinitionId as string);
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
