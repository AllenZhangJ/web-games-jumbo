import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationCollectionContentProjectionV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA,
  projectArenaV2CollectionNextGoalIdentityV1,
  projectArenaV2CollectionProgressSummaryFactsV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1,
  ArenaV2CollectionProgressComponentSetCandidateV1,
  type ArenaV2A6CollectionProgressComponentInputV1,
  type ArenaV2A6CollectionProgressSourceStateV1,
} from './arena-v2-collection-progress-component-set-candidate-v1.js';

export const ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
  inheritedUnreachableGoalKinds: Object.freeze([] as const),
  inheritedUnreachableGoalReason: null,
  catalogCompleteReachable: true as const,
  catalogCompleteKindMeaning:
    ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA.catalogCompleteKindMeaning,
  fullCatalogTerminalGoalId:
    ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA.fullCatalogTerminalGoalId,
  activeLearningCompletionGoalId:
    ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA
      .activeLearningCompletionGoalId,
  fullCatalogTerminalMeaning:
    ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA.fullCatalogTerminalMeaning,
  eligibleWeaponScopeForwardedToUniqueGoalResolver: true as const,
  nullEligibleWeaponScopeMeansFullDefinition: true as const,
  fullCatalogProgressRemainsVisibleForActiveScope: true as const,
});

export const ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2ProfileCollectionProgressInputAdapterStateV1 =
  typeof ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1[
    keyof typeof ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1
  ];

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'locale', 'sourceState', 'collectionContent',
  'profileDefinition', 'profile', 'eligibleWeaponDefinitionIds', 'diagnosticCode',
  'observedProfileSchemaVersion', 'reducedMotion', 'muted', 'decorativeAssetState',
]);
const RESET_KEYS = new Set(['epochId']);
const SOURCE_STATES = new Set<unknown>(
  Object.values(ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1),
);

interface ParsedAdapterInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly sourceState: ArenaV2A6CollectionProgressSourceStateV1;
  readonly collectionContent: unknown;
  readonly profileDefinition: unknown | null;
  readonly profile: unknown | null;
  readonly eligibleWeaponDefinitionIds: readonly string[] | null;
  readonly diagnosticCode:
    | 'profile-empty'
    | 'profile-read-failed'
    | 'unsupported-profile-version'
    | null;
  readonly observedProfileSchemaVersion: number | null;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly decorativeAssetState: 'ready' | 'missing';
  readonly canonical: string;
}

interface ReadyProjectionV1 {
  readonly profileIdentity: NonNullable<
    ArenaV2A6CollectionProgressComponentInputV1['profileIdentity']
  >;
  readonly progressFacts: NonNullable<
    ArenaV2A6CollectionProgressComponentInputV1['progressFacts']
  >;
  readonly nextGoalIdentity: NonNullable<
    ArenaV2A6CollectionProgressComponentInputV1['nextGoalIdentity']
  >;
  readonly definitionCanonical: string;
  readonly profileCanonical: string;
}

function assertComponentProgressFacts(
  value: ReturnType<typeof projectArenaV2CollectionProgressSummaryFactsV1>,
): asserts value is ReturnType<typeof projectArenaV2CollectionProgressSummaryFactsV1>
  & NonNullable<ArenaV2A6CollectionProgressComponentInputV1['progressFacts']> {
  if (value.weaponJourney.targetMainResearch !== 2_400
    || value.weaponJourney.weaponCount !== 20) {
    throw new RangeError('A6.5收藏进度汇总与A6组件容量合同漂移。');
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
  return record;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function safeInteger(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function eligibleWeaponDefinitionIds(value: unknown): readonly string[] | null {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('A6.5 eligibleWeaponDefinitionIds必须是非空数组或null。');
  }
  const seen = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const weaponDefinitionId = nonEmptyString(
      entry,
      `A6.5 eligibleWeaponDefinitionIds[${index}]`,
    );
    if (seen.has(weaponDefinitionId)) {
      throw new RangeError(`A6.5 eligibleWeaponDefinitionIds重复声明${weaponDefinitionId}。`);
    }
    seen.add(weaponDefinitionId);
    return weaponDefinitionId;
  }));
}

function isRecoverableContractRejection(error: unknown): boolean {
  return error instanceof TypeError || error instanceof RangeError;
}

