import '../styles.css';
import { createWebPlatform } from '../platform/web.js';
import { createArenaGame } from './create-arena-game.js';
import { bindWebGameTeardown } from './web-game-teardown.js';
import { launchGame } from './launch-game.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';

bindWebGameTeardown(globalThis);

void launchGame(() => createWebPlatform(), {
  createGame: createArenaGame,
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('竞技场灰盒回退入口启动失败', error);
    showWebStartupError(error);
  },
});
