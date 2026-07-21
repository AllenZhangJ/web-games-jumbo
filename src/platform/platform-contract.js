const WEBGL2_VERSION = 0x1f02;

function safeNow(now) {
  try {
    const value = now?.();
    if (Number.isFinite(value)) return value;
  } catch {
    // Fall back to the wall clock when a host performance API is unavailable.
  }
  return Date.now();
}

function platformError(id, message, cause) {
  const error = new Error(`[${id}] ${message}`);
  if (cause) error.cause = cause;
  return error;
}

export function normalizeCanvasSize(width, height, id = 'unknown') {
  const normalizedWidth = Math.floor(Number(width));
  const normalizedHeight = Math.floor(Number(height));
  if (
    !Number.isFinite(normalizedWidth)
    || !Number.isFinite(normalizedHeight)
    || normalizedWidth < 1
    || normalizedHeight < 1
  ) {
    throw platformError(id, `Canvas 尺寸必须是正整数，当前为 ${width}×${height}`);
  }
  return { width: normalizedWidth, height: normalizedHeight };
}

function installEventTargetFallback(canvas, id) {
  for (const name of ['addEventListener', 'removeEventListener']) {
    if (typeof canvas[name] === 'function') continue;
    try {
      canvas[name] = () => {};
    } catch (cause) {
      throw platformError(id, `Canvas 缺少 ${name}，无法与 Three.js 兼容`, cause);
    }
    if (typeof canvas[name] !== 'function') {
      throw platformError(id, `Canvas 缺少 ${name}，无法与 Three.js 兼容`);
    }
  }
}

export function prepareCanvas(canvas, id = 'unknown') {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw platformError(id, '平台未返回可用的 Canvas（缺少 getContext）');
  }
  installEventTargetFallback(canvas, id);
  return canvas;
}

export function sizeCanvas(canvas, width, height, id = 'unknown') {
  const size = normalizeCanvasSize(width, height, id);
  prepareCanvas(canvas, id);
  try {
    canvas.width = size.width;
    canvas.height = size.height;
  } catch (cause) {
    throw platformError(id, `无法设置离屏 Canvas 尺寸 ${size.width}×${size.height}`, cause);
  }
  return canvas;
}

/**
 * Keeps request/cancel semantics stable across browsers and mini-game hosts.
 * Some hosts schedule a frame successfully but return `undefined`; treating
 * that value as a failure would schedule a second frame and fork the game
 * loop. The public token also lets us suppress a late callback when a host has
 * no matching cancel API.
 */
export function createFrameScheduler({ request, cancel, now = () => Date.now() } = {}) {
  let nextToken = 1;
  const pending = new Map();

  const requestFrame = (callback) => {
    if (typeof callback !== 'function') {
      throw new TypeError('requestFrame(callback) 需要函数参数');
    }
    const token = nextToken;
    nextToken = nextToken >= Number.MAX_SAFE_INTEGER ? 1 : nextToken + 1;
    const entry = {
      active: true,
      hostId: undefined,
      timerId: undefined,
      usesHost: false,
    };
    pending.set(token, entry);

    const invoke = () => {
      const current = pending.get(token);
      if (!current?.active) return;
      pending.delete(token);
      current.active = false;
      callback(safeNow(now));
    };

    if (typeof request === 'function') {
      try {
        entry.usesHost = true;
        entry.hostId = request(invoke);
        return token;
      } catch {
        entry.usesHost = false;
      }
    }

    entry.timerId = setTimeout(invoke, 16);
    return token;
  };

  const cancelFrame = (token) => {
    const entry = pending.get(token);
    if (!entry) return false;
    pending.delete(token);
    entry.active = false;
    if (entry.usesHost && typeof cancel === 'function') {
      try {
        cancel(entry.hostId);
      } catch {
        // The active flag still suppresses hosts that deliver a late callback.
      }
    } else if (entry.timerId !== undefined) {
      clearTimeout(entry.timerId);
    }
    return true;
  };

  return { requestFrame, cancelFrame };
}

function reportsWebGL2(context) {
  if (!context) return false;
  if (
    typeof globalThis.WebGL2RenderingContext === 'function'
    && context instanceof globalThis.WebGL2RenderingContext
  ) {
    return true;
  }
  try {
    const version = context.getParameter?.(context.VERSION ?? WEBGL2_VERSION);
    if (/WebGL\s*2(?:\.0)?/i.test(String(version ?? ''))) return true;
  } catch {
    // Some mini-game contexts do not expose VERSION until initialization finishes.
  }
  return typeof context.texStorage2D === 'function'
    && typeof context.createVertexArray === 'function';
}

function validateWebGL2Context(context, id) {
  if (!reportsWebGL2(context)) {
    throw platformError(id, '宿主通过 WebGL2 请求返回了非 WebGL2 上下文');
  }
  if (typeof context?.getContextAttributes !== 'function') {
    throw platformError(
      id,
      '宿主返回的 WebGL2 上下文不完整（缺少 getContextAttributes），Three.js 无法启动',
    );
  }
  return context;
}

export function getRequiredWebGL2Context(canvas, attributes = {}, id = 'unknown') {
  prepareCanvas(canvas, id);
  let webgl2Error = null;
  try {
    const context = canvas.getContext('webgl2', attributes);
    if (context) return validateWebGL2Context(context, id);
  } catch (error) {
    webgl2Error = error;
  }

  // A few mini-game adapters expose a WebGL2 context behind the legacy `webgl` token.
  try {
    const legacyNamedContext = canvas.getContext('webgl', attributes);
    if (reportsWebGL2(legacyNamedContext)) {
      return validateWebGL2Context(legacyNamedContext, id);
    }
  } catch (error) {
    webgl2Error ??= error;
  }

  throw platformError(
    id,
    '无法创建 WebGL2 上下文。当前 Three.js 版本不支持 WebGL1，请升级宿主/基础库或换用支持 WebGL2 的设备',
    webgl2Error,
  );
}

export function createPlatformContract(overrides = {}) {
  const id = overrides.id ?? 'unknown';
  const frameScheduler = createFrameScheduler();
  const storageConcurrency = overrides.storageConcurrency ?? 'multi-runtime';
  if (!['multi-runtime', 'single-active-runtime'].includes(storageConcurrency)) {
    throw platformError(id, `未知 storageConcurrency ${String(storageConcurrency)}`);
  }
  return {
    id,
    createCanvas: () => null,
    createOffscreenCanvas: () => {
      throw platformError(id, '当前平台未实现 createOffscreenCanvas(width, height)');
    },
    getWebGLContext: (canvas, attributes) => getRequiredWebGL2Context(canvas, attributes, id),
    createImage: () => null,
    readAssetBytes: async (sourceKey) => {
      throw platformError(id, `当前平台不能读取资产 ${String(sourceKey)}`);
    },
    getViewport: () => ({ width: 1280, height: 720, pixelRatio: 1, safeArea: null }),
    requestFrame: frameScheduler.requestFrame,
    cancelFrame: frameScheduler.cancelFrame,
    now: () => Date.now(),
    wallNow: () => Date.now(),
    bindInput: () => () => {},
    onResize: () => () => {},
    onShow: () => () => {},
    onHide: () => () => {},
    createAudio: () => null,
    vibrate: () => {},
    storageGet: () => undefined,
    storageSet: () => false,
    storageRemove: () => false,
    storageRead: () => ({ ok: false, found: false, value: undefined }),
    storageWrite: () => false,
    storageDelete: () => false,
    share: () => Promise.resolve(false),
    ...overrides,
    storageConcurrency,
  };
}
