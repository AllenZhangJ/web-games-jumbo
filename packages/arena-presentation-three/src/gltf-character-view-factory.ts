import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  PRESENTATION_ASSET_KIND,
  assertPresentationAssetRegistry,
  createCharacterPresentationDefinition,
  type PresentationAssetDefinition,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_PRESENTATION_ASSET_PROVIDER_ID,
  PresentationAssetLoadTask,
} from '@number-strategy-jump/arena-presentation-runtime';
import { GltfPresentationAssetLoader } from './gltf-presentation-asset-loader.js';
import { GltfCharacterView } from './gltf-character-view.js';
import { ProgrammaticCharacterView } from './programmatic-character-view.js';

const LOADABLE_PROVIDERS = new Set<unknown>([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
]);
const CHARACTER_PROVIDERS = new Set<unknown>([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
]);

const OPTION_KEYS = new Set<PropertyKey>(['assetRegistry', 'actionPresentations', 'loader']);
const CREATE_OPTION_KEYS = new Set<PropertyKey>(['participantId', 'presentationDefinition']);

type LoadMethod = (definition: PresentationAssetDefinition) => unknown;

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function snapshotLoad(value: unknown): LoadMethod {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('GltfCharacterViewFactory loader 必须是对象。');
  }
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, 'load');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError('GltfCharacterViewFactory loader.load 必须是数据方法。');
      }
      const method = descriptor.value as LoadMethod;
      return (definition) => method.call(value, definition);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError('GltfCharacterViewFactory loader 缺少 load()。');
}

function fallbackSourceKey(asset: PresentationAssetDefinition): string {
  if (asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1) {
    return asset.sourceKey;
  }
  return asset.tags.includes('robot') ? 'wind-up-robot' : 'chibi-runner';
}

function equipmentDefinitionId(asset: PresentationAssetDefinition): string | null {
  if (asset.kind !== PRESENTATION_ASSET_KIND.ATTACHMENT) return null;
  if (asset.tags.includes('two-handed')) return 'hammer';
  if (asset.tags.includes('offhand')) return 'shield';
  return null;
}

function cleanupFailure(message: string, causes: readonly unknown[]): Error {
  const failure = new Error(message);
  Object.defineProperty(failure, 'causes', { value: Object.freeze([...causes]) });
  return failure;
}

