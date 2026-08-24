import {
  assertKnownKeys,
  assertTrimmedNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ModeHudConsumerEpochV1,
  type ArenaV2ModeHudConsumerEpochProjectionV1,
  type ArenaV2ModeHudConsumerEpochSnapshotV1,
} from './arena-v2-mode-hud-consumer-epoch-v1.js';
import {
  ArenaV2ModeHudFeedbackEffectConsumerV1,
  type ArenaV2ModeHudFeedbackEffectConsumerSnapshotV1,
  type ArenaV2ModeHudFeedbackEffectQualityTierV1,
} from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';

export const ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

export type ArenaV2ModeHudPresentationHostStateV1 =
  typeof ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1[
    keyof typeof ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1
  ];
type PresentationHostOperation = 'begin-epoch' | 'consume' | 'dispose';

export interface ArenaV2ModeHudPresentationHostSnapshotV1 {
  readonly state: ArenaV2ModeHudPresentationHostStateV1;
  readonly consumerEpochId: string | null;
  readonly generation: number;
  readonly projectionConsumer: ArenaV2ModeHudConsumerEpochSnapshotV1;
  readonly effectConsumer: ArenaV2ModeHudFeedbackEffectConsumerSnapshotV1;
  readonly cleanup: Readonly<{
    readonly started: boolean;
    readonly projectionConsumerDisposed: boolean;
    readonly effectConsumerDisposed: boolean;
  }>;
}

const OPTION_KEYS = new Set(['audio', 'visual', 'qualityTier']);
const BEGIN_KEYS = new Set(['consumerEpochId', 'baselineModel', 'preferences']);
const CONSUME_REQUIRED_KEYS = new Set([
  'consumerEpochId', 'model', 'sourceEvents', 'preferences',
]);
const CONSUME_KEYS = new Set([
  ...CONSUME_REQUIRED_KEYS, 'projectedRenderModel',
]);

