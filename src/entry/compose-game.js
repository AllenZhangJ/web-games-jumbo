import { NumberStrategyGame } from '@number-strategy/application';
import { Renderer3D } from '../render3d/renderer3d.js';

export function createNumberStrategyGame(platform, options = {}) {
  return new NumberStrategyGame(platform, {
    ...options,
    rendererFactory: (canvas, rendererPlatform) => {
      const renderer = new Renderer3D(canvas, rendererPlatform);
      return {
        load: () => renderer.load(),
        resize: () => renderer.resize(),
        render: (snapshot) => renderer.draw(
          snapshot.state,
          snapshot.world,
          snapshot.presentation,
        ),
        dispose: () => renderer.destroy(),
        hitTest: (point) => renderer.hitTest(point),
        toDesignPoint: (point) => renderer.toDesignPoint(point),
        choiceIndexForControl: (control, candidates) => (
          renderer.choiceIndexForControl(control, [...candidates])
        ),
        getDebugSnapshot: () => renderer.getDebugSnapshot(),
      };
    },
  });
}
