import '../styles.css';
import { launchGame } from './launch-game.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';
import { createWebPlatform } from '../platform/web.js';

void launchGame(() => createWebPlatform(), {
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('游戏启动失败', error);
    showWebStartupError(error);
  },
});
