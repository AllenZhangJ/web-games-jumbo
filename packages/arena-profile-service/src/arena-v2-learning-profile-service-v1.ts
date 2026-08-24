import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2LearningProfileFutureSchemaError,
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  ArenaV2LearningProfileSaveConflictError,
  advanceArenaV2LearningProfileV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  getArenaV2LearningResultGrantIdV1,
  type ArenaV2LearningCommitOutcomeV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';

export const ARENA_V2_LEARNING_PROFILE_SERVICE_STATE_V1 = Object.freeze({
  CREATED: 'created',
  OPEN: 'open',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2LearningProfileServiceStateV1 =
  typeof ARENA_V2_LEARNING_PROFILE_SERVICE_STATE_V1[
    keyof typeof ARENA_V2_LEARNING_PROFILE_SERVICE_STATE_V1
  ];

export interface ArenaV2LearningProfileRepositoryPortV1 {
  open(): unknown;
  getSnapshot(): unknown;
  renewLease(): unknown;
  compareAndSet(next: unknown, expectedRevision: unknown): unknown;
  destroy(): unknown;
}

export interface ArenaV2LearningProfileServiceOptionsV1 {
  readonly definition: unknown;
  readonly repository: unknown;
}

type ArenaV2LearningProfileServiceOperationV1 =
  | 'state-read'
  | 'open'
  | 'snapshot-read'
  | 'last-known-snapshot-read'
  | 'commit-grant'
  | 'destroy';

export const ARENA_V2_LEARNING_PROFILE_SERVICE_LIFECYCLE_V1 = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  repositoryCallbackReentryIsSticky: true,
  operationGuardPrecedesStateAndGrantValidation: true,
  repositoryPortsCheckedBeforeCrossOwnerProgress: true,
  ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true,
  stickyReentryUsesMonotonicSequenceAndFirstError: true,
  repositoryCallbacksCheckedBeforeProfilePublication: true,
  destroyCallbackConfirmedBeforeOwnershipRelease: true,
  publicStateAndSnapshotsRejectOperationIntermediateState: true,
  destroyWatermarkPrecedesReentryRejection: true,
  profilePublicationWaitsForRepositoryCallbackClosure: true,
  openFailureDispositionIsExplicit: true,
  destroyStartsAtFailedClosedWatermark: true,
  sharedSynchronousReturnBoundaryWired: true,
  validationStatus: 'not-run',
} as const);

export class ArenaV2LearningProfileServiceErrorV1 extends Error {
  readonly reason: string | null;
  readonly recoverable: boolean;
  readonly restartRequired: boolean;

  constructor(
    message: string,
    options: Readonly<{
      cause?: unknown;
      reason?: string | null;
      recoverable?: boolean;
      restartRequired?: boolean;
    }> = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ArenaV2LearningProfileServiceErrorV1';
    this.reason = options.reason ?? null;
    this.recoverable = options.recoverable ?? false;
    this.restartRequired = options.restartRequired ?? false;
    if (this.recoverable && this.restartRequired) {
      throw new RangeError(
        'ArenaV2LearningProfileServiceErrorV1不能同时可重试并要求重启。',
      );
    }
  }
}

type PortMethod = (...args: readonly unknown[]) => unknown;
const OPTION_KEYS = new Set(['definition', 'repository']);
const COMMIT_KEYS = new Set(['committed', 'reason', 'headUpdated']);

function exact(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
  }
  return record;
}

function method(target: object, name: string): PortMethod {
  const visited = new Set<object>();
  let cursor: object | null = target;
  while (cursor && cursor !== Object.prototype) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError('Learning Repository原型链无效。');
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`Learning Repository.${name}必须是数据方法。`);
      }
      return (...args: readonly unknown[]) => Reflect.apply(
        descriptor.value as PortMethod,
        target,
        args,
      );
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`Learning Repository缺少${name}()。`);
}

function repositoryPort(value: unknown): Readonly<ArenaV2LearningProfileRepositoryPortV1> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Learning Profile Service需要Repository。');
  }
  return Object.freeze({
    open: method(value, 'open'),
    getSnapshot: method(value, 'getSnapshot'),
    renewLease: method(value, 'renewLease'),
    compareAndSet: method(value, 'compareAndSet'),
    destroy: method(value, 'destroy'),
  });
}

