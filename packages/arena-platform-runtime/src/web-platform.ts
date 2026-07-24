import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from '@number-strategy-jump/arena-platform-contracts';
import { isThenable, optionalMethod, rejectThenable } from './host-capability.js';

// Browser and test hosts are structurally dynamic; `any` is confined to this adapter boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostObject = Record<PropertyKey, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostCallback = (...args: any[]) => unknown;

const INPUT_BINDING_KEYS = new Set(['onStart', 'onMove', 'onEnd', 'onCancel']);

function hostObject(value: unknown, label: string): HostObject {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as HostObject;
}

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePointer(event: HostObject, canvas: HostObject) {
  let rect: HostObject | null = null;
  try {
    rect = canvas.getBoundingClientRect?.() ?? null;
  } catch {
    rect = null;
  }
  const left = finite(rect?.left);
  const top = finite(rect?.top);
  const displayWidth = positive(rect?.width, positive(canvas.clientWidth, positive(canvas.width, 1)));
  const displayHeight = positive(rect?.height, positive(canvas.clientHeight, positive(canvas.height, 1)));
  const bufferWidth = positive(canvas.width, displayWidth);
  const bufferHeight = positive(canvas.height, displayHeight);
  const clientX = finite(safeProperty(event, 'clientX'), left);
  const clientY = finite(safeProperty(event, 'clientY'), top);
  return {
    x: ((clientX - left) / displayWidth) * bufferWidth,
    y: ((clientY - top) / displayHeight) * bufferHeight,
    pointerId: pointerIdentifier(event),
  };
}

