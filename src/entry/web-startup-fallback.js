const FALLBACK_ID = 'game-startup-error';

function documentFrom(environment) {
  try {
    return environment?.document ?? environment?.window?.document ?? null;
  } catch {
    return null;
  }
}

export function clearWebStartupError(environment = globalThis) {
  const documentObject = documentFrom(environment);
  try {
    documentObject?.getElementById?.(FALLBACK_ID)?.remove?.();
    documentObject?.querySelector?.('#game')?.removeAttribute?.('aria-hidden');
  } catch {
    // The page may already be navigating away.
  }
}

export function showWebStartupError(error, environment = globalThis) {
  const documentObject = documentFrom(environment);
  if (!documentObject || typeof documentObject.createElement !== 'function') return false;
  try {
    let panel = documentObject.getElementById?.(FALLBACK_ID) ?? null;
    if (!panel) {
      panel = documentObject.createElement('section');
      panel.id = FALLBACK_ID;
      panel.setAttribute?.('role', 'alert');
      panel.setAttribute?.('aria-live', 'assertive');
      panel.setAttribute?.('tabindex', '-1');
      Object.assign(panel.style ?? {}, {
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
      });
      const parent = documentObject.querySelector?.('.game-shell')
        ?? documentObject.body
        ?? documentObject.documentElement;
      parent?.appendChild?.(panel);
    }

    const detail = error instanceof Error ? error.message : String(error ?? '未知错误');
    panel.textContent = '';
    const title = documentObject.createElement('strong');
    title.textContent = '游戏暂时无法启动';
    Object.assign(title.style ?? {}, { display: 'block', fontSize: '1.2rem', marginBottom: '0.45rem' });
    const message = documentObject.createElement('span');
    message.textContent = `请确认浏览器已启用 WebGL2，或更换设备后重试。${detail ? `（${detail}）` : ''}`;
    panel.appendChild(title);
    panel.appendChild(message);
    documentObject.querySelector?.('#game')?.setAttribute?.('aria-hidden', 'true');
    panel.focus?.({ preventScroll: true });
    return true;
  } catch {
    return false;
  }
}
