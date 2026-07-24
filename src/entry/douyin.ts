import { createDouyinPlatform } from '@number-strategy-jump/arena-platform-runtime/douyin';
import { createCanvasArenaProductGame } from '@number-strategy-jump/arena-v1-application-launch';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createDouyinPlatform(), {
  createGame: createCanvasArenaProductGame,
  onError: (error: unknown) => {
    console.error('抖音小游戏产品流程启动失败', error);
    showMiniGameStartupError((globalThis as { tt?: unknown }).tt, '游戏启动失败');
  },
});
