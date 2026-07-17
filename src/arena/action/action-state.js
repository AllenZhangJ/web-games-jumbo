export const ARENA_ACTION_PHASE = Object.freeze({
  IDLE: 'idle',
  WINDUP: 'windup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
});

export function createActionRuntimeState() {
  return {
    definitionId: null,
    phase: ARENA_ACTION_PHASE.IDLE,
    ticksRemaining: 0,
    hitTargets: new Set(),
  };
}

export function resetActionRuntimeState(action) {
  action.definitionId = null;
  action.phase = ARENA_ACTION_PHASE.IDLE;
  action.ticksRemaining = 0;
  action.hitTargets.clear();
}
