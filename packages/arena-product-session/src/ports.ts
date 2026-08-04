import {
  assertKnownKeys,
  assertPlainRecord,
  isNormalizedInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  assertProductMatchReadFrameV2,
  assertProductMatchResult,
} from '@number-strategy-jump/arena-product-match';
import type {
  ProductMatchCoordinatorReadFrameStartOutcome,
  ProductMatchCoordinatorReadFrameStepOutcome,
  ProductMatchCoordinatorSnapshot,
} from '@number-strategy-jump/arena-product-match';
import type { ProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import type { RewardCommitOutcome } from '@number-strategy-jump/arena-product-progression';
import type {
  ProductSessionEvent,
  ProductSessionState,
  ProductSessionStateSnapshot,
} from '@number-strategy-jump/arena-product-state';
import { assertProductMatchSeed } from '@number-strategy-jump/arena-product-contracts';

type AnyMethod = (...arguments_: never[]) => unknown;

const NATIVE_PROMISE_THEN = Promise.prototype.then;

class MissingPortPropertyError extends TypeError {}

export interface ProductSessionStateMachinePort {
  dispatch(eventId: ProductSessionEvent): ProductSessionStateSnapshot;
  suspend(): ProductSessionStateSnapshot;
  resume(): ProductSessionStateSnapshot;
  failRecoverable(recoveryState: ProductSessionState): ProductSessionStateSnapshot;
  retry(): ProductSessionStateSnapshot;
  failFatal(): ProductSessionStateSnapshot;
  destroy(): ProductSessionStateSnapshot;
  getSnapshot(): ProductSessionStateSnapshot;
}

export interface ProductProfileServicePort {
  open(): PlayerProfile | PromiseLike<PlayerProfile>;
  renewLease(): unknown;
  selectCharacter(characterId: unknown): PlayerProfile;
  destroy(): unknown;
}

export interface ProductRewardCommitterPort {
  commit(result: ProductMatchResult): RewardCommitOutcome;
}

export interface ProductMatchCoordinatorPort {
  prepare(): PromiseLike<ProductMatchCoordinatorSnapshot> | ProductMatchCoordinatorSnapshot;
  setPaused(paused: boolean): ProductMatchCoordinatorSnapshot;
  startWithReadFrame: () => ProductMatchCoordinatorReadFrameStartOutcome;
  stepWithReadFrame: (playerFrame?: unknown) => ProductMatchCoordinatorReadFrameStepOutcome;
  getMatchReadFrame: () => ProductMatchCoordinatorReadFrameStartOutcome['readFrame'] | null;
  getResult(): ProductMatchResult | null;
  release(): ProductMatchCoordinatorSnapshot;
  resetFailure(): ProductMatchCoordinatorSnapshot;
  destroy(): unknown;
  getSnapshot(): ProductMatchCoordinatorSnapshot;
}

export type ProductDiagnosticSink = (diagnostic: Readonly<{
  type: string;
  error: Error | null;
}>) => unknown;

const OPTION_KEYS = new Set([
  'stateMachine',
  'profileService',
  'matchCoordinator',
  'rewardCommitter',
  'diagnosticSink',
]);
const READ_START_KEYS = new Set(['readFrame', 'snapshot']);
const READ_STEP_KEYS = new Set(['events', 'readFrame', 'input', 'result']);
const COORDINATOR_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'state', 'hasRuntime', 'preparing', 'paused', 'cleanupIncomplete',
  'publicMatchInfo', 'result',
]);
function readOwnDataField(
  record: object,
  key: string,
  label: string,
  optional = false,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined && optional) return null;
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function assertFrozenReadFrame(
  value: unknown,
  label: string,
  expectedMatchSeed?: number,
): Readonly<Record<string, unknown>> {
  // This is a shallow product-port gate, not the PA2a audit.  The trusted
  // Session frame remains the owner of recursive validation; this call checks
  // all fields consumed by Product and preserves the trusted object identity.
  return assertProductMatchReadFrameV2(value, expectedMatchSeed) as unknown as Readonly<Record<string, unknown>>;
}

