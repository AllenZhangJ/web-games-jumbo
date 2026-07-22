import {
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotFunction,
  snapshotMethod,
  type UnknownMethod,
} from './capability-utils.js';
import { cloneKnownRecord } from './input-validation.js';

interface MatchSessionPort {
  readonly start: UnknownMethod;
  readonly setPaused: UnknownMethod;
  readonly step: UnknownMethod;
  readonly getSnapshot: UnknownMethod;
  readonly getPublicMatchInfo: UnknownMethod;
  readonly destroy: UnknownMethod;
}

interface SamplerPort {
  readonly pointerStart: UnknownMethod;
  readonly pointerMove: UnknownMethod;
  readonly pointerEnd: UnknownMethod;
  readonly pointerCancel: UnknownMethod;
  readonly resize: UnknownMethod;
  readonly suspend: UnknownMethod;
  readonly resume: UnknownMethod;
  readonly sample: UnknownMethod;
  readonly destroy: UnknownMethod;
  readonly getDebugSnapshot: UnknownMethod | null;
}

interface EventWindowPort {
  readonly consume: UnknownMethod;
  readonly destroy: UnknownMethod;
}

export interface ArenaMatchCandidate {
  readonly matchSeed: number;
  session: MatchSessionPort | null;
  sampler: SamplerPort | null;
  eventWindow: EventWindowPort | null;
  readonly publicMatchInfo: Record<string, unknown>;
  readonly snapshot: Record<string, unknown>;
}

const COMPOSITION_KEYS = new Set([
  'matchService',
  'matchConfig',
  'mapperFactory',
  'mapperId',
  'samplerFactory',
  'eventWindowFactory',
]);
const MATCH_KEYS = new Set(['matchSeed', 'opponent', 'content', 'session']);
const MAPPER_KEYS = new Set(['id', 'map']);

function pickDataProperties(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor) {
      throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
    }
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function callSync(method: UnknownMethod, name: string, ...args: unknown[]): unknown {
  const result = method(...args);
  rejectThenable(result, name);
  return result;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function recordValue(value: unknown, name: string): Record<string, unknown> {
  const cloned = cloneFrozenData(value, name);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return cloned as Record<string, unknown>;
}

function validateSession(value: unknown): MatchSessionPort {
  return Object.freeze({
    start: snapshotMethod(value, '快速匹配 session', 'start')!,
    setPaused: snapshotMethod(value, '快速匹配 session', 'setPaused')!,
    step: snapshotMethod(value, '快速匹配 session', 'step')!,
    getSnapshot: snapshotMethod(value, '快速匹配 session', 'getSnapshot')!,
    getPublicMatchInfo: snapshotMethod(value, '快速匹配 session', 'getPublicMatchInfo')!,
    destroy: snapshotMethod(value, '快速匹配 session', 'destroy')!,
  });
}

function validateSampler(value: unknown): SamplerPort {
  return Object.freeze({
    pointerStart: snapshotMethod(value, 'samplerFactory 返回值', 'pointerStart')!,
    pointerMove: snapshotMethod(value, 'samplerFactory 返回值', 'pointerMove')!,
    pointerEnd: snapshotMethod(value, 'samplerFactory 返回值', 'pointerEnd')!,
    pointerCancel: snapshotMethod(value, 'samplerFactory 返回值', 'pointerCancel')!,
    resize: snapshotMethod(value, 'samplerFactory 返回值', 'resize')!,
    suspend: snapshotMethod(value, 'samplerFactory 返回值', 'suspend')!,
    resume: snapshotMethod(value, 'samplerFactory 返回值', 'resume')!,
    sample: snapshotMethod(value, 'samplerFactory 返回值', 'sample')!,
    destroy: snapshotMethod(value, 'samplerFactory 返回值', 'destroy')!,
    getDebugSnapshot: snapshotMethod(
      value,
      'samplerFactory 返回值',
      'getDebugSnapshot',
      false,
    ),
  });
}

function validateEventWindow(value: unknown): EventWindowPort {
  return Object.freeze({
    consume: snapshotMethod(value, 'eventWindowFactory 返回值', 'consume')!,
    destroy: snapshotMethod(value, 'eventWindowFactory 返回值', 'destroy')!,
  });
}

function cleanup(value: unknown, name: string, errors: Error[]): void {
  if (value === null || value === undefined) return;
  try {
    const destroy = snapshotMethod(value, name, 'destroy');
    callSync(destroy!, `${name}.destroy`);
  } catch (error) {
    errors.push(normalizeThrownError(error, `${name} 清理失败`));
  }
}

export function destroyArenaMatchCandidate(candidateValue: unknown): void {
  if (candidateValue === null || candidateValue === undefined) return;
  const candidate = cloneKnownRecord(
    candidateValue,
    new Set(['matchSeed', 'session', 'sampler', 'eventWindow', 'publicMatchInfo', 'snapshot']),
    'Arena match candidate',
  );
  const errors: Error[] = [];
  cleanup(candidate.eventWindow, 'Arena match eventWindow', errors);
  cleanup(candidate.sampler, 'Arena match sampler', errors);
  cleanup(candidate.session, 'Arena match session', errors);
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Arena match candidate 清理未完整完成。');
  }
}

