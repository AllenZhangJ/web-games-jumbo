import { optionalMethod, rejectThenable } from './host-capability.js';

const WEB_TEARDOWN_STATE = Symbol.for('number-strategy-jump.web-teardown-state');

type Cleanup = () => void;
type Stop = (environment: unknown) => unknown;

function ownDataValue(owner: unknown, key: PropertyKey): unknown {
  if ((typeof owner !== 'object' || owner === null) && typeof owner !== 'function') return undefined;
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(owner, key);
  } catch {
    return undefined;
  }
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError('Web teardown 宿主状态必须是数据字段。');
  }
  return descriptor.value;
}

function writeState(environment: object, value: Cleanup | null): void {
  if (value === null) {
    try {
      if (Reflect.deleteProperty(environment, WEB_TEARDOWN_STATE)) return;
    } catch { /* report the retained state below */ }
    throw new Error('Web teardown 无法释放宿主清理状态。');
  }
  try {
    Object.defineProperty(environment, WEB_TEARDOWN_STATE, {
      configurable: true,
      enumerable: false,
      value,
      writable: true,
    });
  } catch {
    throw new Error('Web teardown 无法持有宿主清理状态。');
  }
}

export function bindWebGameTeardown(environment: unknown, stop: Stop): Cleanup {
  if ((typeof environment !== 'object' || environment === null)
    && typeof environment !== 'function') {
    throw new TypeError('bindWebGameTeardown 需要 Window 事件能力。');
  }
  if (typeof stop !== 'function') throw new TypeError('bindWebGameTeardown.stop 必须是函数。');
  const addEventListener = optionalMethod(environment, 'addEventListener');
  const removeEventListener = optionalMethod(environment, 'removeEventListener');
  if (!addEventListener || !removeEventListener) {
    throw new TypeError('bindWebGameTeardown 需要完整的 Window 事件能力。');
  }

  const staleCleanup = ownDataValue(environment, WEB_TEARDOWN_STATE);
  if (staleCleanup !== undefined && staleCleanup !== null) {
    if (typeof staleCleanup !== 'function') {
      throw new TypeError('Web teardown 宿主状态已损坏。');
    }
    staleCleanup();
  }

  let listenerOwned = false;
  let stateOwned = false;
  const handler = (event: unknown): void => {
    let persisted = false;
    if ((typeof event === 'object' && event !== null) || typeof event === 'function') {
      try { persisted = Reflect.get(event, 'persisted') === true; } catch { return; }
    }
    if (persisted) return;
    try {
      rejectThenable(stop(environment), 'Web teardown stop');
    } catch {
      // A browser lifecycle callback cannot safely surface host cleanup errors.
    }
  };
  const cleanup = (): void => {
    if (!listenerOwned && !stateOwned) return;
    if (listenerOwned) {
      const result = removeEventListener('pagehide', handler);
      rejectThenable(result, 'removeEventListener');
      listenerOwned = false;
    }
    if (stateOwned) {
      if (ownDataValue(environment, WEB_TEARDOWN_STATE) !== cleanup) {
        throw new Error('Web teardown 宿主清理状态在持有期间被替换。');
      }
      writeState(environment, null);
      stateOwned = false;
    }
  };

  try {
    const result = addEventListener('pagehide', handler);
    rejectThenable(result, 'addEventListener');
    listenerOwned = true;
    writeState(environment, cleanup);
    stateOwned = true;
  } catch (error) {
    try {
      const result = removeEventListener('pagehide', handler);
      rejectThenable(result, 'removeEventListener');
      listenerOwned = false;
    } catch (cleanupError) {
      listenerOwned = true;
      throw new AggregateError([error, cleanupError], 'Web teardown 绑定失败且回滚不完整。');
    }
    throw error;
  }
  return cleanup;
}
