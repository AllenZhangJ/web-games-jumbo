import '../styles.css';
import { createWebPlatform } from '../platform/web.js';
import { createArenaGame } from './create-arena-game.js';
import {
  bindWebGameTeardown,
  clearWebStartupError,
  launchGame,
  showWebStartupError,
  stopLaunchedGame,
} from '@number-strategy-jump/arena-platform-runtime';

bindWebGameTeardown(globalThis, stopLaunchedGame);

void launchGame(() => createWebPlatform(), {
  createGame: createArenaGame,
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('竞技场灰盒回退入口启动失败', error);
    showWebStartupError(error);
  },
});
