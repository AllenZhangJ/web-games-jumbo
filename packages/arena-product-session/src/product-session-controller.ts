import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
  type ProductMatchCoordinatorSnapshot,
  type ProductMatchStepOutcome,
} from '@number-strategy-jump/arena-product-match';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfilePersistenceError } from '@number-strategy-jump/arena-profile-service';
import type { RewardCommitOutcome } from '@number-strategy-jump/arena-product-progression';
import type { RewardGrant } from '@number-strategy-jump/arena-progression';
import {
  PRODUCT_SESSION_ERROR_CODE,
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
  createProductSessionCleanupFailure,
  createProductSessionPublicError,
  type ProductSessionErrorCode,
  type ProductSessionPublicError,
  type ProductSessionState,
  type ProductSessionStateSnapshot,
} from '@number-strategy-jump/arena-product-state';
import {
  normalizeProductSessionOptions,
  rejectAsyncSyncReturn,
  type ProductDiagnosticSink,
  type ProductMatchCoordinatorPort,
  type ProductProfileServicePort,
  type ProductRewardCommitterPort,
  type ProductSessionStateMachinePort,
} from './ports.js';

export const PRODUCT_SESSION_SNAPSHOT_SCHEMA_VERSION = 2;

export interface ProductRewardSnapshot {
  readonly grant: RewardGrant;
  readonly committed: boolean;
  readonly duplicate: boolean;
}

export interface ProductSessionSnapshot {
  readonly schemaVersion: 2;
  readonly state: ProductSessionStateSnapshot;
  readonly profile: PlayerProfile | null;
  readonly match: ProductMatchCoordinatorSnapshot;
  readonly reward: ProductRewardSnapshot | null;
  readonly lastError: ProductSessionPublicError | null;
}

export interface ProductSessionStepOutcome {
  readonly matchStep: ProductMatchStepOutcome | null;
  readonly productSnapshot: ProductSessionSnapshot;
}

export interface ProductSessionRenewLeaseOutcome {
  readonly renewed: boolean;
  readonly productSnapshot: ProductSessionSnapshot;
}

export interface ProductSessionControllerOptions {
  readonly stateMachine: unknown;
  readonly profileService: unknown;
  readonly matchCoordinator: unknown;
  readonly rewardCommitter: unknown;
  readonly diagnosticSink?: ProductDiagnosticSink | null;
}

interface PrepareMatchOptions {
  readonly sourceState: ProductSessionState;
  readonly requestEvent: typeof PRODUCT_SESSION_EVENT.MATCH_REQUESTED
    | typeof PRODUCT_SESSION_EVENT.REMATCH_REQUESTED;
  readonly recoveryState: ProductSessionState;
  readonly clearRewardOnSuccess: boolean;
}

const REWARD_OUTCOME_KEYS = new Set(['grant', 'committed', 'duplicate', 'profile']);
const REWARD_UNLOCK_KEYS = ['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds'] as const;

function readDataField(record: object, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function normalizeProfile(value: unknown, label: string): PlayerProfile {
  const profile = cloneFrozenData(value, label);
  assertPlainRecord(profile, label);
  return profile as unknown as PlayerProfile;
}

function normalizeRewardOutcome(value: unknown): Readonly<{
  profile: PlayerProfile;
  reward: ProductRewardSnapshot;
}> {
  assertKnownKeys(value, REWARD_OUTCOME_KEYS, 'ProductSession RewardCommitOutcome');
  const record = assertPlainRecord(value, 'ProductSession RewardCommitOutcome');
  const committed = readDataField(record, 'committed', 'ProductSession RewardCommitOutcome');
  const duplicate = readDataField(record, 'duplicate', 'ProductSession RewardCommitOutcome');
  if (typeof committed !== 'boolean' || typeof duplicate !== 'boolean') {
    throw new TypeError('ProductSession RewardCommitOutcome 状态必须是布尔值。');
  }
  if (committed === duplicate) {
    throw new RangeError('ProductSession RewardCommitOutcome 必须且只能是 committed 或 duplicate。');
  }
  const grant = cloneFrozenData(
    readDataField(record, 'grant', 'ProductSession RewardCommitOutcome'),
    'ProductSession RewardCommitOutcome.grant',
  ) as unknown as RewardGrant;
  const grantRecord = assertPlainRecord(grant, 'ProductSession RewardCommitOutcome.grant');
  const unlocks = assertPlainRecord(
    readDataField(grantRecord, 'unlocks', 'ProductSession RewardCommitOutcome.grant'),
    'ProductSession RewardCommitOutcome.grant.unlocks',
  );
  for (const key of REWARD_UNLOCK_KEYS) {
    const ids = readDataField(unlocks, key, 'ProductSession RewardCommitOutcome.grant.unlocks');
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new TypeError(`ProductSession RewardCommitOutcome.grant.unlocks.${key} 必须是字符串数组。`);
    }
  }
  return Object.freeze({
    profile: normalizeProfile(
      readDataField(record, 'profile', 'ProductSession RewardCommitOutcome'),
      'ProductSession RewardCommitOutcome.profile',
    ),
    reward: Object.freeze({ grant, committed, duplicate }),
  });
}

