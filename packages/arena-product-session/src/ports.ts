import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ProductMatchCoordinatorSnapshot,
  ProductMatchStepOutcome,
} from '@number-strategy-jump/arena-product-match';
import type { ProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import type { RewardCommitOutcome } from '@number-strategy-jump/arena-product-progression';
import type {
  ProductSessionEvent,
  ProductSessionState,
  ProductSessionStateSnapshot,
} from '@number-strategy-jump/arena-product-state';

type AnyMethod = (...arguments_: never[]) => unknown;

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
  start(): ProductMatchCoordinatorSnapshot;
  setPaused(paused: boolean): ProductMatchCoordinatorSnapshot;
  step(playerFrame?: unknown): ProductMatchStepOutcome;
  getMatchSnapshot(): Readonly<Record<string, unknown>> | null;
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
  throw new TypeError(`ProductSession ${ownerName} 缺少 ${methodName}()。`);
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
  return Object.freeze({
    prepare: snapshotMethod<ProductMatchCoordinatorPort['prepare']>(value, 'prepare', 'MatchCoordinator'),
    start: snapshotMethod<ProductMatchCoordinatorPort['start']>(value, 'start', 'MatchCoordinator'),
    setPaused: snapshotMethod<ProductMatchCoordinatorPort['setPaused']>(value, 'setPaused', 'MatchCoordinator'),
    step: snapshotMethod<ProductMatchCoordinatorPort['step']>(value, 'step', 'MatchCoordinator'),
    getMatchSnapshot: snapshotMethod<ProductMatchCoordinatorPort['getMatchSnapshot']>(value, 'getMatchSnapshot', 'MatchCoordinator'),
    getResult: snapshotMethod<ProductMatchCoordinatorPort['getResult']>(value, 'getResult', 'MatchCoordinator'),
    release: snapshotMethod<ProductMatchCoordinatorPort['release']>(value, 'release', 'MatchCoordinator'),
    resetFailure: snapshotMethod<ProductMatchCoordinatorPort['resetFailure']>(value, 'resetFailure', 'MatchCoordinator'),
    destroy: snapshotMethod<ProductMatchCoordinatorPort['destroy']>(value, 'destroy', 'MatchCoordinator'),
    getSnapshot: snapshotMethod<ProductMatchCoordinatorPort['getSnapshot']>(value, 'getSnapshot', 'MatchCoordinator'),
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
