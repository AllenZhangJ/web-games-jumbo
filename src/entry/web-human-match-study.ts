import '../product-styles.css';
import '../human-match-study.css';
import {
  clearWebStartupError,
  launchGame,
  showWebStartupError,
} from '@number-strategy-jump/arena-platform-runtime';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import { HumanMatchStudyWebApp } from './human-match-study-web-app.js';

void launchGame(() => createWebPlatform(), {
  createGame: (platform: unknown) => new HumanMatchStudyWebApp({
    platform: platform as ArenaPlatformContract,
  }),
  onSuccess: () => clearWebStartupError(),
  onError: (error: unknown) => {
    console.error('Arena S9.5 真人公平性工作台启动失败', error);
    showWebStartupError(error);
  },
});
