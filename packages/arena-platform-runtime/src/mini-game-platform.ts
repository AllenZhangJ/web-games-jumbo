import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from '@number-strategy-jump/arena-platform-contracts';
import { isThenable, optionalMethod, rejectThenable } from './host-capability.js';

// Mini-game hosts are structurally dynamic; `any` is confined to this adapter boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostObject = Record<PropertyKey, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostCallback = (...args: any[]) => unknown;
type MiniGameId = 'wechat' | 'douyin';

const INPUT_BINDING_KEYS = new Set(['onStart', 'onMove', 'onEnd', 'onCancel']);
const MINI_GAME_IDS = new Set<unknown>(['wechat', 'douyin']);
const MAX_CHANGED_TOUCHES = 32;

function hostObject(value: unknown, label: string): HostObject {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as HostObject;
}

function miniGameId(value: unknown): MiniGameId {
  if (!MINI_GAME_IDS.has(value)) throw new RangeError(`未知小游戏平台：${String(value)}`);
  return value as MiniGameId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeProperty(value: HostObject | null | undefined, key: PropertyKey): any {
  try {
    return value?.[key];
  } catch {
    return undefined;
  }
}

function ownData(value: unknown, key: PropertyKey): unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function finitePositive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function hostError(id: MiniGameId, message: string, cause?: unknown): Error {
  return cause === undefined
    ? new Error(`[${id}] ${message}`)
    : new Error(`[${id}] ${message}`, { cause });
}

function cleanupAll(cleanups: readonly (() => void)[], label: string): void {
  const errors: unknown[] = [];
  for (const cleanup of [...cleanups].reverse()) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, `${label} 存在 ${errors.length} 个清理失败。`);
}

function isMissingStorageError(error: unknown): boolean {
  try {
    const candidate = hostObject(error, 'storage error');
    const code = safeProperty(candidate, 'errorCode')
      ?? safeProperty(candidate, 'errCode')
      ?? safeProperty(candidate, 'code');
    const message = safeProperty(candidate, 'errMsg') ?? safeProperty(candidate, 'message') ?? '';
    return Number(code) === 100599 || /data\s+not\s+found/i.test(String(message));
  } catch {
    return false;
  }
}

function assetPathCandidates(sourceKey: unknown, id: MiniGameId): readonly string[] {
  if (
    typeof sourceKey !== 'string'
    || !sourceKey.startsWith('./assets/')
    || sourceKey.includes('..')
    || sourceKey.includes('\\')
  ) throw hostError(id, '资产路径必须位于 ./assets/ 且不能包含路径逃逸');
  return [sourceKey, sourceKey.slice(2)];
}

function assetArrayBuffer(value: unknown, id: MiniGameId, sourceKey: string): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer;
  }
  throw hostError(id, `资产 ${sourceKey} 未返回 ArrayBuffer`);
}

function readCallbackFile(readFile: HostCallback, filePath: string, id: MiniGameId): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let returned = false;
    let settled = false;
    let pending: Readonly<{ ok: boolean; value: unknown }> | null = null;
    const settle = (ok: boolean, value: unknown) => {
      if (settled) return;
      if (!returned) {
        pending = { ok, value };
        return;
      }
      settled = true;
      if (ok) resolve(value);
      else reject(value);
    };
    let result: unknown;
    try {
      result = readFile({
        filePath,
        success: (response: unknown) => {
          let data: unknown;
          try {
            data = safeProperty(hostObject(response, `[${id}] readFile response`), 'data');
          } catch (error) {
            settle(false, error);
            return;
          }
          settle(true, data);
        },
        fail: (error: unknown) => settle(false, error),
      });
    } catch (error) {
      returned = true;
      settle(false, error);
      return;
    }
    returned = true;
    if (isThenable(result)) {
      settled = true;
      reject(new TypeError(`[${id}] FileSystemManager.readFile 不得返回 thenable。`));
      return;
    }
    const synchronousOutcome = pending as Readonly<{ ok: boolean; value: unknown }> | null;
    if (synchronousOutcome) settle(synchronousOutcome.ok, synchronousOutcome.value);
  });
}

