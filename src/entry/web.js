import '../product-styles.css';
import { createWebPlatform } from '../platform/web.js';
import { createArenaProductGame } from './create-arena-product-game.js';
import { createArenaProductRendererFactory } from './create-arena-product-renderer.js';
import {
  bindWebGameTeardown,
  clearWebStartupError,
  showWebStartupError,
} from '@number-strategy-jump/arena-platform-runtime';
import { launchGame, stopLaunchedGame } from './launch-game.js';
import { WebProductUiSurface } from './web-product-ui-surface.js';
import { resolveArenaPresentationQualityForLaunch } from './arena-presentation-quality-launch.js';
import {
  createArenaPresentationMemoryProviderForLaunch,
} from './arena-presentation-memory-launch.js';

function productUiRoot() {
  const root = globalThis.document?.querySelector?.('#arena-product-ui');
  if (!root) throw new Error('产品页面缺少 #arena-product-ui。');
  return root;
}

const rendererFactory = createArenaProductRendererFactory({
  uiSurfaceFactory: ({ canvas }) => new WebProductUiSurface({
    canvas,
    root: productUiRoot(),
  }),
});

function createWebProductGame(platform) {
  return createArenaProductGame(platform, {
    rendererFactory,
    qualityDefinition: resolveArenaPresentationQualityForLaunch({
      root: globalThis,
      platformId: platform.id,
    }),
    performanceMemoryProvider: createArenaPresentationMemoryProviderForLaunch({
      root: globalThis,
      platformId: platform.id,
    }),
  });
}

bindWebGameTeardown(globalThis, stopLaunchedGame);

void launchGame(() => createWebPlatform(), {
  createGame: createWebProductGame,
  onSuccess: (game) => {
    clearWebStartupError();
    if (game.getLastSnapshot()?.viewModel?.screen?.sceneId !== 'gameplay') {
      globalThis.document?.querySelector?.('#game')?.setAttribute?.('aria-hidden', 'true');
    }
  },
  onError: (error) => {
    console.error('竞技场产品流程启动失败', error);
    showWebStartupError(error);
  },
});
