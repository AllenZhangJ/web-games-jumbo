import {
  definitionKey,
  type CharacterDefinition,
  type SceneDefinition,
  type VersionedDefinition,
} from '@number-strategy/game-contracts';

function assertFiniteColor(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffff) {
    throw new RangeError(`${path} 必须是 0x000000..0xffffff 的整数颜色。`);
  }
}

function assertRendererKey(value: string, path: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new TypeError(`${path} 必须是小写短横线标识符。`);
  }
}

export class ContentRegistry<TDefinition extends VersionedDefinition> {
  readonly #definitions = new Map<string, TDefinition>();

  register(definition: TDefinition): this {
    const key = definitionKey(definition);
    if (this.#definitions.has(key)) throw new Error(`内容重复注册：${key}`);
    this.validate(definition);
    this.#definitions.set(key, Object.freeze({ ...definition }) as TDefinition);
    return this;
  }

  protected validate(definition: TDefinition): void { void definition; }

  get(id: string, version?: number): TDefinition {
    if (version !== undefined) {
      const exact = this.#definitions.get(`${id}@${version}`);
      if (!exact) throw new Error(`未注册内容：${id}@${version}`);
      return exact;
    }
    const latest = [...this.#definitions.values()]
      .filter((definition) => definition.id === id)
      .sort((left, right) => right.version - left.version)[0];
    if (!latest) throw new Error(`未注册内容：${id}`);
    return latest;
  }

  resolve(id: string | undefined, fallbackId: string): {
    readonly definition: TDefinition;
    readonly usedFallback: boolean;
  } {
    try {
      return { definition: this.get(id ?? fallbackId), usedFallback: false };
    } catch {
      return { definition: this.get(fallbackId), usedFallback: true };
    }
  }

  list(): readonly TDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}

export class SceneRegistry extends ContentRegistry<SceneDefinition> {
  protected override validate(definition: SceneDefinition): void {
    assertRendererKey(definition.rendererKey, 'Scene.rendererKey');
    assertFiniteColor(definition.theme.background, 'Scene.theme.background');
    assertFiniteColor(definition.theme.floor, 'Scene.theme.floor');
    if (!(definition.theme.fogNear >= 0 && definition.theme.fogFar > definition.theme.fogNear)) {
      throw new RangeError('Scene fog 范围无效。');
    }
    assertFiniteColor(definition.lighting.hemisphereSky, 'Scene.lighting.hemisphereSky');
    assertFiniteColor(definition.lighting.hemisphereGround, 'Scene.lighting.hemisphereGround');
    assertFiniteColor(definition.lighting.directionalColor, 'Scene.lighting.directionalColor');
  }
}

export class CharacterRegistry extends ContentRegistry<CharacterDefinition> {
  protected override validate(definition: CharacterDefinition): void {
    assertRendererKey(definition.rendererKey, 'Character.rendererKey');
    assertFiniteColor(definition.primaryColor, 'Character.primaryColor');
    if (!Number.isFinite(definition.visualScale) || definition.visualScale <= 0) {
      throw new RangeError('Character.visualScale 必须是正有限数。');
    }
    for (const [path, assets] of Object.entries({
      textures: definition.assetManifest.textures,
      audio: definition.assetManifest.audio,
    })) {
      if (!Array.isArray(assets) || assets.some((asset) => typeof asset !== 'string' || asset.trim() !== asset)) {
        throw new TypeError(`Character.assetManifest.${path} 无效。`);
      }
    }
  }
}

export const DEFAULT_SCENE: SceneDefinition = Object.freeze({
  id: 'number-strategy-default',
  version: 1,
  rendererKey: 'three-minimal-world',
  theme: Object.freeze({
    background: 0xd8dde2,
    floor: 0xd1d6db,
    fogNear: 24,
    fogFar: 48,
  }),
  lighting: Object.freeze({
    hemisphereSky: 0xffffff,
    hemisphereGround: 0x8f9ba3,
    hemisphereIntensity: 1.75,
    directionalColor: 0xffffff,
    directionalIntensity: 3.2,
  }),
});

const DEFAULT_ANIMATIONS = Object.freeze({
  idle: 'procedural-idle',
  charging: 'procedural-squash',
  jumping: 'procedural-flip',
  landing: 'procedural-land',
  failed: 'procedural-fall',
});

export const DEFAULT_CHARACTER: CharacterDefinition = Object.freeze({
  id: 'jumbo-red',
  version: 1,
  rendererKey: 'three-procedural-jumbo',
  assetManifest: Object.freeze({ textures: Object.freeze([]), audio: Object.freeze([]) }),
  animationSet: DEFAULT_ANIMATIONS,
  visualScale: 1,
  primaryColor: 0xe53935,
});

export function createBuiltinSceneRegistry(): SceneRegistry {
  return new SceneRegistry().register(DEFAULT_SCENE);
}

export function createBuiltinCharacterRegistry(): CharacterRegistry {
  return new CharacterRegistry().register(DEFAULT_CHARACTER);
}

export function createProgrammaticCharacterDefinition(index: number): CharacterDefinition {
  if (!Number.isSafeInteger(index) || index < 1 || index > 10) {
    throw new RangeError('测试角色序号必须为 1..10。');
  }
  return Object.freeze({
    id: `fixture-character-${index}`,
    version: 1,
    rendererKey: 'three-procedural-jumbo',
    assetManifest: Object.freeze({ textures: Object.freeze([]), audio: Object.freeze([]) }),
    animationSet: DEFAULT_ANIMATIONS,
    visualScale: 0.9 + index * 0.02,
    primaryColor: (0x223344 + index * 0x080503) & 0xffffff,
  });
}
