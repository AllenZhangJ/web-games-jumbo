// Presentation/Platform boundary only; authority packages must not depend on this module.
const WEBGL2_VERSION = 0x1f02;

type HostFrameId = unknown;
type FrameCallback = (timestamp: number) => void;

export interface PlatformCanvas {
  getContext(...args: unknown[]): unknown;
  addEventListener?: (...args: unknown[]) => unknown;
  removeEventListener?: (...args: unknown[]) => unknown;
  width?: unknown;
  height?: unknown;
}

interface WebGL2ContextLike {
  VERSION?: unknown;
  getParameter?: (name: unknown) => unknown;
  getContextAttributes?: () => unknown;
  texStorage2D?: unknown;
  createVertexArray?: unknown;
}

export interface FrameSchedulerOptions {
  readonly request?: (callback: () => void) => HostFrameId;
  readonly cancel?: (hostId: HostFrameId) => unknown;
  readonly now?: () => unknown;
}

export interface FrameScheduler {
  requestFrame(callback: FrameCallback): number;
  cancelFrame(token: number): boolean;
}

export type PlatformStorageConcurrency = 'multi-runtime' | 'single-active-runtime';

export interface PlatformViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: unknown;
}

export interface ArenaPlatformContract {
  readonly id: string;
  readonly storageConcurrency: PlatformStorageConcurrency;
  createCanvas(): unknown;
  createOffscreenCanvas(width: unknown, height?: unknown): unknown;
  getWebGLContext(canvas: unknown, attributes?: unknown): unknown;
  createImage(): unknown;
  readAssetBytes(sourceKey: string): Promise<ArrayBuffer>;
  getViewport(): PlatformViewport;
  requestFrame(callback: FrameCallback): number;
  cancelFrame(token: number): boolean;
  now(): number;
  wallNow(): number;
  bindInput(bindings?: unknown): () => void;
  onResize(callback: () => void): () => void;
  onShow(callback: () => void): () => void;
  onHide(callback: () => void): () => void;
  createAudio(): unknown;
  vibrate(kind?: string): unknown;
  storageGet(key: string): unknown;
  storageSet(key: string, value: unknown): boolean;
  storageRemove(key: string): boolean;
  storageRead(key: string): unknown;
  storageWrite(key: string, value: unknown): boolean;
  storageDelete(key: string): boolean;
  share(payload?: unknown): Promise<boolean>;
}

export type PlatformContractOverrides = Partial<ArenaPlatformContract> & Record<string, unknown>;

interface ScheduledFrame {
  active: boolean;
  hostId: HostFrameId;
  timerId: ReturnType<typeof setTimeout> | undefined;
  usesHost: boolean;
}

function safeNow(now: (() => unknown) | undefined): number {
  try {
    const value = now?.();
    if (Number.isFinite(value)) return value as number;
  } catch {
    // Fall back to the wall clock when a host performance API is unavailable.
  }
  return Date.now();
}

function platformError(id: unknown, message: string, cause?: unknown): Error {
  const error = new Error(`[${String(id)}] ${message}`);
  if (cause) error.cause = cause;
  return error;
}

export function normalizeCanvasSize(
  width: unknown,
  height: unknown,
  id: unknown = 'unknown',
): Readonly<{ width: number; height: number }> {
  const normalizedWidth = Math.floor(Number(width));
  const normalizedHeight = Math.floor(Number(height));
  if (
    !Number.isFinite(normalizedWidth)
    || !Number.isFinite(normalizedHeight)
    || normalizedWidth < 1
    || normalizedHeight < 1
  ) {
    throw platformError(id, `Canvas 尺寸必须是正整数，当前为 ${String(width)}×${String(height)}`);
  }
  return { width: normalizedWidth, height: normalizedHeight };
}

