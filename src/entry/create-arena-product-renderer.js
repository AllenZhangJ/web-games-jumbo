import { ProductRenderer } from '../arena/presentation/renderer/product-renderer.js';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '../arena/presentation/content/arena-gameplay-v2-content.js';
import { ArenaGreyboxRenderer } from '../arena/presentation/three/arena-greybox-renderer.js';

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
