import type * as THREE from 'three';
import type { RenderQualityProfile } from '../diagnostics/performance-budget.js';
import { CoreEffectsRuntime, type CoreEffectsFrame } from './core-effects-runtime.js';
import type { EffectRuntime } from './effect-runtime.js';

export type ThreeEffectRuntime = EffectRuntime<CoreEffectsFrame> & {
  snapshot(): Readonly<Record<string, unknown>>;
};

export type ThreeEffectFactory = (
  root: THREE.Object3D,
  profile: RenderQualityProfile,
) => ThreeEffectRuntime;

export class EffectRegistry {
  readonly #factories = new Map<string, ThreeEffectFactory>();

  register(id: string, factory: ThreeEffectFactory): this {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) {
      throw new TypeError('特效 id 必须是小写短横线标识符。');
    }
    if (this.#factories.has(id)) throw new Error(`特效重复注册：${id}`);
    this.#factories.set(id, factory);
    return this;
  }

  create(id: string, root: THREE.Object3D, profile: RenderQualityProfile): ThreeEffectRuntime {
    const factory = this.#factories.get(id);
    if (!factory) throw new Error(`未注册特效：${id}`);
    return factory(root, profile);
  }

  keys(): readonly string[] {
    return Object.freeze([...this.#factories.keys()]);
  }
}

export function createBuiltinEffectRegistry(): EffectRegistry {
  return new EffectRegistry().register(
    'three-core-effects',
    (root, profile) => new CoreEffectsRuntime(root, profile),
  );
}
