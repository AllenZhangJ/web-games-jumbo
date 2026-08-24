import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  projectArenaV2CollectionMasteryDetailFactsV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1,
  ArenaV2CollectionMasteryDetailCompositionCandidateV1,
  type ArenaV2A6CollectionMasteryDetailInputV1,
  type ArenaV2A6DetailSelectionV1,
} from './arena-v2-collection-mastery-detail-composition-candidate-v1.js';
import {
  ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1,
} from './arena-v2-collection-progress-component-set-candidate-v1.js';
import {
  ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1,
  ArenaV2ProfileCollectionProgressInputAdapterCandidateV1,
} from './arena-v2-profile-collection-progress-input-adapter-candidate-v1.js';

export const ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_CANDIDATE_V1 =
  Object.freeze({
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    inheritedUnreachableGoalKinds: Object.freeze([] as const),
    inheritedUnreachableGoalReason: null,
    catalogCompleteReachable: true as const,
    catalogCompleteKindMeaning:
      ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1
        .catalogCompleteKindMeaning,
    fullCatalogTerminalGoalId:
      ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1
        .fullCatalogTerminalGoalId,
    activeLearningCompletionGoalId:
      ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1
        .activeLearningCompletionGoalId,
    fullCatalogTerminalMeaning:
      ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1
        .fullCatalogTerminalMeaning,
  });

export const ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2ProfileCollectionMasteryDetailInputAdapterStateV1 =
  typeof ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1[
    keyof typeof ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1
  ];

const INPUT_KEYS = new Set([
  'schemaVersion', 'profileCollectionProgressInput', 'selection',
  'p5DetailContent', 'existingSelectionAction',
]);
const RESET_KEYS = new Set(['epochId']);
const SELECTION_KEYS = new Set(['kind', 'screenId', 'targetDefinitionId']);

interface ParsedAdapterInputV1 {
  readonly profileCollectionProgressInput: PlainRecord;
  readonly selection: ArenaV2A6DetailSelectionV1;
  readonly p5DetailContent: unknown;
  readonly existingSelectionAction: unknown;
  readonly canonical: string;
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

function canonicalData(value: unknown, name: string): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError(`${name} 无法规范序列化。`);
  return result;
}

function isRecoverableContractRejection(error: unknown): boolean {
  return error instanceof TypeError || error instanceof RangeError;
}

function parseSelection(value: unknown): ArenaV2A6DetailSelectionV1 {
  const source = exactRecord(value, SELECTION_KEYS, 'A6.7 selection');
  if (source.kind !== 'weapon' && source.kind !== 'map') {
    throw new RangeError('A6.7 selection.kind不受支持。');
  }
  const expectedScreenId = source.kind === 'weapon' ? 'weapon-detail' : 'map-detail';
  if (source.screenId !== expectedScreenId) {
    throw new RangeError('A6.7 selection的kind与screenId不闭合。');
  }
  return Object.freeze({
    kind: source.kind,
    screenId: expectedScreenId,
    targetDefinitionId: nonEmptyString(source.targetDefinitionId, 'A6.7 targetDefinitionId'),
  });
}

function parseInput(value: unknown): ParsedAdapterInputV1 {
  const cloned = cloneFrozenData(value, 'A6.7 Profile collection detail adapter input');
  const source = exactRecord(cloned, INPUT_KEYS, 'A6.7 Profile collection detail adapter input');
  if (source.schemaVersion !== 1) throw new RangeError('A6.7输入只接受schema 1。');
  return Object.freeze({
    profileCollectionProgressInput: assertPlainRecord(
      source.profileCollectionProgressInput,
      'A6.7 profileCollectionProgressInput',
    ),
    selection: parseSelection(source.selection),
    p5DetailContent: source.p5DetailContent,
    existingSelectionAction: source.existingSelectionAction,
    canonical: canonicalData(cloned, 'A6.7 input'),
  });
}