function createMiniGameAssetReader(api: HostObject, id: MiniGameId) {
  const getFileSystemManager = optionalMethod(api, 'getFileSystemManager');
  let fileSystem: HostObject | null = null;
  if (getFileSystemManager) {
    try {
      const candidate = getFileSystemManager();
      if (!isThenable(candidate)) fileSystem = hostObject(candidate, `[${id}] FileSystemManager`);
    } catch {
      fileSystem = null;
    }
  }
  const readFile = optionalMethod(fileSystem, 'readFile');
  const readFileSync = optionalMethod(fileSystem, 'readFileSync');
  return async (sourceKey: string): Promise<ArrayBuffer> => {
    const candidates = assetPathCandidates(sourceKey, id);
    if (!fileSystem) throw hostError(id, '宿主缺少 getFileSystemManager，无法读取本地 GLB');
    if (!readFile && !readFileSync) {
      throw hostError(id, 'FileSystemManager 缺少 readFile/readFileSync');
    }
    let lastError: unknown = null;
    for (const filePath of candidates) {
      try {
        const data = readFile
          ? await readCallbackFile(readFile, filePath, id)
          : readFileSync?.(filePath);
        if (isThenable(data)) throw hostError(id, 'readFileSync 不得返回 thenable');
        return assetArrayBuffer(data, id, sourceKey);
      } catch (error) {
        lastError = error;
      }
    }
    throw hostError(id, `读取本地资产失败：${sourceKey}`, lastError);
  };
}

function createViewportReader(api: HostObject) {
  const getWindowInfo = optionalMethod(api, 'getWindowInfo');
  const getSystemInfoSync = optionalMethod(api, 'getSystemInfoSync');
  return () => {
    let info: HostObject | null = null;
    for (const readInfo of [getWindowInfo, getSystemInfoSync]) {
      if (!readInfo) continue;
      try {
        const candidate = readInfo();
        if (!isThenable(candidate)) {
          info = hostObject(candidate, 'mini-game viewport');
          break;
        }
      } catch {
        // Try the older host API before conservative defaults.
      }
    }
    const width = finitePositive(safeProperty(info, 'windowWidth') ?? safeProperty(info, 'screenWidth'), 1280);
    const height = finitePositive(safeProperty(info, 'windowHeight') ?? safeProperty(info, 'screenHeight'), 720);
    const pixelRatio = finitePositive(safeProperty(info, 'pixelRatio'), 1);
    const safeArea = safeProperty(info, 'safeArea');
    let safeAreaSnapshot: Readonly<Record<string, number>> | null = null;
    if (safeArea && typeof safeArea === 'object' && !Array.isArray(safeArea)) {
      const candidate: Record<string, number> = {};
      for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height']) {
        const value = ownData(safeArea, key);
        if (typeof value === 'number' && Number.isFinite(value)) candidate[key] = value;
      }
      if (Object.keys(candidate).length > 0) safeAreaSnapshot = Object.freeze(candidate);
    }
    return {
      width,
      height,
      pixelRatio: Math.min(pixelRatio, 2),
      safeArea: safeAreaSnapshot,
    };
  };
}

function touchPoint(touch: HostObject, canvas: HostObject, readViewport: () => HostObject) {
  const identifier = safeProperty(touch, 'identifier');
  const pointerId = Number.isSafeInteger(identifier) && identifier >= 0 ? identifier : null;
  if (pointerId === null) return null;
  const viewport = readViewport();
  const candidatesX = [safeProperty(touch, 'clientX'), safeProperty(touch, 'x'), safeProperty(touch, 'pageX')];
  const candidatesY = [safeProperty(touch, 'clientY'), safeProperty(touch, 'y'), safeProperty(touch, 'pageY')];
  const sourceX = candidatesX.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
  const sourceY = candidatesY.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
  const canvasWidth = finitePositive(safeProperty(canvas, 'width'), viewport.width);
  const canvasHeight = finitePositive(safeProperty(canvas, 'height'), viewport.height);
  return {
    x: (sourceX / viewport.width) * canvasWidth,
    y: (sourceY / viewport.height) * canvasHeight,
    pointerId,
  };
}

