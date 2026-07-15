import type { CharacterDefinition } from '@number-strategy/game-contracts';
import { CharacterRig } from './character-rig.js';

export type CharacterRendererFactory = (definition: CharacterDefinition) => CharacterRig;

export class CharacterRendererRegistry {
  readonly #factories = new Map<string, CharacterRendererFactory>();

  register(rendererKey: string, factory: CharacterRendererFactory): this {
    if (!/^[a-z][a-z0-9-]*$/.test(rendererKey)) {
      throw new TypeError('角色 rendererKey 必须是小写短横线标识符。');
    }
    if (this.#factories.has(rendererKey)) throw new Error(`角色渲染器重复注册：${rendererKey}`);
    this.#factories.set(rendererKey, factory);
    return this;
  }

  create(definition: CharacterDefinition): CharacterRig {
    const factory = this.#factories.get(definition.rendererKey);
    if (!factory) throw new Error(`未注册角色渲染器：${definition.rendererKey}`);
    return factory(definition);
  }

  keys(): readonly string[] {
    return Object.freeze([...this.#factories.keys()]);
  }
}

export function createBuiltinCharacterRendererRegistry(): CharacterRendererRegistry {
  return new CharacterRendererRegistry()
    .register('three-procedural-jumbo', (definition) => new CharacterRig(definition));
}