function sameProfile(left: ArenaV2LearningProfileV1, right: ArenaV2LearningProfileV1): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function synchronous<T>(value: T, name: string): T {
  assertSynchronousReturn(value, name);
  return value;
}

function synchronousPortContractError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('必须同步完成')
    || error.message.includes('返回值原型链循环')
    || error.message.includes('返回值原型链超过')
    || error.message.includes('返回访问器constructor')
    || error.message.includes('返回访问器thenable')
    || error.message.includes('原生Promise.prototype.then描述符漂移')
    || error.message.includes('原生Promise[Symbol.species]描述符漂移');
}

function duplicateOutcome(
  outcome: ArenaV2LearningCommitOutcomeV1,
  profile: ArenaV2LearningProfileV1,
): ArenaV2LearningCommitOutcomeV1 | null {
  const resultGrantId = getArenaV2LearningResultGrantIdV1(outcome.grant.grantId);
  const committedResultGrantId = profile.committedGrantIds.find((grantId) => (
    getArenaV2LearningResultGrantIdV1(grantId) === resultGrantId
  ));
  if (committedResultGrantId === undefined) return null;
  if (committedResultGrantId !== outcome.grant.grantId) {
    throw new ArenaV2LearningProfileServiceErrorV1(
      '同一Learning Result已由不同Replay结算身份提交。',
    );
  }
  return Object.freeze({
    committed: false,
    duplicate: true,
    effectiveLearningProgress: false,
    progressKinds: Object.freeze([]),
    researchedWeaponDefinitionId: null,
    weaponContextEvidenceDeltas: Object.freeze([]),
    mapSegmentEvidenceDeltas: Object.freeze([]),
    mapRouteEvidenceDeltas: Object.freeze([]),
    modeCompletionDeltas: Object.freeze([]),
    challengeProgressDeltas: Object.freeze([]),
    newlyCollectedWeaponDefinitionIds: Object.freeze([]),
    newlyCollectedMapDefinitionIds: Object.freeze([]),
    profile,
    grant: outcome.grant,
  });
}

