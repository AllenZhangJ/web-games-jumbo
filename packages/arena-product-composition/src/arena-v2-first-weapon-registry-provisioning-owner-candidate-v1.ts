import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2EmptyRegistryBaselinePortOptionsCandidateV1,
  type ArenaV2EmptyRegistryBaselinePortInputCandidateV1,
} from './arena-v2-empty-registry-baseline-candidate-v1.js';
import {
  ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1,
} from './arena-v2-first-weapon-registry-initialization-owner-candidate-v1.js';
import {
  ArenaV2RegistryActiveBootstrapCandidateV1,
} from './arena-v2-registry-active-bootstrap-candidate-v1.js';
import {
  validateArenaV2SingleWeaponProductionAssessmentCandidateV1,
  type ArenaV2SingleWeaponProductionAssessmentCandidateV1,
} from './arena-v2-single-weapon-production-assessment-candidate-v1.js';
import {
  createArenaV2SingleWeaponRegistrationPlanCandidateV1,
  type ArenaV2SingleWeaponRegistrationPlanCandidateV1,
} from './arena-v2-single-weapon-registration-plan-candidate-v1.js';
import {
  assertArenaV2NextRegistryWeaponCandidateV1,
} from './arena-v2-registry-weapon-sequence-candidate-v1.js';

export const ARENA_V2_FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2FirstWeaponRegistryProvisioningOwnerOptionsCandidateV1 {
  readonly provisioningOwnerId: string;
  readonly initializationOwnerId: string;
  readonly coordinatorId: string;
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly runtimeBootstrapId: string;
  readonly assessment: unknown;
  readonly emptyBaselinePortInput: ArenaV2EmptyRegistryBaselinePortInputCandidateV1;
}

export type ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1 =
  | 'ready'
  | 'published'
  | 'rolled-back'
  | 'activated-reference-stale'
  | 'reference-promoted-unsealed'
  | 'promoted'
  | 'failed'
  | 'runtime-bootstrap-failed'
  | 'runtime-bootstrap-ready'
  | 'bootstrap-handed-off'
  | 'destroyed';

const OPTION_KEYS = new Set([
  'provisioningOwnerId', 'initializationOwnerId', 'coordinatorId', 'hostId',
  'publicationOwnerId', 'runtimeBootstrapId', 'assessment', 'emptyBaselinePortInput',
]);
type ProvisioningOperation =
  | 'initialize'
  | 'retry-reference'
  | 'retry-seal'
  | 'restart'
  | 'renew-lease'
  | 'prepare-bootstrap'
  | 'retry-bootstrap'
  | 'destroy';

export const ARENA_V2_FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.first-weapon-registry-provisioning-owner.candidate.v1' as const,
    status: 'production-unreachable' as const,
    assessmentSource: 'validated-stored-assessment-only' as const,
    registrationPlanSource: 'internally-recomputed-not-caller-supplied' as const,
    persistenceBase: 'canonical-empty-baseline-only' as const,
    order:
      'assess-plan-initialize-durable-active-release-lease-bootstrap-transfer' as const,
    runtimeBootstrapHandoff: 'single-owner-transfer' as const,
    coarseProvisioningOrchestration: 'advance-to-runtime-bootstrap-ready' as const,
    coarseProvisioningFailurePolicy: 'preserve-exact-recoverable-owner-state' as const,
    concurrentGenerationDriftPolicy: 'fail-closed' as const,
    failedRuntimeBootstrapCleanupRetainsOwner: true as const,
    runtimeBootstrapRetryCleansPriorFailedInstance: true as const,
    destroyRetriesOnlyOwnedChildren: true as const,
    swallowedChildReentryFailsProvisioningClosed: true as const,
    childOwnershipCommittedBeforeReentryCheck: true as const,
    postInitializationReentryUsesRuntimeBootstrapRecovery: true as const,
    snapshotRejectedDuringOperation: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    defaultInstanceCreated: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

