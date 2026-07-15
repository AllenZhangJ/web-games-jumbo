import type { SceneDefinition } from '@number-strategy/game-contracts';
import type * as THREE from 'three';
import { Stage } from './stage.js';

export type SceneRendererFactory = (
  renderer: THREE.WebGLRenderer,
  definition: SceneDefinition,
) => Stage;

export class SceneRendererRegistry {
  readonly #factories = new Map<string, SceneRendererFactory>();

  register(rendererKey: string, factory: SceneRendererFactory): this {
    if (!/^[a-z][a-z0-9-]*$/.test(rendererKey)) {
      throw new TypeError('场景 rendererKey 必须是小写短横线标识符。');
    }
    if (this.#factories.has(rendererKey)) throw new Error(`场景渲染器重复注册：${rendererKey}`);
    this.#factories.set(rendererKey, factory);
    return this;
  }

  create(renderer: THREE.WebGLRenderer, definition: SceneDefinition): Stage {
    const factory = this.#factories.get(definition.rendererKey);
    if (!factory) throw new Error(`未注册场景渲染器：${definition.rendererKey}`);
    return factory(renderer, definition);
  }
}

export function createBuiltinSceneRendererRegistry(): SceneRendererRegistry {
  return new SceneRendererRegistry()
    .register('three-minimal-world', (renderer, definition) => new Stage(renderer, definition));
}