function cleanupFailure(errors: readonly Error[]): Error {
  const failure = createProductSessionCleanupFailure([...errors]);
  if (!failure) throw new Error('ProductSession cleanup failure 缺少原因。');
  return failure;
}

export class ProductSessionController {
  readonly #stateMachine: Readonly<ProductSessionStateMachinePort>;
  readonly #profileService: Readonly<ProductProfileServicePort>;
  readonly #matchCoordinator: Readonly<ProductMatchCoordinatorPort>;
  readonly #rewardCommitter: Readonly<ProductRewardCommitterPort>;
  readonly #diagnosticSink: ProductDiagnosticSink | null;
  #bootPromise: Promise<ProductSessionSnapshot> | null = null;
  #matchRequestPromise: Promise<ProductSessionSnapshot> | null = null;
  #profileSnapshot: PlayerProfile | null = null;
  #rewardSnapshot: ProductRewardSnapshot | null = null;
  #lastError: ProductSessionPublicError | null = null;
  #transitioning = false;
  #stateMachineCleanupPending = true;
  #profileCleanupPending = true;
  #matchCleanupPending = true;

  constructor(options: ProductSessionControllerOptions);
  constructor(options: unknown) {
    const normalized = normalizeProductSessionOptions(options);
    this.#stateMachine = normalized.stateMachine;
    this.#profileService = normalized.profileService;
    this.#matchCoordinator = normalized.matchCoordinator;
    this.#rewardCommitter = normalized.rewardCommitter;
    this.#diagnosticSink = normalized.diagnosticSink;
    Object.freeze(this);
  }

  get state(): ProductSessionState {
    return this.#runTransition(() => this.#readState().state);
  }

  #runTransition<T>(operation: () => T): T {
    if (this.#transitioning) throw new Error('ProductSessionController 操作不可重入。');
    this.#transitioning = true;
    try {
      return operation();
    } finally {
      this.#transitioning = false;
    }
  }

