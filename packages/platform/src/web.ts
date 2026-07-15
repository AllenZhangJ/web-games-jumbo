import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from './platform-contract.js';

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePointer(event: any, canvas: any) {
  let rect = null;
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
  const clientX = finite(event?.clientX, left);
  const clientY = finite(event?.clientY, top);
  return {
    x: ((clientX - left) / displayWidth) * bufferWidth,
    y: ((clientY - top) / displayHeight) * bufferHeight,
    pointerId: Number.isFinite(event?.pointerId) ? event.pointerId : 0,
  };
}

function listen(target: any, type: string, callback: (...args: any[]) => void, options?: any) {
  if (typeof target?.addEventListener !== 'function') return () => {};
  try {
    target.addEventListener(type, callback, options);
  } catch {
    return () => {};
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    try {
      target.removeEventListener?.(type, callback, options);
    } catch {
      // Cleanup must remain best-effort on partially torn-down documents.
    }
  };
}

function preventBrowserGesture(event: any) {
  try {
    if (event?.cancelable !== false) event?.preventDefault?.();
  } catch {
    // Browser gesture suppression is best-effort; gameplay input still runs.
  }
}

function safeProperty(object: any, key: string) {
  try {
    return object?.[key];
  } catch {
    return undefined;
  }
}

