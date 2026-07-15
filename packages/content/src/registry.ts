import {
  definitionKey,
  type CharacterAccessory,
  type CharacterBodyShape,
  type CharacterDefinition,
  type CharacterMotionStyle,
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
    assertFiniteColor(definition.appearance.secondaryColor, 'Character.appearance.secondaryColor');
    if (!definition.presentation.name.trim() || !definition.presentation.description.trim()) {
      throw new TypeError('Character.presentation 必须包含名称和描述。');
    }
    if (!BODY_SHAPES.includes(definition.appearance.bodyShape)) {
      throw new TypeError('Character.appearance.bodyShape 无效。');
    }
    if (!ACCESSORIES.includes(definition.appearance.accessory)) {
      throw new TypeError('Character.appearance.accessory 无效。');
    }
    if (!MOTION_STYLES.includes(definition.appearance.motionStyle)) {
      throw new TypeError('Character.appearance.motionStyle 无效。');
    }
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

const BODY_SHAPES: readonly CharacterBodyShape[] = Object.freeze([
  'jumbo', 'capsule', 'orb', 'bot', 'cone',
]);
const ACCESSORIES: readonly CharacterAccessory[] = Object.freeze([
  'none', 'antenna', 'visor', 'ears', 'ring', 'crown',
]);
const MOTION_STYLES: readonly CharacterMotionStyle[] = Object.freeze([
  'balanced', 'spring', 'heavy', 'float', 'swift',
]);

function defineCharacter({
  id,
  name,
  description,
  primaryColor,
  secondaryColor,
  bodyShape,
  accessory,
  motionStyle,
  visualScale = 1,
}: {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly primaryColor: number;
  readonly secondaryColor: number;
  readonly bodyShape: CharacterBodyShape;
  readonly accessory: CharacterAccessory;
  readonly motionStyle: CharacterMotionStyle;
  readonly visualScale?: number;
}): CharacterDefinition {
  return Object.freeze({
    id,
    version: 1,
    presentation: Object.freeze({ name, description }),
    rendererKey: 'three-procedural-jumbo',
    assetManifest: Object.freeze({ textures: Object.freeze([]), audio: Object.freeze([]) }),
    animationSet: DEFAULT_ANIMATIONS,
    visualScale,
    primaryColor,
    appearance: Object.freeze({ bodyShape, accessory, motionStyle, secondaryColor }),
  });
}

export const DEFAULT_CHARACTER: CharacterDefinition = defineCharacter({
  id: 'jumbo-red',
  name: '赤红巨宝',
  description: '均衡稳定的经典跃迁者。',
  primaryColor: 0xe53935,
  secondaryColor: 0xffcdd2,
  bodyShape: 'jumbo',
  accessory: 'none',
  motionStyle: 'balanced',
});

export const BUILTIN_CHARACTERS: readonly CharacterDefinition[] = Object.freeze([
  DEFAULT_CHARACTER,
  defineCharacter({
    id: 'aqua-scout', name: '青蓝侦察', description: '轻巧敏捷的天线侦察员。',
    primaryColor: 0x16a6a1, secondaryColor: 0xb2dfdb,
    bodyShape: 'capsule', accessory: 'antenna', motionStyle: 'swift', visualScale: 0.94,
  }),
  defineCharacter({
    id: 'amber-bot', name: '琥珀机兵', description: '落地沉稳的方形机兵。',
    primaryColor: 0xffa000, secondaryColor: 0xffecb3,
    bodyShape: 'bot', accessory: 'visor', motionStyle: 'heavy', visualScale: 0.98,
  }),
  defineCharacter({
    id: 'violet-orbit', name: '紫曜环星', description: '带悬浮环的球形探索者。',
    primaryColor: 0x7e57c2, secondaryColor: 0xd1c4e9,
    bodyShape: 'orb', accessory: 'ring', motionStyle: 'float', visualScale: 0.96,
  }),
  defineCharacter({
    id: 'lime-spring', name: '青柠弹簧', description: '蓄力形变最鲜明的弹跳专家。',
    primaryColor: 0x7cb342, secondaryColor: 0xdcedc8,
    bodyShape: 'capsule', accessory: 'ears', motionStyle: 'spring', visualScale: 0.93,
  }),
  defineCharacter({
    id: 'cobalt-guard', name: '钴蓝守卫', description: '宽体重心带来可靠的落地感。',
    primaryColor: 0x3567c8, secondaryColor: 0xbbdefb,
    bodyShape: 'bot', accessory: 'antenna', motionStyle: 'heavy', visualScale: 1.04,
  }),
  defineCharacter({
    id: 'rose-comet', name: '玫红彗星', description: '尖锥轮廓与快速空翻。',
    primaryColor: 0xec407a, secondaryColor: 0xf8bbd0,
    bodyShape: 'cone', accessory: 'visor', motionStyle: 'swift', visualScale: 0.97,
  }),
  defineCharacter({
    id: 'ivory-monk', name: '象牙静修者', description: '悬环与柔和漂浮动作。',
    primaryColor: 0xf5f1e8, secondaryColor: 0xb0bec5,
    bodyShape: 'orb', accessory: 'ring', motionStyle: 'float', visualScale: 0.98,
  }),
  defineCharacter({
    id: 'obsidian-ninja', name: '黑曜疾影', description: '低调深色的高速跃迁者。',
    primaryColor: 0x263238, secondaryColor: 0x90a4ae,
    bodyShape: 'cone', accessory: 'visor', motionStyle: 'swift', visualScale: 0.92,
  }),
  defineCharacter({
    id: 'golden-crown', name: '鎏金王冠', description: '拥有冠饰与强烈回弹的挑战者。',
    primaryColor: 0xfbc02d, secondaryColor: 0xfff59d,
    bodyShape: 'jumbo', accessory: 'crown', motionStyle: 'spring', visualScale: 1.02,
  }),
]);

export function createBuiltinSceneRegistry(): SceneRegistry {
  return new SceneRegistry().register(DEFAULT_SCENE);
}

export function createBuiltinCharacterRegistry(): CharacterRegistry {
  return BUILTIN_CHARACTERS.reduce(
    (registry, definition) => registry.register(definition),
    new CharacterRegistry(),
  );
}

export function createProgrammaticCharacterDefinition(index: number): CharacterDefinition {
  if (!Number.isSafeInteger(index) || index < 1 || index > 10) {
    throw new RangeError('测试角色序号必须为 1..10。');
  }
  return BUILTIN_CHARACTERS[index - 1]!;
}