function assertFrozenCoordinatorSnapshot(value: unknown, label: string): Readonly<Record<string, unknown>> {
  const snapshot = assertPlainRecord(value, label);
  if (!Object.isFrozen(snapshot)) throw new TypeError(`${label} 必须是冻结对象。`);
  assertKnownKeys(snapshot, COORDINATOR_SNAPSHOT_KEYS, label);
  for (const key of COORDINATOR_SNAPSHOT_KEYS) readOwnDataField(snapshot, key, label);
  if (readOwnDataField(snapshot, 'schemaVersion', label) !== 1) {
    throw new RangeError(`${label}.schemaVersion 无效。`);
  }
  if (typeof readOwnDataField(snapshot, 'state', label) !== 'string') {
    throw new TypeError(`${label}.state 无效。`);
  }
  for (const key of ['hasRuntime', 'preparing', 'paused', 'cleanupIncomplete']) {
    if (typeof readOwnDataField(snapshot, key, label) !== 'boolean') {
      throw new TypeError(`${label}.${key} 必须是布尔值。`);
    }
  }
  return snapshot;
}

function readCoordinatorMatchSeed(
  snapshot: Readonly<Record<string, unknown>>,
  label: string,
): number {
  const publicInfo = assertPlainRecord(
    readOwnDataField(snapshot, 'publicMatchInfo', label),
    `${label}.publicMatchInfo`,
  );
  if (!Object.isFrozen(publicInfo)) throw new TypeError(`${label}.publicMatchInfo 必须冻结。`);
  assertKnownKeys(publicInfo, new Set(['matchSeed', 'opponent', 'content']), `${label}.publicMatchInfo`);
  for (const key of ['matchSeed', 'opponent', 'content']) {
    readOwnDataField(publicInfo, key, `${label}.publicMatchInfo`);
  }
  for (const key of ['opponent', 'content']) {
    const nested = assertPlainRecord(
      readOwnDataField(publicInfo, key, `${label}.publicMatchInfo`),
      `${label}.publicMatchInfo.${key}`,
    );
    if (!Object.isFrozen(nested)) throw new TypeError(`${label}.publicMatchInfo.${key} 必须冻结。`);
  }
  return assertProductMatchSeed(
    readOwnDataField(publicInfo, 'matchSeed', `${label}.publicMatchInfo`),
    `${label}.publicMatchInfo.matchSeed`,
  );
}

function assertFrozenProductResult(value: unknown, label: string): Readonly<Record<string, unknown>> {
  return assertProductMatchResult(value, undefined, label) as unknown as Readonly<Record<string, unknown>>;
}

function normalizeReadFrameStart(value: unknown): {
  readonly outcome: ProductMatchCoordinatorReadFrameStartOutcome;
  readonly matchSeed: number;
} {
  const outcome = assertPlainRecord(value, 'ProductSession V2 start outcome');
  if (!Object.isFrozen(outcome)) throw new TypeError('ProductSession V2 start outcome 必须冻结。');
  assertKnownKeys(outcome, READ_START_KEYS, 'ProductSession V2 start outcome');
  const snapshot = assertFrozenCoordinatorSnapshot(
    readOwnDataField(outcome, 'snapshot', 'ProductSession V2 start outcome'),
    'ProductSession V2 start snapshot',
  );
  const matchSeed = readCoordinatorMatchSeed(snapshot, 'ProductSession V2 start snapshot');
  const readFrame = assertFrozenReadFrame(
    readOwnDataField(outcome, 'readFrame', 'ProductSession V2 start outcome'),
    'ProductSession V2 start frame',
    matchSeed,
  );
  const state = readOwnDataField(snapshot, 'state', 'ProductSession V2 start snapshot');
  if (
    readOwnDataField(snapshot, 'hasRuntime', 'ProductSession V2 start snapshot') !== true
    || readOwnDataField(snapshot, 'preparing', 'ProductSession V2 start snapshot') !== false
    || (state !== 'running' && state !== 'paused')
  ) {
    throw new Error('ProductSession V2 start snapshot 不处于 active match 状态。');
  }
  return Object.freeze({
    outcome: Object.freeze({
      readFrame: readFrame as ProductMatchCoordinatorReadFrameStartOutcome['readFrame'],
    snapshot: snapshot as unknown as ProductMatchCoordinatorReadFrameStartOutcome['snapshot'],
    }),
    matchSeed,
  });
}