export function createArenaMatchResources(
  compositionValue: unknown,
  inputViewport: unknown,
): ArenaMatchCandidate {
  const composition = pickDataProperties(
    compositionValue,
    COMPOSITION_KEYS,
    'Arena match resources composition',
  );
  const createMatch = snapshotMethod(
    composition.matchService,
    'Arena match resources matchService',
    'create',
  )!;
  const mapperFactory = snapshotFunction(
    composition.mapperFactory,
    'Arena match resources mapperFactory',
  );
  const samplerFactory = snapshotFunction(
    composition.samplerFactory,
    'Arena match resources samplerFactory',
  );
  const eventWindowFactory = snapshotFunction(
    composition.eventWindowFactory,
    'Arena match resources eventWindowFactory',
  );
  if (typeof composition.mapperId !== 'string' || composition.mapperId.length === 0) {
    throw new TypeError('Arena match resources mapperId 必须是非空字符串。');
  }

  let session: MatchSessionPort | null = null;
  let sampler: SamplerPort | null = null;
  let eventWindow: EventWindowPort | null = null;
  try {
    const matchValue = callSync(
      createMatch,
      'Arena match resources matchService.create',
      Object.freeze({ config: composition.matchConfig }),
    );
    const match = cloneKnownRecord(matchValue, MATCH_KEYS, 'Arena quick match');
    session = validateSession(match.session);
    const publicMatchInfo = recordValue(
      callSync(session.getPublicMatchInfo, 'Arena match session.getPublicMatchInfo'),
      'Arena publicMatchInfo',
    );
    const snapshot = recordValue(
      callSync(session.getSnapshot, 'Arena match session.getSnapshot'),
      'Arena match snapshot',
    );
    const snapshotSeed = uint32(snapshot.matchSeed, 'Arena match snapshot.matchSeed');
    const publicSeed = uint32(publicMatchInfo.matchSeed, 'Arena publicMatchInfo.matchSeed');
    const bundleSeed = uint32(match.matchSeed, 'Arena quick match.matchSeed');
    if (publicSeed !== snapshotSeed || bundleSeed !== snapshotSeed) {
      throw new RangeError('快速匹配 matchSeed 在 bundle/session/snapshot 之间不一致。');
    }

    const mapperValue = callSync(
      mapperFactory,
      'Arena match resources mapperFactory',
      composition.mapperId,
    );
    const mapperSource = cloneKnownRecord(mapperValue, MAPPER_KEYS, 'Arena InputMapper');
    if (mapperSource.id !== composition.mapperId || typeof mapperSource.map !== 'function') {
      throw new TypeError('mapperFactory 返回值不符合 InputMapper 合同。');
    }
    const mapper = Object.freeze({ id: mapperSource.id, map: mapperSource.map });
    sampler = validateSampler(callSync(
      samplerFactory,
      'Arena match resources samplerFactory',
      Object.freeze({
        participantId: 'player-1',
        viewport: inputViewport,
        mapper,
      }),
    ));
    eventWindow = validateEventWindow(callSync(
      eventWindowFactory,
      'Arena match resources eventWindowFactory',
      Object.freeze({ capacity: 512 }),
    ));
    return {
      matchSeed: snapshotSeed,
      session,
      sampler,
      eventWindow,
      publicMatchInfo,
      snapshot,
    };
  } catch (error) {
    const cleanupErrors: Error[] = [];
    cleanup(eventWindow, 'Arena match eventWindow', cleanupErrors);
    cleanup(sampler, 'Arena match sampler', cleanupErrors);
    cleanup(session, 'Arena match session', cleanupErrors);
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [normalizeThrownError(error, 'Arena match resources 创建失败'), ...cleanupErrors],
        'Arena match resources 创建失败且清理未完整完成。',
      );
    }
    throw error;
  }
}
