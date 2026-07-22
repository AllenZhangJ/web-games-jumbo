import {
  cloneFrozenData,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { InputPilotObservedSession } from './input-pilot-observed-session.js';

type DataRecord = Readonly<Record<string, unknown>>;
type BoundMethod = (...args: readonly unknown[]) => unknown;

interface MatchServicePort {
  readonly create: BoundMethod;
}

interface CleanupPort {
  readonly destroy: BoundMethod;
}

function dataRecord(value: unknown, name: string): DataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as DataRecord;
}

function ownDataValue(record: DataRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  return descriptor.value;
}

function findDataMethod(owner: object, method: string, name: string): BoundMethod {
  let current: object | null = owner;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, method);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${name}.${method} 必须是数据方法。`);
      }
      if (typeof descriptor.value !== 'function') {
        throw new TypeError(`${name} 缺少 ${method}()。`);
      }
      return descriptor.value.bind(owner) as BoundMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${method}()。`);
}

function matchServicePort(value: unknown): MatchServicePort {
  const owner = dataRecord(value, 'InputPilotObservedMatchService.matchService');
  return Object.freeze({
    create: findDataMethod(owner, 'create', 'InputPilotObservedMatchService.matchService'),
  });
}

function collectorOwner(value: unknown): object {
  const owner = dataRecord(value, 'InputPilotObservedMatchService.collector');
  findDataMethod(owner, 'observeStep', 'InputPilotObservedMatchService.collector');
  return owner;
}

function cleanupPort(value: unknown, name: string): CleanupPort {
  const owner = dataRecord(value, name);
  return Object.freeze({ destroy: findDataMethod(owner, 'destroy', name) });
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

export interface InputPilotObservedMatch {
  readonly matchSeed: number;
  readonly opponent: unknown;
  readonly session: InputPilotObservedSession;
}

export interface InputPilotObservedMatchServiceDebugSnapshot {
  readonly creating: boolean;
  readonly created: boolean;
  readonly destroyed: boolean;
  readonly hasSession: boolean;
}

export class InputPilotObservedMatchService {
  #matchService: MatchServicePort | null;
  #collector: object | null;
  #session: InputPilotObservedSession | null;
  #pendingCleanup: CleanupPort | null;
  #creating: boolean;
  #created: boolean;
  #failed: boolean;
  #destroyed: boolean;

  constructor({ matchService, collector }: { readonly matchService: unknown; readonly collector: unknown }) {
    this.#matchService = matchServicePort(matchService);
    this.#collector = collectorOwner(collector);
    this.#session = null;
    this.#pendingCleanup = null;
    this.#creating = false;
    this.#created = false;
    this.#failed = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  create(options: unknown): InputPilotObservedMatch {
    if (this.#destroyed || this.#failed) {
      throw new Error('InputPilotObservedMatchService 已销毁。');
    }
    if (this.#creating) throw new Error('InputPilotObservedMatchService.create() 不可重入。');
    if (this.#created) throw new Error('一个 pilot assignment 只允许创建一局比赛。');
    const matchService = this.#matchService;
    const collector = this.#collector;
    if (matchService === null || collector === null) {
      throw new Error('InputPilotObservedMatchService 资源已释放。');
    }
    this.#creating = true;
    let rawCleanup: CleanupPort | null = null;
    let observedSession: InputPilotObservedSession | null = null;
    try {
      const match = dataRecord(matchService.create(options), 'pilot match');
      const rawSession = ownDataValue(match, 'session', 'pilot match');
      rawCleanup = cleanupPort(rawSession, 'pilot match session');
      observedSession = new InputPilotObservedSession({ session: rawSession, collector });
      const observedMatch = Object.freeze({
        matchSeed: uint32(ownDataValue(match, 'matchSeed', 'pilot match'), 'pilot match.matchSeed'),
        opponent: cloneFrozenData(ownDataValue(match, 'opponent', 'pilot match'), 'pilot match.opponent'),
        session: observedSession,
      });
      this.#session = observedSession;
      this.#created = true;
      return observedMatch;
    } catch (error) {
      const failure = normalizeThrownError(
        error,
        'InputPilotObservedMatchService.create() 失败',
      );
      const cleanupErrors: Error[] = [];
      const target = observedSession === null
        ? rawCleanup
        : cleanupPort(observedSession, 'pilot observed session');
      if (target !== null && this.#session === null) {
        try {
          target.destroy();
        } catch (cleanupError) {
          this.#pendingCleanup = target;
          this.#failed = true;
          cleanupErrors.push(normalizeThrownError(
            cleanupError,
            'InputPilotObservedMatchService session 清理失败',
          ));
        }
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'InputPilotObservedMatchService 创建失败且清理未完整完成。',
      );
    } finally {
      this.#creating = false;
    }
  }

  getDebugSnapshot(): InputPilotObservedMatchServiceDebugSnapshot {
    return Object.freeze({
      creating: this.#creating,
      created: this.#created,
      destroyed: this.#destroyed,
      hasSession: this.#session !== null || this.#pendingCleanup !== null,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#creating) {
      throw new Error('create() 期间不能销毁 InputPilotObservedMatchService。');
    }
    const target = this.#session === null
      ? this.#pendingCleanup
      : cleanupPort(this.#session, 'pilot observed session');
    this.#failed = true;
    if (target !== null) target.destroy();
    this.#session = null;
    this.#pendingCleanup = null;
    this.#matchService = null;
    this.#collector = null;
    this.#destroyed = true;
  }
}
