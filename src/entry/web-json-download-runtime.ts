import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';

type UnknownMethod = (...args: unknown[]) => unknown;
type BlobConstructor = new (
  parts: readonly unknown[],
  options: Readonly<{ type: string }>,
) => unknown;

export interface WebJsonDownloadLease {
  readonly fileName: string;
  readonly click: () => void;
  readonly release: () => void;
}

function descriptorInPrototypeChain(
  value: object,
  key: PropertyKey,
  name: string,
): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function requiredMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function optionalMethod(value: unknown, key: string, name: string): UnknownMethod | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) return null;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function rejectThenable<T>(value: T, name: string): T {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return value;
  const descriptor = descriptorInPrototypeChain(value as object, 'then', name);
  if (!descriptor) return value;
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name} 返回访问器 thenable。`);
  if (typeof descriptor.value !== 'function') return value;
  try { Promise.prototype.then.call(value, undefined, () => {}); } catch {
    // Non-Promise thenables are rejected without executing their then method.
  }
  throw new TypeError(`${name} 必须同步完成。`);
}

function callSync(method: UnknownMethod, name: string, ...args: unknown[]): unknown {
  return rejectThenable(method(...args), name);
}

function hostProperty(value: unknown, key: PropertyKey, name: string): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  try {
    return Reflect.get(value, key);
  } catch (error) {
    throw normalizeThrownError(error, `${name}.${String(key)} 读取失败`);
  }
}

function requireHostObject(value: unknown, name: string): object {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 不可用。`);
  }
  return value;
}

function setAnchorField(anchor: object, key: string, value: unknown): void {
  if (!Reflect.set(anchor, key, value)) throw new TypeError(`下载链接 ${key} 写入失败。`);
}

function cleanupError(errors: readonly Error[], message: string): Error | null {
  if (errors.length === 0) return null;
  if (errors.length === 1) return errors[0]!;
  return new AggregateError(errors, message);
}

