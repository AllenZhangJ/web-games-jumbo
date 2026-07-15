import { NumberStrategyGame } from './game.js';

let pendingGame = null;
let bootstrapRevision = 0;

export async function bootstrap(platform, options) {
  const revision = ++bootstrapRevision;
  const previous = globalThis.__NUMBER_STRATEGY_GAME__;
  if (previous && typeof previous.destroy === 'function') {
    try {
      previous.destroy();
    } catch {
      // A broken old instance must not block the replacement main flow.
    } finally {
      if (globalThis.__NUMBER_STRATEGY_GAME__ === previous) {
        delete globalThis.__NUMBER_STRATEGY_GAME__;
      }
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
  globalThis.__NUMBER_STRATEGY_GAME__ = game;
  pendingGame = null;
  return game;
}
