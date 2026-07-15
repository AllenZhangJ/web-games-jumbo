import { createWeChatPlatform } from '../platform/wechat.js';
import { launchGame } from './launch-game.js';
import { showMiniGameStartupError } from './mini-game-startup-fallback.js';
import { createNumberStrategyGame } from './compose-game.js';

void launchGame(() => createWeChatPlatform(), {
  createGame: createNumberStrategyGame,
  onError: (error) => {
    console.error('微信小游戏启动失败', error);
    showMiniGameStartupError(globalThis.wx, '游戏启动失败');
  },
});