export function createWebJsonDownloadLease(
  root: unknown,
  payloadValue: unknown,
  fileNameValue: unknown,
): WebJsonDownloadLease {
  if (typeof payloadValue !== 'string' && !(payloadValue instanceof Uint8Array)) {
    throw new TypeError('下载 payload 必须是字符串或 Uint8Array。');
  }
  if (
    typeof fileNameValue !== 'string'
    || fileNameValue.length === 0
    || fileNameValue.length > 128
    || !/^[A-Za-z0-9._-]+\.json$/.test(fileNameValue)
  ) throw new RangeError('下载 fileName 必须是安全 JSON 文件名。');
  const payload = typeof payloadValue === 'string'
    ? payloadValue
    : Uint8Array.from(payloadValue);
  const documentObject = requireHostObject(
    hostProperty(root, 'document', '下载 root'),
    '下载 document',
  );
  const urlApi = requireHostObject(hostProperty(root, 'URL', '下载 root'), '下载 URL');
  const BlobValue = hostProperty(root, 'Blob', '下载 root');
  if (typeof BlobValue !== 'function') throw new TypeError('下载 Blob 构造器不可用。');
  const BlobClass = BlobValue as BlobConstructor;
  const createElement = requiredMethod(documentObject, 'createElement', '下载 document');
  const createObjectURL = requiredMethod(urlApi, 'createObjectURL', '下载 URL');
  const revokeObjectURL = requiredMethod(urlApi, 'revokeObjectURL', '下载 URL');
  const parentValue = hostProperty(documentObject, 'body', '下载 document')
    ?? hostProperty(documentObject, 'documentElement', '下载 document');
  const parent = requireHostObject(parentValue, '下载 DOM parent');
  const appendChild = requiredMethod(parent, 'appendChild', '下载 DOM parent');
  const removeChild = optionalMethod(parent, 'removeChild', '下载 DOM parent');

  let url: string | null = null;
  let anchor: object | null = null;
  let remove: UnknownMethod | null = null;
  let appended = false;
  try {
    const blob = new BlobClass([payload], Object.freeze({
      type: 'application/json;charset=utf-8',
    }));
    const createdUrl = callSync(createObjectURL, '下载 URL.createObjectURL', blob);
    if (typeof createdUrl !== 'string' || createdUrl.length === 0) {
      throw new TypeError('URL.createObjectURL 必须返回非空字符串。');
    }
    url = createdUrl;
    anchor = requireHostObject(callSync(createElement, '下载 document.createElement', 'a'), '下载 anchor');
    const click = requiredMethod(anchor, 'click', '下载 anchor');
    remove = optionalMethod(anchor, 'remove', '下载 anchor');
    if (!remove && !removeChild) throw new TypeError('下载 DOM 不支持移除临时链接。');
    setAnchorField(anchor, 'href', url);
    setAnchorField(anchor, 'download', fileNameValue);
    setAnchorField(anchor, 'rel', 'noopener');
    setAnchorField(anchor, 'hidden', true);
    callSync(appendChild, '下载 DOM parent.appendChild', anchor);
    appended = true;

    let clicked = false;
    let released = false;
    let anchorRemoved = false;
    let urlRevoked = false;
    return Object.freeze({
      fileName: fileNameValue,
      click() {
        if (released) throw new Error('JSON 下载租约已释放。');
        if (clicked) throw new Error('JSON 下载租约不可重复点击。');
        callSync(click, '下载 anchor.click');
        clicked = true;
      },
      release() {
        if (released) return;
        const errors: Error[] = [];
        if (!anchorRemoved) {
          try {
            if (remove) callSync(remove, '下载 anchor.remove');
            else if (removeChild) callSync(removeChild, '下载 DOM parent.removeChild', anchor);
            anchorRemoved = true;
          } catch (error) {
            errors.push(normalizeThrownError(error, '下载 anchor 清理失败'));
          }
        }
        if (!urlRevoked) {
          try {
            callSync(revokeObjectURL, '下载 URL.revokeObjectURL', url);
            urlRevoked = true;
          } catch (error) {
            errors.push(normalizeThrownError(error, '下载 Blob URL 清理失败'));
          }
        }
        released = anchorRemoved && urlRevoked;
        const failure = cleanupError(errors, 'JSON 下载租约清理未完整完成。');
        if (failure) throw failure;
      },
    });
  } catch (error) {
    const errors = [normalizeThrownError(error, 'JSON 下载租约创建失败')];
    if (anchor && (appended || remove || removeChild)) {
      try {
        if (remove) callSync(remove, '下载 anchor.remove');
        else if (removeChild) callSync(removeChild, '下载 DOM parent.removeChild', anchor);
      } catch (cleanupCause) {
        errors.push(normalizeThrownError(cleanupCause, '下载 anchor 回滚失败'));
      }
    }
    if (url !== null) {
      try { callSync(revokeObjectURL, '下载 URL.revokeObjectURL', url); } catch (cleanupCause) {
        errors.push(normalizeThrownError(cleanupCause, '下载 Blob URL 回滚失败'));
      }
    }
    if (errors.length === 1) throw errors[0]!;
    throw new AggregateError(errors, 'JSON 下载租约创建与回滚均失败。');
  }
}

export function releaseWebJsonDownloadLease(
  lease: WebJsonDownloadLease,
  primaryErrors: readonly unknown[] = [],
): void {
  try {
    lease.release();
  } catch (cleanupCause) {
    if (primaryErrors.length > 0) {
      throw new AggregateError(
        [
          ...primaryErrors.map((error) => normalizeThrownError(error, 'JSON 下载失败')),
          cleanupCause,
        ],
        'JSON 下载失败且清理未完整完成。',
      );
    }
    throw cleanupCause;
  }
  if (primaryErrors.length === 1) throw primaryErrors[0];
  if (primaryErrors.length > 1) {
    throw new AggregateError(primaryErrors, 'JSON 下载失败。');
  }
}

export async function waitForWebDownloadDispatch(root: unknown): Promise<void> {
  const timer = optionalMethod(root, 'setTimeout', '下载 root');
  if (!timer) {
    await Promise.resolve();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    let synchronous = true;
    let callbackCalled = false;
    const complete = () => {
      if (synchronous) callbackCalled = true;
      else resolve();
    };
    try {
      callSync(timer, '下载 root.setTimeout', complete, 0);
    } catch (error) {
      reject(normalizeThrownError(error, '下载清理任务调度失败'));
      return;
    }
    synchronous = false;
    if (callbackCalled) resolve();
  });
}
