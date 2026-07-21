import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '../assets/presentation-asset-provider-ids.js';
import { disposeThreeObject } from './dispose-three-resources.js';
import { PlatformTextureLoader } from './host-texture-loader.js';

const GLTF_PROVIDERS = new Set([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
]);

export class GltfPresentationAssetLoader {
  #loader;
  #readAssetBytes;

  constructor({ loader = new GLTFLoader(), readAssetBytes = null, createImage = null } = {}) {
    if (
      !loader
      || typeof loader.loadAsync !== 'function'
      || typeof loader.parseAsync !== 'function'
    ) {
      throw new TypeError('GltfPresentationAssetLoader 需要 GLTFLoader.loadAsync/parseAsync()。');
    }
    if (readAssetBytes !== null && typeof readAssetBytes !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.readAssetBytes 必须是函数或 null。');
    }
    if (createImage !== null && typeof createImage !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.createImage 必须是函数或 null。');
    }
    if (createImage !== null) {
      if (typeof loader.manager?.addHandler !== 'function') {
        throw new TypeError('GltfPresentationAssetLoader.loader.manager 缺少 addHandler()。');
      }
      loader.manager.addHandler(
        /\.(?:png|jpe?g)(?:[?#].*)?$/i,
        new PlatformTextureLoader({ createImage, manager: loader.manager }),
      );
    }
    this.#loader = loader;
    this.#readAssetBytes = readAssetBytes;
  }

  async load(definition) {
    if (!definition?.id || !definition.sourceKey || !GLTF_PROVIDERS.has(definition.providerId)) {
      throw new RangeError('GltfPresentationAssetLoader 收到不支持的 asset Definition。');
    }
    let gltf;
    if (this.#readAssetBytes) {
      const bytes = await this.#readAssetBytes(definition.sourceKey);
      if (!(bytes instanceof ArrayBuffer)) {
        throw new TypeError(`GLTF asset ${definition.id} bytes 必须是 ArrayBuffer。`);
      }
      const slash = definition.sourceKey.lastIndexOf('/');
      const basePath = slash < 0 ? '' : definition.sourceKey.slice(0, slash + 1);
      gltf = await this.#loader.parseAsync(bytes, basePath);
    } else {
      gltf = await this.#loader.loadAsync(definition.sourceKey);
    }
    if (!gltf?.scene?.isObject3D || !Array.isArray(gltf.animations)) {
      throw new TypeError(`GLTF asset ${definition.id} 缺少 scene/animations。`);
    }
    let released = false;
    const value = Object.freeze({
      assetId: definition.id,
      scene: gltf.scene,
      animations: Object.freeze([...gltf.animations]),
      sourceKey: definition.sourceKey,
    });
    return {
      assetId: definition.id,
      value,
      release: () => {
        if (released) return;
        released = true;
        disposeThreeObject(gltf.scene);
      },
    };
  }
}
