import '../product-styles.css';
import { createArenaProductGame, createArenaProductRendererFactory } from '@number-strategy-jump/arena-v1-application-launch';
import {
  bindWebGameTeardown,
  clearWebStartupError,
  launchGame,
  showWebStartupError,
  stopLaunchedGame,
} from '@number-strategy-jump/arena-platform-runtime';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';
import { WebProductUiSurface } from './web-product-ui-surface.js';
import { createArenaPresentationMemoryProviderForLaunch, resolveArenaPresentationQualityForLaunch } from '@number-strategy-jump/arena-v1-application-launch';

function productUiRoot(): HTMLElement {
  const root = globalThis.document?.querySelector<HTMLElement>('#arena-product-ui');
  if (!root) throw new Error('产品页面缺少 #arena-product-ui。');
  return root;
}

function rendererCanvas(optionsValue: unknown): HTMLCanvasElement {
  if (!optionsValue || typeof optionsValue !== 'object' || Array.isArray(optionsValue)) {
    throw new TypeError('Web Product UI factory options 无效。');
  }
  const descriptor = Object.getOwnPropertyDescriptor(optionsValue, 'canvas');
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError('Web Product UI factory canvas 必须是数据字段。');
  }
  const canvas = descriptor.value;
  if (!canvas || typeof canvas !== 'object' || typeof canvas.setAttribute !== 'function') {
    throw new TypeError('Web Product UI factory 需要 DOM Canvas。');
  }
  return canvas as HTMLCanvasElement;
}

const rendererFactory = createArenaProductRendererFactory({
  uiSurfaceFactory: (options: unknown) => new WebProductUiSurface({
    canvas: rendererCanvas(options),
    root: productUiRoot(),
  }),
});

function createWebProductGame(platform: ReturnType<typeof createWebPlatform>) {
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
  onSuccess: (game: unknown) => {
    const productGame = game as ReturnType<typeof createArenaProductGame>;
    clearWebStartupError();
    if (productGame.getLastSnapshot()?.viewModel?.screen?.sceneId !== 'gameplay') {
      globalThis.document?.querySelector?.('#game')?.setAttribute?.('aria-hidden', 'true');
    }
  },
  onError: (error: unknown) => {
    console.error('竞技场产品流程启动失败', error);
    showWebStartupError(error);
  },
});
