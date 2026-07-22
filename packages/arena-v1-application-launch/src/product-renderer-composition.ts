import { ProductRenderer } from '@number-strategy-jump/arena-product-presentation';
import { ArenaGreyboxRenderer } from '@number-strategy-jump/arena-presentation-three';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '@number-strategy-jump/arena-v1-presentation-content';
import { ownDataOptions, requiredFunction } from './capability.js';

const OPTION_KEYS = new Set(['uiSurfaceFactory', 'gameplayRendererFactory']);

export type ArenaProductRendererFactory = (options: unknown) => ProductRenderer;

export function createArenaProductRendererFactory(
  optionsValue: unknown,
): ArenaProductRendererFactory {
  const options = ownDataOptions(
    optionsValue,
    'createArenaProductRendererFactory options',
    OPTION_KEYS,
  );
  const uiSurfaceFactory = requiredFunction(options.uiSurfaceFactory, 'uiSurfaceFactory');
  const gameplayRendererFactory = options.gameplayRendererFactory === undefined
    ? ((...args: unknown[]) => {
      const rendererOptions = ownDataOptions(
        args[0],
        'Arena Gameplay Renderer factory options',
        new Set(['canvas', 'platform', 'qualityDefinition']),
      );
      return new ArenaGreyboxRenderer({
        canvas: rendererOptions.canvas,
        platform: rendererOptions.platform,
        qualityDefinition: rendererOptions.qualityDefinition,
        content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
      });
    })
    : requiredFunction(options.gameplayRendererFactory, 'gameplayRendererFactory');
  return (...args: unknown[]) => {
    const factoryOptions = ownDataOptions(
      args[0],
      'Arena Product Renderer factory options',
      new Set(['canvas', 'platform', 'qualityDefinition']),
    );
    return new ProductRenderer({
      canvas: factoryOptions.canvas,
      platform: factoryOptions.platform,
      qualityDefinition: factoryOptions.qualityDefinition,
      uiSurfaceFactory,
      gameplayRendererFactory,
    });
  };
}
