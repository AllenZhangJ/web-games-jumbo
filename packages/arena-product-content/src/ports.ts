import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import type { FrozenMatchContentPool } from './frozen-match-content-pool.js';

type AnyMethod = (...arguments_: never[]) => unknown;

export interface ProfileSnapshotPort {
  getSnapshot(): PlayerProfile;
}

export interface ContentPoolResolverPort {
  resolve(options: Readonly<{ profile: PlayerProfile; matchSeed: number }>): FrozenMatchContentPool;
}

export function readOwnDataField(
  record: object,
  key: string,
  label: string,
  optional = false,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined && optional) return undefined;
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function normalizeExactOptions(
  value: unknown,
  keys: ReadonlySet<string>,
  label: string,
): object {
  assertKnownKeys(value, keys, label);
  return assertPlainRecord(value, label);
}

export function snapshotMethod<T extends AnyMethod>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`ProfileContentPoolProvider 需要 ${ownerName}。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${ownerName} 原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as T;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${ownerName} 缺少 ${methodName}()。`);
}

export function rejectAsyncSyncReturn(value: unknown, label: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null && visited.size < 32 && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if ('value' in descriptor && typeof descriptor.value === 'function') {
        Promise.resolve(value).catch(() => {
          // 同步端口拒绝 Promise，但仍收容迟到 rejection。
        });
      }
      throw new TypeError(`${label} 必须同步完成。`);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
}