function exactData(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function exactDataWithOptional(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, allowedKeys, name);
  for (const key of requiredKeys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function dataOptions(value: unknown): Readonly<{
  readonly audio: unknown;
  readonly visual: unknown;
  readonly qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 HUD Presentation Host options必须是对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key === 'symbol')
    || keys.length !== OPTION_KEYS.size
    || keys.some((key) => typeof key !== 'string' || !OPTION_KEYS.has(key))
  ) throw new RangeError('Arena V2 HUD Presentation Host options字段不闭合。');
  const fields = new Map<string, unknown>();
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2 HUD Presentation Host options.${key}必须是数据字段。`);
    }
    fields.set(key, descriptor.value);
  }
  const qualityTier = fields.get('qualityTier');
  if (qualityTier !== 'low' && qualityTier !== 'medium' && qualityTier !== 'high') {
    throw new RangeError('Arena V2 HUD Presentation Host qualityTier无效。');
  }
  return Object.freeze({
    audio: fields.get('audio'),
    visual: fields.get('visual'),
    qualityTier,
  });
}

/**
 * Presentation-only composition boundary. The host is the sole public owner of
 * both consumers, so an epoch cannot remain half-active after either child
 * rejects. Partial child cleanup keeps the host failed and retryable; the host
 * reaches disposed only after both child owners complete their cleanup.
 */
export class ArenaV2ModeHudPresentationHostV1 {
  readonly #projectionConsumer = new ArenaV2ModeHudConsumerEpochV1();
  readonly #effectConsumer: ArenaV2ModeHudFeedbackEffectConsumerV1;
  #state: ArenaV2ModeHudPresentationHostStateV1 =
    ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.CREATED;
  #consumerEpochId: string | null = null;
  #generation = 0;
  #operation: PresentationHostOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #cleanupStarted = false;
  #projectionConsumerDisposed = false;
  #effectConsumerDisposed = false;

  constructor(value: unknown) {
    const options = dataOptions(value);
    this.#effectConsumer = new ArenaV2ModeHudFeedbackEffectConsumerV1(options).load();
  }

  get state(): ArenaV2ModeHudPresentationHostStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #beginOperation(operation: PresentationHostOperation): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 HUD Presentation Host拒绝${this.#operation}期间同步重入${operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: PresentationHostOperation): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 HUD Presentation Host缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #endOperation(operation: PresentationHostOperation): void {
    const reentryError = this.#reentryError;
    const operationFailure = this.#operationFailure;
    this.#operation = null;
    this.#reentryError = null;
    this.#operationFailure = null;
    if (reentryError === null) return;
    const failure = operationFailure === null || operationFailure === reentryError
      ? reentryError
      : new AggregateError(
        [operationFailure, reentryError],
        `Arena V2 HUD Presentation Host ${operation}失败且检测到同步重入。`,
      );
    if (this.#state === ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.DISPOSED) {
      this.#state = ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED;
      throw failure;
    }
    if (this.#state === ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED) throw failure;
    this.#closeFailed(failure);
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.DISPOSED) {
      throw new Error('Arena V2 HUD Presentation Host已销毁。');
    }
    if (this.#state === ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED) {
      throw new Error('Arena V2 HUD Presentation Host已失败关闭。');
    }
  }

  #closeFailed(error: unknown): never {
    if (this.#operation !== null) this.#operationFailure ??= error;
    this.#state = ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED;
    this.#cleanupStarted = true;
    const cleanupErrors = this.#cleanupChildren();
    const failure = new Error('Arena V2 HUD Presentation Host原子消费失败。') as Error & {
      cleanupErrors?: readonly unknown[];
    };
    failure.cause = error;
    if (cleanupErrors.length > 0) failure.cleanupErrors = Object.freeze(cleanupErrors);
    if (this.#operation !== null) this.#operationFailure = failure;
    throw failure;
  }

  #cleanupChildren(): readonly unknown[] {
    const cleanupErrors: unknown[] = [];
    if (!this.#effectConsumerDisposed) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#effectConsumer.dispose();
        if (this.#reentrySequence !== reentrySequence) {
          cleanupErrors.push(this.#reentryError ?? new Error(
            'Arena V2 HUD Presentation Host Effect Consumer清理期间发生重入。',
          ));
          return Object.freeze(cleanupErrors);
        }
        this.#effectConsumerDisposed = true;
      } catch (cause) {
        cleanupErrors.push(cause);
        if (this.#reentrySequence !== reentrySequence) return Object.freeze(cleanupErrors);
      }
    }
    if (this.#effectConsumerDisposed && !this.#projectionConsumerDisposed) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#projectionConsumer.dispose();
        if (this.#reentrySequence !== reentrySequence) {
          cleanupErrors.push(this.#reentryError ?? new Error(
            'Arena V2 HUD Presentation Host Projection Consumer清理期间发生重入。',
          ));
          return Object.freeze(cleanupErrors);
        }
        this.#projectionConsumerDisposed = true;
      } catch (cause) { cleanupErrors.push(cause); }
    }
    return Object.freeze(cleanupErrors);
  }

  #cleanupComplete(): boolean {
    return this.#projectionConsumerDisposed && this.#effectConsumerDisposed;
  }

  beginEpoch(value: unknown): ArenaV2ModeHudConsumerEpochProjectionV1 {
    this.#assertUsable('begin-epoch');
    this.#beginOperation('begin-epoch');
    try {
      const source = exactData(value, BEGIN_KEYS, 'Arena V2 HUD Presentation Host begin');
      const consumerEpochId = assertTrimmedNonEmptyString(
        source.consumerEpochId,
        'Arena V2 HUD Presentation Host epoch id',
      );
      if (consumerEpochId === this.#consumerEpochId) {
        throw new RangeError('Arena V2 HUD Presentation Host拒绝复用epoch id。');
      }
      this.#consumerEpochId = consumerEpochId;
      try {
        const projection = this.#projectionConsumer.beginEpoch(source);
        this.#assertOperationCommit('begin-epoch');
        this.#effectConsumer.beginEpoch(consumerEpochId);
        this.#assertOperationCommit('begin-epoch');
        this.#effectConsumer.consumeEpoch(consumerEpochId, projection.feedback);
        this.#assertOperationCommit('begin-epoch');
        this.#generation = projection.generation;
        this.#state = ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.ACTIVE;
        return projection;
      } catch (error) {
        return this.#closeFailed(error);
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('begin-epoch');
    }
  }

  consume(value: unknown): ArenaV2ModeHudConsumerEpochProjectionV1 {
    this.#assertUsable('consume');
    this.#beginOperation('consume');
    try {
      const source = exactDataWithOptional(
        value,
        CONSUME_KEYS,
        CONSUME_REQUIRED_KEYS,
        'Arena V2 HUD Presentation Host consume',
      );
      const consumerEpochId = assertTrimmedNonEmptyString(
        source.consumerEpochId,
        'Arena V2 HUD Presentation Host consume epoch id',
      );
      if (consumerEpochId !== this.#consumerEpochId) {
        throw new RangeError('Arena V2 HUD Presentation Host拒绝旧epoch回调。');
      }
      if (this.#state !== ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.ACTIVE) {
        throw new Error(`Arena V2 HUD Presentation Host状态${this.#state}不可消费。`);
      }
      try {
        const projection = this.#projectionConsumer.consume(source);
        this.#assertOperationCommit('consume');
        this.#effectConsumer.consumeEpoch(consumerEpochId, projection.feedback);
        this.#assertOperationCommit('consume');
        return projection;
      } catch (error) {
        return this.#closeFailed(error);
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('consume');
    }
  }

  getSnapshot(): ArenaV2ModeHudPresentationHostSnapshotV1 {
    this.#assertNoOperation('getSnapshot');
    return Object.freeze({
      state: this.#state,
      consumerEpochId: this.#consumerEpochId,
      generation: this.#generation,
      projectionConsumer: this.#projectionConsumer.getSnapshot(),
      effectConsumer: this.#effectConsumer.getSnapshot(),
      cleanup: Object.freeze({
        started: this.#cleanupStarted,
        projectionConsumerDisposed: this.#projectionConsumerDisposed,
        effectConsumerDisposed: this.#effectConsumerDisposed,
      }),
    });
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.DISPOSED) return;
    this.#beginOperation('dispose');
    try {
      this.#cleanupStarted = true;
      const cleanupErrors = this.#cleanupChildren();
      if (this.#cleanupComplete()) {
        this.#consumerEpochId = null;
        this.#state = ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.DISPOSED;
      } else {
        this.#state = ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED;
      }
      if (cleanupErrors.length > 0) {
        const failure = new Error('Arena V2 HUD Presentation Host销毁不完整。') as Error & {
          cleanupErrors: readonly unknown[];
        };
        failure.cleanupErrors = Object.freeze(cleanupErrors);
        throw failure;
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('dispose');
    }
  }
}

export const ARENA_V2_MODE_HUD_PRESENTATION_HOST_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  ownsAuthorityState: false as const,
  consumesCheckpointData: false as const,
  childConsumersExposed: false as const,
  boundedWeaponFeedbackRenderProjectionForwarded: true as const,
  partialFailurePolicy: 'fail-closed-and-clean-both-consumers' as const,
  cleanupRetriesOnlyIncompleteChildConsumers: true as const,
  cleanupFollowsEffectConsumerBeforeProjectionProducer: true as const,
  terminalStateWaitsForBothChildConsumers: true as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  synchronousLifecycleReentryRejected: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCallbacksCheckedBeforeCrossChildProgressOrHostCommit: true as const,
  swallowedChildCleanupReentryRetainsCurrentAndLaterOwners: true as const,
  swallowedChildConsumerOrExternalEffectReentryFailsClosed: true as const,
  epochConsumeAndDisposeCommitUnderStickyOperation: true as const,
  stateAndSnapshotReadsRejectedDuringOperation: true as const,
  idempotentDisposeChecksReentryBeforeFastPath: true as const,
  operationLockScope: 'begin-epoch-consume-dispose-with-snapshot-rejection' as const,
  validationStatus: 'not-run' as const,
});
