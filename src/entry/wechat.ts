import { createWeChatPlatform } from '@number-strategy/platform';
import { launchGame } from './launch-game.js';
import { showMiniGameStartupError } from './mini-game-startup-fallback.js';
import { createNumberStrategyGame } from './compose-game.js';

void launchGame(() => createWeChatPlatform(), {
  createGame: createNumberStrategyGame,
  onError: (error: unknown) => {
    console.error('微信小游戏启动失败', error);
    showMiniGameStartupError((globalThis as { wx?: unknown }).wx as never, '游戏启动失败');
  },
});
