import '../styles.css';
import { createArenaGame } from './create-arena-game.js';
import { launchGame } from './launch-game.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';
import { createWebPlatform } from '../platform/web.js';

void launchGame(() => createWebPlatform(), {
  createGame: createArenaGame,
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('游戏启动失败', error);
    showWebStartupError(error);
  },
});
