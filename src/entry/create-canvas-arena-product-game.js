import {
  ProductCanvasUiSurface,
} from '../arena/presentation/canvas/product-canvas-ui-surface.js';
import { createArenaProductGame } from './create-arena-product-game.js';
import { createArenaProductRendererFactory } from './create-arena-product-renderer.js';

const rendererFactory = createArenaProductRendererFactory({
  uiSurfaceFactory: (args) => new ProductCanvasUiSurface(args),
});

export function createCanvasArenaProductGame(platform) {
  return createArenaProductGame(platform, { rendererFactory });
}
