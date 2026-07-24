import { createDouyinPlatform } from '@number-strategy-jump/arena-platform-runtime/douyin';
import { createArenaGame } from '@number-strategy-jump/arena-v1-greybox-session';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createDouyinPlatform(), {
  createGame: createArenaGame,
  onError: (error: unknown) => {
    console.error('抖音小游戏灰盒回退入口启动失败', error);
    showMiniGameStartupError((globalThis as { tt?: unknown }).tt, '游戏启动失败');
  },
});