function listen(
  target: HostObject | null | undefined,
  type: string,
  callback: HostCallback,
  options?: unknown,
  { required = false }: { required?: boolean } = {},
): () => void {
  const add = optionalMethod(target, 'addEventListener');
  const remove = optionalMethod(target, 'removeEventListener');
  if (!add || !remove) {
    if (required) throw new Error(`[web] 缺少必需事件监听能力：${type}`);
    return () => {};
  }
  let asynchronousRegistration = false;
  let rollbackAttempted = false;
  try {
    const result = add(type, callback, options);
    if (isThenable(result)) {
      asynchronousRegistration = true;
      rollbackAttempted = true;
      let rollbackError: unknown;
      try {
        rejectThenable(remove(type, callback, options), `[web] 回滚事件 ${type}`);
      } catch (error) {
        rollbackError = error;
      }
      const registrationError = new TypeError(`[web] 注册事件 ${type} 不得返回异步 thenable。`);
      if (rollbackError) {
        throw new AggregateError(
          [registrationError, rollbackError],
          `[web] 注册事件 ${type} 返回异步结果且回滚失败`,
        );
      }
      throw registrationError;
    }
  } catch (cause) {
    let failure = cause;
    if (!rollbackAttempted) {
      try {
        rejectThenable(remove(type, callback, options), `[web] 回滚事件 ${type}`);
      } catch (rollbackError) {
        failure = new AggregateError(
          [cause, rollbackError],
          `[web] 注册事件 ${type} 失败且回滚不完整`,
        );
      }
    }
    if (required || asynchronousRegistration || failure instanceof AggregateError) {
      const error = new Error(`[web] 注册必需事件 ${type} 失败`);
      error.cause = failure;
      throw error;
    }
    return () => {};
  }
  let active = true;
  return () => {
    if (!active) return;
    rejectThenable(remove(type, callback, options), `[web] 清理事件 ${type}`);
    active = false;
  };
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

function parseInputBindings(value: unknown): Readonly<Record<string, HostCallback>> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError('[web] input bindings 必须是对象。');
  }
  if (Array.isArray(value)) throw new TypeError('[web] input bindings 必须是对象。');
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('[web] input bindings 无法读取。', { cause });
  }
  const callbacks: Record<string, HostCallback> = Object.create(null) as Record<string, HostCallback>;
  for (const key of keys) {
    if (typeof key !== 'string' || !INPUT_BINDING_KEYS.has(key)) {
      throw new TypeError(`[web] input bindings 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`[web] input bindings.${key} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`[web] input bindings.${key} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'function') {
      throw new TypeError(`[web] input bindings.${key} 必须是函数。`);
    }
    if (typeof descriptor.value === 'function') callbacks[key] = descriptor.value as HostCallback;
  }
  for (const key of INPUT_BINDING_KEYS) callbacks[key] ??= () => {};
  return Object.freeze(callbacks);
}

function preventBrowserGesture(event: HostObject): void {
  try {
    if (event?.cancelable !== false) event?.preventDefault?.();
  } catch {
    // Browser gesture suppression is best-effort; gameplay input still runs.
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeProperty(object: HostObject | null | undefined, key: PropertyKey): any {
  try {
    return object?.[key];
  } catch {
    return undefined;
  }
}

function pointerIdentifier(event: HostObject): number | null {
  const value = safeProperty(event, 'pointerId');
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function webEnvironment(environmentValue: unknown): HostObject {
  const environment = hostObject(environmentValue, '[web] environment');
  const windowObject = safeProperty(environment, 'window') ?? environment;
  const documentObject = safeProperty(environment, 'document') ?? safeProperty(windowObject, 'document');
  if (!documentObject?.querySelector) {
    throw new Error('[web] 未检测到 DOM，请只在 Web 入口中创建 Web 平台');
  }
  return {
    root: environment,
    windowObject,
    documentObject,
    navigatorObject: safeProperty(environment, 'navigator') ?? safeProperty(windowObject, 'navigator'),
    storage: safeProperty(environment, 'localStorage') ?? safeProperty(windowObject, 'localStorage'),
    performanceObject: safeProperty(environment, 'performance') ?? safeProperty(windowObject, 'performance'),
  };
}

function mainCanvasFrom(environment: HostObject): HostObject {
  let canvas: HostObject | null = null;
  try {
    canvas = environment.documentObject.querySelector('#game');
  } catch {
    canvas = null;
  }
  if (canvas) return prepareCanvas(canvas, 'web') as HostObject;

  const createElement = environment.documentObject.createElement;
  const parent = environment.documentObject.body ?? environment.documentObject.documentElement;
  if (typeof createElement !== 'function' || typeof parent?.appendChild !== 'function') {
    throw new Error('[web] 页面缺少 #game Canvas，且无法自动创建可见的备用 Canvas');
  }
  try {
    const createdCanvas = hostObject(
      createElement.call(environment.documentObject, 'canvas'),
      '[web] fallback Canvas',
    );
    createdCanvas.id = 'game';
    createdCanvas.setAttribute?.('aria-label', '竞技场跑酷对决游戏画布');
    parent.appendChild(createdCanvas);
    return prepareCanvas(createdCanvas, 'web') as HostObject;
  } catch (cause) {
    const error = new Error('[web] 自动创建备用 Canvas 失败');
    error.cause = cause;
    throw error;
  }
}

function createOffscreenCanvas(environment: HostObject, width: unknown, height: unknown): unknown {
  const size = normalizeCanvasSize(width, height, 'web');
  const OffscreenCanvasConstructor = environment.root.OffscreenCanvas
    ?? environment.windowObject.OffscreenCanvas;
  if (typeof OffscreenCanvasConstructor === 'function') {
    try {
      return sizeCanvas(
        new OffscreenCanvasConstructor(size.width, size.height),
        size.width,
        size.height,
        'web',
      );
    } catch {
      // A blocked or incomplete OffscreenCanvas should not disable 2D labels.
    }
  }
  if (typeof environment.documentObject.createElement !== 'function') {
    throw new Error('[web] 当前浏览器不支持 OffscreenCanvas，且无法创建备用 Canvas');
  }
  return sizeCanvas(
    environment.documentObject.createElement('canvas'),
    size.width,
    size.height,
    'web',
  );
}

export function createWebPlatform(environment: unknown = globalThis) {
  const env = webEnvironment(environment);
  const canvas = mainCanvasFrom(env);
  const performanceNow = optionalMethod(env.performanceObject, 'now');
  const requestAnimationFrame = optionalMethod(env.windowObject, 'requestAnimationFrame');
  const cancelAnimationFrame = optionalMethod(env.windowObject, 'cancelAnimationFrame');
  const storageGetItem = optionalMethod(env.storage, 'getItem');
  const storageSetItem = optionalMethod(env.storage, 'setItem');
  const storageRemoveItem = optionalMethod(env.storage, 'removeItem');
  const vibrateHost = optionalMethod(env.navigatorObject, 'vibrate');
  const shareHost = optionalMethod(env.navigatorObject, 'share');
  const now = () => {
    try {
      const value = performanceNow?.();
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    } catch {
      // Use the wall clock if performance.now is blocked or has been detached.
    }
    return Date.now();
  };
  const frames = createFrameScheduler({
    ...(requestAnimationFrame ? {
      request: (callback: () => void) => requestAnimationFrame(callback),
    } : {}),
    ...(cancelAnimationFrame ? {
      cancel: (frameId: unknown) => cancelAnimationFrame(frameId),
    } : {}),
    now,
  });
  const storageRead = (key: string) => {
    try {
      if (!storageGetItem) return { ok: false, found: false, value: undefined };
      const value = storageGetItem(key);
      if (isThenable(value) || (value !== null && typeof value !== 'string')) {
        return { ok: false, found: false, value: undefined };
      }
      return value == null
        ? { ok: true, found: false, value: undefined }
        : { ok: true, found: true, value: JSON.parse(value) };
    } catch {
      return { ok: false, found: false, value: undefined };
    }
  };
  const storageWrite = (key: string, value: unknown): boolean => {
    try {
      if (!storageSetItem) return false;
      const serialized = JSON.stringify(value);
      if (typeof serialized !== 'string') return false;
      if (isThenable(storageSetItem(key, serialized))) return false;
      return true;
    } catch {
      return false;
    }
  };
  const storageDelete = (key: string): boolean => {
    try {
      if (!storageRemoveItem) return false;
      if (isThenable(storageRemoveItem(key))) return false;
      return true;
    } catch {
      return false;
    }
  };
  const readAssetBytes = async (sourceKey: string): Promise<ArrayBuffer> => {
    if (
      typeof sourceKey !== 'string'
      || !sourceKey.startsWith('./assets/')
      || sourceKey.includes('..')
      || sourceKey.includes('\\')
    ) {
      throw new RangeError('[web] 资产路径必须位于 ./assets/ 且不能包含路径逃逸。');
    }
    const fetchOwner = typeof env.root.fetch === 'function' ? env.root : env.windowObject;
    if (typeof fetchOwner.fetch !== 'function') throw new Error('[web] 当前宿主缺少 fetch。');
    const response = await fetchOwner.fetch.call(fetchOwner, sourceKey);
    if (!response?.ok || typeof response.arrayBuffer !== 'function') {
      throw new Error(`[web] 读取资产失败：${sourceKey}（${response?.status ?? 'unknown'}）`);
    }
    const bytes = await response.arrayBuffer();
    if (!(bytes instanceof ArrayBuffer)) throw new TypeError('[web] 资产响应不是 ArrayBuffer。');
    return bytes;
  };

  return createPlatformContract({
    id: 'web',
    createCanvas: () => canvas,
    createOffscreenCanvas: (width, height) => createOffscreenCanvas(env, width, height),
    getWebGLContext: (targetCanvas, attributes) => (
      getRequiredWebGL2Context(targetCanvas, attributes, 'web')
    ),
    createImage: () => {
      const ImageConstructor = env.root.Image ?? env.windowObject.Image;
      try {
        if (typeof ImageConstructor === 'function') return new ImageConstructor();
        if (typeof env.documentObject.createElement === 'function') {
          return env.documentObject.createElement('img');
        }
      } catch {
        return null;
      }
      return null;
    },
    readAssetBytes,
    getViewport: () => {
      const documentElement = env.documentObject.documentElement;
      let canvasRect: HostObject | null = null;
      try {
        canvasRect = canvas.getBoundingClientRect?.() ?? null;
      } catch {
        canvasRect = null;
      }
      return {
        width: positive(canvasRect?.width, positive(canvas.clientWidth, positive(env.windowObject.innerWidth, positive(documentElement?.clientWidth, 1280)))),
        height: positive(canvasRect?.height, positive(canvas.clientHeight, positive(env.windowObject.innerHeight, positive(documentElement?.clientHeight, 720)))),
        pixelRatio: Math.min(positive(env.windowObject.devicePixelRatio, 1), 2),
        safeArea: null,
      };
    },
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    wallNow: () => Date.now(),
    bindInput: (bindingsValue: unknown = {}) => {
      const bindings = parseInputBindings(bindingsValue);
      const onStart = bindings.onStart ?? (() => {});
      const onMove = bindings.onMove ?? (() => {});
      const onEnd = bindings.onEnd ?? (() => {});
      const onCancel = bindings.onCancel ?? (() => {});
      let active = true;
      const pressedPointers = new Set<number>();
      const start = (event: HostObject) => {
        if (!active) return;
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        preventBrowserGesture(event);
        if (pressedPointers.has(pointerId)) return;
        pressedPointers.add(pointerId);
        try {
          canvas.setPointerCapture?.(pointerId);
        } catch {
          // Window-level pointer listeners below still complete the gesture.
        }
        try {
          onStart(normalizePointer(event, canvas));
        } catch (error) {
          pressedPointers.delete(pointerId);
          try {
            canvas.releasePointerCapture?.(pointerId);
          } catch {
            // State is authoritative here; host capture release remains best-effort.
          }
          throw error;
        }
      };
      const move = (event: HostObject) => {
        if (!active) return;
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        if (!pressedPointers.has(pointerId)) return;
        preventBrowserGesture(event);
        onMove(normalizePointer(event, canvas));
      };
      const end = (event: HostObject) => {
        if (!active) return;
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        preventBrowserGesture(event);
        if (!pressedPointers.delete(pointerId)) return;
        try {
          canvas.releasePointerCapture?.(pointerId);
        } catch {
          // The pointer may already have been released by the browser.
        }
        onEnd(normalizePointer(event, canvas));
      };
      const cancel = (event: HostObject) => {
        if (!active) return;
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        preventBrowserGesture(event);
        if (!pressedPointers.delete(pointerId)) return;
        onCancel(normalizePointer(event, canvas));
      };
      const cleanups: Array<() => void> = [];
      try {
        cleanups.push(listen(canvas, 'pointerdown', start, { passive: false }, { required: true }));
        cleanups.push(listen(canvas, 'pointerup', end, { passive: false }));
        cleanups.push(listen(canvas, 'pointercancel', cancel, { passive: false }));
        cleanups.push(listen(canvas, 'lostpointercapture', cancel));
        cleanups.push(listen(canvas, 'contextmenu', preventBrowserGesture));
        cleanups.push(listen(canvas, 'selectstart', preventBrowserGesture));
        cleanups.push(listen(canvas, 'dragstart', preventBrowserGesture));
        cleanups.push(listen(canvas, 'gesturestart', preventBrowserGesture, { passive: false }));
        cleanups.push(listen(
          env.windowObject,
          'pointerup',
          end,
          { passive: false },
          { required: true },
        ));
        cleanups.push(listen(
          env.windowObject,
          'pointermove',
          move,
          { passive: false },
          { required: true },
        ));
        cleanups.push(listen(
          env.windowObject,
          'pointercancel',
          cancel,
          { passive: false },
          { required: true },
        ));
      } catch (error) {
        active = false;
        pressedPointers.clear();
        try {
          cleanupAll(cleanups, '[web] input binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] input binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return () => {
        active = false;
        pressedPointers.clear();
        cleanupAll(cleanups, '[web] input binding');
      };
    },
    onResize: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] resize callback 必须是函数。');
      let active = true;
      const notify = () => {
        if (active) callback();
      };
      const cleanups = [listen(env.windowObject, 'resize', notify)];
      const ResizeObserverConstructor = env.root.ResizeObserver
        ?? env.windowObject.ResizeObserver;
      if (typeof ResizeObserverConstructor === 'function') {
        try {
          const observer = new ResizeObserverConstructor(notify);
          const observe = optionalMethod(observer, 'observe');
          const disconnect = optionalMethod(observer, 'disconnect');
          if (observe && disconnect) {
            try {
              rejectThenable(observe(canvas), '[web] ResizeObserver.observe');
            } catch (cause) {
              try {
                rejectThenable(disconnect(), '[web] ResizeObserver 注册回滚');
              } catch (rollbackError) {
                throw new AggregateError(
                  [cause, rollbackError],
                  '[web] ResizeObserver 注册失败且回滚不完整。',
                );
              }
              throw cause;
            }
            let observerActive = true;
            cleanups.push(() => {
              if (!observerActive) return;
              rejectThenable(disconnect(), '[web] ResizeObserver.disconnect');
              observerActive = false;
            });
          }
        } catch (error) {
          if (error instanceof AggregateError) {
            active = false;
            try {
              cleanupAll(cleanups, '[web] resize binding rollback');
            } catch (cleanupError) {
              throw new AggregateError(
                [error, cleanupError],
                '[web] ResizeObserver 与 resize listener 回滚均失败。',
              );
            }
            throw error;
          }
          // Window resize remains the conservative fallback.
        }
      }
      return () => {
        active = false;
        cleanupAll(cleanups, '[web] resize binding');
      };
    },
    onShow: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] show callback 必须是函数。');
      let active = true;
      const handler = () => active && !env.documentObject.hidden && callback();
      const cleanups: Array<() => void> = [];
      try {
        cleanups.push(listen(env.documentObject, 'visibilitychange', handler));
        cleanups.push(listen(env.windowObject, 'pageshow', handler));
        cleanups.push(listen(env.windowObject, 'focus', handler));
      } catch (error) {
        active = false;
        try {
          cleanupAll(cleanups, '[web] show binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] show binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return () => {
        active = false;
        cleanupAll(cleanups, '[web] show binding');
      };
    },
    onHide: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] hide callback 必须是函数。');
      let active = true;
      const handler = () => active && env.documentObject.hidden && callback();
      const pageHide = () => active && callback();
      const cleanups: Array<() => void> = [];
      try {
        cleanups.push(listen(env.documentObject, 'visibilitychange', handler));
        cleanups.push(listen(env.windowObject, 'pagehide', pageHide));
        cleanups.push(listen(env.windowObject, 'blur', pageHide));
      } catch (error) {
        active = false;
        try {
          cleanupAll(cleanups, '[web] hide binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] hide binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return () => {
        active = false;
        cleanupAll(cleanups, '[web] hide binding');
      };
    },
    createAudio: () => {
      const AudioConstructor = env.root.Audio ?? env.windowObject.Audio;
      try {
        return typeof AudioConstructor === 'function' ? new AudioConstructor() : null;
      } catch {
        return null;
      }
    },
    vibrate: (kind = 'light') => {
      try {
        const result = vibrateHost?.(kind === 'heavy' ? 40 : 18);
        return !isThenable(result) && Boolean(result);
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
      if (!shareHost) return false;
      try {
        await shareHost(payload);
        return true;
      } catch {
        return false;
      }
    },
  });
}