function touchPoints(eventValue: unknown, canvas: HostObject, readViewport: () => HostObject) {
  try {
    const event = hostObject(eventValue, 'mini-game touch event');
    const changed = safeProperty(event, 'changedTouches');
    const current = safeProperty(event, 'touches');
    const changedLength = safeProperty(changed, 'length');
    const currentLength = safeProperty(current, 'length');
    const source = Number.isSafeInteger(changedLength) ? changed : current;
    const length = Number.isSafeInteger(changedLength) ? changedLength : currentLength;
    if (!source || !Number.isSafeInteger(length) || length < 1 || length > MAX_CHANGED_TOUCHES) return [];
    const points = [];
    for (let index = 0; index < length; index += 1) {
      const touch = safeProperty(source, index);
      if (!touch || typeof touch !== 'object') continue;
      const value = touchPoint(hostObject(touch, 'mini-game touch'), canvas, readViewport);
      if (value) points.push(value);
    }
    return points;
  } catch {
    return [];
  }
}

function parseInputBindings(value: unknown): Readonly<Record<string, HostCallback>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('mini-game input bindings 必须是对象。');
  }
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('mini-game input bindings 无法读取。', { cause });
  }
  const callbacks: Record<string, HostCallback> = Object.create(null) as Record<string, HostCallback>;
  for (const key of keys) {
    if (typeof key !== 'string' || !INPUT_BINDING_KEYS.has(key)) {
      throw new TypeError(`mini-game input bindings 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`mini-game input bindings.${key} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`mini-game input bindings.${key} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'function') {
      throw new TypeError(`mini-game input bindings.${key} 必须是函数。`);
    }
    if (typeof descriptor.value === 'function') callbacks[key] = descriptor.value as HostCallback;
  }
  for (const key of INPUT_BINDING_KEYS) callbacks[key] ??= () => {};
  return Object.freeze(callbacks);
}

function parseSharePayload(value: unknown): Readonly<{ title?: string; query: string }> {
  if (value === undefined || value === null) return Object.freeze({ query: '' });
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('mini-game share payload 必须是对象。');
  }
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('mini-game share payload 无法读取。', { cause });
  }
  const result: { title?: string; query: string } = { query: '' };
  for (const key of keys) {
    if (key !== 'title' && key !== 'query') {
      throw new TypeError(`mini-game share payload 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`mini-game share payload.${String(key)} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`mini-game share payload.${String(key)} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'string') {
      throw new TypeError(`mini-game share payload.${String(key)} 必须是字符串。`);
    }
    if (key === 'title' && descriptor.value !== undefined) result.title = descriptor.value as string;
    if (key === 'query' && descriptor.value !== undefined) result.query = descriptor.value as string;
  }
  return Object.freeze(result);
}

