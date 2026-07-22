import { ProductRenderer } from '@number-strategy-jump/arena-product-presentation';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '@number-strategy-jump/arena-v1-presentation-content';
import { ArenaGreyboxRenderer } from '@number-strategy-jump/arena-presentation-three';

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

/** Creates a platform composition factory without teaching Product Session about its host UI. */
export function createArenaProductRendererFactory({
  uiSurfaceFactory,
  gameplayRendererFactory,
}) {
  requiredFunction(uiSurfaceFactory, 'uiSurfaceFactory');
  if (gameplayRendererFactory !== undefined) {
    requiredFunction(gameplayRendererFactory, 'gameplayRendererFactory');
  }
  const resolvedGameplayRendererFactory = gameplayRendererFactory ?? ((args) => (
    new ArenaGreyboxRenderer({
      ...args,
      content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
    })
  ));
  return ({ canvas, platform, qualityDefinition }) => new ProductRenderer({
    canvas,
    platform,
    qualityDefinition,
    uiSurfaceFactory,
    gameplayRendererFactory: resolvedGameplayRendererFactory,
  });
}
