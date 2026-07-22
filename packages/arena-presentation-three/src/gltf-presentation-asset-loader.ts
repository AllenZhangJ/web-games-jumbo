import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PresentationAssetDefinition } from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import { ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { PlatformTextureLoader } from './platform-texture-loader.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;

const GLTF_PROVIDERS = new Set<string>([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
]);

function ownData(value: unknown, key: PropertyKey, name: string, required = true): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(key)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
  return descriptor.value;
}

function snapshotMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${key}()。`);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function normalizeDefinition(value: unknown): Readonly<Pick<PresentationAssetDefinition, 'id' | 'sourceKey' | 'providerId'>> {
  const definition = Object.freeze({
    id: nonEmptyString(ownData(value, 'id', 'asset Definition'), 'asset Definition.id'),
    sourceKey: nonEmptyString(ownData(value, 'sourceKey', 'asset Definition'), 'asset Definition.sourceKey'),
    providerId: nonEmptyString(ownData(value, 'providerId', 'asset Definition'), 'asset Definition.providerId'),
  });
  if (!GLTF_PROVIDERS.has(definition.providerId)) {
    throw new RangeError('GltfPresentationAssetLoader 收到不支持的 asset Definition。');
  }
  return definition;
}

function cleanupFailure(message: string, cause: unknown, cleanupCause: unknown): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCause', { value: cleanupCause });
  return failure;
}

export interface GltfPresentationAssetValue {
  readonly assetId: string;
  readonly scene: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
  readonly sourceKey: string;
}

export interface GltfPresentationAssetLease {
  readonly assetId: string;
  readonly value: Readonly<GltfPresentationAssetValue>;
  readonly release: () => void;
}

export class GltfPresentationAssetLoader {
  readonly #loadAsync: UnknownMethod;
  readonly #parseAsync: UnknownMethod;
  readonly #readAssetBytes: ((sourceKey: string) => unknown) | null;

  constructor(options: unknown = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('GltfPresentationAssetLoader options 必须是对象。');
    }
    const allowed = new Set<PropertyKey>(['loader', 'readAssetBytes', 'createImage']);
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) {
      throw new TypeError('GltfPresentationAssetLoader options 包含未知字段。');
    }
    const loader = ownData(options, 'loader', 'GltfPresentationAssetLoader options', false) ?? new GLTFLoader();
    this.#loadAsync = snapshotMethod(loader, 'loadAsync', 'GltfPresentationAssetLoader.loader');
    this.#parseAsync = snapshotMethod(loader, 'parseAsync', 'GltfPresentationAssetLoader.loader');
    const readAssetBytes = ownData(options, 'readAssetBytes', 'GltfPresentationAssetLoader options', false) ?? null;
    if (readAssetBytes !== null && typeof readAssetBytes !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.readAssetBytes 必须是函数或 null。');
    }
    this.#readAssetBytes = readAssetBytes as ((sourceKey: string) => unknown) | null;
    const createImage = ownData(options, 'createImage', 'GltfPresentationAssetLoader options', false) ?? null;
    if (createImage !== null && typeof createImage !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.createImage 必须是函数或 null。');
    }
    if (createImage !== null) {
      const manager = ownData(loader, 'manager', 'GltfPresentationAssetLoader.loader');
      const addHandler = snapshotMethod(manager, 'addHandler', 'GltfPresentationAssetLoader.loader.manager');
      const removeHandler = snapshotMethod(manager, 'removeHandler', 'GltfPresentationAssetLoader.loader.manager');
      const pattern = /\.(?:png|jpe?g)(?:[?#].*)?$/i;
      try {
        rejectThenable(
          addHandler(pattern, new PlatformTextureLoader({ createImage, manager })),
          'LoadingManager.addHandler()',
        );
      } catch (error) {
        try { rejectThenable(removeHandler(pattern), 'LoadingManager.removeHandler()'); } catch (cleanupCause) {
          throw cleanupFailure('GLTF texture handler 注册失败且回滚未完成。', error, cleanupCause);
        }
        throw error;
      }
    }
  }

  async load(definitionValue: unknown): Promise<GltfPresentationAssetLease> {
    const definition = normalizeDefinition(definitionValue);
    let result: unknown;
    if (this.#readAssetBytes) {
      const bytes = await this.#readAssetBytes(definition.sourceKey);
      if (!(bytes instanceof ArrayBuffer)) {
        throw new TypeError(`GLTF asset ${definition.id} bytes 必须是 ArrayBuffer。`);
      }
      const slash = definition.sourceKey.lastIndexOf('/');
      const basePath = slash < 0 ? '' : definition.sourceKey.slice(0, slash + 1);
      result = await this.#parseAsync(bytes, basePath);
    } else {
      result = await this.#loadAsync(definition.sourceKey);
    }
    const sceneValue = ownData(result, 'scene', `GLTF asset ${definition.id}`);
    if (!(sceneValue instanceof THREE.Object3D)) {
      throw new TypeError(`GLTF asset ${definition.id} 缺少 Object3D scene。`);
    }
    const disposal = new ThreeObjectDisposalLease(sceneValue);
    let animations: readonly unknown[];
    try {
      animations = readDataArray(
        ownData(result, 'animations', `GLTF asset ${definition.id}`),
        `GLTF asset ${definition.id}.animations`,
      );
      if (animations.some((clip) => !(clip instanceof THREE.AnimationClip))) {
        throw new TypeError(`GLTF asset ${definition.id}.animations 包含无效 clip。`);
      }
    } catch (error) {
      try { disposal.dispose(); } catch (cleanupCause) {
        throw cleanupFailure(`GLTF asset ${definition.id} 无效且清理失败。`, error, cleanupCause);
      }
      throw error;
    }
    const value = Object.freeze({
      assetId: definition.id,
      scene: sceneValue,
      animations: Object.freeze(animations as readonly THREE.AnimationClip[]),
      sourceKey: definition.sourceKey,
    });
    return Object.freeze({
      assetId: definition.id,
      value,
      release: () => { disposal.dispose(); },
    });
  }
}