function webEnvironment(environment: any) {
  const windowObject = environment.window ?? environment;
  const documentObject = environment.document ?? windowObject.document;
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

function mainCanvasFrom(environment: any) {
  let canvas = null;
  try {
    canvas = environment.documentObject.querySelector('#game');
  } catch {
    canvas = null;
  }
  if (canvas) return prepareCanvas(canvas, 'web');

  const createElement = environment.documentObject.createElement;
  const parent = environment.documentObject.body ?? environment.documentObject.documentElement;
  if (typeof createElement !== 'function' || typeof parent?.appendChild !== 'function') {
    throw new Error('[web] 页面缺少 #game Canvas，且无法自动创建可见的备用 Canvas');
  }
  try {
    canvas = createElement.call(environment.documentObject, 'canvas');
    canvas.id = 'game';
    canvas.setAttribute?.('aria-label', '数值策略跳跃游戏画布');
    parent.appendChild(canvas);
    return prepareCanvas(canvas, 'web');
  } catch (cause) {
    const error = new Error('[web] 自动创建备用 Canvas 失败');
    error.cause = cause;
    throw error;
  }
}

function createOffscreenCanvas(environment: any, width: unknown, height: unknown) {
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

export function createWebPlatform(environment: any = globalThis): any {
  const env = webEnvironment(environment);
  const canvas = mainCanvasFrom(env);
  const now = () => {
    try {
      const value = env.performanceObject?.now?.();
      if (Number.isFinite(value)) return value;
    } catch {
      // Use the wall clock if performance.now is blocked or has been detached.
    }
    return Date.now();
  };
  const frames = createFrameScheduler({
    request: typeof env.windowObject.requestAnimationFrame === 'function'
      ? (callback) => env.windowObject.requestAnimationFrame(callback)
      : undefined,
    cancel: typeof env.windowObject.cancelAnimationFrame === 'function'
      ? (frameId) => env.windowObject.cancelAnimationFrame(frameId)
      : undefined,
    now,
  });

  return createPlatformContract({
    id: 'web',
    createCanvas: () => canvas,
    createOffscreenCanvas: (width: unknown, height: unknown) => createOffscreenCanvas(env, width, height),
    getWebGLContext: (targetCanvas: any, attributes: any) => (
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
    getViewport: () => {
      const documentElement = env.documentObject.documentElement;
      return {
        width: positive(env.windowObject.innerWidth, positive(documentElement?.clientWidth, positive(canvas.clientWidth, 1280))),
        height: positive(env.windowObject.innerHeight, positive(documentElement?.clientHeight, positive(canvas.clientHeight, 720))),
        pixelRatio: Math.min(positive(env.windowObject.devicePixelRatio, 1), 2),
        safeArea: null,
      };
    },
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    bindInput: ({
      onStart = () => {},
      onEnd = () => {},
      onCancel = () => {},
    }: any = {}) => {
      const pressedPointers = new Set<number>();
      const start = (event: any) => {
        preventBrowserGesture(event);
        const pointerId = Number.isFinite(event?.pointerId) ? event.pointerId : 0;
        if (pressedPointers.has(pointerId)) return;
        pressedPointers.add(pointerId);
        try {
          canvas.setPointerCapture?.(pointerId);
        } catch {
          // Window-level pointer listeners below still complete the gesture.
        }
        onStart(normalizePointer(event, canvas));
      };
      const end = (event: any) => {
        preventBrowserGesture(event);
        const pointerId = Number.isFinite(event?.pointerId) ? event.pointerId : 0;
        if (!pressedPointers.delete(pointerId)) return;
        try {
          canvas.releasePointerCapture?.(pointerId);
        } catch {
          // The pointer may already have been released by the browser.
        }
        onEnd(normalizePointer(event, canvas));
      };
      const cancel = (event: any) => {
        preventBrowserGesture(event);
        const pointerId = Number.isFinite(event?.pointerId) ? event.pointerId : 0;
        if (!pressedPointers.delete(pointerId)) return;
        onCancel(normalizePointer(event, canvas));
      };
      const cleanups = [
        listen(canvas, 'pointerdown', start, { passive: false }),
        listen(canvas, 'pointerup', end, { passive: false }),
        listen(canvas, 'pointercancel', cancel, { passive: false }),
        listen(canvas, 'lostpointercapture', cancel),
        listen(canvas, 'contextmenu', preventBrowserGesture),
        listen(canvas, 'selectstart', preventBrowserGesture),
        listen(canvas, 'dragstart', preventBrowserGesture),
        listen(canvas, 'gesturestart', preventBrowserGesture, { passive: false }),
        listen(env.windowObject, 'pointerup', end, { passive: false }),
        listen(env.windowObject, 'pointercancel', cancel, { passive: false }),
      ];
      return () => {
        pressedPointers.clear();
        cleanups.forEach((cleanup) => cleanup());
      };
    },
    onResize: (callback: (...args: any[]) => void) => listen(env.windowObject, 'resize', callback),
    onShow: (callback: (...args: any[]) => void) => {
      const handler = () => !env.documentObject.hidden && callback();
      const cleanups = [
        listen(env.documentObject, 'visibilitychange', handler),
        listen(env.windowObject, 'pageshow', handler),
      ];
      return () => cleanups.forEach((cleanup) => cleanup());
    },
    onHide: (callback: (...args: any[]) => void) => {
      const handler = () => env.documentObject.hidden && callback();
      const pageHide = () => callback();
      const cleanups = [
        listen(env.documentObject, 'visibilitychange', handler),
        listen(env.windowObject, 'pagehide', pageHide),
      ];
      return () => cleanups.forEach((cleanup) => cleanup());
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
        return Boolean(env.navigatorObject?.vibrate?.(kind === 'heavy' ? 40 : 18));
      } catch {
        return false;
      }
    },
    storageGet: (key: string) => {
      try {
        const value = env.storage?.getItem(key);
        return value == null ? undefined : JSON.parse(value);
      } catch {
        return undefined;
      }
    },
    storageSet: (key: string, value: unknown) => {
      try {
        if (!env.storage?.setItem) return false;
        env.storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    storageRemove: (key: string) => {
      try {
        if (!env.storage?.removeItem) return false;
        env.storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    share: async (payload: any) => {
      if (!env.navigatorObject?.share) return false;
      try {
        await env.navigatorObject.share(payload);
        return true;
      } catch {
        return false;
      }
    },
  });
}
