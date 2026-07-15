import {
  NumberStrategyGame,
  type NumberStrategyGameOptions,
  type PlatformPort,
} from './number-strategy-game.js';

interface GameGlobal {
  __NUMBER_STRATEGY_GAME__?: NumberStrategyGame;
}

const root = globalThis as typeof globalThis & GameGlobal;
let pendingGame: NumberStrategyGame | null = null;
let bootstrapRevision = 0;

export async function bootstrap(
  platform: PlatformPort,
  options: NumberStrategyGameOptions,
): Promise<NumberStrategyGame> {
  const revision = ++bootstrapRevision;
  const previous = root.__NUMBER_STRATEGY_GAME__;
  if (previous) {
    try {
      previous.destroy();
    } catch {
      // A broken old instance must not block the replacement main flow.
    } finally {
      if (root.__NUMBER_STRATEGY_GAME__ === previous) delete root.__NUMBER_STRATEGY_GAME__;
    }
  }
  if (pendingGame && pendingGame !== previous) {
    try {
      pendingGame.destroy();
    } catch {
      // The stale async start will be rejected by the generation check below.
    }
  }

  const game = new NumberStrategyGame(platform, options);
  pendingGame = game;
  try {
    await game.start();
  } catch (error) {
    game.destroy();
    if (pendingGame === game) pendingGame = null;
    throw error;
  }
  if (revision !== bootstrapRevision || pendingGame !== game) {
    game.destroy();
    throw new Error('启动请求已被更新的游戏实例取代。');
  }
  root.__NUMBER_STRATEGY_GAME__ = game;
  pendingGame = null;
  return game;
}
