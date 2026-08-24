import {
  assertKnownKeys,
  assertSynchronousReturn,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1,
  ArenaV2RegistryActiveBootstrapCandidateV1,
  ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1,
  createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1,
  createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1,
  projectArenaV2RegistryWeaponSequenceCandidateV1,
  projectArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1,
  type ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
  type ArenaV2RegistryActiveBootstrapOptionsCandidateV1,
  type ArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1,
} from '@number-strategy-jump/arena-product-composition';
import {
  ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1,
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  type ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
} from './arena-three-mode-authoritative-quick-match-composition-candidate-v1.js';

export const ARENA_V2_REGISTRY_BACKED_LOCAL_PLAYABLE_OWNER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2RegistryBackedLocalPlayableOwnerOptionsCandidateV1 {
  readonly registryBootstrapOptions?: ArenaV2RegistryActiveBootstrapOptionsCandidateV1;
  readonly registryBootstrap?: ArenaV2RegistryActiveBootstrapCandidateV1;
  readonly localPlayableOptions: Omit<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
    'registryReference'
  >;
}

export interface ArenaV2RegistryBackedLocalPlayableBeginPromotionOptionsCandidateV1 {
  readonly coordinatorId: string;
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly assessment: unknown;
  readonly plan: unknown;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

export interface ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1 {
  readonly coordinatorId: string;
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly assessment: unknown;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

export interface ArenaV2RegistryBackedLocalPlayableFromFirstProvisioningOptionsCandidateV1 {
  readonly provisioningOwner: ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1;
  readonly localPlayableOptions: Omit<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
    'registryReference'
  >;
}

export interface ArenaV2RegistryWeaponAvailabilityChangeCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly weaponId: string;
  readonly weaponDefinitionId: string;
  readonly collectionOrder: number;
  readonly previousRevision: number;
  readonly previousSnapshotHash: string;
  readonly nextRevision: number;
  readonly nextSnapshotHash: string;
  readonly previousCollectionWeaponIds: readonly string[];
  readonly nextCollectionWeaponIds: readonly string[];
  readonly newlyPlayable: true;
  readonly newlyCollected: false;
}

const OPTION_KEYS = new Set([
  'registryBootstrapOptions', 'registryBootstrap', 'localPlayableOptions',
]);
const BEGIN_PROMOTION_OPTION_KEYS = new Set([
  'coordinatorId', 'hostId', 'publicationOwnerId', 'assessment', 'plan', 'portOptions',
]);
const BEGIN_PROMOTION_FROM_ASSESSMENT_OPTION_KEYS = new Set([
  'coordinatorId', 'hostId', 'publicationOwnerId', 'assessment', 'portOptions',
]);
type RegistryBackedLocalPlayableOperation =
  | 'read-registry'
  | 'read-registry-head'
  | 'begin-promotion'
  | 'publish-promote'
  | 'retry-reference'
  | 'retry-seal'
  | 'renew-lease'
  | 'close-promotion'
  | 'destroy';

export const ARENA_V2_REGISTRY_BACKED_LOCAL_PLAYABLE_OWNER_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: ARENA_V2_REGISTRY_BACKED_LOCAL_PLAYABLE_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.registry-backed-local-playable-owner.candidate.v1',
    status: 'production-unreachable',
    constructionOrder: 'durable-active-bootstrap-then-local-playable',
    destructionOrder: 'promotion-owner-then-local-playable-then-registry-bootstrap',
    promotionVisibility: 'next-match-creation-snapshot',
    currentMatchMutation: false,
    livePromotionReference: 'same-active-bootstrap-reference',
    directReferenceOnlyPromotionExposed: false,
    bootstrapConstruction: 'options-or-transferred-live-bootstrap-exactly-one',
    transferredBootstrapOwnership: 'local-owner-acquires-destroy-duty',
    firstProvisioningHandoffFactory: true,
    assessmentOnlyFollowUpPromotionFactory: true,
    assessmentOnlyConfigurationEnvelopeWired: true,
    callerSuppliedPlanCompatibilityEntryRetained: true,
    assessmentOnlyCallerSuppliedPlanAllowed: false,
    availabilityFactPreviousAndNextSequencesRevalidated: true as const,
    availabilityFactAppendsNextCatalogWeaponOnly: true as const,
    availabilityFactHashAndRevisionClosed: true as const,
    outerOptionsDescriptorSnapshotBeforeConstruction: true as const,
    localPlayableOptionsDescriptorSnapshotBeforeSpread: true as const,
    firstProvisioningOptionsDescriptorSnapshotBeforeHandoff: true as const,
    optionAccessorsExecuted: false as const,
    coarsePromotionOrchestration: 'begin-assessment-then-advance-to-stable' as const,
    coarsePromotionFailurePolicy: 'preserve-exact-recoverable-owner-state' as const,
    activePromotionMustResolveBeforeAnyOuterCleanup: true as const,
    destroyAttemptsIndependentDependents: true as const,
    registryBootstrapReleasesAfterDependents: true as const,
    destroyClearsOnlySuccessfullyReleasedChildren: true as const,
    constructionCleanupRetainsNestedLocalPlayableDebt: true as const,
    constructionCleanupWaitsForLocalPlayableBeforeRegistryBootstrap: true as const,
    constructionCleanupRetriesOnlyIncompleteOwners: true as const,
    firstProvisioningFactoryDoesNotDoubleDestroyRetainedBootstrap: true as const,
    swallowedChildReentryFailsLocalOwnerClosed: true as const,
    childCallsCheckedByReentrySequence: true as const,
    childCallsMustCompleteSynchronously: true as const,
    promotionWatermarksCommittedBeforeReentryCheck: true as const,
    failedOwnerAllowsExactPromotionRecoveryOnly: true as const,
    snapshotAndReadsRejectedDuringOperation: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    defaultInstanceCreated: false,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    implementationStatus: 'code-written-not-run',
    validationStatus: 'not-run',
  } as const);

