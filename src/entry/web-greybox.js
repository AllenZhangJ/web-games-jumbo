import '../styles.css';
import { createArenaGame } from '@number-strategy-jump/arena-v1-greybox-session';
import {
  bindWebGameTeardown,
  clearWebStartupError,
  launchGame,
  showWebStartupError,
  stopLaunchedGame,
} from '@number-strategy-jump/arena-platform-runtime';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';

bindWebGameTeardown(globalThis, stopLaunchedGame);

void launchGame(() => createWebPlatform(), {
  createGame: createArenaGame,
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('竞技场灰盒回退入口启动失败', error);
    showWebStartupError(error);
  },
});
