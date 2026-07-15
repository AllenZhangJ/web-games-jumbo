import type { GameCommand } from '@number-strategy/game-contracts';

export class CommandHandler<TResult = unknown> {
  readonly #execute: (command: GameCommand) => TResult;

  constructor(execute: (command: GameCommand) => TResult) {
    this.#execute = execute;
  }

  handle(command: GameCommand): TResult {
    if (command.type === 'tick' && (!Number.isFinite(command.deltaMs) || command.deltaMs <= 0)) {
      throw new RangeError('tick.deltaMs 必须是正有限数。');
    }
    if ('pointerId' in command && !Number.isSafeInteger(command.pointerId)) {
      throw new TypeError('pointerId 必须是安全整数。');
    }
    return this.#execute(command);
  }
}
