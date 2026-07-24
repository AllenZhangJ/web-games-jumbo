import {
  createWebJsonDownloadLease,
  releaseWebJsonDownloadLease,
} from './web-json-download-runtime.js';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';

const KINDS = new Set(['aggregate', 'audit', 'evidence']);

function ownOptions(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Pilot JSON 下载 options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Pilot JSON 下载 options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !['kind', 'revision', 'value'].includes(key)) {
      throw new RangeError(`Pilot JSON 下载不支持 option ${String(key)}。`);
    }
    const descriptor = descriptors[key]!;
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Pilot JSON 下载 option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  for (const key of ['kind', 'revision', 'value']) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`Pilot JSON 下载缺少 ${key}。`);
  }
  return Object.freeze(result);
}

function safeRevision(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

export function downloadInputPilotJson(root: unknown, optionsValue: unknown): string {
  const options = ownOptions(optionsValue);
  const kind = options.kind;
  if (typeof kind !== 'string' || !KINDS.has(kind)) {
    throw new RangeError(`未知 Pilot 导出类型 ${String(kind)}。`);
  }
  const value = cloneFrozenData(options.value, 'Pilot JSON 下载 value');
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new TypeError('Pilot JSON 下载 value 不可序列化。');
  const text = `${serialized}\n`;
  const fileName = `arena-input-pilot-${kind}-r${safeRevision(options.revision)}.json`;
  const lease = createWebJsonDownloadLease(root, text, fileName);
  const primaryErrors: unknown[] = [];
  try {
    lease.click();
  } catch (error) {
    primaryErrors.push(error);
  }
  releaseWebJsonDownloadLease(lease, primaryErrors);
  return fileName;
}
