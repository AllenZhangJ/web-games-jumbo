import '../input-pilot.css';
import {
  clearWebStartupError,
  launchGame,
  showWebStartupError,
} from '@number-strategy-jump/arena-platform-runtime';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import { InputPilotWebApp } from './input-pilot-web-app.js';

void launchGame(() => createWebPlatform(), {
  createGame: (platform: unknown) => new InputPilotWebApp({
    platform: platform as ArenaPlatformContract,
  }),
  onSuccess: () => clearWebStartupError(),
  onError: (error: unknown) => {
    console.error('竞技场输入盲测启动失败', error);
    showWebStartupError(error);
  },
});
