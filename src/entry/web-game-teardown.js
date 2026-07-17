import { stopLaunchedGame } from './launch-game.js';

const WEB_TEARDOWN_STATE = Symbol.for('number-strategy-jump.web-teardown-state');

/**
 * Releases storage leases and render resources on real navigation/reload while
 * preserving the running session when the page enters the back-forward cache.
 */
export function bindWebGameTeardown(environment = globalThis, stop = stopLaunchedGame) {
  if (!environment || typeof environment.addEventListener !== 'function') {
    throw new TypeError('bindWebGameTeardown 需要 Window 事件能力。');
  }
  if (typeof stop !== 'function') throw new TypeError('bindWebGameTeardown.stop 必须是函数。');
  try { environment[WEB_TEARDOWN_STATE]?.(); } catch {
    // A stale HMR cleanup must not block the replacement listener.
  }
  const handler = (event) => {
    if (event?.persisted === true) return;
    stop(environment);
  };
  environment.addEventListener('pagehide', handler);
  let active = true;
  const cleanup = () => {
    if (!active) return;
    environment.removeEventListener?.('pagehide', handler);
    active = false;
    if (environment[WEB_TEARDOWN_STATE] === cleanup) {
      try { delete environment[WEB_TEARDOWN_STATE]; } catch {
        environment[WEB_TEARDOWN_STATE] = null;
      }
    }
  };
  environment[WEB_TEARDOWN_STATE] = cleanup;
  return cleanup;
}