function ownerOptions(
  value: unknown,
): Readonly<{
  readonly registryBootstrapOptions: unknown;
  readonly registryBootstrap: unknown;
  readonly localPlayableOptions: unknown;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 Registry-backed local owner options必须是普通对象。');
  }
  const name = 'Arena V2 Registry-backed local owner options';
  assertKnownKeys(value, OPTION_KEYS, name);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${name}不能包含Symbol字段。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const values = new Map<string, unknown>();
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!OPTION_KEYS.has(key)) throw new TypeError(`${name}包含未知字段${key}。`);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
    }
    values.set(key, descriptor.value);
  }
  if (!values.has('localPlayableOptions')) {
    throw new TypeError(`${name}.localPlayableOptions缺失。`);
  }
  const registryBootstrapOptions = values.get('registryBootstrapOptions');
  const registryBootstrap = values.get('registryBootstrap');
  const hasOptions = values.has('registryBootstrapOptions')
    && registryBootstrapOptions !== undefined;
  const hasBootstrap = values.has('registryBootstrap')
    && registryBootstrap !== undefined;
  if (hasOptions === hasBootstrap) {
    throw new TypeError('Arena V2 Registry-backed local owner必须且只能选择新建或移交一个bootstrap。');
  }
  return Object.freeze({
    registryBootstrapOptions,
    registryBootstrap,
    localPlayableOptions: values.get('localPlayableOptions'),
  });
}

interface RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1 {
  downstreamConstructionDebt:
    ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1 | null;
  registryBootstrap: ArenaV2RegistryActiveBootstrapCandidateV1 | null;
}

function registryBackedLocalPlayableConstructionCleanupCompleteCandidateV1(
  resources: RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.downstreamConstructionDebt === null
    && resources.registryBootstrap === null;
}