function createCollectionProgressInput(
  rawInput: PlainRecord,
): ArenaV2A6CollectionMasteryDetailInputV1['collectionProgressInput'] {
  const epochId = nonEmptyString(rawInput.epochId, 'A6.7 A6.5 input.epochId');
  const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({ epochId });
  let primaryError: unknown = null;
  try {
    return adapter.consume(rawInput);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      adapter.destroy();
    } catch (cleanupError) {
      if (primaryError === null) throw cleanupError;
    }
  }
}

function validateWithA6_3Composition(
  input: ArenaV2A6CollectionMasteryDetailInputV1,
): void {
  const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({
    epochId: input.collectionProgressInput.epochId,
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
  if (component.state !== ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.DESTROYED) {
    throw new Error('A6.7短生命周期A6.3组件未销毁。');
  }
}

function collectionContentIdentity(
  input: ArenaV2A6CollectionMasteryDetailInputV1['collectionProgressInput'],
): string {
  return `${input.collectionContent.sourceContentHash}|${input.collectionContent.contentHash}`;
}

export class ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1 {
  #state: ArenaV2ProfileCollectionMasteryDetailInputAdapterStateV1 =
    ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.ACTIVE;
  #epochId: string;
  #busy = false;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #collectionContentIdentity: string | null = null;
  #definitionCanonical: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  #detailContentHashBySelection = new Map<string, string>();
  #output: ArenaV2A6CollectionMasteryDetailInputV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.7 adapter constructor'),
      RESET_KEYS,
      'A6.7 adapter constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.7 constructor.epochId');
  }

  get state(): ArenaV2ProfileCollectionMasteryDetailInputAdapterStateV1 {
    return this.#state;
  }

  #assertActive(operation: string): void {
    if (
      this.#state
      !== ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.ACTIVE
    ) throw new Error(`${operation}拒绝状态${this.#state}。`);
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #clearCommitted(): void {
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#collectionContentIdentity = null;
    this.#definitionCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#detailContentHashBySelection.clear();
    this.#output = null;
  }

  consume(value: unknown): ArenaV2A6CollectionMasteryDetailInputV1 {
    this.#assertActive('A6.7 consume');
    this.#busy = true;
    try {
      const parsed = parseInput(value);
      const rawProgressInput = parsed.profileCollectionProgressInput;
      const inputEpochId = nonEmptyString(rawProgressInput.epochId, 'A6.7 input.epochId');
      if (inputEpochId !== this.#epochId) throw new RangeError('A6.7输入epochId漂移。');
      const tick = rawProgressInput.tick;
      if (!Number.isSafeInteger(tick) || (tick as number) < 0) {
        throw new RangeError('A6.7 input.tick必须是非负安全整数。');
      }
      if ((tick as number) < this.#lastTick) throw new RangeError('A6.7输入tick回退。');
      if (tick === this.#lastTick) {
        if (parsed.canonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.7同tick输入携带冲突事实。');
        }
        if (this.#output === null) throw new Error('A6.7同tick幂等输出缺失。');
        return this.#output;
      }

      const collectionProgressInput = createCollectionProgressInput(rawProgressInput);
      const ready = collectionProgressInput.sourceState
        === ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1.READY;
      const profileDefinition = rawProgressInput.profileDefinition;
      const profile = rawProgressInput.profile;
      const detailProgressFacts = ready
        ? projectArenaV2CollectionMasteryDetailFactsV1({
          profileDefinition,
          profile,
          selection: {
            kind: parsed.selection.kind,
            targetDefinitionId: parsed.selection.targetDefinitionId,
          },
        })
        : null;
      const candidate = Object.freeze({
        schemaVersion: 1 as const,
        collectionProgressInput,
        selection: parsed.selection,
        p5DetailContent: parsed.p5DetailContent,
        detailProgressFacts,
        existingSelectionAction: parsed.existingSelectionAction,
      }) as ArenaV2A6CollectionMasteryDetailInputV1;
      validateWithA6_3Composition(candidate);

      const nextCollectionContentIdentity = collectionContentIdentity(collectionProgressInput);
      if (
        this.#collectionContentIdentity !== null
        && nextCollectionContentIdentity !== this.#collectionContentIdentity
      ) throw new RangeError('A6.7同epoch P5 collectionContent身份漂移。');

      const detailContent = assertPlainRecord(parsed.p5DetailContent, 'A6.7 p5DetailContent');
      const nextSelectionIdentity =
        `${parsed.selection.kind}|${parsed.selection.targetDefinitionId}`;
      const nextDetailContentHash = nonEmptyString(
        detailContent.contentHash,
        'A6.7 p5DetailContent.contentHash',
      );
      const previousDetailContentHash = this.#detailContentHashBySelection.get(
        nextSelectionIdentity,
      );
      if (
        previousDetailContentHash !== undefined
        && nextDetailContentHash !== previousDetailContentHash
      ) throw new RangeError('A6.7同epoch同selection的P5 detail content身份漂移。');

      let nextDefinitionCanonical = this.#definitionCanonical;
      let nextProfileIdentity = this.#profileIdentity;
      let nextProfileRevision = this.#profileRevision;
      let nextProfileCanonical = this.#profileCanonical;
      if (ready) {
        if (profileDefinition === null || profile === null) {
          throw new Error('A6.7 ready状态缺少已验证Profile。');
        }
        const definitionCanonical = canonicalData(profileDefinition, 'A6.7 profileDefinition');
        const profileCanonical = canonicalData(profile, 'A6.7 profile');
        const identity = collectionProgressInput.profileIdentity;
        if (identity === null) throw new Error('A6.7 ready状态缺少Profile身份。');
        const profileIdentity = [
          identity.profileDefinitionId,
          identity.profileDefinitionContentVersion,
          identity.profileId,
        ].join('|');
        if (
          this.#definitionCanonical !== null
          && definitionCanonical !== this.#definitionCanonical
        ) throw new RangeError('A6.7同epoch Profile Definition内容漂移。');
        if (this.#profileIdentity !== null && profileIdentity !== this.#profileIdentity) {
          throw new RangeError('A6.7同epoch Profile身份漂移。');
        }
        if (identity.profileRevision < this.#profileRevision) {
          throw new RangeError('A6.7 Profile revision回退。');
        }
        if (
          identity.profileRevision === this.#profileRevision
          && profileCanonical !== this.#profileCanonical
        ) throw new RangeError('A6.7相同Profile revision携带冲突事实。');
        nextDefinitionCanonical = definitionCanonical;
        nextProfileIdentity = profileIdentity;
        nextProfileRevision = identity.profileRevision;
        nextProfileCanonical = profileCanonical;
      }

      const nextDetailContentHashBySelection = new Map(this.#detailContentHashBySelection);
      nextDetailContentHashBySelection.set(nextSelectionIdentity, nextDetailContentHash);
      this.#lastTick = tick as number;
      this.#lastInputCanonical = parsed.canonical;
      this.#collectionContentIdentity = nextCollectionContentIdentity;
      this.#definitionCanonical = nextDefinitionCanonical;
      this.#profileIdentity = nextProfileIdentity;
      this.#profileRevision = nextProfileRevision;
      this.#profileCanonical = nextProfileCanonical;
      this.#detailContentHashBySelection = nextDetailContentHashBySelection;
      this.#output = candidate;
      return candidate;
    } catch (error) {
      if (isRecoverableContractRejection(error)) throw error;
      this.#clearCommitted();
      this.#state = ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.FAILED;
      throw error;
    } finally {
      this.#busy = false;
    }
  }

  getInput(): ArenaV2A6CollectionMasteryDetailInputV1 | null {
    this.#assertActive('A6.7 getInput');
    return this.#output;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.7 resetPresentationEpoch');
    const source = exactRecord(
      cloneFrozenData(value, 'A6.7 epoch reset'),
      RESET_KEYS,
      'A6.7 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.7 epoch reset.epochId');
    if (epochId === this.#epochId) throw new RangeError('A6.7 epoch reset必须使用新epochId。');
    this.#clearCommitted();
    this.#epochId = epochId;
  }

  destroy(): void {
    if (
      this.#state
      === ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.DESTROYED
    ) return;
    if (this.#busy) throw new Error('A6.7 consume期间不能destroy。');
    this.#clearCommitted();
    this.#state = ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.DESTROYED;
  }
}
