export const ARENA_ACTION_PHASE = Object.freeze({
  IDLE: 'idle',
  WINDUP: 'windup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
} as const);

export type ArenaActionPhase =
  typeof ARENA_ACTION_PHASE[keyof typeof ARENA_ACTION_PHASE];

export interface ActionRuntimeState {
  definitionId: string | null;
  phase: ArenaActionPhase;
  ticksRemaining: number;
  readonly hitTargets: Set<string>;
}

export function createActionRuntimeState(): ActionRuntimeState {
  return {
    definitionId: null,
    phase: ARENA_ACTION_PHASE.IDLE,
    ticksRemaining: 0,
    hitTargets: new Set<string>(),
  };
}

export function resetActionRuntimeState(action: ActionRuntimeState): void {
  action.definitionId = null;
  action.phase = ARENA_ACTION_PHASE.IDLE;
  action.ticksRemaining = 0;
  action.hitTargets.clear();
}
