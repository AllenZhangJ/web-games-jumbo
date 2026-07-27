export const ARENA_ACTION_PHASE = Object.freeze({
  IDLE: 'idle',
  WINDUP: 'windup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
} as const);

export type ArenaActionPhase =
  typeof ARENA_ACTION_PHASE[keyof typeof ARENA_ACTION_PHASE];

export type ActionCommitmentStatus = 'charging' | 'committed';

export interface ActionCommitmentFacing {
  x: number;
  z: number;
}

export interface ActionRuntimeState {
  definitionId: string | null;
  phase: ArenaActionPhase;
  ticksRemaining: number;
  readonly hitTargets: Set<string>;
  commitmentStartedTick: number | null;
  commitmentStatus: ActionCommitmentStatus | null;
  commitmentChargeTicks: number;
  commitmentChargeLevel: number;
  commitmentFacingAtStart: ActionCommitmentFacing | null;
  commitmentFacingAtResult: ActionCommitmentFacing | null;
}

export function createActionRuntimeState(): ActionRuntimeState {
  return {
    definitionId: null,
    phase: ARENA_ACTION_PHASE.IDLE,
    ticksRemaining: 0,
    hitTargets: new Set<string>(),
    commitmentStartedTick: null,
    commitmentStatus: null,
    commitmentChargeTicks: 0,
    commitmentChargeLevel: 0,
    commitmentFacingAtStart: null,
    commitmentFacingAtResult: null,
  };
}

export function resetActionRuntimeState(action: ActionRuntimeState): void {
  action.definitionId = null;
  action.phase = ARENA_ACTION_PHASE.IDLE;
  action.ticksRemaining = 0;
  action.hitTargets.clear();
  action.commitmentStartedTick = null;
  action.commitmentStatus = null;
  action.commitmentChargeTicks = 0;
  action.commitmentChargeLevel = 0;
  action.commitmentFacingAtStart = null;
  action.commitmentFacingAtResult = null;
}
