import type { GameSnapshot } from '@number-strategy/game-contracts';
import type { DifficultyProfile } from '@number-strategy/difficulty';
import type { GameState } from '@number-strategy/gameplay';
import type { WorldState } from '@number-strategy/jump-engine';

export class SnapshotFactory {
  create({
    revision,
    state,
    world,
    presentation,
    difficulty,
    gameplayId,
    taskId,
  }: {
    readonly revision: number;
    readonly state: GameState;
    readonly world: WorldState;
    readonly presentation: Readonly<Record<string, unknown>>;
    readonly difficulty: DifficultyProfile;
    readonly gameplayId: string;
    readonly taskId: string;
  }): GameSnapshot {
    return Object.freeze({
      revision,
      phase: state.phase,
      gameplayId,
      taskId,
      difficultyId: difficulty.id,
      difficultyVersion: difficulty.version,
      state: Object.freeze({
        phase: state.phase,
        previousPhase: state.previousPhase,
        round: state.round,
        currentValue: state.currentValue,
        targetValue: state.targetValue,
        movesRemaining: state.movesRemaining,
        selectedChoice: state.selectedChoice,
        chargeMs: state.chargeMs,
        jumpProgress: state.jumpProgress,
        landingProgress: state.landingProgress,
        choices: state.choices.map((choice) => ({ ...choice })),
        operationHistory: state.operationHistory.map((operation) => ({ ...operation })),
        message: state.message,
      }),
      world: Object.freeze({ ...world.snapshot() }),
      presentation: Object.freeze({ ...presentation }),
    });
  }
}
