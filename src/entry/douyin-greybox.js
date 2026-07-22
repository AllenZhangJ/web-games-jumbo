import { createDouyinPlatform } from '@number-strategy-jump/arena-platform-runtime/douyin';
import { createArenaGame } from './create-arena-game.js';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createDouyinPlatform(), {
  createGame: createArenaGame,
  onError: (error) => {
    console.error('抖音小游戏灰盒回退入口启动失败', error);
    showMiniGameStartupError(globalThis.tt, '游戏启动失败');
  },
});
