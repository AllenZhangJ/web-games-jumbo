let fallbackSequence = 0;

function nonEmptyPrefix(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('runtime instance id prefix 必须是非空字符串。');
  }
  return value.trim();
}

function finiteInteger(value, fallback = 0) {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

export function createRuntimeInstanceId(
  root = globalThis,
  prefixValue = 'runtime-instance',
) {
  const prefix = nonEmptyPrefix(prefixValue);
  try {
    if (typeof root?.crypto?.randomUUID === 'function') {
      return `${prefix}-${root.crypto.randomUUID()}`;
    }
    if (typeof root?.crypto?.getRandomValues === 'function') {
      const values = new Uint32Array(4);
      root.crypto.getRandomValues(values);
      return `${prefix}-${[...values].map(
        (value) => value.toString(16).padStart(8, '0'),
      ).join('')}`;
    }
  } catch {
    // Host crypto is optional. The time-based fallback still fails closed on
    // the unlikely event that two independent runtimes produce a collision.
  }
  fallbackSequence = fallbackSequence >= Number.MAX_SAFE_INTEGER
    ? 1
    : fallbackSequence + 1;
  let wall;
  let monotonic;
  try {
    wall = finiteInteger(root?.Date?.now?.(), Date.now());
  } catch {
    wall = Date.now();
  }
  try {
    monotonic = finiteInteger(root?.performance?.now?.() * 1000, 0);
  } catch {
    monotonic = 0;
  }
  return `${prefix}-fallback-${wall}-${monotonic}-${fallbackSequence}`;
}
