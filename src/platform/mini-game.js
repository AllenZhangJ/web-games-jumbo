import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from '@number-strategy-jump/arena-platform-contracts';

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function hostError(id, message, cause) {
  const error = new Error(`[${id}] ${message}`);
  if (cause) error.cause = cause;
  return error;
}

function isMissingStorageError(error) {
  try {
    const code = error?.errorCode ?? error?.errCode ?? error?.code;
    const message = error?.errMsg ?? error?.message ?? '';
    return Number(code) === 100599 || /data\s+not\s+found/i.test(String(message));
  } catch {
    return false;
  }
}

function assetPathCandidates(sourceKey, id) {
  if (
    typeof sourceKey !== 'string'
    || !sourceKey.startsWith('./assets/')
    || sourceKey.includes('..')
    || sourceKey.includes('\\')
  ) throw hostError(id, '资产路径必须位于 ./assets/ 且不能包含路径逃逸');
  return [sourceKey, sourceKey.slice(2)];
}

function assetArrayBuffer(value, id, sourceKey) {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  throw hostError(id, `资产 ${sourceKey} 未返回 ArrayBuffer`);
}

function createMiniGameAssetReader(api, id) {
  let fileSystem = null;
  try {
    fileSystem = api.getFileSystemManager?.() ?? null;
  } catch {
    fileSystem = null;
  }
  return async (sourceKey) => {
    const candidates = assetPathCandidates(sourceKey, id);
    if (!fileSystem) throw hostError(id, '宿主缺少 getFileSystemManager，无法读取本地 GLB');
    let lastError = null;
    for (const filePath of candidates) {
      try {
        let data;
        if (typeof fileSystem.readFile === 'function') {
          data = await new Promise((resolve, reject) => {
            fileSystem.readFile({
              filePath,
              success: (result) => resolve(result?.data),
              fail: reject,
            });
          });
        } else if (typeof fileSystem.readFileSync === 'function') {
          data = fileSystem.readFileSync(filePath);
        } else {
          throw hostError(id, 'FileSystemManager 缺少 readFile/readFileSync');
        }
        return assetArrayBuffer(data, id, sourceKey);
      } catch (error) {
        lastError = error;
      }
    }
    throw hostError(id, `读取本地资产失败：${sourceKey}`, lastError);
  };
}

function viewportFrom(api) {
  let info = null;
  for (const readInfo of [api.getWindowInfo, api.getSystemInfoSync]) {
    if (typeof readInfo !== 'function') continue;
    try {
      const candidate = readInfo.call(api);
      if (candidate && typeof candidate === 'object') {
        info = candidate;
        break;
      }
    } catch {
      // Try the older host API before falling back to conservative defaults.
    }
  }
  info ??= {};
  const width = finitePositive(info.windowWidth ?? info.screenWidth, 1280);
  const height = finitePositive(info.windowHeight ?? info.screenHeight, 720);
  const pixelRatio = finitePositive(info.pixelRatio, 1);
  return {
    width,
    height,
    pixelRatio: Math.min(pixelRatio, 2),
    safeArea: info.safeArea && typeof info.safeArea === 'object' ? info.safeArea : null,
  };
}

function touchPoint(touch, canvas) {
  const pointerId = Number.isSafeInteger(touch.identifier) && touch.identifier >= 0
    ? touch.identifier
    : null;
  if (pointerId === null) return null;
  const viewport = viewportFrom(canvas.__platformApi);
  const sourceX = [touch.clientX, touch.x, touch.pageX].find(Number.isFinite) ?? 0;
  const sourceY = [touch.clientY, touch.y, touch.pageY].find(Number.isFinite) ?? 0;
  const canvasWidth = finitePositive(canvas.width, viewport.width);
  const canvasHeight = finitePositive(canvas.height, viewport.height);
  return {
    x: (sourceX / viewport.width) * canvasWidth,
    y: (sourceY / viewport.height) * canvasHeight,
    pointerId,
  };
}

function touchPoints(event, canvas) {
  try {
    const changed = event?.changedTouches;
    const current = event?.touches;
    const source = changed && Number.isSafeInteger(changed.length) ? changed : current;
    if (!source || !Number.isSafeInteger(source.length) || source.length < 1) return [];
    const points = [];
    for (let index = 0; index < source.length; index += 1) {
      const touch = source[index];
      if (!touch || typeof touch !== 'object') continue;
      const value = touchPoint(touch, canvas);
      if (value) points.push(value);
    }
    return points;
  } catch {
    return [];
  }
}

