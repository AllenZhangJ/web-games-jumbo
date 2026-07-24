import { isThenable, optionalMethod, optionalProperty } from './host-capability.js';

let fallbackSequence = 0;

function nonEmptyPrefix(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('runtime instance id prefix 必须是非空字符串。');
  }
  const prefix = value.trim();
  if (prefix.length > 64 || !/^[A-Za-z0-9._-]+$/.test(prefix)) {
    throw new RangeError('runtime instance id prefix 必须是不超过 64 字符的安全标识。');
  }
  return prefix;
}

function finiteInteger(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Math.floor(value as number) : fallback;
}

function safeEntropyToken(root: unknown): string | null {
  const crypto = optionalProperty(root, 'crypto');
  const randomUuid = optionalMethod(crypto, 'randomUUID');
  if (randomUuid) {
    try {
      const value = randomUuid();
      if (!isThenable(value)
        && typeof value === 'string'
        && /^[A-Za-z0-9-]{1,128}$/.test(value)) return value;
    } catch { /* try the bounded byte source next */ }
  }
  const getRandomValues = optionalMethod(crypto, 'getRandomValues');
  if (!getRandomValues) return null;
  try {
    const values = new Uint32Array(4);
    const result = getRandomValues(values);
    if (isThenable(result)) return null;
    return [...values].map((value) => value.toString(16).padStart(8, '0')).join('');
  } catch {
    return null;
  }
}

function readOptionalClock(
  root: unknown,
  ownerName: 'Date' | 'performance',
  scale: number,
): number | null {
  const owner = optionalProperty(root, ownerName);
  const now = optionalMethod(owner, 'now');
  if (!now) return null;
  try {
    const value = now();
    if (isThenable(value) || !Number.isFinite(value)) return null;
    return finiteInteger((value as number) * scale);
  } catch {
    return null;
  }
}

export function createRuntimeInstanceId(
  root: unknown = globalThis,
  prefixValue: unknown = 'runtime-instance',
): string {
  const prefix = nonEmptyPrefix(prefixValue);
  const entropy = safeEntropyToken(root);
  if (entropy !== null) return `${prefix}-${entropy}`;

  fallbackSequence = fallbackSequence >= Number.MAX_SAFE_INTEGER
    ? 1
    : fallbackSequence + 1;
  const wall = readOptionalClock(root, 'Date', 1) ?? Date.now();
  const monotonic = readOptionalClock(root, 'performance', 1_000) ?? 0;
  return `${prefix}-fallback-${wall}-${monotonic}-${fallbackSequence}`;
}
