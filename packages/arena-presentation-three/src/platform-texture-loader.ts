import * as THREE from 'three';

type UnknownMethod = (...args: unknown[]) => unknown;

interface HostImage {
  onload?: (() => void) | null;
  onerror?: ((error: unknown) => void) | null;
  src?: string;
}

interface LoadingManagerPort {
  readonly itemStart: UnknownMethod | null;
  readonly itemEnd: UnknownMethod | null;
  readonly itemError: UnknownMethod | null;
}

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
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethod(value: unknown, key: string, name: string, required: boolean): UnknownMethod | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return null;
    throw new TypeError(`${name} 必须是对象。`);
  }
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
  if (required) throw new TypeError(`${name} 缺少 ${key}()。`);
  return null;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function callSync(method: UnknownMethod | null, name: string, ...args: unknown[]): void {
  if (method) rejectThenable(method(...args), name);
}

function normalizeManager(value: unknown): LoadingManagerPort {
  if (value === null || value === undefined) {
    return Object.freeze({ itemStart: null, itemEnd: null, itemError: null });
  }
  return Object.freeze({
    itemStart: snapshotMethod(value, 'itemStart', 'PlatformTextureLoader.manager', false),
    itemEnd: snapshotMethod(value, 'itemEnd', 'PlatformTextureLoader.manager', false),
    itemError: snapshotMethod(value, 'itemError', 'PlatformTextureLoader.manager', false),
  });
}

function assetPathCandidates(value: unknown): readonly string[] {
  if (typeof value !== 'string' || (!value.startsWith('./assets/') && !value.startsWith('assets/'))) {
    throw new RangeError('PlatformTextureLoader 只允许加载 assets/ 内的纹理。');
  }
  const pathname = value.split(/[?#]/u, 1)[0] ?? '';
  let decodedPathname: string;
  try { decodedPathname = decodeURIComponent(pathname); } catch (cause) {
    const error = new RangeError('PlatformTextureLoader 纹理路径编码无效。');
    error.cause = cause;
    throw error;
  }
  if (
    pathname.includes('\\')
    || decodedPathname.includes('\\')
    || decodedPathname.split('/').includes('..')
  ) throw new RangeError('PlatformTextureLoader 拒绝纹理路径逃逸。');
  return Object.freeze(value.startsWith('./') ? [value, value.slice(2)] : [value]);
}

function cleanupImage(image: HostImage | null): void {
  if (!image) return;
  try { image.onload = null; } catch { /* host image cleanup is best effort */ }
  try { image.onerror = null; } catch { /* host image cleanup is best effort */ }
}

export class PlatformTextureLoader {
  readonly #createImage: () => unknown;
  readonly #manager: LoadingManagerPort;

  constructor(options: unknown) {
    const allowed = new Set<PropertyKey>(['createImage', 'manager']);
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('PlatformTextureLoader options 必须是对象。');
    }
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) {
      throw new TypeError('PlatformTextureLoader options 包含未知字段。');
    }
    const createImage = ownData(options, 'createImage', 'PlatformTextureLoader options');
    if (typeof createImage !== 'function') throw new TypeError('PlatformTextureLoader.createImage 必须是函数。');
    this.#createImage = createImage as () => unknown;
    this.#manager = normalizeManager(ownData(options, 'manager', 'PlatformTextureLoader options', false));
  }

  load(
    urlValue: unknown,
    onLoadValue: unknown = () => {},
    _onProgress: unknown = undefined,
    onErrorValue: unknown = () => {},
  ): THREE.Texture {
    const candidates = assetPathCandidates(urlValue);
    const url = urlValue as string;
    if (typeof onLoadValue !== 'function' || typeof onErrorValue !== 'function') {
      throw new TypeError('PlatformTextureLoader callbacks 必须是函数。');
    }
    const onLoad = onLoadValue as (texture: THREE.Texture) => unknown;
    const onError = onErrorValue as (error: Error) => unknown;
    const texture = new THREE.Texture();
    let attempt = 0;
    let settled = false;
    let activeImage: HostImage | null = null;

    try { callSync(this.#manager.itemStart, 'LoadingManager.itemStart()', url); } catch (error) {
      try { texture.dispose(); } catch { /* texture was never published */ }
      throw error;
    }

    const notifyError = (error: Error): void => {
      try { rejectThenable(onError(error), 'PlatformTextureLoader.onError()'); } catch {
        // Host callback ownership belongs to GLTFLoader; never create a second async failure.
      }
    };
    const failPermanently = (cause: unknown): void => {
      if (settled) return;
      settled = true;
      cleanupImage(activeImage);
      const cleanupErrors: unknown[] = [];
      try { texture.dispose(); } catch (error) { cleanupErrors.push(error); }
      try { callSync(this.#manager.itemError, 'LoadingManager.itemError()', url); } catch (error) { cleanupErrors.push(error); }
      try { callSync(this.#manager.itemEnd, 'LoadingManager.itemEnd()', url); } catch (error) { cleanupErrors.push(error); }
      const failure = new Error(`宿主无法解码纹理：${url}`);
      failure.cause = cause;
      if (cleanupErrors.length > 0) {
        Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze(cleanupErrors) });
      }
      notifyError(failure);
    };
    const beginAttempt = (): void => {
      const currentAttempt = attempt;
      const sourceKey = candidates[currentAttempt];
      attempt += 1;
      if (sourceKey === undefined) {
        failPermanently(new RangeError('PlatformTextureLoader 纹理候选索引越界。'));
        return;
      }
      let imageValue: unknown;
      try { imageValue = this.#createImage(); } catch (error) { failPermanently(error); return; }
      if (!imageValue || typeof imageValue !== 'object' || Array.isArray(imageValue)) {
        failPermanently(new TypeError('platform.createImage() 未返回图片对象。'));
        return;
      }
      const image = imageValue as HostImage;
      activeImage = image;
      texture.image = image;
      const onImageLoad = (): void => {
        if (settled || currentAttempt !== attempt - 1) return;
        settled = true;
        cleanupImage(image);
        texture.needsUpdate = true;
        try {
          callSync(this.#manager.itemEnd, 'LoadingManager.itemEnd()', url);
          rejectThenable(onLoad(texture), 'PlatformTextureLoader.onLoad()');
        } catch (error) {
          notifyError(error instanceof Error ? error : new Error('PlatformTextureLoader 完成回调失败。', { cause: error }));
        }
      };
      const onImageError = (error: unknown): void => {
        if (settled || currentAttempt !== attempt - 1) return;
        cleanupImage(image);
        if (attempt < candidates.length) { beginAttempt(); return; }
        failPermanently(error);
      };
      try {
        image.onload = onImageLoad;
        image.onerror = onImageError;
        image.src = sourceKey;
      } catch (error) { onImageError(error); }
    };

    beginAttempt();
    return texture;
  }
}