function cleanupRegistryBackedLocalPlayableConstructionResourcesCandidateV1(
  resources: RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1,
): void {
  const errors: unknown[] = [];
  if (resources.downstreamConstructionDebt !== null) {
    const debt = resources.downstreamConstructionDebt;
    try {
      if (!debt.cleanupComplete) debt.retryCleanup();
      if (!debt.cleanupComplete) {
        throw new Error('Arena V2 Registry-backed local owner下游构造债务尚未收敛。');
      }
      resources.downstreamConstructionDebt = null;
    } catch (error) { errors.push(error); }
  }
  if (resources.downstreamConstructionDebt === null
    && resources.registryBootstrap !== null) {
    const registryBootstrap = resources.registryBootstrap;
    try {
      registryBootstrap.destroy();
      resources.registryBootstrap = null;
    } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      'Arena V2 Registry-backed local owner构造资源清理不完整。',
    );
  }
  if (!registryBackedLocalPlayableConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena V2 Registry-backed local owner构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 Registry-backed local owner构造失败且反向清理不完整。',
    );
    this.name =
      'ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return registryBackedLocalPlayableConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    if (this.cleanupComplete) return;
    cleanupRegistryBackedLocalPlayableConstructionResourcesCandidateV1(this.#resources);
  }
}

function localPlayableOptions(
  value: unknown,
): Omit<ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options, 'registryReference'> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 Registry-backed local playable options必须是普通对象。');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError('Arena V2 Registry-backed local playable options不能包含Symbol字段。');
  }
  const snapshot = Object.create(null) as Record<string, unknown>;
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(
        `Arena V2 Registry-backed local playable options.${key}必须是自有可枚举数据字段。`,
      );
    }
    if (key === 'registryReference') {
      throw new TypeError('Arena V2 Registry reference只能由外层Owner注入。');
    }
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: descriptor.value,
    });
  }
  return Object.freeze(snapshot) as Omit<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
    'registryReference'
  >;
}

function exactPromotionOptions(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
    }
  }
}

function availabilityChange(
  previous: Readonly<{
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionWeaponIds: readonly string[];
  }>,
  next: Readonly<{
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionWeaponIds: readonly string[];
  }>,
  expectedWeaponId: string,
): Readonly<ArenaV2RegistryWeaponAvailabilityChangeCandidateV1> {
  const previousIds = Object.freeze([...previous.collectionWeaponIds]);
  const nextIds = Object.freeze([...next.collectionWeaponIds]);
  const previousSequence = projectArenaV2RegistryWeaponSequenceCandidateV1(previousIds);
  const nextSequence = projectArenaV2RegistryWeaponSequenceCandidateV1(nextIds);
  const hashPattern = /^[0-9a-f]{8}$/u;
  if (!Number.isSafeInteger(previous.revision)
    || !Number.isSafeInteger(next.revision)
    || previous.revision < 0
    || previous.revision >= Number.MAX_SAFE_INTEGER
    || next.revision !== previous.revision + 1
    || !hashPattern.test(previous.snapshotHash)
    || !hashPattern.test(next.snapshotHash)
    || previous.snapshotHash === next.snapshotHash
    || previousSequence.complete
    || previousSequence.nextWeaponId !== expectedWeaponId
    || nextSequence.activeWeaponCount !== previousSequence.activeWeaponCount + 1
    || nextIds.length !== previousIds.length + 1
    || previousIds.some((weaponId, index) => nextIds[index] !== weaponId)
    || nextIds[nextIds.length - 1] !== expectedWeaponId) {
    throw new RangeError('Arena V2 Registry可玩武器变化不是精确单把晋级。');
  }
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ id }) => id === expectedWeaponId,
  );
  if (weapon === undefined) {
    throw new RangeError(`Arena V2 Registry新增目录外武器${expectedWeaponId}。`);
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    weaponId: weapon.id,
    weaponDefinitionId: weapon.equipment.id,
    collectionOrder: weapon.collectionOrder,
    previousRevision: previous.revision,
    previousSnapshotHash: previous.snapshotHash,
    nextRevision: next.revision,
    nextSnapshotHash: next.snapshotHash,
    previousCollectionWeaponIds: previousIds,
    nextCollectionWeaponIds: nextIds,
    newlyPlayable: true as const,
    newlyCollected: false as const,
  });
}