function subscribeHost(
  on: HostCallback | null,
  off: HostCallback | null,
  name: string,
  callback: HostCallback,
  id: MiniGameId,
  required = false,
): () => void {
  if (!on || !off) {
    if (required) throw hostError(id, `宿主缺少 ${name}/off${name.slice(2)} API`);
    return () => {};
  }
  let active = true;
  let owned = false;
  let rollbackAttempted = false;
  const guarded = (...args: unknown[]) => {
    if (active) callback(...args);
  };
  try {
    const result = on(guarded);
    owned = true;
    if (isThenable(result)) {
      active = false;
      rollbackAttempted = true;
      try {
        rejectThenable(off(guarded), `[${id}] ${name} 注册回滚`);
        owned = false;
      } catch (rollbackError) {
        throw new AggregateError(
          [new TypeError(`[${id}] ${name} 不得返回 thenable。`), rollbackError],
          `[${id}] ${name} 异步注册且回滚失败`,
        );
      }
      throw new TypeError(`[${id}] ${name} 不得返回 thenable。`);
    }
  } catch (cause) {
    active = false;
    if (!owned && !rollbackAttempted) {
      try {
        rejectThenable(off(guarded), `[${id}] ${name} 失败回滚`);
      } catch (rollbackError) {
        throw hostError(id, `注册 ${name} 失败且回滚不完整`, new AggregateError([cause, rollbackError]));
      }
    }
    if (required || cause instanceof TypeError || cause instanceof AggregateError) {
      throw hostError(id, `注册 ${name} 失败`, cause);
    }
    return () => {};
  }
  return () => {
    active = false;
    if (!owned) return;
    rejectThenable(off(guarded), `[${id}] 清理 ${name}`);
    owned = false;
  };
}

function createOffscreenCanvas(
  createOffscreen: HostCallback | null,
  createCanvas: HostCallback,
  id: MiniGameId,
  mainCanvas: HostObject,
  width: unknown,
  height: unknown,
): unknown {
  const size = normalizeCanvasSize(width, height, id);
  let lastError: unknown = null;
  const acceptCanvas = (candidate: unknown) => {
    rejectThenable(candidate, `[${id}] 创建离屏 Canvas`);
    if (candidate === mainCanvas) throw hostError(id, '宿主把主 Canvas 重复返回为离屏 Canvas，已拒绝调整其尺寸');
    return sizeCanvas(candidate, size.width, size.height, id);
  };
  if (createOffscreen) {
    const options = { type: '2d', width: size.width, height: size.height };
    const attempts = id === 'douyin'
      ? [() => createOffscreen(), () => createOffscreen(options)]
      : [() => createOffscreen(options), () => createOffscreen()];
    for (const create of attempts) {
      try {
        return acceptCanvas(create());
      } catch (error) {
        lastError = error;
      }
    }
  }
  try {
    return acceptCanvas(createCanvas());
  } catch (error) {
    lastError = error;
  }
  throw hostError(id, '无法创建离屏 Canvas：宿主需要 createOffscreenCanvas 或支持第二次 createCanvas()', lastError);
}