function createOffscreenCanvas(api, id, mainCanvas, width, height) {
  const size = normalizeCanvasSize(width, height, id);
  const offscreenWidth = size.width;
  const offscreenHeight = size.height;
  let lastError = null;

  const acceptCanvas = (candidate) => {
    if (candidate === mainCanvas) {
      throw hostError(id, '宿主把主 Canvas 重复返回为离屏 Canvas，已拒绝调整其尺寸');
    }
    return sizeCanvas(candidate, offscreenWidth, offscreenHeight, id);
  };

  if (typeof api.createOffscreenCanvas === 'function') {
    const createAttempts = id === 'douyin'
      ? [
        () => api.createOffscreenCanvas(),
        () => api.createOffscreenCanvas({ type: '2d', width: offscreenWidth, height: offscreenHeight }),
      ]
      : [
        () => api.createOffscreenCanvas({ type: '2d', width: offscreenWidth, height: offscreenHeight }),
        () => api.createOffscreenCanvas(),
      ];
    for (const create of createAttempts) {
      try {
        const canvas = acceptCanvas(create());
        canvas.__platformApi = api;
        return canvas;
      } catch (error) {
        lastError = error;
      }
    }
  }

  // Both mini-game runtimes historically return offscreen canvases after the first createCanvas call.
  if (typeof api.createCanvas === 'function') {
    try {
      const canvas = acceptCanvas(api.createCanvas());
      canvas.__platformApi = api;
      return canvas;
    } catch (error) {
      lastError = error;
    }
  }

  throw hostError(
    id,
    '无法创建离屏 Canvas：宿主需要 createOffscreenCanvas 或支持第二次 createCanvas()',
    lastError,
  );
}

function subscribeHost(api, onName, offName, callback, { required = false, id = 'unknown' } = {}) {
  if (typeof api[onName] !== 'function') {
    if (required) throw hostError(id, `宿主缺少 ${onName} API`);
    return () => {};
  }
  let active = true;
  const guarded = (...args) => {
    if (active) callback(...args);
  };
  try {
    api[onName](guarded);
  } catch (cause) {
    active = false;
    if (required) throw hostError(id, `注册 ${onName} 失败`, cause);
    return () => {};
  }
  return () => {
    if (!active) return;
    active = false;
    try {
      api[offName]?.(guarded);
    } catch {
      // The guarded callback remains inert even on hosts without an off API.
    }
  };
}

