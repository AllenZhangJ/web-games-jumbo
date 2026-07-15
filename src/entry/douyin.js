import { createDouyinPlatform } from '../platform/douyin.js';
import { launchGame } from './launch-game.js';
import { showMiniGameStartupError } from './mini-game-startup-fallback.js';

void launchGame(() => createDouyinPlatform(), {
  onError: (error) => {
    console.error('抖音小游戏启动失败', error);
    showMiniGameStartupError(globalThis.tt, '游戏启动失败');
  },
});
