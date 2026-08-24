import {
  assertNonEmptyString,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2ModeHudFeedbackVisualCommandV1,
} from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';
import {
  createArenaV2FeedbackVisualCommandSnapshotCandidateV1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
  type ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1,
} from './arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.js';

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_STATE_CANDIDATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

export type ArenaV2TwentyWeaponFeedbackVfxPortStateCandidateV1 =
  typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_STATE_CANDIDATE_V1[
    keyof typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_STATE_CANDIDATE_V1
  ];

export type ArenaV2TwentyWeaponFeedbackVfxAssetPolicyCandidateV1 =
  | 'candidate-audition'
  | 'production-approved-only';

export interface ArenaV2TwentyWeaponFeedbackVfxPortSnapshotCandidateV1 {
  readonly state: ArenaV2TwentyWeaponFeedbackVfxPortStateCandidateV1;
  readonly assetPolicy: ArenaV2TwentyWeaponFeedbackVfxAssetPolicyCandidateV1;
  readonly activeSourceEventIds: readonly string[];
  readonly activeSpecializedSourceEventIds: readonly string[];
  readonly activePassthroughSourceEventIds: readonly string[];
}

type SyncMethod = (...args: readonly unknown[]) => unknown;

interface DownstreamPort {
  readonly presentResolved: SyncMethod;
  readonly presentPassthrough: SyncMethod;
  readonly remove: SyncMethod;
  readonly clear: SyncMethod;
  readonly dispose: SyncMethod;
}

interface ActiveRecord {
  readonly route: 'specialized' | 'passthrough';
  readonly cueId: string;
  readonly commandFingerprint: string;
}

const OPTION_KEYS = new Set(['assetPolicy', 'downstream']);
const SPECIALIZED_CUE_PREFIX = 'arena.cue.vfx.weapon-feedback.';
export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1 =
  Object.freeze([
    'impact-confirm',
    'impact-surface-transfer',
    'ring-out',
    'evaded-warning',
    'movement-fall-warning',
    'mode-started',
    'participant-fell-credited-hit',
    'participant-fell-movement',
    'participant-fell-environment',
    'respawn-scheduled',
    'respawned',
    'safe-anchor-committed',
    'race-finish-claimed',
    'enemy-entered',
    'enemy-left',
    'survival-first-fall',
    'survival-terminal-fall',
    'match-ended',
    'supply-spawned',
    'supply-picked-up',
    'supply-replaced',
    'supply-expired',
  ] as const);

export type ArenaV2TwentyWeaponFeedbackVfxPassthroughCueIdCandidateV1 =
  typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1[number];

const PASSTHROUGH_CUES: ReadonlySet<string> = new Set(
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
);
const MAXIMUM_ACTIVE_IDENTITIES = 64;

function commandFingerprint(input: ArenaV2ModeHudFeedbackVisualCommandV1): string {
  const fingerprint = JSON.stringify(input);
  if (fingerprint === undefined) {
    throw new TypeError('Arena V2 feedback VFX命令无法形成完整身份指纹。');
  }
  return fingerprint;
}

function dataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined
    || !descriptor.enumerable
    || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(value: unknown, key: string, name: string): SyncMethod {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as SyncMethod;
      return (...args: readonly unknown[]) => Reflect.apply(method, value, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function options(value: unknown): Readonly<{
  readonly assetPolicy: ArenaV2TwentyWeaponFeedbackVfxAssetPolicyCandidateV1;
  readonly downstream: DownstreamPort;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 feedback VFX port options必须是对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== OPTION_KEYS.size
    || keys.some((key) => typeof key !== 'string' || !OPTION_KEYS.has(key))) {
    throw new RangeError('Arena V2 feedback VFX port options字段不闭合。');
  }
  const assetPolicy = dataField(value, 'assetPolicy', 'Arena V2 feedback VFX port options');
  if (assetPolicy !== 'candidate-audition' && assetPolicy !== 'production-approved-only') {
    throw new RangeError('Arena V2 feedback VFX port assetPolicy无效。');
  }
  const downstream = dataField(value, 'downstream', 'Arena V2 feedback VFX port options');
  return Object.freeze({
    assetPolicy,
    downstream: Object.freeze({
      presentResolved: dataMethod(
        downstream,
        'presentResolved',
        'Arena V2 feedback VFX downstream',
      ),
      presentPassthrough: dataMethod(
        downstream,
        'presentPassthrough',
        'Arena V2 feedback VFX downstream',
      ),
      remove: dataMethod(downstream, 'remove', 'Arena V2 feedback VFX downstream'),
      clear: dataMethod(downstream, 'clear', 'Arena V2 feedback VFX downstream'),
      dispose: dataMethod(downstream, 'dispose', 'Arena V2 feedback VFX downstream'),
    }),
  });
}

/**
 * Candidate visual port for the specialized HUD owner. Authored candidates may
 * be auditioned in an isolated surface, while the production policy rejects
 * every currently unapproved texture before a downstream side effect occurs.
 */
export class ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1 {
  readonly #assetPolicy: ArenaV2TwentyWeaponFeedbackVfxAssetPolicyCandidateV1;
  readonly #downstream: DownstreamPort;
  readonly #active = new Map<string, ActiveRecord>();
  #state: ArenaV2TwentyWeaponFeedbackVfxPortStateCandidateV1 = 'active';
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #downstreamDisposed = false;

  constructor(value: unknown) {
    const resolved = options(value);
    this.#assetPolicy = resolved.assetPolicy;
    this.#downstream = resolved.downstream;
  }

  get state(): ArenaV2TwentyWeaponFeedbackVfxPortStateCandidateV1 {
    this.#assertNoOperation('Arena V2 feedback VFX port state read');
    return this.#state;
  }

  #assertActive(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state !== 'active') throw new Error(`${operation}拒绝状态${this.#state}。`);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可在${this.#operation}期间同步重入。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #beginOperation(operation: string): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertOperationCommit(operation: string): void {
    if (this.#operation !== operation) {
      throw new Error(`${operation}缺少Arena V2 feedback VFX操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #endOperation(operation: string): void {
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
        `${operation}失败且检测到同步重入。`,
      );
    if (this.#state === 'disposed') {
      this.#state = 'failed';
      throw failure;
    }
    if (this.#state === 'failed') throw failure;
    this.#fail(failure);
  }

  #invoke(method: SyncMethod, name: string, ...args: readonly unknown[]): void {
    rejectThenable(method(...args), name);
  }

  #fail(error: unknown): never {
    if (this.#operation !== null) this.#operationFailure ??= error;
    this.#state = 'failed';
    const cleanupErrors: unknown[] = [];
    const cleanupReentrySequence = this.#reentrySequence;
    try {
      this.#invoke(this.#downstream.clear, 'Arena V2 feedback VFX downstream.clear after failure');
      if (this.#reentrySequence === cleanupReentrySequence) this.#active.clear();
      else cleanupErrors.push(this.#reentryError ?? new Error(
        'Arena V2 feedback VFX失败清理期间发生同步重入。',
      ));
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
    const failure = cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 feedback VFX port失败且清理不完整。',
      );
    if (this.#operation !== null) this.#operationFailure = failure;
    throw failure;
  }

  present(value: unknown): void {
    const operation = 'Arena V2 feedback VFX port present';
    this.#assertActive(operation);
    this.#beginOperation(operation);
    try {
      const input = createArenaV2FeedbackVisualCommandSnapshotCandidateV1(value);
      const route = input.cueId.startsWith(SPECIALIZED_CUE_PREFIX)
        ? 'specialized' as const
        : 'passthrough' as const;
      if (route === 'passthrough' && !PASSTHROUGH_CUES.has(input.cueId)) {
        throw new RangeError(`Arena V2 feedback VFX passthrough Cue未注册：${input.cueId}。`);
      }
      const fingerprint = commandFingerprint(input);
      const previous = this.#active.get(input.sourceEventId);
      if (previous !== undefined
        && (previous.route !== route
          || previous.cueId !== input.cueId
          || previous.commandFingerprint !== fingerprint)) {
        throw new RangeError(`Arena V2 feedback VFX身份漂移：${input.sourceEventId}。`);
      }
      if (previous !== undefined) {
        this.#assertOperationCommit(operation);
        return;
      }
      if (this.#active.size >= MAXIMUM_ACTIVE_IDENTITIES) {
        throw new RangeError('Arena V2 feedback VFX活动身份超过64。');
      }
      if (route === 'specialized') {
        const resolution: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1 =
          resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(input);
        if (this.#assetPolicy === 'production-approved-only'
          && !resolution.formalTexture.productionApproved) {
          throw new RangeError(`Arena V2 feedback VFX素材未获生产批准：${input.cueId}。`);
        }
        this.#invoke(
          this.#downstream.presentResolved,
          'Arena V2 feedback VFX downstream.presentResolved',
          resolution,
        );
      } else {
        this.#invoke(
          this.#downstream.presentPassthrough,
          'Arena V2 feedback VFX downstream.presentPassthrough',
          input,
        );
      }
      this.#assertOperationCommit(operation);
      this.#active.set(input.sourceEventId, Object.freeze({
        route,
        cueId: input.cueId,
        commandFingerprint: fingerprint,
      }));
    } catch (error) {
      this.#fail(error);
    } finally {
      this.#endOperation(operation);
    }
  }

  remove(value: unknown): void {
    const operation = 'Arena V2 feedback VFX port remove';
    this.#assertActive(operation);
    const sourceEventId = assertNonEmptyString(value, 'Arena V2 feedback VFX remove id');
    if (!this.#active.has(sourceEventId)) return;
    this.#beginOperation(operation);
    try {
      this.#invoke(
        this.#downstream.remove,
        'Arena V2 feedback VFX downstream.remove',
        sourceEventId,
      );
      this.#assertOperationCommit(operation);
      this.#active.delete(sourceEventId);
    } catch (error) {
      this.#fail(error);
    } finally {
      this.#endOperation(operation);
    }
  }

  clear(): void {
    const operation = 'Arena V2 feedback VFX port clear';
    this.#assertActive(operation);
    this.#beginOperation(operation);
    try {
      this.#invoke(this.#downstream.clear, 'Arena V2 feedback VFX downstream.clear');
      this.#assertOperationCommit(operation);
      this.#active.clear();
    } catch (error) {
      this.#fail(error);
    } finally {
      this.#endOperation(operation);
    }
  }

  getSnapshot(): ArenaV2TwentyWeaponFeedbackVfxPortSnapshotCandidateV1 {
    this.#assertNoOperation('Arena V2 feedback VFX port snapshot read');
    const identities = [...this.#active.entries()].sort(([left], [right]) => (
      left < right ? -1 : left > right ? 1 : 0
    ));
    return Object.freeze({
      state: this.#state,
      assetPolicy: this.#assetPolicy,
      activeSourceEventIds: Object.freeze(identities.map(([sourceEventId]) => sourceEventId)),
      activeSpecializedSourceEventIds: Object.freeze(identities.flatMap(
        ([sourceEventId, record]) => record.route === 'specialized' ? [sourceEventId] : [],
      )),
      activePassthroughSourceEventIds: Object.freeze(identities.flatMap(
        ([sourceEventId, record]) => record.route === 'passthrough' ? [sourceEventId] : [],
      )),
    });
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 feedback VFX port dispose');
    if (this.#state === 'disposed') return;
    const operation = 'Arena V2 feedback VFX port dispose';
    this.#beginOperation(operation);
    try {
      const errors: unknown[] = [];
      let reentryStoppedCleanup = false;
      if (this.#state === 'active') {
        const clearReentrySequence = this.#reentrySequence;
        try {
          this.#invoke(this.#downstream.clear, 'Arena V2 feedback VFX downstream.clear dispose');
          if (this.#reentrySequence !== clearReentrySequence) {
            errors.push(this.#reentryError ?? new Error(
              'Arena V2 feedback VFX销毁清空期间发生同步重入。',
            ));
            reentryStoppedCleanup = true;
          } else {
            this.#active.clear();
          }
        } catch (error) {
          errors.push(error);
          if (this.#reentrySequence !== clearReentrySequence) reentryStoppedCleanup = true;
        }
      }
      if (!reentryStoppedCleanup && !this.#downstreamDisposed) {
        const disposeReentrySequence = this.#reentrySequence;
        try {
          this.#invoke(this.#downstream.dispose, 'Arena V2 feedback VFX downstream.dispose');
          if (this.#reentrySequence !== disposeReentrySequence) {
            errors.push(this.#reentryError ?? new Error(
              'Arena V2 feedback VFX下游销毁期间发生同步重入。',
            ));
            reentryStoppedCleanup = true;
          } else {
            this.#downstreamDisposed = true;
            this.#active.clear();
          }
        } catch (error) {
          errors.push(error);
          if (this.#reentrySequence !== disposeReentrySequence) reentryStoppedCleanup = true;
        }
      }
      this.#state = errors.length === 0 ? 'disposed' : 'failed';
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 feedback VFX port销毁不完整。');
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation(operation);
    }
  }
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  maximumActiveIdentities: 64 as const,
  specializedCuePolicy: 'authored-resolution' as const,
  genericCuePolicy: 'validated-existing-passthrough' as const,
  exactPassthroughCueIdentityCount:
    ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1.length,
  currentProductionApprovedTextureCount: 0 as const,
  programmaticAssetFallbackAllowed: false as const,
  downstreamLifecycleOwned: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  downstreamCallbacksCheckedBeforeActiveIdentityCommit: true as const,
  exactReplayIsIdempotentBeforeDownstreamDispatch: true as const,
  fullVisualCommandIdentityDriftFailsClosed: true as const,
  specializedResolutionPreservesAttackerAndTargetIdentity: true as const,
  swallowedDownstreamClearReentryRetainsIdentityAndStopsDispose: true as const,
  downstreamOwnershipReleasedOnlyAfterConfirmedDispose: true as const,
  swallowedDownstreamReentryFailsClosed: true as const,
  presentRemoveClearAndDisposeCommitUnderStickyOperation: true as const,
  stateAndSnapshotReadsRejectedDuringOperation: true as const,
  idempotentRemoveAndDisposeCheckReentryBeforeFastPath: true as const,
  ownsRuleOrMatchAuthority: false as const,
  validationStatus: 'not-run' as const,
});
