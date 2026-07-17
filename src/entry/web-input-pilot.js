import '../input-pilot.css';
import { createWebPlatform } from '../platform/web.js';
import { InputPilotWebApp } from './input-pilot-web-app.js';
import { launchGame } from './launch-game.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';

void launchGame(() => createWebPlatform(), {
  createGame: (platform) => new InputPilotWebApp({ platform }),
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('竞技场输入盲测启动失败', error);
    showWebStartupError(error);
  },
});
