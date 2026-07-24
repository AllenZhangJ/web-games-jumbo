import { createWeChatPlatform } from '@number-strategy-jump/arena-platform-runtime/wechat';
import { createCanvasArenaProductGame } from '@number-strategy-jump/arena-v1-application-launch';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createWeChatPlatform(), {
  createGame: createCanvasArenaProductGame,
  onError: (error: unknown) => {
    console.error('微信小游戏产品流程启动失败', error);
    showMiniGameStartupError((globalThis as { wx?: unknown }).wx, '游戏启动失败');
  },
});
