import {
  ProductCanvasUiSurface,
} from '@number-strategy-jump/arena-product-presentation-three';
import { createArenaProductGame } from './create-arena-product-game.js';
import { createArenaProductRendererFactory } from './create-arena-product-renderer.js';
import { resolveArenaPresentationQualityForLaunch } from './arena-presentation-quality-launch.js';
import {
  createArenaPresentationMemoryProviderForLaunch,
} from './arena-presentation-memory-launch.js';

const rendererFactory = createArenaProductRendererFactory({
  uiSurfaceFactory: (args) => new ProductCanvasUiSurface(args),
});

export function createCanvasArenaProductGame(platform, options = {}) {
  const qualityDefinition = options.qualityDefinition
    ?? resolveArenaPresentationQualityForLaunch({ platformId: platform.id });
  const performanceMemoryProvider = options.performanceMemoryProvider
    ?? createArenaPresentationMemoryProviderForLaunch({
      root: globalThis,
      platformId: platform.id,
    });
  return createArenaProductGame(platform, {
    ...options,
    rendererFactory,
    qualityDefinition,
    performanceMemoryProvider,
  });
}
