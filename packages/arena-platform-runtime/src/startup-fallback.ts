import { optionalMethod, optionalProperty, rejectThenable } from './host-capability.js';

const FALLBACK_ID = 'game-startup-error';
const DEFAULT_MINI_GAME_TITLE = '游戏启动失败';
const MINI_GAME_CONTENT = '当前设备或基础库无法启动游戏，请升级客户端/基础库并确认支持 WebGL2。';

function safeTitle(value: unknown): string {
  if (value === undefined) return DEFAULT_MINI_GAME_TITLE;
  if (typeof value !== 'string') return DEFAULT_MINI_GAME_TITLE;
  const title = value.trim();
  return title.length > 0 && title.length <= 64 ? title : DEFAULT_MINI_GAME_TITLE;
}

function callOptionalHostMethod(
  owner: unknown,
  name: string,
  payload: Readonly<Record<string, unknown>>,
): boolean {
  const method = optionalMethod(owner, name);
  if (!method) return false;
  try {
    const result = method(payload);
    rejectThenable(result, `startup fallback ${name}`);
    return true;
  } catch {
    return false;
  }
}

export function showMiniGameStartupError(api: unknown, titleValue?: unknown): boolean {
  if ((typeof api !== 'object' || api === null) && typeof api !== 'function') return false;
  const title = safeTitle(titleValue);
  if (callOptionalHostMethod(api, 'showModal', Object.freeze({
    title,
    content: MINI_GAME_CONTENT,
    showCancel: false,
  }))) return true;
  return callOptionalHostMethod(api, 'showToast', Object.freeze({
    title: MINI_GAME_CONTENT,
    icon: 'none',
    duration: 4_000,
  }));
}

function documentFrom(environment: unknown): unknown {
  const direct = optionalProperty(environment, 'document');
  if (direct !== undefined && direct !== null) return direct;
  return optionalProperty(optionalProperty(environment, 'window'), 'document') ?? null;
}

function callDomMethod(owner: unknown, name: string, ...args: unknown[]): unknown {
  const method = optionalMethod(owner, name);
  if (!method) return undefined;
  const result = method(...args);
  rejectThenable(result, `Web startup fallback ${name}`);
  return result;
}

function setOptionalProperty(owner: unknown, key: PropertyKey, value: unknown): boolean {
  if ((typeof owner !== 'object' || owner === null) && typeof owner !== 'function') return false;
  try {
    return Reflect.set(owner, key, value);
  } catch {
    return false;
  }
}

function assignStyle(owner: unknown, values: Readonly<Record<string, string>>): void {
  const style = optionalProperty(owner, 'style');
  if ((typeof style !== 'object' || style === null) && typeof style !== 'function') return;
  for (const [key, value] of Object.entries(values)) setOptionalProperty(style, key, value);
}

function query(documentObject: unknown, selector: string): unknown {
  try {
    return callDomMethod(documentObject, 'querySelector', selector) ?? null;
  } catch {
    return null;
  }
}

export function clearWebStartupError(environment: unknown = globalThis): void {
  const documentObject = documentFrom(environment);
  try {
    const getElementById = optionalMethod(documentObject, 'getElementById');
    const panel = getElementById?.(FALLBACK_ID);
    callDomMethod(panel, 'remove');
    callDomMethod(query(documentObject, '#game'), 'removeAttribute', 'aria-hidden');
  } catch {
    // Navigation may already be releasing the document.
  }
}

export function showWebStartupError(error: unknown, environment: unknown = globalThis): boolean {
  const documentObject = documentFrom(environment);
  const createElement = optionalMethod(documentObject, 'createElement');
  if (!createElement) return false;
  let panel: unknown = null;
  let createdPanel = false;
  try {
    const getElementById = optionalMethod(documentObject, 'getElementById');
    panel = getElementById?.(FALLBACK_ID) ?? null;
    if (!panel) {
      panel = createElement('section');
      rejectThenable(panel, 'document.createElement');
      if ((typeof panel !== 'object' || panel === null) && typeof panel !== 'function') return false;
      if (!setOptionalProperty(panel, 'id', FALLBACK_ID)) return false;
      if (!optionalMethod(panel, 'setAttribute') || !optionalMethod(panel, 'appendChild')) return false;
      callDomMethod(panel, 'setAttribute', 'role', 'alert');
      callDomMethod(panel, 'setAttribute', 'aria-live', 'assertive');
      callDomMethod(panel, 'setAttribute', 'tabindex', '-1');
      assignStyle(panel, Object.freeze({
        position: 'absolute',
        inset: '50% auto auto 50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(88vw, 32rem)',
        padding: '1.25rem 1.35rem',
        borderRadius: '1rem',
        background: 'rgba(255,255,255,0.96)',
        color: '#263238',
        boxShadow: '0 1rem 3rem rgba(38,50,56,0.2)',
        font: '600 1rem/1.55 system-ui, sans-serif',
        textAlign: 'center',
        zIndex: '10',
      }));
      const parent = query(documentObject, '.game-shell')
        ?? optionalProperty(documentObject, 'body')
        ?? optionalProperty(documentObject, 'documentElement');
      if (!optionalMethod(parent, 'appendChild')) return false;
      callDomMethod(parent, 'appendChild', panel);
      createdPanel = true;
    }

    const detail = error instanceof Error ? error.message : String(error ?? '未知错误');
    setOptionalProperty(panel, 'textContent', '');
    const title = createElement('strong');
    rejectThenable(title, 'document.createElement');
    setOptionalProperty(title, 'textContent', '游戏暂时无法启动');
    assignStyle(title, Object.freeze({
      display: 'block',
      fontSize: '1.2rem',
      marginBottom: '0.45rem',
    }));
    const message = createElement('span');
    rejectThenable(message, 'document.createElement');
    setOptionalProperty(
      message,
      'textContent',
      `请确认浏览器已启用 WebGL2，或更换设备后重试。${detail ? `（${detail}）` : ''}`,
    );
    callDomMethod(panel, 'appendChild', title);
    callDomMethod(panel, 'appendChild', message);
    callDomMethod(query(documentObject, '#game'), 'setAttribute', 'aria-hidden', 'true');
    callDomMethod(panel, 'focus', Object.freeze({ preventScroll: true }));
    return true;
  } catch {
    if (createdPanel) {
      try { callDomMethod(panel, 'remove'); } catch { /* fail soft */ }
      try { callDomMethod(query(documentObject, '#game'), 'removeAttribute', 'aria-hidden'); } catch {
        // The document may already be unavailable.
      }
    }
    return false;
  }
}