  #callSync<T>(label: string, operation: () => T): T {
    const value = operation();
    rejectAsyncSyncReturn(value, label);
    return value;
  }

  #readState(): ProductSessionStateSnapshot {
    return this.#callSync(
      'ProductSession StateMachine.getSnapshot()',
      () => this.#stateMachine.getSnapshot(),
    );
  }

  #readMatch(): ProductMatchCoordinatorSnapshot {
    return this.#callSync(
      'ProductSession MatchCoordinator.getSnapshot()',
      () => this.#matchCoordinator.getSnapshot(),
    );
  }

  #dispatch(event: Parameters<ProductSessionStateMachinePort['dispatch']>[0]): void {
    this.#callSync(
      `ProductSession StateMachine.dispatch(${event})`,
      () => this.#stateMachine.dispatch(event),
    );
  }

  #report(type: string, error: Error | null = null): void {
    if (!this.#diagnosticSink) return;
    try {
      const result = this.#diagnosticSink(Object.freeze({ type, error }));
      if ((typeof result === 'object' && result !== null) || typeof result === 'function') {
        Promise.resolve(result).catch(() => {
          // 诊断只观察，不拥有产品生命周期。
        });
      }
    } catch {
      // 诊断只观察，不拥有产品生命周期。
    }
  }

  #createSnapshot(): ProductSessionSnapshot {
    const state = this.#readState();
    return Object.freeze({
      schemaVersion: PRODUCT_SESSION_SNAPSHOT_SCHEMA_VERSION,
      state,
      profile: state.state === PRODUCT_SESSION_STATE.DESTROYED
        ? null
        : this.#profileSnapshot,
      match: this.#readMatch(),
      reward: state.state === PRODUCT_SESSION_STATE.DESTROYED ? null : this.#rewardSnapshot,
      lastError: this.#lastError,
    });
  }

  #assertForeground(expectedState: ProductSessionState): ProductSessionStateSnapshot {
    const state = this.#readState();
    if (state.state === PRODUCT_SESSION_STATE.DESTROYED) {
      throw new Error('ProductSessionController 已销毁。');
    }
    if (state.state === PRODUCT_SESSION_STATE.SUSPENDED) {
      throw new Error('ProductSessionController 挂起时不能处理用户意图。');
    }
    if (state.activeState !== expectedState) {
      throw new Error(`ProductSession 需要 ${expectedState}，当前为 ${String(state.activeState)}。`);
    }
    return state;
  }

  #recover(
    code: ProductSessionErrorCode,
    recoveryState: ProductSessionState,
    error: unknown,
  ): ProductSessionSnapshot {
    const failure = normalizeThrownError(error, `ProductSession ${code}`);
    this.#callSync(
      'ProductSession StateMachine.failRecoverable()',
      () => this.#stateMachine.failRecoverable(recoveryState),
    );
    this.#lastError = createProductSessionPublicError(code);
    this.#report(code, failure);
    return this.#createSnapshot();
  }

  #fatal(code: ProductSessionErrorCode, error: unknown): ProductSessionSnapshot {
    const errors = [normalizeThrownError(error, `ProductSession ${code}`)];
    try {
      this.#callSync(
        'ProductSession StateMachine.failFatal()',
        () => this.#stateMachine.failFatal(),
      );
    } catch (stateError) {
      errors.push(normalizeThrownError(stateError, 'ProductSession fatal 状态发布失败'));
      const failure = cleanupFailure(errors);
      this.#lastError = createProductSessionPublicError(
        PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
      );
      this.#report(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, failure);
      throw failure;
    }
    if (this.#matchCleanupPending) {
      try {
        this.#callSync(
          'ProductSession MatchCoordinator.destroy()',
          () => this.#matchCoordinator.destroy(),
        );
        this.#matchCleanupPending = false;
      } catch (cleanupError) {
        errors.push(normalizeThrownError(cleanupError, 'Product match 清理失败'));
      }
    }
    const combined = errors.length === 1 ? errors[0]! : cleanupFailure(errors);
    this.#lastError = createProductSessionPublicError(
      errors.length === 1 ? code : PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
    );
    this.#report(code, combined);
    return this.#createSnapshot();
  }

  #resetFailedMatchOrFatal(
    originalError: unknown,
    recoveryCode: ProductSessionErrorCode,
    recoveryState: ProductSessionState = PRODUCT_SESSION_STATE.CHARACTER_SELECT,
  ): ProductSessionSnapshot {
    try {
      const match = this.#readMatch();
      if (match.state === PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
        this.#callSync(
          'ProductSession MatchCoordinator.resetFailure()',
          () => this.#matchCoordinator.resetFailure(),
        );
      } else if (
        match.state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE
        && match.state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
      ) {
        this.#callSync(
          'ProductSession MatchCoordinator.release()',
          () => this.#matchCoordinator.release(),
        );
      }
    } catch (cleanupError) {
      return this.#fatal(
        PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
        cleanupFailure([
          normalizeThrownError(originalError, recoveryCode),
          normalizeThrownError(cleanupError, 'Product match 恢复清理失败'),
        ]),
      );
    }
    return this.#recover(recoveryCode, recoveryState, originalError);
  }

  boot(): Promise<ProductSessionSnapshot> {
    return this.#runTransition(() => this.#boot());
  }

  #boot(): Promise<ProductSessionSnapshot> {
    const state = this.#readState();
    if (state.state === PRODUCT_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ProductSessionController 已销毁。'));
    }
    if (state.activeState === PRODUCT_SESSION_STATE.LOADING_PROFILE && this.#bootPromise) {
      return this.#bootPromise;
    }
    if (
      state.activeState === PRODUCT_SESSION_STATE.READY
      || state.activeState === PRODUCT_SESSION_STATE.CHARACTER_SELECT
      || state.activeState === PRODUCT_SESSION_STATE.MATCHING
      || state.activeState === PRODUCT_SESSION_STATE.PREPARING
      || state.activeState === PRODUCT_SESSION_STATE.IN_MATCH
      || state.activeState === PRODUCT_SESSION_STATE.RESULTS
      || state.activeState === PRODUCT_SESSION_STATE.REWARD
      || state.activeState === PRODUCT_SESSION_STATE.UNLOCK
    ) return Promise.resolve(this.#createSnapshot());
    this.#assertForeground(PRODUCT_SESSION_STATE.BOOT);
    this.#dispatch(PRODUCT_SESSION_EVENT.BOOT_REQUESTED);

    let opened: unknown;
    try {
      opened = this.#profileService.open();
    } catch (error) {
      opened = Promise.reject(error);
    }
    const operation: Promise<ProductSessionSnapshot> = Promise.resolve(opened)
      .then((profile) => this.#runTransition(() => {
        if (this.#readState().state === PRODUCT_SESSION_STATE.DESTROYED) {
          this.#profileCleanupPending = true;
          try {
            this.#callSync(
              'ProductSession late ProfileService.destroy()',
              () => this.#profileService.destroy(),
            );
            this.#profileCleanupPending = false;
          } catch (cleanupError) {
            const failure = normalizeThrownError(cleanupError, '迟到 Profile 清理失败');
            this.#lastError = createProductSessionPublicError(
              PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
            );
            this.#report(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, failure);
          }
          return this.#createSnapshot();
        }
        this.#profileSnapshot = normalizeProfile(profile, 'ProductSession loaded profile');
        this.#lastError = null;
        this.#dispatch(PRODUCT_SESSION_EVENT.PROFILE_LOADED);
        return this.#createSnapshot();
      }))
      .catch((error: unknown) => this.#runTransition(() => {
        if (this.#readState().state === PRODUCT_SESSION_STATE.DESTROYED) {
          return this.#createSnapshot();
        }
        return this.#recover(
          PRODUCT_SESSION_ERROR_CODE.PROFILE_LOAD_FAILED,
          PRODUCT_SESSION_STATE.BOOT,
          error,
        );
      }))
      .finally(() => {
        this.#runTransition(() => {
          if (this.#bootPromise === operation) this.#bootPromise = null;
        });
      });
    this.#bootPromise = operation;
    return operation;
  }

  openCharacterSelect(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      const state = this.#readState();
      if (
        state.state !== PRODUCT_SESSION_STATE.SUSPENDED
        && state.activeState === PRODUCT_SESSION_STATE.CHARACTER_SELECT
      ) return this.#createSnapshot();
      this.#assertForeground(PRODUCT_SESSION_STATE.READY);
      this.#dispatch(PRODUCT_SESSION_EVENT.CHARACTER_SELECT_OPENED);
      return this.#createSnapshot();
    });
  }

  closeCharacterSelect(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      const state = this.#readState();
      if (
        state.state !== PRODUCT_SESSION_STATE.SUSPENDED
        && state.activeState === PRODUCT_SESSION_STATE.READY
      ) return this.#createSnapshot();
      this.#assertForeground(PRODUCT_SESSION_STATE.CHARACTER_SELECT);
      this.#dispatch(PRODUCT_SESSION_EVENT.CHARACTER_SELECT_CLOSED);
      return this.#createSnapshot();
    });
  }

  selectCharacter(characterId: unknown): ProductSessionSnapshot {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.CHARACTER_SELECT);
      try {
        const profile = this.#callSync(
          'ProductSession ProfileService.selectCharacter()',
          () => this.#profileService.selectCharacter(characterId),
        );
        this.#profileSnapshot = normalizeProfile(profile, 'ProductSession selected profile');
        this.#lastError = null;
        return this.#createSnapshot();
      } catch (error) {
        if (!(error instanceof PlayerProfilePersistenceError)) throw error;
        if (!error.recoverable) {
          return this.#fatal(PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED, error);
        }
        return this.#recover(
          PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED,
          PRODUCT_SESSION_STATE.CHARACTER_SELECT,
          error,
        );
      }
    });
  }

  #prepareMatch(options: PrepareMatchOptions): Promise<ProductSessionSnapshot> {
    const current = this.#readState();
    if (current.activeState === PRODUCT_SESSION_STATE.MATCHING && this.#matchRequestPromise) {
      return this.#matchRequestPromise;
    }
    this.#assertForeground(options.sourceState);
    this.#dispatch(options.requestEvent);

    const operation: Promise<ProductSessionSnapshot> = Promise.resolve()
      .then(() => this.#runTransition(() => this.#matchCoordinator.prepare()))
      .then((value) => Promise.resolve(value))
      .then(() => this.#runTransition(() => {
        if (this.#readState().state === PRODUCT_SESSION_STATE.DESTROYED) {
          return this.#createSnapshot();
        }
        const state = this.#readState();
        if (state.activeState !== PRODUCT_SESSION_STATE.MATCHING) {
          throw new Error('Product match 准备完成时产品状态已失配。');
        }
        if (state.state === PRODUCT_SESSION_STATE.SUSPENDED) {
          this.#callSync(
            'ProductSession MatchCoordinator.setPaused(true)',
            () => this.#matchCoordinator.setPaused(true),
          );
        }
        this.#dispatch(PRODUCT_SESSION_EVENT.MATCH_PREPARED);
        if (options.clearRewardOnSuccess) this.#rewardSnapshot = null;
        this.#lastError = null;
        return this.#createSnapshot();
      }))
      .catch((error: unknown) => this.#runTransition(() => {
        if (this.#readState().state === PRODUCT_SESSION_STATE.DESTROYED) {
          return this.#createSnapshot();
        }
        return this.#resetFailedMatchOrFatal(
          error,
          PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED,
          options.recoveryState,
        );
      }))
      .finally(() => {
        this.#runTransition(() => {
          if (this.#matchRequestPromise === operation) this.#matchRequestPromise = null;
        });
      });
    this.#matchRequestPromise = operation;
    return operation;
  }

  requestMatch(): Promise<ProductSessionSnapshot> {
    return this.#runTransition(() => this.#prepareMatch({
      sourceState: PRODUCT_SESSION_STATE.CHARACTER_SELECT,
      requestEvent: PRODUCT_SESSION_EVENT.MATCH_REQUESTED,
      recoveryState: PRODUCT_SESSION_STATE.CHARACTER_SELECT,
      clearRewardOnSuccess: false,
    }));
  }

  requestRematch(): Promise<ProductSessionSnapshot> {
    return this.#runTransition(() => {
      const current = this.#readState();
      if (current.activeState === PRODUCT_SESSION_STATE.MATCHING && this.#matchRequestPromise) {
        return this.#matchRequestPromise;
      }
      if (
        current.activeState !== PRODUCT_SESSION_STATE.REWARD
        && current.activeState !== PRODUCT_SESSION_STATE.UNLOCK
      ) {
        throw new Error(
          `ProductSession 只能从 reward/unlock 快捷重赛，当前为 ${String(current.activeState)}。`,
        );
      }
      return this.#prepareMatch({
        sourceState: current.activeState,
        requestEvent: PRODUCT_SESSION_EVENT.REMATCH_REQUESTED,
        recoveryState: current.activeState,
        clearRewardOnSuccess: true,
      });
    });
  }

  beginMatch(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.PREPARING);
      try {
        this.#callSync(
          'ProductSession MatchCoordinator.start()',
          () => this.#matchCoordinator.start(),
        );
        this.#dispatch(PRODUCT_SESSION_EVENT.MATCH_STARTED);
        this.#lastError = null;
        return this.#createSnapshot();
      } catch (error) {
        return this.#resetFailedMatchOrFatal(
          error,
          PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED,
        );
      }
    });
  }

  stepMatch(playerFrame: unknown = null): ProductSessionStepOutcome {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.IN_MATCH);
      try {
        const matchStep = this.#callSync(
          'ProductSession MatchCoordinator.step()',
          () => this.#matchCoordinator.step(playerFrame),
        );
        if (matchStep.result !== null) this.#dispatch(PRODUCT_SESSION_EVENT.MATCH_FINISHED);
        return Object.freeze({ matchStep, productSnapshot: this.#createSnapshot() });
      } catch (error) {
        return Object.freeze({
          matchStep: null,
          productSnapshot: this.#resetFailedMatchOrFatal(
            error,
            PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED,
          ),
        });
      }
    });
  }

  getActiveMatchSnapshot(): Readonly<Record<string, unknown>> | null {
    return this.#runTransition(() => {
      if (this.#readState().state === PRODUCT_SESSION_STATE.DESTROYED) return null;
      return this.#callSync(
        'ProductSession MatchCoordinator.getMatchSnapshot()',
        () => this.#matchCoordinator.getMatchSnapshot(),
      );
    });
  }

  renewProfileLease(): ProductSessionRenewLeaseOutcome {
    return this.#runTransition(() => {
      const state = this.#readState();
      if (
        state.state === PRODUCT_SESSION_STATE.DESTROYED
        || this.#profileSnapshot === null
        || state.activeState === PRODUCT_SESSION_STATE.FATAL_ERROR
      ) return Object.freeze({ renewed: false, productSnapshot: this.#createSnapshot() });
      try {
        this.#callSync(
          'ProductSession ProfileService.renewLease()',
          () => this.#profileService.renewLease(),
        );
        return Object.freeze({ renewed: true, productSnapshot: this.#createSnapshot() });
      } catch (error) {
        if (error instanceof PlayerProfilePersistenceError && error.recoverable) {
          this.#report('profile-lease-renew-deferred', error);
          return Object.freeze({ renewed: false, productSnapshot: this.#createSnapshot() });
        }
        return Object.freeze({
          renewed: false,
          productSnapshot: this.#fatal(PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED, error),
        });
      }
    });
  }

  commitReward(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.RESULTS);
      try {
        const result = this.#callSync(
          'ProductSession MatchCoordinator.getResult()',
          () => this.#matchCoordinator.getResult(),
        );
        if (result === null) throw new Error('ProductSession results 缺少权威比赛结果。');
        const rawOutcome = this.#callSync<RewardCommitOutcome>(
          'ProductSession RewardCommitter.commit()',
          () => this.#rewardCommitter.commit(result),
        );
        const outcome = normalizeRewardOutcome(rawOutcome);
        this.#profileSnapshot = outcome.profile;
        this.#rewardSnapshot = outcome.reward;
        this.#callSync(
          'ProductSession MatchCoordinator.release()',
          () => this.#matchCoordinator.release(),
        );
        this.#dispatch(PRODUCT_SESSION_EVENT.REWARD_COMMITTED);
        this.#lastError = null;
        return this.#createSnapshot();
      } catch (error) {
        if (error instanceof PlayerProfilePersistenceError) {
          if (error.recoverable) {
            return this.#recover(
              PRODUCT_SESSION_ERROR_CODE.REWARD_SAVE_FAILED,
              PRODUCT_SESSION_STATE.RESULTS,
              error,
            );
          }
          return this.#fatal(PRODUCT_SESSION_ERROR_CODE.REWARD_SAVE_FAILED, error);
        }
        return this.#fatal(PRODUCT_SESSION_ERROR_CODE.REWARD_PROCESSING_FAILED, error);
      }
    });
  }

  continueReward(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.REWARD);
      const hasUnlocks = this.#rewardSnapshot !== null
        && REWARD_UNLOCK_KEYS.some((key) => this.#rewardSnapshot!.grant.unlocks[key].length > 0);
      this.#dispatch(
        hasUnlocks
          ? PRODUCT_SESSION_EVENT.UNLOCK_PRESENTED
          : PRODUCT_SESSION_EVENT.REWARD_DISMISSED,
      );
      if (!hasUnlocks) this.#rewardSnapshot = null;
      return this.#createSnapshot();
    });
  }

  dismissUnlocks(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      this.#assertForeground(PRODUCT_SESSION_STATE.UNLOCK);
      this.#dispatch(PRODUCT_SESSION_EVENT.UNLOCK_DISMISSED);
      this.#rewardSnapshot = null;
      return this.#createSnapshot();
    });
  }

  retry(): Promise<ProductSessionSnapshot> {
    return this.#runTransition(() => {
      const state = this.#assertForeground(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
      const recoveryState = state.recoveryState;
      this.#callSync('ProductSession StateMachine.retry()', () => this.#stateMachine.retry());
      this.#lastError = null;
      if (recoveryState === PRODUCT_SESSION_STATE.BOOT) return this.#boot();
      return Promise.resolve(this.#createSnapshot());
    });
  }

  hide(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      const state = this.#readState();
      if (
        state.state === PRODUCT_SESSION_STATE.DESTROYED
        || state.state === PRODUCT_SESSION_STATE.SUSPENDED
      ) return this.#createSnapshot();
      try {
        this.#callSync('ProductSession StateMachine.suspend()', () => this.#stateMachine.suspend());
        this.#callSync(
          'ProductSession MatchCoordinator.setPaused(true)',
          () => this.#matchCoordinator.setPaused(true),
        );
        return this.#createSnapshot();
      } catch (error) {
        return this.#fatal(PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED, error);
      }
    });
  }

  show(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      const state = this.#readState();
      if (
        state.state === PRODUCT_SESSION_STATE.DESTROYED
        || state.state !== PRODUCT_SESSION_STATE.SUSPENDED
      ) return this.#createSnapshot();
      try {
        this.#callSync(
          'ProductSession MatchCoordinator.setPaused(false)',
          () => this.#matchCoordinator.setPaused(false),
        );
        this.#callSync('ProductSession StateMachine.resume()', () => this.#stateMachine.resume());
        return this.#createSnapshot();
      } catch (error) {
        return this.#fatal(PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED, error);
      }
    });
  }

  destroy(): ProductSessionSnapshot {
    return this.#runTransition(() => {
      const errors: Error[] = [];
      if (this.#stateMachineCleanupPending) {
        try {
          this.#callSync(
            'ProductSession StateMachine.destroy()',
            () => this.#stateMachine.destroy(),
          );
          this.#stateMachineCleanupPending = false;
        } catch (error) {
          errors.push(normalizeThrownError(error, 'Product state 销毁失败'));
        }
      }
      if (errors.length > 0) {
        this.#lastError = createProductSessionPublicError(
          PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
        );
        const failure = cleanupFailure(errors);
        this.#report(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, failure);
        throw failure;
      }
      if (this.#matchCleanupPending) {
        try {
          this.#callSync(
            'ProductSession MatchCoordinator.destroy()',
            () => this.#matchCoordinator.destroy(),
          );
          this.#matchCleanupPending = false;
        } catch (error) {
          errors.push(normalizeThrownError(error, 'Product match 销毁失败'));
        }
      }
      if (this.#profileCleanupPending) {
        try {
          this.#callSync(
            'ProductSession ProfileService.destroy()',
            () => this.#profileService.destroy(),
          );
          this.#profileCleanupPending = false;
        } catch (error) {
          errors.push(normalizeThrownError(error, 'Product profile 销毁失败'));
        }
      }
      this.#profileSnapshot = null;
      this.#rewardSnapshot = null;
      if (errors.length > 0) {
        this.#lastError = createProductSessionPublicError(
          PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
        );
        const failure = cleanupFailure(errors);
        this.#report(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, failure);
        throw failure;
      }
      this.#lastError = null;
      return this.#createSnapshot();
    });
  }

  getSnapshot(): ProductSessionSnapshot {
    return this.#runTransition(() => this.#createSnapshot());
  }
}