export class ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 {
  #registryBootstrap: ArenaV2RegistryActiveBootstrapCandidateV1 | null;
  #localPlayable: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null;
  #promotionCoordinator:
    ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1 | null = null;
  readonly #registryBootstrapSource: 'constructed' | 'transferred';
  #pendingPromotionBase: Readonly<{
    readonly weaponId: string;
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionWeaponIds: readonly string[];
  }> | null = null;
  #lastAvailabilityChange:
    Readonly<ArenaV2RegistryWeaponAvailabilityChangeCandidateV1> | null = null;
  #operation: RegistryBackedLocalPlayableOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #failedByReentry = false;
  #cleanupStarted = false;
  #lastFailure: string | null = null;
  #destroyed = false;

  constructor(options: ArenaV2RegistryBackedLocalPlayableOwnerOptionsCandidateV1) {
    const parsedOptions = ownerOptions(options);
    const playableOptions = localPlayableOptions(parsedOptions.localPlayableOptions);
    const registryBootstrap = parsedOptions.registryBootstrap === undefined
      ? new ArenaV2RegistryActiveBootstrapCandidateV1(
        parsedOptions.registryBootstrapOptions as ArenaV2RegistryActiveBootstrapOptionsCandidateV1,
      )
      : parsedOptions.registryBootstrap;
    if (!(registryBootstrap instanceof ArenaV2RegistryActiveBootstrapCandidateV1)) {
      throw new TypeError('Arena V2 Registry-backed local owner只接受真实active bootstrap实例。');
    }
    let localPlayable: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1;
    try {
      localPlayable = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...playableOptions,
        registryReference: registryBootstrap,
      });
    } catch (error) {
      const resources: RegistryBackedLocalPlayableConstructionCleanupResourcesCandidateV1 = {
        downstreamConstructionDebt:
          error instanceof
            ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
            ? error
            : null,
        registryBootstrap,
      };
      try {
        cleanupRegistryBackedLocalPlayableConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    this.#registryBootstrap = registryBootstrap;
    this.#localPlayable = localPlayable;
    this.#registryBootstrapSource = parsedOptions.registryBootstrap === undefined
      ? 'constructed'
      : 'transferred';
    Object.freeze(this);
  }

  #assertNoOperation(): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        'Arena V2 Registry-backed local owner操作不可重入。',
      );
      throw this.#reentryError;
    }
  }

  #usable(allowRecovery = false): void {
    this.#assertNoOperation();
    if (this.#destroyed
      || this.#registryBootstrap === null
      || this.#localPlayable === null) {
      throw new Error('Arena V2 Registry-backed local owner已销毁。');
    }
    if (this.#cleanupStarted) {
      throw new Error('Arena V2 Registry-backed local owner已进入清理，只允许继续销毁。');
    }
    if (this.#failedByReentry && !allowRecovery) {
      throw new Error(
        'Arena V2 Registry-backed local owner发生父层重入，只允许精确晋级恢复或销毁。',
      );
    }
  }

  #assertNoReentrySince(
    sequence: number,
    operation: string,
    cause?: unknown,
  ): void {
    if (this.#reentrySequence === sequence) return;
    this.#failedByReentry = true;
    this.#lastFailure = 'Arena V2 Registry-backed local owner发生被子Owner吞掉的重入。';
    const reentryError = this.#reentryError
      ?? new Error(`Arena V2 Registry-backed local owner ${operation}期间发生重入。`);
    if (cause !== undefined && cause !== reentryError) {
      throw new AggregateError(
        [reentryError, cause],
        `Arena V2 Registry-backed local owner ${operation}期间发生重入且子操作失败。`,
      );
    }
    throw reentryError;
  }

  #runOperation<T>(
    operation: RegistryBackedLocalPlayableOperation,
    callback: () => T,
    options: Readonly<{
      readonly allowFailed?: boolean;
      readonly allowPartial?: boolean;
    }> = Object.freeze({}),
  ): T {
    this.#assertNoOperation();
    if (this.#destroyed) {
      throw new Error('Arena V2 Registry-backed local owner已销毁。');
    }
    if (!options.allowPartial
      && (this.#registryBootstrap === null || this.#localPlayable === null)) {
      throw new Error('Arena V2 Registry-backed local owner子Owner不完整。');
    }
    if (this.#cleanupStarted && operation !== 'destroy') {
      throw new Error('Arena V2 Registry-backed local owner已进入清理，只允许继续销毁。');
    }
    if (this.#failedByReentry && !options.allowFailed) {
      throw new Error(
        'Arena V2 Registry-backed local owner发生父层重入，只允许精确晋级恢复或销毁。',
      );
    }
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        result = callback();
      } catch (error) {
        this.#assertNoReentrySince(reentrySequence, operation, error);
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
  ): T {
    if (this.#operation === null) {
      throw new Error('Arena V2 Registry-backed local owner子操作缺少父事务。');
    }
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      result = callback();
      assertSynchronousReturn(
        result,
        `Arena V2 Registry-backed local owner ${operation}`,
      );
    } catch (error) {
      this.#assertNoReentrySince(reentrySequence, operation, error);
      throw error;
    }
    onCommitted?.(result);
    this.#assertNoReentrySince(reentrySequence, operation);
    return result;
  }

  get localPlayable(): ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 {
    this.#usable();
    return this.#localPlayable!;
  }

  readRegistry() {
    return this.#runOperation('read-registry', () => this.#runChildOperation(
      'Registry active读取',
      () => this.#registryBootstrap!.read(),
    ));
  }

  readRegistryHead() {
    return this.#runOperation('read-registry-head', () => this.#runChildOperation(
      'Registry active head读取',
      () => this.#registryBootstrap!.readHead(),
    ));
  }

  #captureCompletedPromotion(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 Registry-backed local owner晋级水位提交缺少父事务。');
    }
    const promotion = this.#promotionCoordinator === null
      ? null
      : this.#runChildOperation(
        '晋级Coordinator状态读取',
        () => this.#promotionCoordinator!.snapshot(),
      );
    if (promotion?.state !== 'promoted'
      || this.#pendingPromotionBase === null) return;
    const active = this.#runChildOperation(
      '晋级后Registry active读取',
      () => this.#registryBootstrap!.read(),
    );
    this.#lastAvailabilityChange = availabilityChange(
      {
        revision: this.#pendingPromotionBase.revision,
        snapshotHash: this.#pendingPromotionBase.snapshotHash,
        collectionWeaponIds: this.#pendingPromotionBase.collectionWeaponIds,
      },
      active,
      this.#pendingPromotionBase.weaponId,
    );
  }

  beginSingleWeaponPromotion(
    options: ArenaV2RegistryBackedLocalPlayableBeginPromotionOptionsCandidateV1,
  ): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    this.#runOperation('begin-promotion', () => {
      exactPromotionOptions(
        options,
        BEGIN_PROMOTION_OPTION_KEYS,
        'Arena V2 Registry-backed local owner explicit promotion options',
      );
      if (this.#promotionCoordinator !== null) {
        throw new Error('Arena V2 Registry-backed local owner已有单把晋级Owner。');
      }
      const assembly = createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1({
        hostId: options.hostId,
        publicationOwnerId: options.publicationOwnerId,
        assessment: options.assessment,
        plan: options.plan,
        registryReference: this.#registryBootstrap!,
        portOptions: options.portOptions,
      });
      this.#beginSingleWeaponPromotionFromConfiguration(
        options.coordinatorId,
        Object.freeze({
          registrationHostOptions: assembly.registrationHostOptions,
          targetWeaponId: assembly.weaponId,
          sourceRevision: assembly.sourceRevision,
          sourceSnapshotHash: assembly.sourceSnapshotHash,
          sourceCollectionWeaponIds: assembly.sourceCollectionWeaponIds,
        }),
      );
    });
    return this.snapshot();
  }

  #beginSingleWeaponPromotionFromConfiguration(
    coordinatorId: string,
    configuration: Readonly<{
      readonly registrationHostOptions:
        ArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1[
          'registrationHostOptions'
        ];
      readonly targetWeaponId: string;
      readonly sourceRevision: number;
      readonly sourceSnapshotHash: string;
      readonly sourceCollectionWeaponIds: readonly string[];
    }>,
  ): void {
    this.#runChildOperation(
      '单把晋级Coordinator构造',
      () => new ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1({
        coordinatorId,
        registrationHostOptions: configuration.registrationHostOptions,
        registryReference: this.#registryBootstrap!,
      }),
      (coordinator) => {
        this.#promotionCoordinator = coordinator;
        this.#pendingPromotionBase = Object.freeze({
          weaponId: configuration.targetWeaponId,
          revision: configuration.sourceRevision,
          snapshotHash: configuration.sourceSnapshotHash,
          collectionWeaponIds: Object.freeze([...configuration.sourceCollectionWeaponIds]),
        });
      },
    );
  }

  beginSingleWeaponPromotionFromAssessment(
    options: ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1,
  ): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    this.#runOperation('begin-promotion', () => {
      exactPromotionOptions(
        options,
        BEGIN_PROMOTION_FROM_ASSESSMENT_OPTION_KEYS,
        'Arena V2 Registry-backed local owner assessment promotion options',
      );
      if (this.#promotionCoordinator !== null) {
        throw new Error('Arena V2 Registry-backed local owner已有单把晋级Owner。');
      }
      const envelope = createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1({
        hostId: options.hostId,
        publicationOwnerId: options.publicationOwnerId,
        assessment: options.assessment,
        registryReference: this.#registryBootstrap!,
        portOptions: options.portOptions,
      });
      this.#beginSingleWeaponPromotionFromConfiguration(
        options.coordinatorId,
        envelope,
      );
    });
    return this.snapshot();
  }

  promoteNextWeaponFromAssessment(
    options: ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1,
  ): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    this.beginSingleWeaponPromotionFromAssessment(options);
    return this.advanceSingleWeaponPromotionToStable();
  }

  publishAndPromoteSingleWeapon(): Readonly<
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1
  > {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      throw new Error('Arena V2 Registry-backed local owner尚未开始单把晋级。');
    }
    const coordinator = this.#promotionCoordinator;
    this.#runOperation('publish-promote', () => {
      this.#runChildOperation(
        '单把武器发布与晋级',
        () => coordinator.publishAndPromote(),
        () => { this.#captureCompletedPromotion(); },
      );
    }, Object.freeze({ allowFailed: true }));
    return this.snapshot();
  }

  retrySingleWeaponReferenceAfterActivation(): Readonly<
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1
  > {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      throw new Error('Arena V2 Registry-backed local owner没有可重试的单把晋级。');
    }
    const coordinator = this.#promotionCoordinator;
    this.#runOperation('retry-reference', () => {
      this.#runChildOperation(
        '单把武器引用重试',
        () => coordinator.retryReferenceAfterActivation(),
        () => { this.#captureCompletedPromotion(); },
      );
    }, Object.freeze({ allowFailed: true }));
    return this.snapshot();
  }

  retrySingleWeaponSealAfterPromotion(): Readonly<
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1
  > {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      throw new Error('Arena V2 Registry-backed local owner没有可重试的单把封存。');
    }
    const coordinator = this.#promotionCoordinator;
    this.#runOperation('retry-seal', () => {
      this.#runChildOperation(
        '单把武器封存重试',
        () => coordinator.retrySealAfterPromotion(),
        () => { this.#captureCompletedPromotion(); },
      );
    }, Object.freeze({ allowFailed: true }));
    return this.snapshot();
  }

  renewSingleWeaponPromotionLease(): boolean {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      throw new Error('Arena V2 Registry-backed local owner没有活动的单把晋级租约。');
    }
    const coordinator = this.#promotionCoordinator;
    return this.#runOperation('renew-lease', () => this.#runChildOperation(
      '单把武器晋级租约续期',
      () => coordinator.renewLease(),
    ), Object.freeze({ allowFailed: true }));
  }

  advanceSingleWeaponPromotionToStable(): Readonly<
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1
  > {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      throw new Error('Arena V2 Registry-backed local owner尚未开始可推进的单把晋级。');
    }
    for (let operationCount = 0; operationCount < 4; operationCount += 1) {
      const operations = projectArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1(
        this.#promotionCoordinator?.snapshot() ?? null,
      );
      switch (operations.nextRequiredOperation) {
        case 'publish-and-promote':
          this.publishAndPromoteSingleWeapon();
          continue;
        case 'retry-reference':
          this.retrySingleWeaponReferenceAfterActivation();
          continue;
        case 'retry-seal':
          this.retrySingleWeaponSealAfterPromotion();
          continue;
        case 'close':
          return this.closeSingleWeaponPromotion();
        case 'wait':
          throw new Error('Arena V2单把武器晋级仍在执行，不能并发粗粒度推进。');
        case 'begin':
        case 'none':
          return this.snapshot();
      }
    }
    throw new Error('Arena V2单把武器晋级超过有界粗粒度推进步数。');
  }

  closeSingleWeaponPromotion(): Readonly<
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1
  > {
    this.#usable(true);
    if (this.#promotionCoordinator === null) {
      this.#failedByReentry = false;
      this.#lastFailure = null;
      return this.snapshot();
    }
    const coordinator = this.#promotionCoordinator;
    this.#runOperation('close-promotion', () => {
      this.#captureCompletedPromotion();
      this.#runChildOperation(
        '单把晋级Coordinator关闭',
        () => coordinator.destroy(),
        () => {
          if (this.#promotionCoordinator === coordinator) {
            this.#promotionCoordinator = null;
            this.#pendingPromotionBase = null;
          }
        },
      );
    }, Object.freeze({ allowFailed: true }));
    this.#failedByReentry = false;
    this.#lastFailure = null;
    return this.snapshot();
  }

  snapshot(): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    return this.#snapshot();
  }

  #snapshot(): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    const registrySequence = this.#registryBootstrap === null || this.#destroyed
      ? null
      : projectArenaV2RegistryWeaponSequenceCandidateV1(
        this.#registryBootstrap.read().collectionWeaponIds,
      );
    return Object.freeze({
      schemaVersion: ARENA_V2_REGISTRY_BACKED_LOCAL_PLAYABLE_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      registry: this.#registryBootstrap?.snapshot() ?? null,
      registryBootstrapSource: this.#registryBootstrapSource,
      registrySequence,
      promotion: this.#promotionCoordinator?.snapshot() ?? null,
      promotionOperations:
        projectArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1(
          this.#promotionCoordinator?.snapshot() ?? null,
          !this.#destroyed && this.#registryBootstrap !== null && this.#localPlayable !== null,
        ),
      pendingPromotionWeaponId: this.#pendingPromotionBase?.weaponId ?? null,
      lastAvailabilityChange: this.#lastAvailabilityChange,
      localPlayableOwned: this.#localPlayable !== null,
      failedByReentry: this.#failedByReentry,
      cleanupStarted: this.#cleanupStarted,
      destroying: this.#operation === 'destroy',
      lastFailure: this.#lastFailure,
      destroyed: this.#destroyed,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
      defaultEntryWired: false as const,
    });
  }

  destroy(): Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    if (this.#destroyed) return this.#snapshot();
    const promotionState = this.#promotionCoordinator?.snapshot().state ?? null;
    if (promotionState === 'published'
      || promotionState === 'activated-reference-stale'
      || promotionState === 'reference-promoted-unsealed') {
      throw new Error('Arena V2 Registry-backed local owner必须先收口活动武器晋级。');
    }
    try {
      this.#runOperation('destroy', () => {
        this.#cleanupStarted = true;
        const errors: unknown[] = [];
        if (this.#promotionCoordinator !== null) {
          const coordinator = this.#promotionCoordinator;
          try {
            this.#runChildOperation(
              '单把晋级Coordinator销毁',
              () => coordinator.destroy(),
              () => {
                if (this.#promotionCoordinator === coordinator) {
                  this.#promotionCoordinator = null;
                  this.#pendingPromotionBase = null;
                }
              },
            );
          } catch (error) {
            errors.push(error);
          }
        }
        if (this.#localPlayable !== null) {
          const localPlayable = this.#localPlayable;
          try {
            this.#runChildOperation(
              '本地Playable Host销毁',
              () => localPlayable.destroy(),
              () => {
                if (this.#localPlayable === localPlayable) this.#localPlayable = null;
              },
            );
          } catch (error) {
            errors.push(error);
          }
        }
        if (this.#promotionCoordinator === null
          && this.#localPlayable === null
          && this.#registryBootstrap !== null) {
          const registryBootstrap = this.#registryBootstrap;
          try {
            this.#runChildOperation(
              'Registry Bootstrap销毁',
              () => registryBootstrap.destroy(),
              () => {
                if (this.#registryBootstrap === registryBootstrap) {
                  this.#registryBootstrap = null;
                }
              },
            );
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length > 0) {
          throw new AggregateError(
            errors,
            'Arena V2 Registry-backed local owner清理不完整。',
          );
        }
        if (this.#promotionCoordinator !== null
          || this.#localPlayable !== null
          || this.#registryBootstrap !== null) {
          throw new Error('Arena V2 Registry-backed local owner清理未收敛。');
        }
      }, Object.freeze({ allowFailed: true, allowPartial: true }));
    } catch (error) {
      if (!this.#failedByReentry) {
        this.#lastFailure = error instanceof Error
          ? error.message
          : 'Arena V2 Registry-backed local owner清理发生非Error失败。';
      }
      throw error;
    }
    this.#destroyed = true;
    this.#failedByReentry = false;
    this.#lastFailure = null;
    return this.#snapshot();
  }
}