function canonicalData(value: unknown, name: string): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError(`${name} 无法规范序列化。`);
  return result;
}

function parseInput(value: unknown): ParsedAdapterInputV1 {
  const cloned = cloneFrozenData(value, 'A6.5 Profile collection adapter input');
  const source = exactRecord(cloned, INPUT_KEYS, 'A6.5 Profile collection adapter input');
  if (source.schemaVersion !== 1 || !SOURCE_STATES.has(source.sourceState)) {
    throw new RangeError('A6.5输入schema或sourceState不受支持。');
  }
  if (source.decorativeAssetState !== 'ready' && source.decorativeAssetState !== 'missing') {
    throw new RangeError('A6.5 decorativeAssetState不受支持。');
  }
  const diagnosticCode = source.diagnosticCode;
  if (
    diagnosticCode !== null
    && diagnosticCode !== 'profile-empty'
    && diagnosticCode !== 'profile-read-failed'
    && diagnosticCode !== 'unsupported-profile-version'
  ) throw new RangeError('A6.5 diagnosticCode不受支持。');
  const observedProfileSchemaVersion = source.observedProfileSchemaVersion === null
    ? null
    : safeInteger(source.observedProfileSchemaVersion, 0, 'A6.5 observedProfileSchemaVersion');
  const sourceState = source.sourceState as ArenaV2A6CollectionProgressSourceStateV1;
  if (sourceState === ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1.READY) {
    if (
      source.profileDefinition === null
      || source.profile === null
      || diagnosticCode !== null
      || observedProfileSchemaVersion !== 1
    ) throw new RangeError('A6.5 ready状态必须携带正式Profile且不得携带诊断。');
  } else if (source.profileDefinition !== null || source.profile !== null) {
    throw new RangeError('A6.5非ready状态不得夹带Profile事实。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: nonEmptyString(source.epochId, 'A6.5 epochId'),
    tick: safeInteger(source.tick, 0, 'A6.5 tick'),
    locale: nonEmptyString(source.locale, 'A6.5 locale'),
    sourceState,
    collectionContent: source.collectionContent,
    profileDefinition: source.profileDefinition,
    profile: source.profile,
    eligibleWeaponDefinitionIds: eligibleWeaponDefinitionIds(
      source.eligibleWeaponDefinitionIds,
    ),
    diagnosticCode,
    observedProfileSchemaVersion,
    reducedMotion: booleanValue(source.reducedMotion, 'A6.5 reducedMotion'),
    muted: booleanValue(source.muted, 'A6.5 muted'),
    decorativeAssetState: source.decorativeAssetState,
    canonical: canonicalData(cloned, 'A6.5 input'),
  });
}

function deriveOrderedDirectory(value: unknown): Readonly<{
  readonly weaponDefinitionIds: readonly string[];
  readonly maps: readonly Readonly<{
    readonly mapDefinitionId: string;
    readonly segmentDefinitionIds: readonly string[];
  }>[];
}> {
  const content = assertPlainRecord(value, 'A6.5 P5 collectionContent');
  if (!Array.isArray(content.weapons) || !Array.isArray(content.maps)) {
    throw new TypeError('A6.5 P5 collectionContent缺少武器或地图目录。');
  }
  const weaponDefinitionIds = content.weapons.map((value, index) => {
    const weapon = assertPlainRecord(value, `A6.5 collectionContent.weapons[${index}]`);
    return nonEmptyString(
      weapon.weaponDefinitionId,
      `A6.5 collectionContent.weapons[${index}].weaponDefinitionId`,
    );
  });
  const maps = content.maps.map((value, mapIndex) => {
    const map = assertPlainRecord(value, `A6.5 collectionContent.maps[${mapIndex}]`);
    if (!Array.isArray(map.segments)) {
      throw new TypeError(`A6.5 collectionContent.maps[${mapIndex}].segments必须是数组。`);
    }
    return Object.freeze({
      mapDefinitionId: nonEmptyString(
        map.mapDefinitionId,
        `A6.5 collectionContent.maps[${mapIndex}].mapDefinitionId`,
      ),
      segmentDefinitionIds: Object.freeze(map.segments.map((value, segmentIndex) => {
        const segment = assertPlainRecord(
          value,
          `A6.5 collectionContent.maps[${mapIndex}].segments[${segmentIndex}]`,
        );
        return nonEmptyString(
          segment.segmentDefinitionId,
          `A6.5 collectionContent.maps[${mapIndex}].segments[${segmentIndex}].segmentDefinitionId`,
        );
      })),
    });
  });
  return Object.freeze({
    weaponDefinitionIds: Object.freeze(weaponDefinitionIds),
    maps: Object.freeze(maps),
  });
}

