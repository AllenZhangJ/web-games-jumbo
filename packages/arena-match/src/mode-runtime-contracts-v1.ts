export const MODE_RUNTIME_LIFECYCLE_STATE_V1 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeRuntimeLifecycleStateV1 =
  typeof MODE_RUNTIME_LIFECYCLE_STATE_V1[keyof typeof MODE_RUNTIME_LIFECYCLE_STATE_V1];

export interface RaceModeRankingV1 {
  readonly participantId: string;
  readonly rank: number;
  readonly finishTick: number | null;
  readonly progressOrdinal: number;
}

export interface RaceModeResultV1 {
  readonly kind: 'race';
  readonly winnerParticipantIds: readonly string[];
  readonly rankings: readonly RaceModeRankingV1[];
  readonly reason: 'finish-claimed' | 'no-finisher';
  readonly endedAtTick: number;
}

export type RaceModeCommandV1 =
  | Readonly<{
    readonly kind: 'commit-safe-anchor';
    readonly participantId: string;
    readonly anchorId: string;
    readonly progressOrdinal: number;
  }>
  | Readonly<{
    readonly kind: 'record-finish-claim';
    readonly participantId: string;
    readonly finishTick: number;
    readonly progressOrdinal: number;
  }>
  | Readonly<{
    readonly kind: 'schedule-respawn';
    readonly participantId: string;
    readonly readyTick: number;
    readonly anchorId: string;
    readonly protectionTicks: number;
  }>
  | Readonly<{
    readonly kind: 'respawn-participant';
    readonly participantId: string;
    readonly anchorId: string;
    readonly protectionTicks: number;
  }>
  | Readonly<{
    readonly kind: 'end-race';
    readonly result: RaceModeResultV1;
  }>;

export interface SurvivalModeResultV1 {
  readonly kind: 'survival';
  readonly playerParticipantId: string;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly fallCount: number;
  readonly reason: 'terminal-player-fall' | 'survival-time-cap';
  readonly endedAtTick: number;
}

export type SurvivalModeCommandV1 =
  | Readonly<{
    readonly kind: 'count-player-fall';
    readonly participantId: string;
    readonly fallCount: number;
    readonly terminalFallCount: 2;
    readonly terminal: boolean;
  }>
  | Readonly<{
    readonly kind: 'schedule-player-respawn';
    readonly participantId: string;
    readonly readyTick: number;
    readonly anchorId: string;
    readonly protectionTicks: number;
  }>
  | Readonly<{
    readonly kind: 'respawn-player';
    readonly participantId: string;
    readonly anchorId: string;
    readonly protectionTicks: number;
  }>
  | Readonly<{
    readonly kind: 'change-enemy-slot';
    readonly participantId: string;
    readonly slotId: string;
    readonly previousGeneration: number;
    readonly generation: number;
    readonly active: boolean;
    readonly anchorId: string | null;
    readonly reason: 'pressure-stage' | 'reactivation-ready' | 'fell';
  }>
  | Readonly<{
    readonly kind: 'end-survival';
    readonly result: SurvivalModeResultV1;
  }>;

export interface ModeRuntimeTickResolutionV1<TState, TCommand> {
  readonly tick: number;
  readonly commands: readonly TCommand[];
  readonly state: TState;
}
