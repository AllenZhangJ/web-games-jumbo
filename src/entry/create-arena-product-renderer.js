import { ProductRenderer } from '../arena/presentation/renderer/product-renderer.js';

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
  return ({ canvas, platform }) => new ProductRenderer({
    canvas,
    platform,
    uiSurfaceFactory,
    ...(gameplayRendererFactory === undefined ? {} : { gameplayRendererFactory }),
  });
}
