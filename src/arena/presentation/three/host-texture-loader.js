import { Texture } from 'three';

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function assetPathCandidates(url) {
  if (typeof url !== 'string' || (!url.startsWith('./assets/') && !url.startsWith('assets/'))) {
    throw new RangeError('PlatformTextureLoader 只允许加载 assets/ 内的纹理。');
  }
  const pathname = url.split(/[?#]/u, 1)[0];
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (cause) {
    const error = new RangeError('PlatformTextureLoader 纹理路径编码无效。');
    error.cause = cause;
    throw error;
  }
  if (
    pathname.includes('\\')
    || decodedPathname.includes('\\')
    || decodedPathname.split('/').includes('..')
  ) throw new RangeError('PlatformTextureLoader 拒绝纹理路径逃逸。');
  return url.startsWith('./') ? [url, url.slice(2)] : [url];
}

export class PlatformTextureLoader {
  #createImage;
  #manager;

  constructor({ createImage, manager = null } = {}) {
    this.#createImage = requiredFunction(createImage, 'PlatformTextureLoader.createImage');
    this.#manager = manager;
  }

  load(url, onLoad = () => {}, _onProgress = undefined, onError = () => {}) {
    const texture = new Texture();
    const candidates = assetPathCandidates(url);
    let attempt = 0;
    let settled = false;
    this.#manager?.itemStart?.(url);

    const failPermanently = (cause) => {
      if (settled) return;
      settled = true;
      const error = new Error(`宿主无法解码纹理：${url}`);
      error.cause = cause;
      this.#manager?.itemError?.(url);
      this.#manager?.itemEnd?.(url);
      onError(error);
    };
    const beginAttempt = () => {
      const currentAttempt = attempt;
      const sourceKey = candidates[currentAttempt];
      attempt += 1;
      let image;
      try {
        image = this.#createImage();
      } catch (error) {
        failPermanently(error);
        return;
      }
      if (!image || typeof image !== 'object') {
        failPermanently(new TypeError('platform.createImage() 未返回图片对象。'));
        return;
      }
      texture.image = image;
      const onImageLoad = () => {
        if (settled || currentAttempt !== attempt - 1) return;
        settled = true;
        texture.needsUpdate = true;
        this.#manager?.itemEnd?.(url);
        onLoad(texture);
      };
      const onImageError = (error) => {
        if (settled || currentAttempt !== attempt - 1) return;
        if (attempt < candidates.length) {
          beginAttempt();
          return;
        }
        failPermanently(error);
      };
      try {
        image.onload = onImageLoad;
        image.onerror = onImageError;
        image.src = sourceKey;
      } catch (error) {
        onImageError(error);
      }
    };

    beginAttempt();
    return texture;
  }
}
