import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from './platform-contract.js';

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePointer(event, canvas) {
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
  const clientX = finite(safeProperty(event, 'clientX'), left);
  const clientY = finite(safeProperty(event, 'clientY'), top);
  return {
    x: ((clientX - left) / displayWidth) * bufferWidth,
    y: ((clientY - top) / displayHeight) * bufferHeight,
    pointerId: pointerIdentifier(event),
  };
}

function listen(target, type, callback, options, { required = false } = {}) {
  if (typeof target?.addEventListener !== 'function') {
    if (required) throw new Error(`[web] 缺少必需事件监听能力：${type}`);
    return () => {};
  }
  try {
    target.addEventListener(type, callback, options);
  } catch (cause) {
    if (required) {
      const error = new Error(`[web] 注册必需事件 ${type} 失败`);
      error.cause = cause;
      throw error;
    }
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

function preventBrowserGesture(event) {
  try {
    if (event?.cancelable !== false) event?.preventDefault?.();
  } catch {
    // Browser gesture suppression is best-effort; gameplay input still runs.
  }
}

function safeProperty(object, key) {
  try {
    return object?.[key];
  } catch {
    return undefined;
  }
}

function pointerIdentifier(event) {
  const value = safeProperty(event, 'pointerId');
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function webEnvironment(environment) {
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

function mainCanvasFrom(environment) {
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

function createOffscreenCanvas(environment, width, height) {
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

export function createWebPlatform(environment = globalThis) {
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
      onMove = () => {},
      onEnd = () => {},
      onCancel = () => {},
    } = {}) => {
      const pressedPointers = new Set();
      const start = (event) => {
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
        onStart(normalizePointer(event, canvas));
      };
      const move = (event) => {
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        if (!pressedPointers.has(pointerId)) return;
        preventBrowserGesture(event);
        onMove(normalizePointer(event, canvas));
      };
      const end = (event) => {
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
      const cancel = (event) => {
        const pointerId = pointerIdentifier(event);
        if (pointerId === null) return;
        preventBrowserGesture(event);
        if (!pressedPointers.delete(pointerId)) return;
        onCancel(normalizePointer(event, canvas));
      };
      const cleanups = [];
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
        pressedPointers.clear();
        [...cleanups].reverse().forEach((cleanup) => cleanup());
        throw error;
      }
      return () => {
        pressedPointers.clear();
        [...cleanups].reverse().forEach((cleanup) => cleanup());
      };
    },
    onResize: (callback) => listen(env.windowObject, 'resize', callback),
    onShow: (callback) => {
      const handler = () => !env.documentObject.hidden && callback();
      const cleanups = [
        listen(env.documentObject, 'visibilitychange', handler),
        listen(env.windowObject, 'pageshow', handler),
        listen(env.windowObject, 'focus', handler),
      ];
      return () => cleanups.forEach((cleanup) => cleanup());
    },
    onHide: (callback) => {
      const handler = () => env.documentObject.hidden && callback();
      const pageHide = () => callback();
      const cleanups = [
        listen(env.documentObject, 'visibilitychange', handler),
        listen(env.windowObject, 'pagehide', pageHide),
        listen(env.windowObject, 'blur', pageHide),
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
    storageGet: (key) => {
      try {
        const value = env.storage?.getItem(key);
        return value == null ? undefined : JSON.parse(value);
      } catch {
        return undefined;
      }
    },
    storageSet: (key, value) => {
      try {
        if (!env.storage?.setItem) return false;
        env.storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    share: async (payload) => {
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