function normalizeReadFrameStep(
  value: unknown,
  expectedMatchSeed: number,
): ProductMatchCoordinatorReadFrameStepOutcome {
  const outcome = assertPlainRecord(value, 'ProductSession V2 step outcome');
  if (!Object.isFrozen(outcome)) throw new TypeError('ProductSession V2 step outcome 必须冻结。');
  assertKnownKeys(outcome, READ_STEP_KEYS, 'ProductSession V2 step outcome');
  const events = readOwnDataField(outcome, 'events', 'ProductSession V2 step outcome');
  if (!Array.isArray(events) || !Object.isFrozen(events)) {
    throw new TypeError('ProductSession V2 step events 必须是冻结数组。');
  }
  const input = readOwnDataField(outcome, 'input', 'ProductSession V2 step outcome');
  if (!isNormalizedInputFrame(input)) {
    throw new TypeError('ProductSession V2 step input 必须是 normalized InputFrame。');
  }
  const result = readOwnDataField(outcome, 'result', 'ProductSession V2 step outcome');
  if (result !== null) {
    assertFrozenProductResult(result, 'ProductSession V2 step result');
    if (readOwnDataField(result as object, 'matchSeed', 'ProductSession V2 step result') !== expectedMatchSeed) {
      throw new Error('ProductSession V2 step result 与 active matchSeed 不一致。');
    }
  }
  return Object.freeze({
    events: events as readonly unknown[],
    readFrame: assertFrozenReadFrame(
      readOwnDataField(outcome, 'readFrame', 'ProductSession V2 step outcome'),
      'ProductSession V2 step frame',
      expectedMatchSeed,
    ) as ProductMatchCoordinatorReadFrameStepOutcome['readFrame'],
    input,
    result: result as ProductMatchCoordinatorReadFrameStepOutcome['result'],
  });
}

