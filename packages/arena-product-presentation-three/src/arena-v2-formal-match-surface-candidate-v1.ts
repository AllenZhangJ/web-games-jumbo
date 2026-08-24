import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  requireArenaV2FormalSceneFrameForIsolatedDevelopmentCandidateV1,
  requireArenaV2FormalSceneFrameCandidateV1,
  type ArenaV2FormalSceneResolutionCandidateV1,
} from './arena-v2-formal-scene-resolution-candidate-v1.js';

export const ARENA_V2_FORMAL_MATCH_SURFACE_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  ACTIVE: 'active',
  PAUSED: 'paused',
  LEFT: 'left',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type SurfaceState = typeof ARENA_V2_FORMAL_MATCH_SURFACE_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_MATCH_SURFACE_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;

interface FormalStagePort {
  readonly load: SyncFunction;
  readonly render: SyncFunction;
  readonly pause: SyncFunction;
  readonly resume: SyncFunction;
  readonly leave: SyncFunction;
  readonly dispose: SyncFunction;
}

export interface ArenaV2FormalMatchSurfacePacketCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly scene: ArenaV2MatchSceneReadFrameCandidateV1;
  readonly hud: unknown;
  readonly resolution: ArenaV2FormalSceneResolutionCandidateV1;
}

const OPTION_KEYS = new Set(['stage', 'allowUnapprovedCandidates']);
const ENVELOPE_KEYS = new Set(['scene', 'hud']);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function boundDataMethod(target: unknown, key: string, name: string): SyncFunction {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as SyncFunction;
      return (...args: readonly unknown[]) => Reflect.apply(method, target, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function stagePort(value: unknown): FormalStagePort {
  return Object.freeze({
    load: boundDataMethod(value, 'load', 'Arena V2 formal match stage'),
    render: boundDataMethod(value, 'render', 'Arena V2 formal match stage'),
    pause: boundDataMethod(value, 'pause', 'Arena V2 formal match stage'),
    resume: boundDataMethod(value, 'resume', 'Arena V2 formal match stage'),
    leave: boundDataMethod(value, 'leave', 'Arena V2 formal match stage'),
    dispose: boundDataMethod(value, 'dispose', 'Arena V2 formal match stage'),
  });
}

function packet(
  value: unknown,
  allowUnapprovedCandidates: boolean,
): ArenaV2FormalMatchSurfacePacketCandidateV1 {
  const source = assertPlainRecord(value, 'Arena V2 formal match surface envelope');
  assertKnownKeys(source, ENVELOPE_KEYS, 'Arena V2 formal match surface envelope');
  for (const key of ENVELOPE_KEYS) dataField(source, key, 'Arena V2 formal match surface envelope');
  const scene = source.scene;
  const resolution = allowUnapprovedCandidates
    ? requireArenaV2FormalSceneFrameForIsolatedDevelopmentCandidateV1(scene)
    : requireArenaV2FormalSceneFrameCandidateV1(scene);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    scene: scene as ArenaV2MatchSceneReadFrameCandidateV1,
    hud: source.hud,
    resolution,
  });
}

/**
 * Synchronous lifecycle boundary between the local playable owner and a
 * preloaded Three stage. It resolves every authoritative Scene Read Frame
 * against the formal V2 registries before the stage can observe it. Missing
 * assets fail closed; old greybox and procedural assets are never consulted.
 */