function installEventTargetFallback(canvas: PlatformCanvas, id: unknown): void {
  for (const name of ['addEventListener', 'removeEventListener'] as const) {
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

export function prepareCanvas(canvas: unknown, id: unknown = 'unknown'): PlatformCanvas {
  if (
    !canvas
    || typeof canvas !== 'object'
    || typeof (canvas as { getContext?: unknown }).getContext !== 'function'
  ) {
    throw platformError(id, '平台未返回可用的 Canvas（缺少 getContext）');
  }
  const result = canvas as PlatformCanvas;
  installEventTargetFallback(result, id);
  return result;
}

export function sizeCanvas(
  canvas: unknown,
  width: unknown,
  height: unknown,
  id: unknown = 'unknown',
): PlatformCanvas {
  const size = normalizeCanvasSize(width, height, id);
  const result = prepareCanvas(canvas, id);
  try {
    result.width = size.width;
    result.height = size.height;
  } catch (cause) {
    throw platformError(id, `无法设置离屏 Canvas 尺寸 ${size.width}×${size.height}`, cause);
  }
  return result;
}

/**
 * Keeps request/cancel semantics stable across browsers and mini-game hosts.
 * Some hosts schedule a frame successfully but return `undefined`; treating
 * that value as a failure would schedule a second frame and fork the game
 * loop. The public token also lets us suppress a late callback when a host has
 * no matching cancel API.
 */
export function createFrameScheduler(
  { request, cancel, now = () => Date.now() }: FrameSchedulerOptions = {},
): FrameScheduler {
  let nextToken = 1;
  const pending = new Map<number, ScheduledFrame>();

  const requestFrame = (callback: FrameCallback): number => {
    if (typeof callback !== 'function') {
      throw new TypeError('requestFrame(callback) 需要函数参数');
    }
    const token = nextToken;
    nextToken = nextToken >= Number.MAX_SAFE_INTEGER ? 1 : nextToken + 1;
    const entry: ScheduledFrame = {
      active: true,
      hostId: undefined,
      timerId: undefined,
      usesHost: false,
    };
    pending.set(token, entry);

    const invoke = (): void => {
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

  const cancelFrame = (token: number): boolean => {
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

function reportsWebGL2(contextValue: unknown): boolean {
  if (!contextValue || (typeof contextValue !== 'object' && typeof contextValue !== 'function')) {
    return false;
  }
  const context = contextValue as WebGL2ContextLike;
  if (
    typeof globalThis.WebGL2RenderingContext === 'function'
    && contextValue instanceof globalThis.WebGL2RenderingContext
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

function validateWebGL2Context(contextValue: unknown, id: unknown): WebGL2ContextLike {
  if (!reportsWebGL2(contextValue)) {
    throw platformError(id, '宿主通过 WebGL2 请求返回了非 WebGL2 上下文');
  }
  const context = contextValue as WebGL2ContextLike;
  if (typeof context.getContextAttributes !== 'function') {
    throw platformError(
      id,
      '宿主返回的 WebGL2 上下文不完整（缺少 getContextAttributes），Three.js 无法启动',
    );
  }
  return context;
}

export function getRequiredWebGL2Context(
  canvasValue: unknown,
  attributes: unknown = {},
  id: unknown = 'unknown',
): WebGL2ContextLike {
  const canvas = prepareCanvas(canvasValue, id);
  let webgl2Error: unknown = null;
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

export function createPlatformContract(
  overrides: PlatformContractOverrides = {},
): ArenaPlatformContract & Record<string, unknown> {
  const id = overrides.id ?? 'unknown';
  const frameScheduler = createFrameScheduler();
  const storageConcurrency = overrides.storageConcurrency ?? 'multi-runtime';
  if (!(['multi-runtime', 'single-active-runtime'] as readonly unknown[]).includes(storageConcurrency)) {
    throw platformError(id, `未知 storageConcurrency ${String(storageConcurrency)}`);
  }
  const normalizedStorageConcurrency = storageConcurrency as PlatformStorageConcurrency;
  return {
    id,
    createCanvas: () => null,
    createOffscreenCanvas: () => {
      throw platformError(id, '当前平台未实现 createOffscreenCanvas(width, height)');
    },
    getWebGLContext: (canvas: unknown, attributes: unknown) => (
      getRequiredWebGL2Context(canvas, attributes, id)
    ),
    createImage: () => null,
    readAssetBytes: async (sourceKey: unknown) => {
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
    storageConcurrency: normalizedStorageConcurrency,
  } as ArenaPlatformContract & Record<string, unknown>;
}
