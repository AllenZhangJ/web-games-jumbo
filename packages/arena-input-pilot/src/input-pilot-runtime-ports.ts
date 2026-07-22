import {
  assertKnownKeys,
  assertPlainRecord,
  createSynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
  SynchronousStorageLease,
} from '@number-strategy-jump/arena-storage';
import type { SynchronousStorageLeaseOptions } from '@number-strategy-jump/arena-storage';

export function createInputPilotStoragePort(value: unknown) {
  return createSynchronousStoragePort(value, { label: 'Pilot Storage' });
}

export const INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION = SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION;
const LEASE_OPTION_KEYS = new Set([
  'storage', 'key', 'ownerId', 'holderId', 'wallNow', 'durationMs',
  'takeoverSameOwner',
]);

function normalizedLeaseOptions(value: unknown): Record<string, unknown> {
  const options = assertPlainRecord(value, 'InputPilotStorageLease options');
  assertKnownKeys(options, LEASE_OPTION_KEYS, 'InputPilotStorageLease options');
  return Object.fromEntries(Reflect.ownKeys(options).map((key) => {
    if (typeof key !== 'string') throw new TypeError('InputPilotStorageLease options 不能包含 Symbol。');
    return [key, options[key]];
  }));
}

export class InputPilotStorageLease extends SynchronousStorageLease {
  constructor(optionsValue: unknown) {
    super({
      ...normalizedLeaseOptions(optionsValue),
      label: 'InputPilotStorageLease',
    } as unknown as SynchronousStorageLeaseOptions);
  }
}

type UnknownMethod = (...args: unknown[]) => unknown;
function optionalDataMethod(value: unknown, key: string, name: string): UnknownMethod | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  let current: object | null = value;
  const visited = new Set<object>();
  while (current) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as UnknownMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function dataMethod(value: unknown, key: string, name: string): UnknownMethod {
  const method = optionalDataMethod(value, key, name);
  if (method) return method;
  throw new TypeError(`${name} 缺少 ${key}()。`);
}

function shallowDataRecord(value: unknown, name: string): Record<string, unknown> {
  const record = assertPlainRecord(value, name);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol。`);
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new RangeError(`${name} 包含不安全字段 ${key}。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

export class InputPilotAssignedMatchService {
  #createMatch: UnknownMethod | null;
  #destroyMatchService: UnknownMethod | null;
  readonly #matchSeed: number;
  #created = false;
  #destroyed = false;

  constructor(optionsValue: unknown) {
    const options = assertPlainRecord(optionsValue, 'InputPilotAssignedMatchService options');
    assertKnownKeys(options, new Set(['matchService', 'matchSeed']), 'InputPilotAssignedMatchService options');
    if (!Number.isSafeInteger(options.matchSeed) || (options.matchSeed as number) < 0 || (options.matchSeed as number) > 0xffffffff) {
      throw new RangeError('InputPilotAssignedMatchService.matchSeed 必须是 uint32。');
    }
    this.#createMatch = dataMethod(options.matchService, 'create', 'InputPilotAssignedMatchService.matchService');
    this.#destroyMatchService = optionalDataMethod(
      options.matchService,
      'destroy',
      'InputPilotAssignedMatchService.matchService',
    );
    this.#matchSeed = options.matchSeed as number;
    Object.freeze(this);
  }

  create(optionsValue: unknown = {}): unknown {
    if (this.#destroyed || !this.#createMatch) throw new Error('InputPilotAssignedMatchService 已销毁。');
    if (this.#created) throw new Error('一个 pilot assignment 只允许创建一局比赛。');
    const options = shallowDataRecord(optionsValue, 'pilot match options');
    if (Object.hasOwn(options, 'matchSeed') && options.matchSeed !== this.#matchSeed) {
      throw new RangeError('pilot match options 不能覆盖 assignment matchSeed。');
    }
    this.#created = true;
    try {
      return this.#createMatch({ ...options, matchSeed: this.#matchSeed });
    } catch (error) {
      this.#created = false;
      throw error;
    }
  }

  destroy(): void {
    if (this.#destroyed) return;
    try {
      this.#destroyMatchService?.();
    } finally {
      this.#createMatch = null;
      this.#destroyMatchService = null;
      this.#destroyed = true;
    }
  }
}

export const INPUT_PILOT_RUNTIME_STATE = Object.freeze({
  CREATED: 'created', STARTING: 'starting', RUNNING: 'running', RESULT: 'result',
  FAILED: 'failed', DESTROYED: 'destroyed',
} as const);
export type InputPilotRuntimeFactory = (...args: unknown[]) => unknown;
export interface InputPilotRuntimePort {
  readonly start: UnknownMethod;
  readonly setPaused: UnknownMethod;
  readonly getStatus: UnknownMethod;
  readonly finalizeMetrics: UnknownMethod;
  readonly destroy: UnknownMethod;
}

export function validateInputPilotRuntimeFactory(value: unknown): InputPilotRuntimeFactory {
  if (typeof value !== 'function') throw new TypeError('InputPilotTrialController.runtimeFactory 必须是函数。');
  return value as InputPilotRuntimeFactory;
}
export function validateInputPilotRuntime(value: unknown): InputPilotRuntimePort {
  return Object.freeze({
    start: dataMethod(value, 'start', 'pilot runtime'),
    setPaused: dataMethod(value, 'setPaused', 'pilot runtime'),
    getStatus: dataMethod(value, 'getStatus', 'pilot runtime'),
    finalizeMetrics: dataMethod(value, 'finalizeMetrics', 'pilot runtime'),
    destroy: dataMethod(value, 'destroy', 'pilot runtime'),
  });
}
export function validateInputPilotRuntimeStatus(value: unknown) {
  const status = assertPlainRecord(value, 'pilot runtime status');
  assertKnownKeys(status, new Set(['state', 'timedOut']), 'pilot runtime status');
  const states = new Set<string>(Object.values(INPUT_PILOT_RUNTIME_STATE));
  if (typeof status.state !== 'string' || !states.has(status.state)) {
    throw new RangeError(`pilot runtime state 不受支持：${String(status.state)}。`);
  }
  if (typeof status.timedOut !== 'boolean') throw new TypeError('pilot runtime status.timedOut 必须是布尔值。');
  return Object.freeze({ state: status.state, timedOut: status.timedOut });
}