export class ArenaV2FormalMatchSurfaceCandidateV1 {
  readonly #stage: FormalStagePort;
  readonly #allowUnapprovedCandidates: boolean;
  #state: SurfaceState = 'created';
  #lastResolution: ArenaV2FormalSceneResolutionCandidateV1 | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #stageDisposed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal match surface options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal match surface options');
    dataField(source, 'stage', 'Arena V2 formal match surface options');
    const allowUnapprovedCandidates = Object.hasOwn(source, 'allowUnapprovedCandidates')
      ? dataField(
        source,
        'allowUnapprovedCandidates',
        'Arena V2 formal match surface options',
      )
      : false;
    if (typeof allowUnapprovedCandidates !== 'boolean') {
      throw new TypeError('Arena V2 formal match surface allowUnapprovedCandidates必须是boolean。');
    }
    this.#stage = stagePort(source.stage);
    this.#allowUnapprovedCandidates = allowUnapprovedCandidates;
    Object.freeze(this);
  }

  get state(): SurfaceState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }
  get lastResolution(): ArenaV2FormalSceneResolutionCandidateV1 | null {
    return this.#runSynchronousOperation('last-resolution-read', () => this.#lastResolution);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 formal match surface ${operation}不可重入${this.#operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: string): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 formal match surface缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal match surface缺少当前操作所有权。');
    }
    this.#assertOperationCommit(this.#operation);
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
    try {
      const result = run();
      this.#assertOperationCommit(operation);
      return result;
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      const reentryError = this.#reentryError;
      const operationFailure = this.#operationFailure;
      if (this.#operation === operation) this.#operation = null;
      this.#reentryError = null;
      this.#operationFailure = null;
      if (reentryError !== null) {
        this.#state = 'failed';
        this.#lastResolution = null;
        throw operationFailure === null || operationFailure === reentryError
          ? reentryError
          : new AggregateError(
            [operationFailure, reentryError],
            `Arena V2 formal match surface ${operation}失败且检测到同步重入。`,
          );
      }
    }
  }

  #assertUsable(operation: string): void {
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
  }

  #invoke(method: keyof FormalStagePort, value?: unknown): void {
    const result = value === undefined ? this.#stage[method]() : this.#stage[method](value);
    rejectThenable(result, `Arena V2 formal match stage.${method}`);
    this.#assertCurrentOperationCommit();
  }

  #disposeStage(errors: unknown[]): void {
    if (this.#stageDisposed) return;
    const reentrySequence = this.#reentrySequence;
    try {
      const result = this.#stage.dispose();
      rejectThenable(result, 'Arena V2 formal match stage.dispose');
      if (this.#reentrySequence !== reentrySequence) {
        errors.push(this.#reentryError ?? new Error(
          'Arena V2 formal match surface Stage清理期间发生同步重入。',
        ));
        return;
      }
      this.#stageDisposed = true;
    } catch (error) {
      errors.push(error);
    }
  }

  #fail(error: unknown): never {
    const cleanupErrors: unknown[] = [];
    this.#disposeStage(cleanupErrors);
    this.#state = 'failed';
    this.#lastResolution = null;
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 formal match surface失败且Stage清理不完整。',
      );
  }

  load(value: unknown): ArenaV2FormalSceneResolutionCandidateV1 {
    return this.#runSynchronousOperation('load', () => {
    this.#assertUsable('Arena V2 formal match surface load');
    if (this.#state !== 'created') throw new Error('Arena V2 formal match surface只能加载一次。');
    try {
      const next = packet(value, this.#allowUnapprovedCandidates);
      this.#invoke('load', next);
      this.#lastResolution = next.resolution;
      this.#state = 'ready';
      return next.resolution;
    } catch (error) {
      return this.#fail(error);
    }
    });
  }

  render(value: unknown): ArenaV2FormalSceneResolutionCandidateV1 {
    return this.#runSynchronousOperation('render', () => {
    this.#assertUsable('Arena V2 formal match surface render');
    if (this.#state !== 'ready' && this.#state !== 'active' && this.#state !== 'left') {
      throw new Error(`Arena V2 formal match surface不能在${this.#state}渲染。`);
    }
    try {
      const next = packet(value, this.#allowUnapprovedCandidates);
      this.#invoke('render', next);
      this.#lastResolution = next.resolution;
      this.#state = 'active';
      return next.resolution;
    } catch (error) {
      return this.#fail(error);
    }
    });
  }

  pause(): void {
    this.#runSynchronousOperation('pause', () => {
    this.#assertUsable('Arena V2 formal match surface pause');
    if (this.#state === 'paused') return;
    if (this.#state !== 'active') throw new Error('Arena V2 formal match surface只能暂停活动对局。');
    try {
      this.#invoke('pause');
      this.#state = 'paused';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  resume(): void {
    this.#runSynchronousOperation('resume', () => {
    this.#assertUsable('Arena V2 formal match surface resume');
    if (this.#state === 'active') return;
    if (this.#state !== 'paused') throw new Error('Arena V2 formal match surface只能恢复暂停对局。');
    try {
      this.#invoke('resume');
      this.#state = 'active';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  leave(): void {
    this.#runSynchronousOperation('leave', () => {
    this.#assertUsable('Arena V2 formal match surface leave');
    if (this.#state === 'left') return;
    if (this.#state !== 'active' && this.#state !== 'paused') {
      throw new Error('Arena V2 formal match surface只能离开已开始的对局。');
    }
    try {
      this.#invoke('leave');
      this.#lastResolution = null;
      this.#state = 'left';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  dispose(): void {
    this.#runSynchronousOperation('dispose', () => {
    if (this.#state === 'disposed' || (this.#state === 'failed' && this.#stageDisposed)) return;
      const errors: unknown[] = [];
      this.#disposeStage(errors);
      this.#lastResolution = null;
      this.#state = errors.length === 0 ? 'disposed' : 'failed';
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal match surface清理不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_MATCH_SURFACE_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  requiresPreloadedFormalAssets: true as const,
  consumesRendererNeutralSceneReadFrame: true as const,
  revalidatesFormalRegistryEveryFrame: true as const,
  ownsMatchSurfaceLifecycle: true as const,
  disposeCommitsUnderOperationGuard: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedStageReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  stageCallbacksCheckedBeforeResolutionAndStateCommit: true as const,
  stageCleanupReentryRetainsOwnershipForRetry: true as const,
  successfulStateCommitsAfterStageOperationOnly: true as const,
  ownsRuleOrMatchAuthority: false as const,
  programmaticFallbackAllowed: false as const,
  unapprovedCandidatesDisabledByDefault: true as const,
  greyboxFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
