import '../product-styles.css';
import '../human-match-study.css';
import { createWebPlatform } from '../platform/web.js';
import { HumanMatchStudyWebApp } from './human-match-study-web-app.js';
import {
  clearWebStartupError,
  launchGame,
  showWebStartupError,
} from '@number-strategy-jump/arena-platform-runtime';

void launchGame(() => createWebPlatform(), {
  createGame: (platform) => new HumanMatchStudyWebApp({ platform }),
  onSuccess: () => clearWebStartupError(),
  onError: (error) => {
    console.error('Arena S9.5 真人公平性工作台启动失败', error);
    showWebStartupError(error);
  },
});