export class GltfCharacterViewFactory {
  readonly #assetRegistry: PresentationAssetRegistryPort;
  readonly #actionPresentations: Readonly<Record<string, unknown>>;
  readonly #loader: Readonly<{ load: LoadMethod }>;
  readonly #definitions: readonly PresentationAssetDefinition[];
  readonly #equipmentAssetByDefinitionId: ReadonlyMap<string, string>;
  readonly #tasks = new Map<string, PresentationAssetLoadTask>();
  readonly #templates = new Map<string, unknown>();
  readonly #pendingAssetIds = new Set<string>();
  readonly #loadErrors = new Map<string, unknown>();
  readonly #cleanupErrors = new Map<string, unknown>();
  #loadPromise: Promise<this> | null = null;
  #loadSettled = false;
  #creating = false;
  #cleaning = false;
  #destroyRequested = false;
  #failedError: unknown = null;
  #disposed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'GltfCharacterViewFactory options');
    this.#assetRegistry = assertPresentationAssetRegistry(
      ownData(options, 'assetRegistry', 'GltfCharacterViewFactory options'),
    );
    const actionPresentations = ownData(options, 'actionPresentations', 'GltfCharacterViewFactory options');
    if (!actionPresentations || typeof actionPresentations !== 'object' || Array.isArray(actionPresentations)) {
      throw new TypeError('GltfCharacterViewFactory 需要 action presentations。');
    }
    this.#actionPresentations = cloneFrozenData(
      actionPresentations, 'GltfCharacterViewFactory actionPresentations',
    ) as Readonly<Record<string, unknown>>;
    const loader = ownData(options, 'loader', 'GltfCharacterViewFactory options', false)
      ?? new GltfPresentationAssetLoader();
    this.#loader = Object.freeze({ load: snapshotLoad(loader) });
    const definitions = this.#assetRegistry.list();
    this.#definitions = Object.freeze(definitions.filter(({ providerId }) => LOADABLE_PROVIDERS.has(providerId)));
    const equipmentAssets = new Map<string, string>();
    for (const asset of definitions) {
      const definitionId = equipmentDefinitionId(asset);
      if (definitionId === null) continue;
      if (equipmentAssets.has(definitionId)) {
        throw new RangeError(`GltfCharacterViewFactory 装备模板 ${definitionId} 重复。`);
      }
      equipmentAssets.set(definitionId, asset.id);
    }
    this.#equipmentAssetByDefinitionId = equipmentAssets;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('GltfCharacterViewFactory 已销毁。');
    if (this.#failedError) {
      const error = new Error('GltfCharacterViewFactory 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#creating) throw new Error('GltfCharacterViewFactory 不允许 create 回调重入。');
  }

  #destroyTask(assetId: string, task: PresentationAssetLoadTask): unknown | null {
    try {
      task.destroy();
      this.#cleanupErrors.delete(assetId);
      if (!this.#pendingAssetIds.has(assetId)) this.#tasks.delete(assetId);
      return null;
    } catch (error) {
      this.#cleanupErrors.set(assetId, error);
      return error;
    }
  }

  #completeDestroyIfPossible(): void {
    if (!this.#destroyRequested || this.#pendingAssetIds.size > 0 || this.#tasks.size > 0) return;
    this.#templates.clear();
    this.#loadErrors.clear();
    this.#cleanupErrors.clear();
    this.#disposed = true;
  }

  load(): Promise<this> {
    this.#assertUsable();
    if (this.#loadPromise) return this.#loadPromise;
    const operations = this.#definitions.map(async (definition) => {
      const task = new PresentationAssetLoadTask({
        assetRegistry: this.#assetRegistry,
        assetId: definition.id,
        loader: this.#loader,
      });
      this.#tasks.set(definition.id, task);
      this.#pendingAssetIds.add(definition.id);
      try {
        const template = await task.load();
        if (!this.#destroyRequested) this.#templates.set(definition.id, template);
      } catch (error) {
        if (!this.#destroyRequested) this.#loadErrors.set(definition.id, error);
      } finally {
        this.#pendingAssetIds.delete(definition.id);
        if (this.#destroyRequested) this.#destroyTask(definition.id, task);
      }
    });
    this.#loadPromise = Promise.all(operations)
      .then(() => {
        this.#loadSettled = true;
        this.#completeDestroyIfPossible();
        return this;
      })
      .catch((error: unknown) => {
        this.#failedError = error;
        try { this.dispose(); } catch (cleanupError) {
          throw cleanupFailure('GltfCharacterViewFactory 加载失败且清理未完整完成。', [error, cleanupError]);
        }
        throw error;
      });
    return this.#loadPromise;
  }

  #equipmentTemplates(): ReadonlyMap<string, unknown> {
    const result = new Map<string, unknown>();
    for (const [definitionId, assetId] of this.#equipmentAssetByDefinitionId) {
      const template = this.#templates.get(assetId);
      if (template) result.set(definitionId, template);
    }
    return result;
  }

  create(options: unknown): GltfCharacterView | ProgrammaticCharacterView {
    this.#assertUsable();
    if (!this.#loadSettled) throw new Error('GltfCharacterViewFactory 必须先完成 load()。');
    assertKnownKeys(options, CREATE_OPTION_KEYS, 'GltfCharacterViewFactory create options');
    const participantId = nonEmptyString(
      ownData(options, 'participantId', 'GltfCharacterViewFactory create options'),
      'GltfCharacterViewFactory participantId',
    );
    const presentationDefinition = createCharacterPresentationDefinition(
      ownData(options, 'presentationDefinition', 'GltfCharacterViewFactory create options'),
    );
    const asset = this.#assetRegistry.require(presentationDefinition.modelAssetId);
    if (asset.kind !== PRESENTATION_ASSET_KIND.CHARACTER_MODEL) {
      throw new RangeError('GltfCharacterViewFactory presentation model 必须引用 character-model。');
    }
    if (!CHARACTER_PROVIDERS.has(asset.providerId)) {
      throw new RangeError(`GltfCharacterViewFactory 不支持角色 provider ${asset.providerId}。`);
    }
    const template = this.#templates.get(asset.id) ?? null;
    this.#creating = true;
    try {
      if (
        asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
        && template
      ) return new GltfCharacterView({
        participantId,
        presentationDefinition,
        characterTemplate: template,
        equipmentTemplates: this.#equipmentTemplates(),
        actionPresentations: this.#actionPresentations,
      });
      const gltfFallbackCapabilities = asset.providerId
        === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
        ? Object.freeze({
          proceduralKeys: Object.freeze([]),
          clipKeys: Object.freeze([
            ...new Set(Object.values(presentationDefinition.animationMap).map(({ sourceKey }) => sourceKey)),
          ].sort()),
        })
        : null;
      return new ProgrammaticCharacterView({
        participantId,
        presentationDefinition,
        assetDefinition: { id: asset.id, sourceKey: fallbackSourceKey(asset) },
        actionPresentations: this.#actionPresentations,
        animationCapabilities: gltfFallbackCapabilities,
      });
    } finally {
      this.#creating = false;
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      taskCount: this.#tasks.size,
      pendingAssetIds: Object.freeze([...this.#pendingAssetIds].sort()),
      templateAssetIds: Object.freeze([...this.#templates.keys()].sort()),
      loadErrorAssetIds: Object.freeze([...this.#loadErrors.keys()].sort()),
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#creating) throw new Error('GltfCharacterViewFactory create 期间不能销毁。');
    if (this.#cleaning) throw new Error('GltfCharacterViewFactory 清理不可重入。');
    this.#destroyRequested = true;
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      for (const [assetId, task] of this.#tasks) {
        const error = this.#destroyTask(assetId, task);
        if (error) errors.push(error);
      }
      this.#templates.clear();
      this.#loadErrors.clear();
      this.#completeDestroyIfPossible();
    } finally {
      this.#cleaning = false;
    }
    if (errors.length > 0) throw cleanupFailure('GltfCharacterViewFactory 清理未完整完成。', errors);
  }
}
