import { ProductPresentationSession } from '../arena/presentation/session/product-presentation-session.js';

export function createArenaProductGame(platform, options) {
  return new ProductPresentationSession(platform, options);
}
