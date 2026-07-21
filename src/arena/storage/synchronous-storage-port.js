import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

const READ_RESULT_KEYS = new Set(['ok', 'found', 'value']);

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function rejectAsync(value, name) {
  if (value && typeof value.then === 'function') {
    Promise.resolve(value).catch(() => {
      // The synchronous contract has already rejected this host call. Contain
      // a late rejection so it cannot escape into an App lifecycle callback.
    });
    throw new TypeError(`${name} 必须同步完成。`);
  }
  return value;
}

/**
 * Adapts the three platform storage functions into one strict, synchronous
 * port. Product and pilot persistence share this boundary without sharing
 * their aggregates, schemas or repositories.
 */
export function createSynchronousStoragePort(value, {
  label: labelValue = 'Synchronous Storage',
} = {}) {
  const label = assertNonEmptyString(labelValue, 'SynchronousStoragePort.label');
  if (!value || typeof value !== 'object') throw new TypeError(`${label} Port 无效。`);
  const storageRead = requiredFunction(value.storageRead, `${label}.storageRead`);
  const storageWrite = requiredFunction(value.storageWrite, `${label}.storageWrite`);
  const storageDelete = requiredFunction(value.storageDelete, `${label}.storageDelete`);
  return Object.freeze({
    read(keyValue) {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(storageRead.call(value, key), `${label}.storageRead`);
      assertKnownKeys(result, READ_RESULT_KEYS, `${label} read result`);
      if (typeof result.ok !== 'boolean' || typeof result.found !== 'boolean') {
        throw new TypeError(`${label} read result.ok/found 必须是布尔值。`);
      }
      if (!result.ok && result.found) {
        throw new RangeError(`${label} 读取失败时不能声明 found。`);
      }
      if (!result.found && result.value !== undefined) {
        throw new RangeError(`${label} 未找到值时 value 必须是 undefined。`);
      }
      return Object.freeze({ ok: result.ok, found: result.found, value: result.value });
    },
    write(keyValue, data) {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(
        storageWrite.call(value, key, data),
        `${label}.storageWrite`,
      );
      if (typeof result !== 'boolean') {
        throw new TypeError(`${label}.storageWrite 必须返回布尔值。`);
      }
      return result;
    },
    delete(keyValue) {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(storageDelete.call(value, key), `${label}.storageDelete`);
      if (typeof result !== 'boolean') {
        throw new TypeError(`${label}.storageDelete 必须返回布尔值。`);
      }
      return result;
    },
  });
}