function snapshotMethod<T extends AnyMethod>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`ProductSessionController 需要 ${ownerName}。`);
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
        throw new TypeError(`ProductSession ${ownerName}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as T;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new MissingPortPropertyError(`ProductSession ${ownerName} 缺少 ${methodName}()。`);
}

function createStateMachinePort(value: unknown): Readonly<ProductSessionStateMachinePort> {
  return Object.freeze({
    dispatch: snapshotMethod<ProductSessionStateMachinePort['dispatch']>(value, 'dispatch', 'StateMachine'),
    suspend: snapshotMethod<ProductSessionStateMachinePort['suspend']>(value, 'suspend', 'StateMachine'),
    resume: snapshotMethod<ProductSessionStateMachinePort['resume']>(value, 'resume', 'StateMachine'),
    failRecoverable: snapshotMethod<ProductSessionStateMachinePort['failRecoverable']>(value, 'failRecoverable', 'StateMachine'),
    retry: snapshotMethod<ProductSessionStateMachinePort['retry']>(value, 'retry', 'StateMachine'),
    failFatal: snapshotMethod<ProductSessionStateMachinePort['failFatal']>(value, 'failFatal', 'StateMachine'),
    destroy: snapshotMethod<ProductSessionStateMachinePort['destroy']>(value, 'destroy', 'StateMachine'),
    getSnapshot: snapshotMethod<ProductSessionStateMachinePort['getSnapshot']>(value, 'getSnapshot', 'StateMachine'),
  });
}

function createProfileServicePort(value: unknown): Readonly<ProductProfileServicePort> {
  return Object.freeze({
    open: snapshotMethod<ProductProfileServicePort['open']>(value, 'open', 'ProfileService'),
    renewLease: snapshotMethod<ProductProfileServicePort['renewLease']>(value, 'renewLease', 'ProfileService'),
    selectCharacter: snapshotMethod<ProductProfileServicePort['selectCharacter']>(value, 'selectCharacter', 'ProfileService'),
    destroy: snapshotMethod<ProductProfileServicePort['destroy']>(value, 'destroy', 'ProfileService'),
  });
}

function createRewardCommitterPort(value: unknown): Readonly<ProductRewardCommitterPort> {
  return Object.freeze({
    commit: snapshotMethod<ProductRewardCommitterPort['commit']>(value, 'commit', 'RewardCommitter'),
  });
}

function createMatchCoordinatorPort(value: unknown): Readonly<ProductMatchCoordinatorPort> {
  let activeMatchSeed: number | null = null;
  const startWithReadFrame = snapshotMethod<ProductMatchCoordinatorPort['startWithReadFrame']>(
    value,
    'startWithReadFrame',
    'MatchCoordinator',
  );
  const stepWithReadFrame = snapshotMethod<ProductMatchCoordinatorPort['stepWithReadFrame']>(
    value,
    'stepWithReadFrame',
    'MatchCoordinator',
  );
  const getMatchReadFrame = snapshotMethod<ProductMatchCoordinatorPort['getMatchReadFrame']>(
    value,
    'getMatchReadFrame',
    'MatchCoordinator',
  );
  const prepare = snapshotMethod<ProductMatchCoordinatorPort['prepare']>(value, 'prepare', 'MatchCoordinator');
  const setPaused = snapshotMethod<ProductMatchCoordinatorPort['setPaused']>(value, 'setPaused', 'MatchCoordinator');
  const rawGetResult = snapshotMethod<ProductMatchCoordinatorPort['getResult']>(value, 'getResult', 'MatchCoordinator');
  const release = snapshotMethod<ProductMatchCoordinatorPort['release']>(value, 'release', 'MatchCoordinator');
  const resetFailure = snapshotMethod<ProductMatchCoordinatorPort['resetFailure']>(value, 'resetFailure', 'MatchCoordinator');
  const destroy = snapshotMethod<ProductMatchCoordinatorPort['destroy']>(value, 'destroy', 'MatchCoordinator');
  const getSnapshot = snapshotMethod<ProductMatchCoordinatorPort['getSnapshot']>(value, 'getSnapshot', 'MatchCoordinator');
  const startWithReadFramePort = (): ProductMatchCoordinatorReadFrameStartOutcome => {
      const outcome = startWithReadFrame();
      rejectAsyncSyncReturn(outcome, 'ProductSession MatchCoordinator.startWithReadFrame');
      const normalized = normalizeReadFrameStart(outcome);
      activeMatchSeed = normalized.matchSeed;
      return normalized.outcome;
    };
  const stepWithReadFramePort = (playerFrame: unknown = null): ProductMatchCoordinatorReadFrameStepOutcome => {
      const outcome = stepWithReadFrame(playerFrame);
      rejectAsyncSyncReturn(outcome, 'ProductSession MatchCoordinator.stepWithReadFrame');
      if (activeMatchSeed === null) throw new Error('ProductSession V2 尚未建立 active match identity。');
      return normalizeReadFrameStep(outcome, activeMatchSeed);
    };
  const getMatchReadFramePort = (): ProductMatchCoordinatorReadFrameStartOutcome['readFrame'] | null => {
      const value = getMatchReadFrame();
      rejectAsyncSyncReturn(value, 'ProductSession MatchCoordinator.getMatchReadFrame');
      if (value === null) return null;
      if (activeMatchSeed === null) throw new Error('ProductSession V2 尚未建立 active match identity。');
      return assertFrozenReadFrame(
        value,
        'ProductSession V2 current frame',
        activeMatchSeed,
      ) as ProductMatchCoordinatorReadFrameStartOutcome['readFrame'];
    };
  return Object.freeze({
    prepare,
    setPaused,
    startWithReadFrame: startWithReadFramePort,
    stepWithReadFrame: stepWithReadFramePort,
    getMatchReadFrame: getMatchReadFramePort,
    getResult: (): ProductMatchResult | null => {
      const result = rawGetResult();
      rejectAsyncSyncReturn(result, 'ProductSession MatchCoordinator.getResult');
      if (result !== null) assertProductMatchResult(result, activeMatchSeed ?? undefined, 'ProductSession MatchCoordinator result');
      return result;
    },
    release: (): ProductMatchCoordinatorSnapshot => {
      const result = release();
      activeMatchSeed = null;
      return result;
    },
    resetFailure: (): ProductMatchCoordinatorSnapshot => {
      const result = resetFailure();
      activeMatchSeed = null;
      return result;
    },
    destroy: (): unknown => {
      activeMatchSeed = null;
      return destroy();
    },
    getSnapshot,
  });
}

export interface NormalizedProductSessionOptions {
  readonly stateMachine: Readonly<ProductSessionStateMachinePort>;
  readonly profileService: Readonly<ProductProfileServicePort>;
  readonly matchCoordinator: Readonly<ProductMatchCoordinatorPort>;
  readonly rewardCommitter: Readonly<ProductRewardCommitterPort>;
  readonly diagnosticSink: ProductDiagnosticSink | null;
}

export function normalizeProductSessionOptions(value: unknown): NormalizedProductSessionOptions {
  assertKnownKeys(value, OPTION_KEYS, 'ProductSessionController options');
  const record = assertPlainRecord(value, 'ProductSessionController options');
  const diagnosticSink = readOwnDataField(
    record,
    'diagnosticSink',
    'ProductSessionController options',
    true,
  );
  if (
    diagnosticSink !== null
    && diagnosticSink !== undefined
    && typeof diagnosticSink !== 'function'
  ) {
    throw new TypeError('ProductSession diagnosticSink 必须是函数。');
  }
  return Object.freeze({
    stateMachine: createStateMachinePort(readOwnDataField(
      record,
      'stateMachine',
      'ProductSessionController options',
    )),
    profileService: createProfileServicePort(readOwnDataField(
      record,
      'profileService',
      'ProductSessionController options',
    )),
    matchCoordinator: createMatchCoordinatorPort(readOwnDataField(
      record,
      'matchCoordinator',
      'ProductSessionController options',
    )),
    rewardCommitter: createRewardCommitterPort(readOwnDataField(
      record,
      'rewardCommitter',
      'ProductSessionController options',
    )),
    diagnosticSink: diagnosticSink === undefined
      ? null
      : diagnosticSink as ProductDiagnosticSink | null,
  });
}

export function rejectAsyncSyncReturn(value: unknown, label: string): void {
  const inspected = inspectSyncOrNativePromise(value, label);
  if (inspected.kind === 'native-promise') throw new TypeError(`${label} 必须同步完成。`);
}

type SyncReturnInspection =
  | Readonly<{ kind: 'native-promise'; value: object }>
  | Readonly<{ kind: 'sync'; value: unknown }>;

function inspectSyncOrNativePromise(value: unknown, label: string): SyncReturnInspection {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return { kind: 'sync', value };
  }
  try {
    // Calling the captured native method is the only Promise-brand probe.  It
    // also consumes a rejection before any later validation can fail; the
    // caller-thrown value is never inspected here.
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return { kind: 'native-promise', value: value as object };
  } catch {
    // Ordinary thenables have no Promise internal slot.  Do not call their
    // then method; inspect descriptors only.
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  let depth = 0;
  while (current !== null && depth < 32 && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!('value' in descriptor)) throw new TypeError(`${label} 返回了访问器 thenable。`);
      if (typeof descriptor.value === 'function') throw new TypeError(`${label} 必须同步完成。`);
      return { kind: 'sync', value };
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
  return { kind: 'sync', value };
}

export function resolveSyncOrNativePromise<T>(
  value: unknown,
  label: string,
): Promise<Readonly<{ value: T }>> {
  const inspected = inspectSyncOrNativePromise(value, label);
  if (inspected.kind === 'sync') {
    return Promise.resolve(Object.freeze({ value: inspected.value as T }));
  }
  return new Promise<Readonly<{ value: T }>>((resolve, reject) => {
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, inspected.value, [
        (resolved: unknown) => resolve(Object.freeze({ value: resolved as T })),
        (rejected: unknown) => reject(rejected),
      ]);
    } catch (error) {
      reject(error);
    }
  });
}

export function containDiagnosticReturn(value: unknown, label: string): void {
  try {
    inspectSyncOrNativePromise(value, label);
  } catch {
    // Diagnostics are observers.  Hostile accessor/function thenables are
    // rejected without executing user code and never alter product state.
  }
}