export interface ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly registry: ReturnType<ArenaV2RegistryActiveBootstrapCandidateV1['snapshot']> | null;
  readonly registryBootstrapSource: 'constructed' | 'transferred';
  readonly registrySequence: ReturnType<
    typeof projectArenaV2RegistryWeaponSequenceCandidateV1
  > | null;
  readonly promotion: ReturnType<
    ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1['snapshot']
  > | null;
  readonly promotionOperations: ReturnType<
    typeof projectArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1
  >;
  readonly pendingPromotionWeaponId: string | null;
  readonly lastAvailabilityChange:
    Readonly<ArenaV2RegistryWeaponAvailabilityChangeCandidateV1> | null;
  readonly localPlayableOwned: boolean;
  readonly failedByReentry: boolean;
  readonly cleanupStarted: boolean;
  readonly destroying: boolean;
  readonly lastFailure: string | null;
  readonly destroyed: boolean;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
}

export function createArenaV2RegistryBackedLocalPlayableOwnerCandidateV1(
  options: ArenaV2RegistryBackedLocalPlayableOwnerOptionsCandidateV1,
): ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 {
  return new ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1(options);
}

export function createArenaV2RegistryBackedLocalPlayableOwnerFromFirstProvisioningCandidateV1(
  options: ArenaV2RegistryBackedLocalPlayableFromFirstProvisioningOptionsCandidateV1,
): ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Arena V2首把Registry可玩Owner移交options必须是普通对象。');
  }
  const name = 'Arena V2首把Registry可玩Owner移交options';
  assertKnownKeys(
    options,
    new Set(['provisioningOwner', 'localPlayableOptions']),
    name,
  );
  if (Object.getOwnPropertySymbols(options).length > 0) {
    throw new TypeError(`${name}不能包含Symbol字段。`);
  }
  const values = new Map<string, unknown>();
  for (const key of ['provisioningOwner', 'localPlayableOptions'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
    }
    values.set(key, descriptor.value);
  }
  const provisioningOwner = values.get('provisioningOwner');
  if (!(provisioningOwner instanceof ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1)) {
    throw new TypeError('Arena V2首把Registry可玩Owner必须消费真实provisioning Owner。');
  }
  const registryBootstrap = provisioningOwner.takeRuntimeBootstrap();
  try {
    return new ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1({
      registryBootstrap,
      localPlayableOptions: values.get('localPlayableOptions') as Omit<
        ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
        'registryReference'
      >,
    });
  } catch (error) {
    if (error instanceof
      ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1) {
      throw error;
    }
    if (registryBootstrap.snapshot().destroyed) throw error;
    try {
      registryBootstrap.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena V2首把Registry可玩Owner构造失败且bootstrap清理不完整。',
      );
    }
    throw error;
  }
}
