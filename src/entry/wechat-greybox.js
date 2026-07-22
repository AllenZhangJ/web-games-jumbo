import { createWeChatPlatform } from '@number-strategy-jump/arena-platform-runtime/wechat';
import { createArenaGame } from '@number-strategy-jump/arena-v1-greybox-session';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createWeChatPlatform(), {
  createGame: createArenaGame,
  onError: (error) => {
    console.error('微信小游戏灰盒回退入口启动失败', error);
    showMiniGameStartupError(globalThis.wx, '游戏启动失败');
  },
});
