import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from './platform-contract.js';

function finitePositive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function hostError(id: string, message: string, cause?: unknown) {
  const error = new Error(`[${id}] ${message}`);
  if (cause) error.cause = cause;
  return error;
}

function viewportFrom(api: any) {
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

function touchPoint(event: any, canvas: any) {
  const touch = event?.changedTouches?.[0] ?? event?.touches?.[0] ?? { clientX: 0, clientY: 0 };
  const viewport = viewportFrom(canvas.__platformApi);
  const sourceX = [touch.clientX, touch.x, touch.pageX].find(Number.isFinite) ?? 0;
  const sourceY = [touch.clientY, touch.y, touch.pageY].find(Number.isFinite) ?? 0;
  const canvasWidth = finitePositive(canvas.width, viewport.width);
  const canvasHeight = finitePositive(canvas.height, viewport.height);
  return {
    x: (sourceX / viewport.width) * canvasWidth,
    y: (sourceY / viewport.height) * canvasHeight,
    pointerId: touch.identifier ?? 0,
  };
}

function createOffscreenCanvas(api: any, id: string, mainCanvas: any, width: unknown, height: unknown) {
  const size = normalizeCanvasSize(width, height, id);
  const offscreenWidth = size.width;
  const offscreenHeight = size.height;
  let lastError = null;

  const acceptCanvas = (candidate: any) => {
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

function subscribeHost(
  api: any,
  onName: string,
  offName: string,
  callback: (...args: any[]) => void,
  { required = false, id = 'unknown' }: { required?: boolean; id?: string } = {},
) {
  if (typeof api[onName] !== 'function') {
    if (required) throw hostError(id, `宿主缺少 ${onName} API`);
    return () => {};
  }
  let active = true;
  const guarded = (...args: any[]) => {
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

export function createMiniGamePlatform(api: any, id: string): any {
  if (!api || typeof api.createCanvas !== 'function') {
    throw new Error(`[${id}] 未检测到小游戏 createCanvas API`);
  }
  const missingTouchApis = ['onTouchStart', 'onTouchEnd']
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
      if (Number.isFinite(value)) return value;
    } catch {
      // Fall through to a clock that is always available in JS runtimes.
    }
    return Date.now();
  };
  const usesApiFrame = typeof api.requestAnimationFrame === 'function';
  const requestHostFrame = usesApiFrame
    ? (callback: (time: number) => void) => api.requestAnimationFrame(callback)
    : typeof canvas.requestAnimationFrame === 'function'
      ? (callback: (time: number) => void) => canvas.requestAnimationFrame(callback)
      : undefined;
  const cancelHostFrame = usesApiFrame
    ? (frameId: unknown) => api.cancelAnimationFrame?.(frameId)
    : typeof canvas.cancelAnimationFrame === 'function'
      ? (frameId: unknown) => canvas.cancelAnimationFrame(frameId)
      : undefined;
  const frames = createFrameScheduler({ request: requestHostFrame, cancel: cancelHostFrame, now });

  return createPlatformContract({
    id,
    createCanvas: () => canvas,
    createOffscreenCanvas: (width: unknown, height: unknown) => createOffscreenCanvas(api, id, canvas, width, height),
    getWebGLContext: (targetCanvas: any, attributes: any) => (
      getRequiredWebGL2Context(targetCanvas, attributes, id)
    ),
    createImage: () => {
      try {
        return api.createImage?.() ?? null;
      } catch {
        return null;
      }
    },
    getViewport: () => viewportFrom(api),
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    bindInput: ({
      onStart = () => {},
      onEnd = () => {},
      onCancel = () => {},
    }: any = {}) => {
      const start = (event: any) => onStart(touchPoint(event, canvas));
      const end = (event: any) => onEnd(touchPoint(event, canvas));
      const cancel = (event: any) => onCancel(touchPoint(event, canvas));
      const cleanups: Array<() => void> = [];
      try {
        cleanups.push(subscribeHost(api, 'onTouchStart', 'offTouchStart', start, { required: true, id }));
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
    onResize: (callback: (...args: any[]) => void) => subscribeHost(api, 'onWindowResize', 'offWindowResize', callback, { id }),
    onShow: (callback: (...args: any[]) => void) => subscribeHost(api, 'onShow', 'offShow', callback, { id }),
    onHide: (callback: (...args: any[]) => void) => subscribeHost(api, 'onHide', 'offHide', callback, { id }),
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
    storageGet: (key: string) => {
      try {
        return api.getStorageSync?.(key);
      } catch {
        return undefined;
      }
    },
    storageSet: (key: string, value: unknown) => {
      try {
        api.setStorageSync?.(key, value);
        return typeof api.setStorageSync === 'function';
      } catch {
        return false;
      }
    },
    storageRemove: (key: string) => {
      try {
        api.removeStorageSync?.(key);
        return typeof api.removeStorageSync === 'function';
      } catch {
        return false;
      }
    },
    share: async (payload: any) => {
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