export function createMiniGamePlatform(api, id) {
  if (!api || typeof api.createCanvas !== 'function') {
    throw new Error(`[${id}] 未检测到小游戏 createCanvas API`);
  }
  const missingTouchApis = ['onTouchStart', 'onTouchMove', 'onTouchEnd']
    .filter((name) => typeof api[name] !== 'function');
  if (missingTouchApis.length > 0) {
    throw hostError(id, `宿主缺少必要触摸 API：${missingTouchApis.join('、')}`);
  }
  let canvas;
  try {
    canvas = prepareCanvas(api.createCanvas(), id);
  } catch (cause) {
    throw hostError(id, '创建主 Canvas 失败', cause);
  }
  canvas.__platformApi = api;

  let performanceObject = null;
  try {
    performanceObject = api.getPerformance?.() ?? api.performance ?? null;
  } catch {
    performanceObject = null;
  }
  const now = () => {
    try {
      const value = performanceObject?.now?.();
      if (Number.isFinite(value)) {
        // Douyin's mini-game performance clock is reported in microseconds,
        // while PresentationFrameLoop consumes DOM-style milliseconds.
        return id === 'douyin' ? value / 1000 : value;
      }
    } catch {
      // Fall through to a clock that is always available in JS runtimes.
    }
    return Date.now();
  };
  const usesApiFrame = typeof api.requestAnimationFrame === 'function';
  const requestHostFrame = usesApiFrame
    ? (callback) => api.requestAnimationFrame(callback)
    : typeof canvas.requestAnimationFrame === 'function'
      ? (callback) => canvas.requestAnimationFrame(callback)
      : undefined;
  const cancelHostFrame = usesApiFrame
    ? (frameId) => api.cancelAnimationFrame?.(frameId)
    : typeof canvas.cancelAnimationFrame === 'function'
      ? (frameId) => canvas.cancelAnimationFrame(frameId)
      : undefined;
  const frames = createFrameScheduler({ request: requestHostFrame, cancel: cancelHostFrame, now });
  const storageRead = (key) => {
    if (typeof api.getStorageSync !== 'function') {
      return { ok: false, found: false, value: undefined };
    }
    let knownPresent = false;
    if (typeof api.getStorageInfoSync === 'function') {
      try {
        const info = api.getStorageInfoSync();
        if (Array.isArray(info?.keys) && !info.keys.includes(key)) {
          return { ok: true, found: false, value: undefined };
        }
        knownPresent = Array.isArray(info?.keys) && info.keys.includes(key);
      } catch {
        // Fall through to the direct read. Some host versions expose the API
        // but fail to return storage metadata under memory pressure.
      }
    }
    try {
      const value = api.getStorageSync(key);
      return value === undefined
        ? { ok: !knownPresent, found: false, value: undefined }
        : { ok: true, found: true, value };
    } catch (error) {
      if (isMissingStorageError(error)) {
        return { ok: true, found: false, value: undefined };
      }
      return { ok: false, found: false, value: undefined };
    }
  };
  const storageWrite = (key, value) => {
    try {
      if (typeof api.setStorageSync !== 'function' || value === undefined) return false;
      api.setStorageSync(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const storageDelete = (key) => {
    try {
      if (typeof api.removeStorageSync !== 'function') return false;
      api.removeStorageSync(key);
      return true;
    } catch {
      return false;
    }
  };
  const readAssetBytes = createMiniGameAssetReader(api, id);

  return createPlatformContract({
    id,
    storageConcurrency: 'single-active-runtime',
    createCanvas: () => canvas,
    createOffscreenCanvas: (width, height) => createOffscreenCanvas(api, id, canvas, width, height),
    getWebGLContext: (targetCanvas, attributes) => (
      getRequiredWebGL2Context(targetCanvas, attributes, id)
    ),
    createImage: () => {
      try {
        return api.createImage?.() ?? null;
      } catch {
        return null;
      }
    },
    readAssetBytes,
    getViewport: () => viewportFrom(api),
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    wallNow: () => Date.now(),
    bindInput: ({
      onStart = () => {},
      onMove = () => {},
      onEnd = () => {},
      onCancel = () => {},
    } = {}) => {
      const dispatch = (callback) => (event) => {
        for (const point of touchPoints(event, canvas)) callback(point);
      };
      const start = dispatch(onStart);
      const move = dispatch(onMove);
      const end = dispatch(onEnd);
      const cancel = dispatch(onCancel);
      const cleanups = [];
      try {
        cleanups.push(subscribeHost(api, 'onTouchStart', 'offTouchStart', start, { required: true, id }));
        cleanups.push(subscribeHost(api, 'onTouchMove', 'offTouchMove', move, { required: true, id }));
        cleanups.push(subscribeHost(api, 'onTouchEnd', 'offTouchEnd', end, { required: true, id }));
        cleanups.push(subscribeHost(api, 'onTouchCancel', 'offTouchCancel', cancel, { id }));
      } catch (error) {
        cleanups.forEach((cleanup) => cleanup());
        throw error;
      }
      return () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    },
    onResize: (callback) => subscribeHost(api, 'onWindowResize', 'offWindowResize', callback, { id }),
    onShow: (callback) => subscribeHost(api, 'onShow', 'offShow', callback, { id }),
    onHide: (callback) => subscribeHost(api, 'onHide', 'offHide', callback, { id }),
    createAudio: () => {
      try {
        return api.createInnerAudioContext?.() ?? null;
      } catch {
        return null;
      }
    },
    vibrate: (kind = 'light') => {
      try {
        if (kind === 'heavy') api.vibrateLong?.();
        else api.vibrateShort?.({ type: 'light' });
        return true;
      } catch {
        return false;
      }
    },
    storageGet: (key) => {
      const result = storageRead(key);
      return result.ok && result.found ? result.value : undefined;
    },
    storageSet: storageWrite,
    storageRemove: storageDelete,
    storageRead,
    storageWrite,
    storageDelete,
    share: async (payload) => {
      if (typeof api.shareAppMessage !== 'function') return false;
      try {
        api.shareAppMessage({ title: payload?.title, query: payload?.query ?? '' });
        return true;
      } catch {
        return false;
      }
    },
  });
}
