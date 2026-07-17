import {
  assertKnownKeys,
  assertNonEmptyString,
} from '../../rules/definition-utils.js';

const READ_RESULT_KEYS = new Set(['ok', 'found', 'value']);

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function rejectAsync(value, name) {
  if (value && typeof value.then === 'function') {
    Promise.resolve(value).catch(() => {
      // The synchronous storage contract already rejects the call. Contain a
      // late host rejection so it cannot escape into the App lifecycle.
    });
    throw new TypeError(`${name} 必须同步完成。`);
  }
  return value;
}

export function createInputPilotStoragePort(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Pilot Storage Port 无效。');
  const storageRead = requiredFunction(value.storageRead, 'storageRead');
  const storageWrite = requiredFunction(value.storageWrite, 'storageWrite');
  const storageDelete = requiredFunction(value.storageDelete, 'storageDelete');
  return Object.freeze({
    read(keyValue) {
      const key = assertNonEmptyString(keyValue, 'Pilot Storage key');
      const result = rejectAsync(storageRead.call(value, key), 'storageRead');
      assertKnownKeys(result, READ_RESULT_KEYS, 'Pilot Storage read result');
      if (typeof result.ok !== 'boolean' || typeof result.found !== 'boolean') {
        throw new TypeError('Pilot Storage read result.ok/found 必须是布尔值。');
      }
      if (!result.ok && result.found) {
        throw new RangeError('Pilot Storage 读取失败时不能声明 found。');
      }
      if (!result.found && result.value !== undefined) {
        throw new RangeError('Pilot Storage 未找到值时 value 必须是 undefined。');
      }
      return Object.freeze({ ok: result.ok, found: result.found, value: result.value });
    },
    write(keyValue, data) {
      const key = assertNonEmptyString(keyValue, 'Pilot Storage key');
      const result = rejectAsync(storageWrite.call(value, key, data), 'storageWrite');
      if (typeof result !== 'boolean') {
        throw new TypeError('storageWrite 必须返回布尔值。');
      }
      return result;
    },
    delete(keyValue) {
      const key = assertNonEmptyString(keyValue, 'Pilot Storage key');
      const result = rejectAsync(storageDelete.call(value, key), 'storageDelete');
      if (typeof result !== 'boolean') {
        throw new TypeError('storageDelete 必须返回布尔值。');
      }
      return result;
    },
  });
}
