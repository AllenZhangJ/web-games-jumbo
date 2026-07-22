import '../input-pilot.css';
import { InputPilotWebApp } from './input-pilot-web-app.js';
import {
  clearWebStartupError,
  launchGame,
  showWebStartupError,
} from '@number-strategy-jump/arena-platform-runtime';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';

void launchGame(() => createWebPlatform(), {
  createGame: (platform) => new InputPilotWebApp({ platform }),
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('竞技场输入盲测启动失败', error);
    showWebStartupError(error);
  },
});