function readyProjection(input: ParsedAdapterInputV1): ReadyProjectionV1 {
  if (input.profileDefinition === null || input.profile === null) {
    throw new Error('A6.5 ready投影缺少Profile输入。');
  }
  const orderedDirectory = deriveOrderedDirectory(input.collectionContent);
  const collectionWeaponDefinitionIds = new Set(orderedDirectory.weaponDefinitionIds);
  for (const weaponDefinitionId of input.eligibleWeaponDefinitionIds ?? []) {
    if (!collectionWeaponDefinitionIds.has(weaponDefinitionId)) {
      throw new RangeError(`A6.5当前可用武器${weaponDefinitionId}不在P5收藏目录中。`);
    }
  }
  const progressFacts = projectArenaV2CollectionProgressSummaryFactsV1({
    profileDefinition: input.profileDefinition,
    profile: input.profile,
    orderedDirectory,
  });
  assertComponentProgressFacts(progressFacts);
  const nextGoalIdentity = projectArenaV2CollectionNextGoalIdentityV1({
    profileDefinition: input.profileDefinition,
    profile: input.profile,
    ...(input.eligibleWeaponDefinitionIds === null
      ? {}
      : { eligibleWeaponDefinitionIds: input.eligibleWeaponDefinitionIds }),
  });
  const definition = assertPlainRecord(input.profileDefinition, 'A6.5 profileDefinition');
  const profile = assertPlainRecord(input.profile, 'A6.5 profile');
  if (definition.id !== 'arena-v2.learning-profile.candidate.v1'
    || definition.contentVersion !== 5) {
    throw new RangeError('A6.5 Profile Definition身份不符合A6.2合同。');
  }
  if (
    profile.schemaVersion !== 1
    || profile.profileDefinitionId !== definition.id
    || profile.profileDefinitionContentVersion !== definition.contentVersion
    || profile.revision !== nextGoalIdentity.profileRevision
  ) throw new RangeError('A6.5 Profile revision或Definition身份漂移。');
  return Object.freeze({
    profileIdentity: Object.freeze({
      profileSchemaVersion: 1 as const,
      profileDefinitionId: 'arena-v2.learning-profile.candidate.v1' as const,
      profileDefinitionContentVersion: 5 as const,
      profileId: nonEmptyString(profile.profileId, 'A6.5 profile.profileId'),
      profileRevision: nextGoalIdentity.profileRevision,
    }),
    progressFacts,
    nextGoalIdentity,
    definitionCanonical: canonicalData(input.profileDefinition, 'A6.5 profileDefinition'),
    profileCanonical: canonicalData(input.profile, 'A6.5 profile'),
  });
}

function contentIdentity(value: unknown): string {
  const content = assertPlainRecord(value, 'A6.5 collectionContent identity');
  return `${nonEmptyString(content.sourceContentHash, 'A6.5 sourceContentHash')}|${
    nonEmptyString(content.contentHash, 'A6.5 contentHash')
  }`;
}

function validateWithA6Component(
  input: ArenaV2A6CollectionProgressComponentInputV1,
): void {
  const component = new ArenaV2CollectionProgressComponentSetCandidateV1({
    epochId: input.epochId,
  });
  let primaryError: unknown = null;
  try {
    component.consume(input);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      component.destroy();
    } catch (cleanupError) {
      if (primaryError === null) throw cleanupError;
    }
  }
}

