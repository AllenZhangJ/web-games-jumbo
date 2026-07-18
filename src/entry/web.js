import '../product-styles.css';
import { createWebPlatform } from '../platform/web.js';
import { createArenaProductGame } from './create-arena-product-game.js';
import { createArenaProductRendererFactory } from './create-arena-product-renderer.js';
import { bindWebGameTeardown } from './web-game-teardown.js';
import { launchGame } from './launch-game.js';
import { WebProductUiSurface } from './web-product-ui-surface.js';
import { clearWebStartupError, showWebStartupError } from './web-startup-fallback.js';

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
  return createArenaProductGame(platform, { rendererFactory });
}

bindWebGameTeardown(globalThis);

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
