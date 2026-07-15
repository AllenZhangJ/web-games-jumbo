import {
  createSaveEnvelope,
  type GameIdentity,
  type ReplayAction,
  type SaveEnvelope,
} from './save-envelope.js';

export interface ReplayDriver {
  jump(choiceIndex: 0 | 1, chargeMs: number): boolean;
  restart(): boolean;
  nextRound(): boolean;
}

export class ReplayRecorder {
  readonly game: GameIdentity;
  readonly actions: ReplayAction[];

  constructor(game: GameIdentity, actions: readonly ReplayAction[] = []) {
    this.game = game;
    this.actions = [...actions];
  }

  append(action: ReplayAction): void {
    const candidate = createSaveEnvelope({
      savedAtMs: 0,
      game: this.game,
      actions: [...this.actions, action],
    });
    this.actions.splice(0, this.actions.length, ...candidate.replay.actions);
  }

  envelope(savedAtMs: number): SaveEnvelope {
    return createSaveEnvelope({ savedAtMs, game: this.game, actions: this.actions });
  }
}

export function replaySave(envelope: SaveEnvelope, driver: ReplayDriver): number {
  let completed = 0;
  for (const action of envelope.replay.actions) {
    let accepted = false;
    if (action.type === 'jump') accepted = driver.jump(action.choiceIndex, action.chargeMs);
    else if (action.type === 'restart') accepted = driver.restart();
    else accepted = driver.nextRound();
    if (!accepted) throw new Error(`回放在动作 ${completed} (${action.type}) 被拒绝。`);
    completed += 1;
  }
  return completed;
}
