import { createWeChatPlatform } from '../platform/wechat.js';
import { createCanvasArenaProductGame } from './create-canvas-arena-product-game.js';
import {
  launchGame,
  showMiniGameStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createWeChatPlatform(), {
  createGame: createCanvasArenaProductGame,
  onError: (error) => {
    console.error('微信小游戏产品流程启动失败', error);
    showMiniGameStartupError(globalThis.wx, '游戏启动失败');
  },
});
