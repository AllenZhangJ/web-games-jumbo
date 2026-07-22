import { PresentationAssetLoadTask } from '@number-strategy-jump/arena-presentation-runtime';
import { assertPresentationAssetRegistry } from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  GltfPresentationAssetLoader,
  ProgrammaticCharacterView,
} from '@number-strategy-jump/arena-presentation-three';
import { GltfCharacterView } from './gltf-character-view.js';

const LOADABLE_PROVIDERS = new Set([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
]);

function fallbackSourceKey(asset) {
  if (asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1) {
    return asset.sourceKey;
  }
  return asset.tags.includes('robot') ? 'wind-up-robot' : 'chibi-runner';
}

function equipmentDefinitionId(asset) {
  if (asset.tags.includes('two-handed')) return 'hammer';
  if (asset.tags.includes('offhand')) return 'shield';
  return null;
}

export class GltfCharacterViewFactory {
  #assetRegistry;
  #actionPresentations;
  #loader;
  #tasks;
  #templates;
  #loadPromise;
  #loadErrors;
  #disposed;

  constructor({
    assetRegistry,
    actionPresentations,
    loader = new GltfPresentationAssetLoader(),
  }) {
    this.#assetRegistry = assertPresentationAssetRegistry(assetRegistry);
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('GltfCharacterViewFactory 需要 action presentations。');
    }
    if (!loader || typeof loader.load !== 'function') {
      throw new TypeError('GltfCharacterViewFactory 需要 asset loader。');
    }
    this.#actionPresentations = actionPresentations;
    this.#loader = loader;
    this.#tasks = new Map();
    this.#templates = new Map();
    this.#loadPromise = null;
    this.#loadErrors = new Map();
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('GltfCharacterViewFactory 已销毁。');
  }

  load() {
    this.#assertUsable();
    if (this.#loadPromise) return this.#loadPromise;
    const definitions = this.#assetRegistry.list()
      .filter((definition) => LOADABLE_PROVIDERS.has(definition.providerId));
    this.#loadPromise = Promise.all(definitions.map(async (definition) => {
      const task = new PresentationAssetLoadTask({
        assetRegistry: this.#assetRegistry,
        assetId: definition.id,
        loader: this.#loader,
      });
      this.#tasks.set(definition.id, task);
      try {
        const template = await task.load();
        if (!this.#disposed) this.#templates.set(definition.id, template);
      } catch (error) {
        if (!this.#disposed) this.#loadErrors.set(definition.id, error);
      }
    })).then(() => this);
    return this.#loadPromise;
  }

  #equipmentTemplates() {
    const result = new Map();
    for (const asset of this.#assetRegistry.list()) {
      const definitionId = equipmentDefinitionId(asset);
      const template = this.#templates.get(asset.id);
      if (definitionId && template) result.set(definitionId, template);
    }
    return result;
  }

  create({ participantId, presentationDefinition }) {
    this.#assertUsable();
    const asset = this.#assetRegistry.require(presentationDefinition.modelAssetId);
    const template = this.#templates.get(asset.id) ?? null;
    if (
      asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
      && template
    ) {
      return new GltfCharacterView({
        participantId,
        presentationDefinition,
        characterTemplate: template,
        equipmentTemplates: this.#equipmentTemplates(),
        actionPresentations: this.#actionPresentations,
      });
    }
    const gltfFallbackCapabilities = asset.providerId
      === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
      ? Object.freeze({
        proceduralKeys: Object.freeze([]),
        clipKeys: Object.freeze([
          ...new Set(Object.values(presentationDefinition.animationMap).map(({ sourceKey }) => (
            sourceKey
          ))),
        ].sort()),
      })
      : null;
    return new ProgrammaticCharacterView({
      participantId,
      presentationDefinition,
      assetDefinition: {
        id: asset.id,
        sourceKey: fallbackSourceKey(asset),
      },
      actionPresentations: this.#actionPresentations,
      animationCapabilities: gltfFallbackCapabilities,
    });
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      taskCount: this.#tasks.size,
      templateAssetIds: Object.freeze([...this.#templates.keys()].sort()),
      loadErrorAssetIds: Object.freeze([...this.#loadErrors.keys()].sort()),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const task of this.#tasks.values()) {
      try { task.destroy(); } catch (error) { errors.push(error); }
    }
    this.#tasks.clear();
    this.#templates.clear();
    this.#loadErrors.clear();
    if (errors.length > 0) {
      const failure = new Error('GltfCharacterViewFactory 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