function exactOptions(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2首把Registry provisioning options必须是普通对象。');
  }
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2首把Registry provisioning options');
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2首把Registry provisioning options.${key}缺失。`);
    }
  }
}

function message(error: unknown): string {
  return typeof error === 'string' && error.length > 0
    ? error
    : 'Arena V2首把Registry provisioning发生非字符串失败。';
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export class ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1 {
  #provisioningOwnerId: string | null;
  readonly #initializationOwnerId: string;
  readonly #coordinatorId: string;
  readonly #hostId: string;
  readonly #publicationOwnerId: string;
  readonly #runtimeBootstrapId: string;
  readonly #assessment: ArenaV2SingleWeaponProductionAssessmentCandidateV1;
  readonly #plan: ArenaV2SingleWeaponRegistrationPlanCandidateV1;
  readonly #portOptions: ReturnType<
    typeof createArenaV2EmptyRegistryBaselinePortOptionsCandidateV1
  >;
  #initializationOwner: ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 | null;
  #runtimeBootstrap: ArenaV2RegistryActiveBootstrapCandidateV1 | null = null;
  #state: ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1 = 'ready';
  #expectedRuntimeRevision: number | null = null;
  #expectedRuntimeSnapshotHash: string | null = null;
  #operation: ProvisioningOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #failedByReentry = false;
  #destroyed = false;
  #lastFailure: string | null = null;

  constructor(options: ArenaV2FirstWeaponRegistryProvisioningOwnerOptionsCandidateV1) {
    exactOptions(options);
    this.#provisioningOwnerId = assertNonEmptyString(
      options.provisioningOwnerId,
      'Arena V2首把Registry provisioningOwnerId',
    );
    this.#initializationOwnerId = assertNonEmptyString(
      options.initializationOwnerId,
      'Arena V2首把Registry initializationOwnerId',
    );
    this.#coordinatorId = assertNonEmptyString(
      options.coordinatorId,
      'Arena V2首把Registry coordinatorId',
    );
    this.#hostId = assertNonEmptyString(options.hostId, 'Arena V2首把Registry hostId');
    this.#publicationOwnerId = assertNonEmptyString(
      options.publicationOwnerId,
      'Arena V2首把Registry publicationOwnerId',
    );
    this.#runtimeBootstrapId = assertNonEmptyString(
      options.runtimeBootstrapId,
      'Arena V2首把Registry runtimeBootstrapId',
    );
    this.#assessment = validateArenaV2SingleWeaponProductionAssessmentCandidateV1(
      options.assessment,
    );
    this.#plan = createArenaV2SingleWeaponRegistrationPlanCandidateV1(this.#assessment);
    assertArenaV2NextRegistryWeaponCandidateV1([], this.#plan.weaponId);
    this.#portOptions = createArenaV2EmptyRegistryBaselinePortOptionsCandidateV1(
      options.emptyBaselinePortInput,
    );
    this.#initializationOwner = this.#createInitializationOwner();
    Object.freeze(this);
  }

  #createInitializationOwner(): ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 {
    return new ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1({
      initializationOwnerId: this.#initializationOwnerId,
      coordinatorId: this.#coordinatorId,
      hostId: this.#hostId,
      publicationOwnerId: this.#publicationOwnerId,
      assessment: this.#assessment,
      plan: this.#plan,
      portOptions: this.#portOptions,
    });
  }

  #usable(): void {
    this.#assertNoOperation();
    if (this.#destroyed) throw new Error('Arena V2首把Registry provisioning Owner已销毁。');
  }

  #hasState(state: ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1): boolean {
    return this.#state === state;
  }

  #assertNoOperation(): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        'Arena V2首把Registry provisioning Owner操作不可重入。',
      );
      throw this.#reentryError;
    }
  }

  #assertNoReentrySince(
    sequence: number,
    operation: string,
    reentryState: ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1 = 'failed',
    cause?: unknown,
  ): void {
    if (this.#reentrySequence === sequence) return;
    if (!this.#failedByReentry) this.#state = reentryState;
    this.#failedByReentry = true;
    this.#lastFailure = 'Arena V2首把Registry provisioning发生被子Owner吞掉的重入。';
    const reentryError = this.#reentryError
      ?? new Error(`Arena V2首把Registry provisioning ${operation}期间发生重入。`);
    if (cause !== undefined && cause !== reentryError) {
      throw new AggregateError(
        [reentryError, cause],
        `Arena V2首把Registry provisioning ${operation}期间发生重入且子操作失败。`,
      );
    }
    throw reentryError;
  }

  #runOperation<T>(
    operation: ProvisioningOperation,
    callback: () => T,
  ): T {
    this.#usable();
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        result = callback();
      } catch (error) {
        this.#assertNoReentrySince(reentrySequence, operation, 'failed', error);
        throw error;
      }
      this.#assertNoReentrySince(reentrySequence, operation);
      return result;
    } finally {
      this.#operation = null;
    }
  }

  #runChildOperation<T>(
    operation: string,
    callback: () => T,
    onCommitted?: (result: T) => void,
    reentryState: ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1 = 'failed',
  ): T {
    if (this.#operation === null) {
      throw new Error('Arena V2首把Registry provisioning子操作缺少父事务。');
    }
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      result = callback();
    } catch (error) {
      this.#assertNoReentrySince(reentrySequence, operation, reentryState, error);
      throw error;
    }
    onCommitted?.(result);
    this.#assertNoReentrySince(reentrySequence, operation, reentryState);
    return result;
  }

  #requireInitializationOwner(): ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 {
    this.#usable();
    if (this.#initializationOwner === null) {
      throw new Error('Arena V2首把Registry provisioning缺少初始化Owner。');
    }
    return this.#initializationOwner;
  }

  #synchronizeInitializationState(): void {
    if (this.#failedByReentry) return;
    const state = this.#initializationOwner?.snapshot().state;
    if (state === undefined || state === 'destroyed') return;
    this.#state = state;
  }

  #recordFailure(error: unknown): void {
    this.#lastFailure = message(error);
    this.#synchronizeInitializationState();
  }

  initialize(): Readonly<ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1> {
    const owner = this.#requireInitializationOwner();
    if (this.#state !== 'ready') {
      throw new Error(`Arena V2首把Registry provisioning初始化状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('initialize', () => {
        this.#runChildOperation('首把Registry初始化', () => owner.initialize(), () => {
          this.#synchronizeInitializationState();
        });
      });
    } catch (error) {
      this.#recordFailure(error);
      throw error;
    }
    return this.snapshot();
  }

  retryReferenceAfterActivation(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    const owner = this.#requireInitializationOwner();
    if (this.#state !== 'activated-reference-stale') {
      throw new Error(`Arena V2首把Registry provisioning引用重试状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('retry-reference', () => {
        this.#runChildOperation('首把Registry引用重试', () => (
          owner.retryReferenceAfterActivation()
        ), () => {
          this.#synchronizeInitializationState();
        });
      });
    } catch (error) {
      this.#recordFailure(error);
      throw error;
    }
    return this.snapshot();
  }

  retrySealAfterPromotion(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    const owner = this.#requireInitializationOwner();
    if (this.#state !== 'reference-promoted-unsealed') {
      throw new Error(`Arena V2首把Registry provisioning封存重试状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('retry-seal', () => {
        this.#runChildOperation('首把Registry封存重试', () => (
          owner.retrySealAfterPromotion()
        ), () => {
          this.#synchronizeInitializationState();
        });
      });
    } catch (error) {
      this.#recordFailure(error);
      throw error;
    }
    return this.snapshot();
  }

  restartAfterRollback(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    this.#usable();
    if (this.#state !== 'rolled-back' && this.#state !== 'failed') {
      throw new Error(`Arena V2首把Registry provisioning重建状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('restart', () => {
        if (this.#initializationOwner !== null) {
          const priorOwner = this.#initializationOwner;
          this.#runChildOperation('旧初始化Owner销毁', () => priorOwner.destroy(), () => {
            if (this.#initializationOwner === priorOwner) this.#initializationOwner = null;
          });
        }
        let nextOwner: ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 | null = null;
        this.#runChildOperation(
          '初始化Owner重建',
          () => this.#createInitializationOwner(),
          (created) => {
            nextOwner = created;
            this.#initializationOwner = created;
          },
        );
        if (nextOwner === null) throw new Error('Arena V2首把Registry初始化Owner重建未提交。');
        this.#failedByReentry = false;
        this.#state = 'ready';
        this.#lastFailure = null;
      });
    } catch (error) {
      this.#state = 'failed';
      this.#lastFailure = message(error);
      throw error;
    }
    return this.snapshot();
  }

  renewInitializationLease(): boolean {
    const owner = this.#requireInitializationOwner();
    return this.#runOperation('renew-lease', () => this.#runChildOperation(
      '初始化Owner租约续期',
      () => owner.renewLease(),
    ));
  }

  provisionRuntimeBootstrap(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    this.#usable();
    for (let operationCount = 0; operationCount < 6; operationCount += 1) {
      switch (this.#state) {
        case 'ready':
          this.initialize();
          continue;
        case 'rolled-back':
        case 'failed':
          this.restartAfterRollback();
          continue;
        case 'activated-reference-stale':
          this.retryReferenceAfterActivation();
          continue;
        case 'reference-promoted-unsealed':
          this.retrySealAfterPromotion();
          continue;
        case 'promoted':
          this.prepareRuntimeBootstrap();
          continue;
        case 'runtime-bootstrap-failed':
          this.retryRuntimeBootstrap();
          continue;
        case 'runtime-bootstrap-ready':
        case 'bootstrap-handed-off':
          return this.snapshot();
        case 'published':
          throw new Error('Arena V2首把Registry仍处于同步发布中间态，拒绝并发推进。');
        case 'destroyed':
          throw new Error('Arena V2首把Registry provisioning Owner已销毁。');
      }
    }
    throw new Error('Arena V2首把Registry provisioning超过有界粗粒度推进步数。');
  }

  #openRuntimeBootstrap(): void {
    if (this.#expectedRuntimeRevision === null
      || this.#expectedRuntimeSnapshotHash === null) {
      throw new Error('Arena V2首把Registry provisioning缺少预期active身份。');
    }
    let bootstrap: ArenaV2RegistryActiveBootstrapCandidateV1 | null = null;
    try {
      this.#runChildOperation(
        'Runtime Bootstrap构造',
        () => new ArenaV2RegistryActiveBootstrapCandidateV1({
          bootstrapId: this.#runtimeBootstrapId,
          portOptions: this.#portOptions,
        }),
        (created) => { bootstrap = created; },
        'runtime-bootstrap-failed',
      );
      if (bootstrap === null) {
        throw new Error('Arena V2首把Registry runtime bootstrap构造未提交。');
      }
      const active = this.#runChildOperation(
        'Runtime Bootstrap active读取',
        () => bootstrap!.read(),
        undefined,
        'runtime-bootstrap-failed',
      );
      if (active.revision !== this.#expectedRuntimeRevision
        || active.snapshotHash !== this.#expectedRuntimeSnapshotHash
        || !sameIds(active.collectionWeaponIds, [this.#plan.weaponId])) {
        throw new RangeError(
          'Arena V2首把Registry provisioning初始化与runtime bootstrap之间generation漂移。',
        );
      }
      this.#runtimeBootstrap = bootstrap;
      this.#state = 'runtime-bootstrap-ready';
      this.#lastFailure = null;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      let cleanupIncomplete = false;
      if (bootstrap !== null) {
        try {
          this.#runChildOperation(
            '失败Runtime Bootstrap清理',
            () => bootstrap!.destroy(),
            undefined,
            'runtime-bootstrap-failed',
          );
        } catch (cleanupError) {
          cleanupIncomplete = true;
          cleanupErrors.push(cleanupError);
        }
      }
      this.#runtimeBootstrap = cleanupIncomplete ? bootstrap : null;
      this.#state = 'runtime-bootstrap-failed';
      this.#lastFailure = message(error);
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2首把Registry runtime bootstrap失败且清理不完整。',
        );
      }
      throw error;
    }
  }

  prepareRuntimeBootstrap(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    const owner = this.#requireInitializationOwner();
    if (this.#state !== 'promoted') {
      throw new Error(`Arena V2首把Registry runtime bootstrap状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('prepare-bootstrap', () => {
        const initialized = owner.snapshot();
        if (!initialized.durableRegistryPlayable
          || initialized.weaponId !== this.#plan.weaponId
          || initialized.activeRevision === null
          || initialized.referenceRevision !== initialized.activeRevision
          || initialized.referenceSnapshotHash === null) {
          throw new RangeError('Arena V2首把Registry provisioning初始化结果未闭合。');
        }
        this.#expectedRuntimeRevision = initialized.activeRevision;
        this.#expectedRuntimeSnapshotHash = initialized.referenceSnapshotHash;
        this.#runChildOperation(
          '已晋级初始化Owner释放',
          () => owner.destroy(),
          () => {
            if (this.#initializationOwner === owner) this.#initializationOwner = null;
          },
          'runtime-bootstrap-failed',
        );
        this.#openRuntimeBootstrap();
      });
    } catch (error) {
      if (!this.#hasState('runtime-bootstrap-failed')) this.#lastFailure = message(error);
      throw error;
    }
    return this.snapshot();
  }

  retryRuntimeBootstrap(): Readonly<
    ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1
  > {
    this.#usable();
    if (this.#state !== 'runtime-bootstrap-failed'
      || this.#initializationOwner !== null) {
      throw new Error(`Arena V2首把Registry runtime bootstrap重试状态无效：${this.#state}。`);
    }
    try {
      this.#runOperation('retry-bootstrap', () => {
        if (this.#runtimeBootstrap !== null) {
          const failedBootstrap = this.#runtimeBootstrap;
          this.#runChildOperation(
            '旧失败Runtime Bootstrap销毁',
            () => failedBootstrap.destroy(),
            () => {
              if (this.#runtimeBootstrap === failedBootstrap) this.#runtimeBootstrap = null;
            },
            'runtime-bootstrap-failed',
          );
        }
        this.#failedByReentry = false;
        this.#openRuntimeBootstrap();
      });
    } catch (error) {
      this.#lastFailure = message(error);
      throw error;
    }
    return this.snapshot();
  }

  takeRuntimeBootstrap(): ArenaV2RegistryActiveBootstrapCandidateV1 {
    this.#usable();
    if (this.#state !== 'runtime-bootstrap-ready' || this.#runtimeBootstrap === null) {
      throw new Error(`Arena V2首把Registry runtime bootstrap移交状态无效：${this.#state}。`);
    }
    const bootstrap = this.#runtimeBootstrap;
    this.#runtimeBootstrap = null;
    this.#state = 'bootstrap-handed-off';
    return bootstrap;
  }

  snapshot(): Readonly<ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    return this.#snapshot();
  }

  #snapshot(): Readonly<ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1> {
    const initialization = this.#initializationOwner?.snapshot() ?? null;
    const runtimeBootstrap = this.#runtimeBootstrap?.snapshot() ?? null;
    return Object.freeze({
      schemaVersion:
        ARENA_V2_FIRST_WEAPON_REGISTRY_PROVISIONING_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      provisioningOwnerId: this.#provisioningOwnerId,
      state: this.#state,
      weaponId: this.#plan.weaponId,
      assessmentContentHash: this.#assessment.assessmentContentHash,
      planContentHash: this.#plan.contentHash,
      expectedRuntimeRevision: this.#expectedRuntimeRevision,
      expectedRuntimeSnapshotHash: this.#expectedRuntimeSnapshotHash,
      initialization,
      runtimeBootstrap,
      durableRegistryPlayable: this.#state === 'promoted'
        || this.#state === 'runtime-bootstrap-failed'
        || this.#state === 'runtime-bootstrap-ready'
        || this.#state === 'bootstrap-handed-off',
      runtimeBootstrapOwned: this.#runtimeBootstrap !== null,
      runtimeBootstrapHandedOff: this.#state === 'bootstrap-handed-off',
      transitioning: this.#operation !== null,
      lastFailure: this.#lastFailure,
      destroyed: this.#destroyed,
      callerSuppliedPlanAccepted: false as const,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
      defaultEntryWired: false as const,
    });
  }

  destroy(): Readonly<ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    if (this.#destroyed) return this.#snapshot();
    try {
      this.#runOperation('destroy', () => {
        const errors: unknown[] = [];
        if (this.#initializationOwner !== null) {
          const owner = this.#initializationOwner;
          try {
            this.#runChildOperation(
              '初始化Owner销毁',
              () => owner.destroy(),
              () => {
                if (this.#initializationOwner === owner) this.#initializationOwner = null;
              },
            );
          } catch (error) {
            errors.push(error);
          }
        }
        if (this.#runtimeBootstrap !== null) {
          const bootstrap = this.#runtimeBootstrap;
          try {
            this.#runChildOperation(
              'Runtime Bootstrap销毁',
              () => bootstrap.destroy(),
              () => {
                if (this.#runtimeBootstrap === bootstrap) this.#runtimeBootstrap = null;
              },
            );
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length > 0) {
          this.#state = 'failed';
          this.#lastFailure = 'Arena V2首把Registry provisioning清理不完整。';
          throw new AggregateError(
            errors,
            'Arena V2首把Registry provisioning清理不完整。',
          );
        }
        this.#provisioningOwnerId = null;
        this.#state = 'destroyed';
        this.#destroyed = true;
      });
    } catch (error) {
      this.#state = 'failed';
      this.#lastFailure = message(error);
      throw error;
    }
    return this.#snapshot();
  }
}

export interface ArenaV2FirstWeaponRegistryProvisioningOwnerSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly provisioningOwnerId: string | null;
  readonly state: ArenaV2FirstWeaponRegistryProvisioningOwnerStateCandidateV1;
  readonly weaponId: string;
  readonly assessmentContentHash: string;
  readonly planContentHash: string;
  readonly expectedRuntimeRevision: number | null;
  readonly expectedRuntimeSnapshotHash: string | null;
  readonly initialization: ReturnType<
    ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1['snapshot']
  > | null;
  readonly runtimeBootstrap: ReturnType<
    ArenaV2RegistryActiveBootstrapCandidateV1['snapshot']
  > | null;
  readonly durableRegistryPlayable: boolean;
  readonly runtimeBootstrapOwned: boolean;
  readonly runtimeBootstrapHandedOff: boolean;
  readonly transitioning: boolean;
  readonly lastFailure: string | null;
  readonly destroyed: boolean;
  readonly callerSuppliedPlanAccepted: false;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
}

export function createArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1(
  options: ArenaV2FirstWeaponRegistryProvisioningOwnerOptionsCandidateV1,
): ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1 {
  return new ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1(options);
}
