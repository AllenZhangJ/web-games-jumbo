import { ProductCanvasUiSurface } from '@number-strategy-jump/arena-product-presentation-three';
import type { ProductPresentationSession } from '@number-strategy-jump/arena-product-presentation';
import { createArenaProductGame } from './product-game-composition.js';
import { createArenaProductRendererFactory } from './product-renderer-composition.js';
import {
  createArenaPresentationMemoryProviderForLaunch,
  resolveArenaPresentationQualityForLaunch,
} from './presentation-launch.js';
import { optionalDataField, ownDataOptions } from './capability.js';

const rendererFactory = createArenaProductRendererFactory({
  uiSurfaceFactory: (...args: unknown[]) => new ProductCanvasUiSurface(
    args[0] as ConstructorParameters<typeof ProductCanvasUiSurface>[0],
  ),
});

export function createCanvasArenaProductGame(
  platform: unknown,
  options: unknown = {},
): ProductPresentationSession {
  const dataOptions = ownDataOptions(options, 'createCanvasArenaProductGame options');
  const platformId = optionalDataField(platform, 'id', 'createCanvasArenaProductGame platform');
  if (typeof platformId !== 'string' || platformId.trim().length === 0) {
    throw new TypeError('createCanvasArenaProductGame platform.id 必须是非空字符串。');
  }
  const qualityDefinition = dataOptions.qualityDefinition
    ?? resolveArenaPresentationQualityForLaunch({ platformId });
  const performanceMemoryProvider = dataOptions.performanceMemoryProvider
    ?? createArenaPresentationMemoryProviderForLaunch({
      root: globalThis,
      platformId,
    });
  return createArenaProductGame(platform, {
    ...dataOptions,
    rendererFactory,
    qualityDefinition,
    performanceMemoryProvider,
  });
}
