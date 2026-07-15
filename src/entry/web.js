import '../styles.css';
import { launchGame } from './launch-game.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';
import { createWebPlatform } from '../platform/web.js';
import { createNumberStrategyGame } from './compose-game.js';

void launchGame(() => createWebPlatform(), {
  createGame: createNumberStrategyGame,
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('游戏启动失败', error);
    showWebStartupError(error);
  },
});