export function createMiniGamePlatform(apiValue: unknown, idValue: unknown) {
  const id = miniGameId(idValue);
  const api = hostObject(apiValue, `[${id}] API`);
  const createCanvas = optionalMethod(api, 'createCanvas');
  if (!createCanvas) throw hostError(id, '未检测到小游戏 createCanvas API');

  const touchCapabilities = Object.freeze({
    start: [optionalMethod(api, 'onTouchStart'), optionalMethod(api, 'offTouchStart')] as const,
    move: [optionalMethod(api, 'onTouchMove'), optionalMethod(api, 'offTouchMove')] as const,
    end: [optionalMethod(api, 'onTouchEnd'), optionalMethod(api, 'offTouchEnd')] as const,
    cancel: [optionalMethod(api, 'onTouchCancel'), optionalMethod(api, 'offTouchCancel')] as const,
  });
  const requiredTouchApis = [
    ['onTouchStart', touchCapabilities.start[0]],
    ['offTouchStart', touchCapabilities.start[1]],
    ['onTouchMove', touchCapabilities.move[0]],
    ['offTouchMove', touchCapabilities.move[1]],
    ['onTouchEnd', touchCapabilities.end[0]],
    ['offTouchEnd', touchCapabilities.end[1]],
  ] as const;
  const missingTouchApis = requiredTouchApis.filter(([, method]) => !method).map(([name]) => name);
  if (missingTouchApis.length > 0) {
    throw hostError(id, `宿主缺少必要触摸 API：${missingTouchApis.join('、')}`);
  }

  let canvas: HostObject;
  try {
    const candidate = createCanvas();
    rejectThenable(candidate, `[${id}] createCanvas`);
    canvas = prepareCanvas(candidate, id) as unknown as HostObject;
  } catch (cause) {
    throw hostError(id, '创建主 Canvas 失败', cause);
  }

  const readViewport = createViewportReader(api);
  const getPerformance = optionalMethod(api, 'getPerformance');
  let performanceObject: HostObject | null = null;
  try {
    const candidate = getPerformance?.() ?? safeProperty(api, 'performance');
    if (!isThenable(candidate) && candidate != null) {
      performanceObject = hostObject(candidate, `[${id}] performance`);
    }
  } catch {
    performanceObject = null;
  }
  const performanceNow = optionalMethod(performanceObject, 'now');
  const now = () => {
    try {
      const value = performanceNow?.();
      if (typeof value === 'number' && Number.isFinite(value)) return id === 'douyin' ? value / 1000 : value;
    } catch {
      // Fall through to a clock available in every JS runtime.
    }
    return Date.now();
  };

  const apiRequestFrame = optionalMethod(api, 'requestAnimationFrame');
  const apiCancelFrame = optionalMethod(api, 'cancelAnimationFrame');
  const canvasRequestFrame = optionalMethod(canvas, 'requestAnimationFrame');
  const canvasCancelFrame = optionalMethod(canvas, 'cancelAnimationFrame');
  const requestHostFrame = apiRequestFrame ?? canvasRequestFrame;
  const cancelHostFrame = apiRequestFrame ? apiCancelFrame : canvasCancelFrame;
  const frames = createFrameScheduler({
    ...(requestHostFrame ? {
      request: (callback: () => void) => {
        const result = requestHostFrame(callback);
        rejectThenable(result, `[${id}] requestAnimationFrame`);
        return result;
      },
    } : {}),
    ...(cancelHostFrame ? {
      cancel: (frameId: unknown) => rejectThenable(cancelHostFrame(frameId), `[${id}] cancelAnimationFrame`),
    } : {}),
    now,
  });

  const getStorageSync = optionalMethod(api, 'getStorageSync');
  const getStorageInfoSync = optionalMethod(api, 'getStorageInfoSync');
  const setStorageSync = optionalMethod(api, 'setStorageSync');
  const removeStorageSync = optionalMethod(api, 'removeStorageSync');
  const storageRead = (key: string) => {
    if (!getStorageSync) return { ok: false, found: false, value: undefined };
    let knownPresent = false;
    if (getStorageInfoSync) {
      try {
        const info = getStorageInfoSync();
        if (!isThenable(info)) {
          const keys = safeProperty(hostObject(info, `[${id}] storage info`), 'keys');
          if (Array.isArray(keys) && !keys.includes(key)) return { ok: true, found: false, value: undefined };
          knownPresent = Array.isArray(keys) && keys.includes(key);
        }
      } catch {
        // Direct read remains the conservative fallback.
      }
    }
    try {
      const value = getStorageSync(key);
      if (isThenable(value)) return { ok: false, found: false, value: undefined };
      return value === undefined
        ? { ok: !knownPresent, found: false, value: undefined }
        : { ok: true, found: true, value };
    } catch (error) {
      return isMissingStorageError(error)
        ? { ok: true, found: false, value: undefined }
        : { ok: false, found: false, value: undefined };
    }
  };
  const storageWrite = (key: string, value: unknown): boolean => {
    try {
      if (!setStorageSync || value === undefined) return false;
      return !isThenable(setStorageSync(key, value));
    } catch {
      return false;
    }
  };
  const storageDelete = (key: string): boolean => {
    try {
      if (!removeStorageSync) return false;
      return !isThenable(removeStorageSync(key));
    } catch {
      return false;
    }
  };

  const createOffscreen = optionalMethod(api, 'createOffscreenCanvas');
  const createImage = optionalMethod(api, 'createImage');
  const createAudio = optionalMethod(api, 'createInnerAudioContext');
  const vibrateLong = optionalMethod(api, 'vibrateLong');
  const vibrateShort = optionalMethod(api, 'vibrateShort');
  const shareAppMessage = optionalMethod(api, 'shareAppMessage');
  const readAssetBytes = createMiniGameAssetReader(api, id);
  const onWindowResize = optionalMethod(api, 'onWindowResize');
  const offWindowResize = optionalMethod(api, 'offWindowResize');
  const onShow = optionalMethod(api, 'onShow');
  const offShow = optionalMethod(api, 'offShow');
  const onHide = optionalMethod(api, 'onHide');
  const offHide = optionalMethod(api, 'offHide');

  return createPlatformContract({
    id,
    storageConcurrency: 'single-active-runtime',
    createCanvas: () => canvas,
    createOffscreenCanvas: (width, height) => createOffscreenCanvas(createOffscreen, createCanvas, id, canvas, width, height),
    getWebGLContext: (targetCanvas, attributes) => getRequiredWebGL2Context(targetCanvas, attributes, id),
    createImage: () => {
      try {
        const result = createImage?.();
        return isThenable(result) ? null : result ?? null;
      } catch {
        return null;
      }
    },
    readAssetBytes,
    getViewport: readViewport,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    wallNow: () => Date.now(),
    bindInput: (bindingsValue: unknown = {}) => {
      const bindings = parseInputBindings(bindingsValue);
      const dispatch = (callback: HostCallback) => (event: unknown) => {
        for (const point of touchPoints(event, canvas, readViewport)) callback(point);
      };
      const cleanups: Array<() => void> = [];
      try {
        cleanups.push(subscribeHost(...touchCapabilities.start, 'onTouchStart', dispatch(bindings.onStart ?? (() => {})), id, true));
        cleanups.push(subscribeHost(...touchCapabilities.move, 'onTouchMove', dispatch(bindings.onMove ?? (() => {})), id, true));
        cleanups.push(subscribeHost(...touchCapabilities.end, 'onTouchEnd', dispatch(bindings.onEnd ?? (() => {})), id, true));
        cleanups.push(subscribeHost(...touchCapabilities.cancel, 'onTouchCancel', dispatch(bindings.onCancel ?? (() => {})), id));
      } catch (error) {
        try {
          cleanupAll(cleanups, `[${id}] input binding rollback`);
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], `[${id}] input binding 注册失败且回滚不完整。`);
        }
        throw error;
      }
      return () => cleanupAll(cleanups, `[${id}] input binding`);
    },
    onResize: (callback) => {
      if (typeof callback !== 'function') throw new TypeError(`[${id}] resize callback 必须是函数。`);
      return subscribeHost(onWindowResize, offWindowResize, 'onWindowResize', callback, id);
    },
    onShow: (callback) => {
      if (typeof callback !== 'function') throw new TypeError(`[${id}] show callback 必须是函数。`);
      return subscribeHost(onShow, offShow, 'onShow', callback, id);
    },
    onHide: (callback) => {
      if (typeof callback !== 'function') throw new TypeError(`[${id}] hide callback 必须是函数。`);
      return subscribeHost(onHide, offHide, 'onHide', callback, id);
    },
    createAudio: () => {
      try {
        const result = createAudio?.();
        return isThenable(result) ? null : result ?? null;
      } catch {
        return null;
      }
    },
    vibrate: (kind = 'light') => {
      try {
        const method = kind === 'heavy' ? vibrateLong : vibrateShort;
        if (!method) return false;
        const result = kind === 'heavy' ? method() : method({ type: 'light' });
        return !isThenable(result);
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
      if (!shareAppMessage) return false;
      try {
        const value = parseSharePayload(payload);
        const result = shareAppMessage(value);
        if (isThenable(result)) await result;
        return true;
      } catch {
        return false;
      }
    },
  });
}
