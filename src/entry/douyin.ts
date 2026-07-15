import { createDouyinPlatform } from '@number-strategy/platform';
import { launchGame } from './launch-game.js';
import { showMiniGameStartupError } from './mini-game-startup-fallback.js';
import { createNumberStrategyGame } from './compose-game.js';

void launchGame(() => createDouyinPlatform(), {
  createGame: createNumberStrategyGame,
  onError: (error: unknown) => {
    console.error('抖音小游戏启动失败', error);
    showMiniGameStartupError((globalThis as { tt?: unknown }).tt as never, '游戏启动失败');
  },
});