export class ArenaV2LearningProfileServiceV1 {
  #definition: ArenaV2LearningProfileDefinitionV1 | null;
  #repository: Readonly<ArenaV2LearningProfileRepositoryPortV1> | null;
  #profile: ArenaV2LearningProfileV1 | null = null;
  #state: ArenaV2LearningProfileServiceStateV1 = 'created';
  #operation: ArenaV2LearningProfileServiceOperationV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ArenaV2LearningProfileServiceOptionsV1) {
    const source = exact(options, OPTION_KEYS, 'ArenaV2LearningProfileServiceV1 options');
    this.#definition = createArenaV2LearningProfileDefinitionV1(source.definition);
    this.#repository = repositoryPort(source.repository);
    Object.freeze(this);
  }

  get state(): ArenaV2LearningProfileServiceStateV1 {
    return this.#runOperation('state-read', () => this.#state);
  }

  #definitionValue(): ArenaV2LearningProfileDefinitionV1 {
    if (!this.#definition) throw new Error('Learning Profile Service已销毁。');
    return this.#definition;
  }

  #repositoryValue(): Readonly<ArenaV2LearningProfileRepositoryPortV1> {
    if (!this.#repository) throw new Error('Learning Profile Service已销毁。');
    return this.#repository;
  }

  #profileValue(): ArenaV2LearningProfileV1 {
    if (!this.#profile) throw new Error('Learning Profile Service尚未打开。');
    return this.#profile;
  }

  #assertOpen(): void {
    if (this.#state === 'destroyed') throw new Error('Learning Profile Service已销毁。');
    if (this.#state === 'failed') throw new ArenaV2LearningProfileIndeterminateWriteError();
    if (this.#state !== 'open') throw new Error('Learning Profile Service尚未打开。');
  }

  #rejectReentry(operation: ArenaV2LearningProfileServiceOperationV1): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Learning Profile Service操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #runOperation<T>(
    operation: ArenaV2LearningProfileServiceOperationV1,
    callback: () => T,
  ): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertCurrentOperationCommit(
    operation: string,
    restartRequired = false,
    preserveState = false,
  ): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError === null) return;
    if (!preserveState) this.#state = 'failed';
    throw new ArenaV2LearningProfileServiceErrorV1(
      `Learning Profile Service ${operation}期间发生重入。`,
      {
        cause: this.#reentryError,
        reason: 'repository-callback-reentry',
        restartRequired,
      },
    );
  }

  open(): ArenaV2LearningProfileV1 {
    return this.#runOperation('open', () => {
      if (this.#state === 'destroyed') throw new Error('Learning Profile Service已销毁。');
      if (this.#state === 'failed') throw new ArenaV2LearningProfileIndeterminateWriteError();
      if (this.#state === 'open') return this.#profileValue();
      let rawProfile: unknown;
      try {
        rawProfile = synchronous(
          this.#repositoryValue().open(),
          'Learning Repository.open',
        );
      } catch (error) {
        this.#assertCurrentOperationCommit('打开');
        if (synchronousPortContractError(error)) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile打开端口违反同步合同。',
            { cause: error, reason: 'repository-port-contract-invalid' },
          );
        }
        if (error instanceof ArenaV2LearningProfileRepositoryBusyError) {
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile暂时被其他持有者占用。',
            { cause: error, reason: error.code, recoverable: true },
          );
        }
        if (error instanceof ArenaV2LearningProfileIndeterminateWriteError) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile打开状态或租约清理无法确认。',
            { cause: error, reason: error.code, restartRequired: true },
          );
        }
        if (error instanceof ArenaV2LearningProfileFutureSchemaError
          || error instanceof ArenaV2LearningProfileSaveConflictError) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile打开时发现存档身份冲突。',
            { cause: error, reason: error.code },
          );
        }
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Profile Repository打开失败。',
          { cause: error, reason: 'repository-open-failed' },
        );
      }
      this.#assertCurrentOperationCommit('打开');
      let profile: ArenaV2LearningProfileV1;
      try {
        profile = createArenaV2LearningProfileV1(
          this.#definitionValue(),
          rawProfile,
        );
      } catch (error) {
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Profile Repository打开快照无效。',
          { cause: error, reason: 'repository-open-profile-invalid' },
        );
      }
      this.#assertCurrentOperationCommit('打开');
      this.#profile = profile;
      this.#state = 'open';
      return profile;
    });
  }

  getSnapshot(): ArenaV2LearningProfileV1 {
    return this.#runOperation('snapshot-read', () => {
      this.#assertOpen();
      return this.#profileValue();
    });
  }

  getLastKnownSnapshot(): ArenaV2LearningProfileV1 {
    return this.#runOperation('last-known-snapshot-read', () => {
      if (this.#state === 'destroyed') throw new Error('Learning Profile Service已销毁。');
      return this.#profileValue();
    });
  }

  commitGrant(grantValue: unknown): ArenaV2LearningCommitOutcomeV1 {
    return this.#runOperation('commit-grant', () => {
      this.#assertOpen();
      const current = this.#profileValue();
      const outcome = advanceArenaV2LearningProfileV1(
        this.#definitionValue(),
        current,
        grantValue,
        current.revision,
      );
      if (outcome.duplicate) return outcome;
      let renewed: unknown;
      try {
        renewed = synchronous(
          this.#repositoryValue().renewLease(),
          'Learning Repository.renewLease',
        );
        this.#assertCurrentOperationCommit('租约续租');
      } catch (error) {
        this.#assertCurrentOperationCommit('租约续租');
        if (synchronousPortContractError(error)) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile租约端口违反同步合同。',
            { cause: error, reason: 'repository-port-contract-invalid' },
          );
        }
        if (error instanceof ArenaV2LearningProfileRepositoryBusyError) {
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile租约暂时不可用。',
            { cause: error, reason: 'lease-busy', recoverable: true },
          );
        }
        if (error instanceof ArenaV2LearningProfileIndeterminateWriteError) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile租约状态无法确认。',
            { cause: error, reason: 'lease-indeterminate', restartRequired: true },
          );
        }
        throw new ArenaV2LearningProfileServiceErrorV1('Learning Profile租约续租失败。', {
          cause: error,
        });
      }
      if (renewed !== true) {
        throw new ArenaV2LearningProfileServiceErrorV1('Learning Profile租约续租未确认。', {
          reason: 'lease-renewal-unconfirmed',
          recoverable: true,
        });
      }
      let rawCommit: unknown;
      try {
        rawCommit = synchronous(
          this.#repositoryValue().compareAndSet(outcome.profile, current.revision),
          'Learning Repository.compareAndSet',
        );
      } catch (error) {
        if (this.#reentryError === null) {
          if (synchronousPortContractError(error)) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile提交端口违反同步合同。',
              { cause: error, reason: 'repository-port-contract-invalid' },
            );
          }
          if (error instanceof ArenaV2LearningProfileIndeterminateWriteError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile提交结果无法确认。',
              { cause: error, reason: error.code, restartRequired: true },
            );
          }
          if (error instanceof ArenaV2LearningProfileFutureSchemaError
            || error instanceof ArenaV2LearningProfileSaveConflictError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile存档身份冲突。',
              { cause: error, reason: error.code },
            );
          }
          if (error instanceof ArenaV2LearningProfileRepositoryBusyError) {
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile暂时被其他持有者占用。',
              { cause: error, reason: error.code, recoverable: true },
            );
          }
        }
        let rawRefreshed: unknown;
        try {
          rawRefreshed = synchronous(
            this.#repositoryValue().getSnapshot(),
            'Learning Repository.getSnapshot after failed compareAndSet',
          );
        } catch (readbackError) {
          this.#assertCurrentOperationCommit('CAS异常后读回', true);
          if (synchronousPortContractError(readbackError)) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile写后读回端口违反同步合同。',
              { cause: readbackError, reason: 'repository-port-contract-invalid' },
            );
          }
          if (readbackError instanceof ArenaV2LearningProfileIndeterminateWriteError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile写后读回状态无法确认。',
              { cause: readbackError, reason: readbackError.code, restartRequired: true },
            );
          }
          if (readbackError instanceof ArenaV2LearningProfileFutureSchemaError
            || readbackError instanceof ArenaV2LearningProfileSaveConflictError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile写后读回存档身份冲突。',
              { cause: readbackError, reason: readbackError.code },
            );
          }
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile提交结果无法确认。',
            { cause: readbackError, reason: 'write-indeterminate', restartRequired: true },
          );
        }
        let refreshed: ArenaV2LearningProfileV1;
        try {
          refreshed = createArenaV2LearningProfileV1(
            this.#definitionValue(),
            rawRefreshed,
          );
        } catch (readbackError) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile写后读回结构无效。',
            { cause: readbackError, reason: 'write-readback-invalid' },
          );
        }
        this.#profile = refreshed;
        this.#assertCurrentOperationCommit('CAS异常后读回', true);
        if (sameProfile(refreshed, outcome.profile)) {
          return Object.freeze({ ...outcome, profile: refreshed });
        }
        try {
          const duplicate = duplicateOutcome(outcome, refreshed);
          if (duplicate !== null) return duplicate;
        } catch (error) {
          this.#state = 'failed';
          throw error;
        }
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Profile提交遇到并发变更，可基于最新revision重试。',
          { cause: error, reason: 'concurrent-profile-change', recoverable: true },
        );
      }
      if (this.#reentryError !== null) {
        let rawPublished: unknown;
        try {
          rawPublished = synchronous(
            this.#repositoryValue().getSnapshot(),
            'Learning Repository.getSnapshot after reentrant compareAndSet',
          );
        } catch (readbackError) {
          this.#assertCurrentOperationCommit('CAS返回后读回', true);
          throw readbackError;
        }
        let published: ArenaV2LearningProfileV1;
        try {
          published = createArenaV2LearningProfileV1(
            this.#definitionValue(),
            rawPublished,
          );
        } catch (error) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile重入CAS返回后的读回结构无效。',
            { cause: error, reason: 'reentrant-commit-readback-invalid' },
          );
        }
        this.#profile = published;
        this.#assertCurrentOperationCommit('CAS返回后读回', true);
      }
      let commit: PlainRecord;
      let committed = false;
      let rejectedReason: string | null = null;
      this.#assertCurrentOperationCommit('CAS提交', true);
      try {
        commit = exact(rawCommit, COMMIT_KEYS, 'Learning Repository commit result');
        if (typeof commit.committed !== 'boolean' || typeof commit.headUpdated !== 'boolean') {
          throw new TypeError('Learning Repository commit状态必须是布尔值。');
        }
        committed = commit.committed;
        if (committed) {
          if (commit.reason !== null) {
            throw new TypeError('Learning Repository已提交结果reason必须为null。');
          }
        } else {
          rejectedReason = assertNonEmptyString(commit.reason, 'Learning commit reason');
          if (commit.headUpdated !== false) {
            throw new RangeError('Learning Repository未提交时不能更新head。');
          }
        }
      } catch (error) {
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Repository返回了无效提交结果。',
          { cause: error, reason: 'repository-commit-result-invalid' },
        );
      }
      if (!committed) {
        let rawRefreshed: unknown;
        try {
          rawRefreshed = synchronous(
            this.#repositoryValue().getSnapshot(),
            'Learning Repository.getSnapshot after rejected compareAndSet',
          );
        } catch (error) {
          this.#assertCurrentOperationCommit('CAS冲突读回');
          if (synchronousPortContractError(error)) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile冲突后读回端口违反同步合同。',
              { cause: error, reason: 'repository-port-contract-invalid' },
            );
          }
          if (error instanceof ArenaV2LearningProfileIndeterminateWriteError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile冲突后存档状态无法确认。',
              { cause: error, reason: error.code, restartRequired: true },
            );
          }
          if (error instanceof ArenaV2LearningProfileFutureSchemaError
            || error instanceof ArenaV2LearningProfileSaveConflictError) {
            this.#state = 'failed';
            throw new ArenaV2LearningProfileServiceErrorV1(
              'Learning Profile冲突后存档身份冲突。',
              { cause: error, reason: error.code },
            );
          }
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile冲突后快照暂不可读。',
            { cause: error, reason: 'conflict-snapshot-unavailable', recoverable: true },
          );
        }
        let refreshed: ArenaV2LearningProfileV1;
        try {
          refreshed = createArenaV2LearningProfileV1(
            this.#definitionValue(),
            rawRefreshed,
          );
        } catch (error) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile冲突后快照结构无效。',
            { cause: error, reason: 'conflict-snapshot-invalid' },
          );
        }
        this.#profile = refreshed;
        this.#assertCurrentOperationCommit('CAS冲突读回');
        try {
          const duplicate = duplicateOutcome(outcome, refreshed);
          if (duplicate !== null) return duplicate;
        } catch (error) {
          this.#state = 'failed';
          throw error;
        }
        throw new ArenaV2LearningProfileServiceErrorV1('Learning Profile发生可恢复CAS冲突。', {
          reason: rejectedReason,
          recoverable: true,
        });
      }
      let rawPublished: unknown;
      try {
        rawPublished = synchronous(
          this.#repositoryValue().getSnapshot(),
          'Learning Repository.getSnapshot',
        );
      } catch (error) {
        this.#assertCurrentOperationCommit('提交后读回', true);
        if (synchronousPortContractError(error)) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile提交后读回端口违反同步合同。',
            { cause: error, reason: 'repository-port-contract-invalid' },
          );
        }
        if (error instanceof ArenaV2LearningProfileFutureSchemaError
          || error instanceof ArenaV2LearningProfileSaveConflictError) {
          this.#state = 'failed';
          throw new ArenaV2LearningProfileServiceErrorV1(
            'Learning Profile提交后存档身份冲突。',
            { cause: error, reason: error.code },
          );
        }
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Profile已报告提交但读回结果无法确认。',
          { cause: error, reason: 'committed-readback-unavailable', restartRequired: true },
        );
      }
      let published: ArenaV2LearningProfileV1;
      try {
        published = createArenaV2LearningProfileV1(
          this.#definitionValue(),
          rawPublished,
        );
      } catch (error) {
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1(
          'Learning Profile提交后读回结构无效。',
          { cause: error, reason: 'committed-readback-invalid' },
        );
      }
      this.#profile = published;
      this.#assertCurrentOperationCommit('提交后读回', true);
      if (!sameProfile(published, outcome.profile)) {
        try {
          const duplicate = duplicateOutcome(outcome, published);
          if (duplicate !== null) return duplicate;
        } catch (error) {
          this.#state = 'failed';
          throw error;
        }
        this.#state = 'failed';
        throw new ArenaV2LearningProfileServiceErrorV1('Learning Profile提交后读回不一致。');
      }
      return Object.freeze({ ...outcome, profile: published });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === 'destroyed') return;
      this.#state = 'failed';
      try {
        synchronous(this.#repositoryValue().destroy(), 'Learning Repository.destroy');
      } catch (error) {
        this.#assertCurrentOperationCommit('销毁');
        throw error;
      }
      this.#assertCurrentOperationCommit('销毁');
      this.#definition = null;
      this.#repository = null;
      this.#profile = null;
      this.#state = 'destroyed';
    });
  }
}