export class ArenaV2ProfileCollectionProgressInputAdapterCandidateV1 {
  #state: ArenaV2ProfileCollectionProgressInputAdapterStateV1 =
    ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.ACTIVE;
  #epochId: string;
  #busy = false;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #contentIdentity: string | null = null;
  #definitionCanonical: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  #output: ArenaV2A6CollectionProgressComponentInputV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.5 adapter constructor'),
      RESET_KEYS,
      'A6.5 adapter constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.5 constructor.epochId');
  }

  get state(): ArenaV2ProfileCollectionProgressInputAdapterStateV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #clearCommitted(): void {
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#definitionCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#output = null;
  }

  consume(value: unknown): ArenaV2A6CollectionProgressComponentInputV1 {
    this.#assertActive('A6.5 consume');
    this.#busy = true;
    try {
      const input = parseInput(value);
      if (input.epochId !== this.#epochId) throw new RangeError('A6.5输入epochId漂移。');
      if (input.tick < this.#lastTick) throw new RangeError('A6.5输入tick回退。');
      if (input.tick === this.#lastTick) {
        if (input.canonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.5同tick输入携带冲突事实。');
        }
        if (this.#output === null) throw new Error('A6.5同tick幂等输出缺失。');
        return this.#output;
      }

      const projection = input.sourceState === ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1.READY
        ? readyProjection(input)
        : null;
      const candidate = Object.freeze({
        schemaVersion: 1 as const,
        epochId: input.epochId,
        tick: input.tick,
        locale: input.locale,
        sourceState: input.sourceState,
        profileIdentity: projection?.profileIdentity ?? null,
        collectionContent: input.collectionContent as ArenaV2InformationCollectionContentProjectionV1,
        progressFacts: projection?.progressFacts ?? null,
        nextGoalIdentity: projection?.nextGoalIdentity ?? null,
        diagnosticCode: input.diagnosticCode,
        observedProfileSchemaVersion: input.observedProfileSchemaVersion,
        reducedMotion: input.reducedMotion,
        muted: input.muted,
        decorativeAssetState: input.decorativeAssetState,
      });
      validateWithA6Component(candidate);

      const nextContentIdentity = contentIdentity(input.collectionContent);
      if (this.#contentIdentity !== null && nextContentIdentity !== this.#contentIdentity) {
        throw new RangeError('A6.5同epoch P5 collectionContent身份漂移。');
      }
      if (projection !== null) {
        const nextProfileIdentity = [
          projection.profileIdentity.profileDefinitionId,
          projection.profileIdentity.profileDefinitionContentVersion,
          projection.profileIdentity.profileId,
        ].join('|');
        if (
          this.#definitionCanonical !== null
          && projection.definitionCanonical !== this.#definitionCanonical
        ) throw new RangeError('A6.5同epoch Profile Definition内容漂移。');
        if (this.#profileIdentity !== null && nextProfileIdentity !== this.#profileIdentity) {
          throw new RangeError('A6.5同epoch Profile身份漂移。');
        }
        const nextRevision = projection.profileIdentity.profileRevision;
        if (nextRevision < this.#profileRevision) {
          throw new RangeError('A6.5 Profile revision回退。');
        }
        if (
          nextRevision === this.#profileRevision
          && projection.profileCanonical !== this.#profileCanonical
        ) throw new RangeError('A6.5相同Profile revision携带冲突事实。');
        this.#definitionCanonical = projection.definitionCanonical;
        this.#profileIdentity = nextProfileIdentity;
        this.#profileRevision = nextRevision;
        this.#profileCanonical = projection.profileCanonical;
      }
      this.#lastTick = input.tick;
      this.#lastInputCanonical = input.canonical;
      this.#contentIdentity = nextContentIdentity;
      this.#output = candidate;
      return candidate;
    } catch (error) {
      if (isRecoverableContractRejection(error)) throw error;
      this.#clearCommitted();
      this.#state = ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.FAILED;
      throw error;
    } finally {
      this.#busy = false;
    }
  }

  getInput(): ArenaV2A6CollectionProgressComponentInputV1 | null {
    this.#assertActive('A6.5 getInput');
    return this.#output;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.5 resetPresentationEpoch');
    const source = exactRecord(
      cloneFrozenData(value, 'A6.5 epoch reset'),
      RESET_KEYS,
      'A6.5 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.5 epoch reset.epochId');
    if (epochId === this.#epochId) throw new RangeError('A6.5 epoch reset必须使用新epochId。');
    this.#clearCommitted();
    this.#epochId = epochId;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.DESTROYED) {
      return;
    }
    if (this.#busy) throw new Error('A6.5 consume期间不能destroy。');
    this.#clearCommitted();
    this.#state = ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.DESTROYED;
  }
}
