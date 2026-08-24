import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  type ArenaV2A6FormalPreviewBindingSlotV1,
  type ArenaV2A6FormalPreviewStrategyV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionMasteryDetailCompositionCandidateV1,
  type ArenaV2A6CollectionMasteryDetailInputV1,
  type ArenaV2A6CollectionMasteryDetailSnapshotV1,
} from './arena-v2-collection-mastery-detail-composition-candidate-v1.js';
import {
  ArenaV2CollectionProgressComponentSetCandidateV1,
  type ArenaV2A6CollectionProgressComponentInputV1,
  type ArenaV2A6CollectionProgressComponentSnapshotV1,
} from './arena-v2-collection-progress-component-set-candidate-v1.js';
import {
  ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1,
} from './arena-v2-profile-collection-mastery-detail-input-adapter-candidate-v1.js';
import {
  ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1,
  ArenaV2ProfileCollectionProgressInputAdapterCandidateV1,
} from './arena-v2-profile-collection-progress-input-adapter-candidate-v1.js';

export const ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  loadsResources: false as const,
  ownsThreeResources: false as const,
  completeFormalAssetLeaseBindingForwarded: true as const,
  formalAssetLeaseBindingSlotCount: 22 as const,
  pageCountAdded: 0 as const,
  actionCountAdded: 0 as const,
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

export const ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2CollectionFourScreenReadOwnerStateV1 =
  typeof ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1[
    keyof typeof ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1
  ];

export type ArenaV2CollectionFourScreenIdV1 =
  | 'weapon-index'
  | 'map-index'
  | 'weapon-detail'
  | 'map-detail';

export type ArenaV2CollectionCurrentScreenPreviewSlotV1 = Readonly<
  Omit<ArenaV2A6FormalPreviewBindingSlotV1, 'previewStrategies'> & {
    readonly previewStrategy: ArenaV2A6FormalPreviewStrategyV1;
  }
>;

export interface ArenaV2CollectionFourScreenReadSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly validationStatus: 'not-run';
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly sourceState: ArenaV2A6CollectionProgressComponentInputV1['sourceState'];
  readonly indexPage: ArenaV2A6CollectionProgressComponentSnapshotV1 | null;
  readonly detailPage: ArenaV2A6CollectionMasteryDetailSnapshotV1 | null;
  readonly previewSlots: readonly ArenaV2CollectionCurrentScreenPreviewSlotV1[];
  readonly formalAssetLeaseBinding:
    ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly formalAssetGovernance: Readonly<{
    readonly contentIdentity:
      ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1['contentIdentity'];
    readonly budget: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1['budget'];
    readonly layouts: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1['layouts'];
    readonly accessibility:
      ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1['accessibility'];
    readonly governance: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1['governance'];
    readonly loadsResourcesHere: false;
    readonly ownsThreeResourcesHere: false;
  }>;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'screenId', 'profileCollectionProgressInput', 'detail',
  'formalAssetCatalog', 'availability',
]);
const DETAIL_KEYS = new Set(['selection', 'p5DetailContent', 'existingSelectionAction']);
const RESET_KEYS = new Set(['epochId']);
const SCREEN_IDS = new Set<unknown>([
  'weapon-index', 'map-index', 'weapon-detail', 'map-detail',
]);

interface ParsedOwnerInputV1 {
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly profileCollectionProgressInput: PlainRecord;
  readonly detail: PlainRecord | null;
  readonly formalAssetCatalog: unknown;
  readonly availability: unknown;
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

function parseInput(value: unknown): ParsedOwnerInputV1 {
  const cloned = cloneFrozenData(value, 'A6.8 four-screen owner input');
  const source = exactRecord(cloned, INPUT_KEYS, 'A6.8 four-screen owner input');
  if (source.schemaVersion !== 1 || !SCREEN_IDS.has(source.screenId)) {
    throw new RangeError('A6.8 schema或screenId不受支持。');
  }
  const screenId = source.screenId as ArenaV2CollectionFourScreenIdV1;
  const detailScreen = screenId === 'weapon-detail' || screenId === 'map-detail';
  if (detailScreen ? source.detail === null : source.detail !== null) {
    throw new RangeError('A6.8 index/detail包与screenId不闭合。');
  }
  const detail = source.detail === null
    ? null
    : exactRecord(source.detail, DETAIL_KEYS, 'A6.8 detail package');
  if (detail !== null) {
    const selection = assertPlainRecord(detail.selection, 'A6.8 detail.selection');
    if (selection.screenId !== screenId) {
      throw new RangeError('A6.8 detail selection与当前screenId不闭合。');
    }
  }
  return Object.freeze({
    screenId,
    profileCollectionProgressInput: assertPlainRecord(
      source.profileCollectionProgressInput,
      'A6.8 profileCollectionProgressInput',
    ),
    detail,
    formalAssetCatalog: source.formalAssetCatalog,
    availability: source.availability,
    canonical: canonicalData(cloned, 'A6.8 input'),
  });
}

function withOwnedResource<T>(
  read: () => T,
  destroy: () => void,
): T {
  let primaryError: unknown = null;
  try {
    return read();
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      destroy();
    } catch (cleanupError) {
      if (primaryError === null) throw cleanupError;
    }
  }
}

function createIndexPath(
  rawInput: PlainRecord,
): Readonly<{
  readonly collectionInput: ArenaV2A6CollectionProgressComponentInputV1;
  readonly indexPage: ArenaV2A6CollectionProgressComponentSnapshotV1;
}> {
  const epochId = nonEmptyString(rawInput.epochId, 'A6.8 index epochId');
  const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({ epochId });
  const collectionInput = withOwnedResource(
    () => adapter.consume(rawInput),
    () => adapter.destroy(),
  );
  const component = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId });
  const indexPage = withOwnedResource(
    () => component.consume(collectionInput),
    () => component.destroy(),
  );
  return Object.freeze({ collectionInput, indexPage });
}

function createDetailPath(
  rawInput: PlainRecord,
  detail: PlainRecord,
): Readonly<{
  readonly detailInput: ArenaV2A6CollectionMasteryDetailInputV1;
  readonly detailPage: ArenaV2A6CollectionMasteryDetailSnapshotV1;
}> {
  const epochId = nonEmptyString(rawInput.epochId, 'A6.8 detail epochId');
  const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({ epochId });
  const detailInput = withOwnedResource(
    () => adapter.consume({
      schemaVersion: 1,
      profileCollectionProgressInput: rawInput,
      selection: detail.selection,
      p5DetailContent: detail.p5DetailContent,
      existingSelectionAction: detail.existingSelectionAction,
    }),
    () => adapter.destroy(),
  );
  const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({ epochId });
  const detailPage = withOwnedResource(
    () => component.consume(detailInput),
    () => component.destroy(),
  );
  return Object.freeze({ detailInput, detailPage });
}

function createFormalAssetBinding(
  collectionInput: ArenaV2A6CollectionProgressComponentInputV1,
  formalAssetCatalog: unknown,
  availability: unknown,
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const component = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
    epochId: collectionInput.epochId,
  });
  return withOwnedResource(
    () => component.consume({
      schemaVersion: 1,
      collectionProgressInput: collectionInput,
      formalAssetCatalog,
      availability,
    }),
    () => component.destroy(),
  );
}

function currentScreenSlots(
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  screenId: ArenaV2CollectionFourScreenIdV1,
  detailTargetDefinitionId: string | null,
): readonly ArenaV2CollectionCurrentScreenPreviewSlotV1[] {
  const expectedKind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const matching = binding.slots.filter((slot) => (
    slot.kind === expectedKind
    && (detailTargetDefinitionId === null || slot.definitionId === detailTargetDefinitionId)
  ));
  const expectedCount = screenId === 'weapon-index' ? 20
    : screenId === 'map-index' ? 2 : 1;
  if (matching.length !== expectedCount) {
    throw new Error('A6.8当前页preview slot数量或selection身份不闭合。');
  }
  return Object.freeze(matching.map((slot) => {
    const previewStrategy = slot.previewStrategies.find((strategy) => (
      strategy.screenId === screenId
    ));
    if (previewStrategy === undefined) throw new Error('A6.8当前页preview strategy缺失。');
    if (
      (!slot.assetUsePermitted || slot.kind === 'map')
      && (
        !slot.fallback.active
        || slot.lifecycle.requestPermitted
        || slot.lifecycle.requestToken !== null
        || slot.lifecycle.releaseToken !== null
      )
    ) throw new Error('A6.8 fallback slot意外携带资源请求能力。');
    const { previewStrategies: _previewStrategies, ...governedSlot } = slot;
    void _previewStrategies;
    return Object.freeze({ ...governedSlot, previewStrategy });
  }));
}

export class ArenaV2CollectionFourScreenReadOwnerCandidateV1 {
  #state: ArenaV2CollectionFourScreenReadOwnerStateV1 =
    ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.ACTIVE;
  #epochId: string;
  #busy = false;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #contentIdentity: string | null = null;
  #catalogIdentity: string | null = null;
  #formalAssetLeaseBindingCanonical: string | null = null;
  #definitionCanonical: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  #detailContentHashBySelection = new Map<string, string>();
  #snapshot: ArenaV2CollectionFourScreenReadSnapshotV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.8 owner constructor'),
      RESET_KEYS,
      'A6.8 owner constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.8 constructor.epochId');
  }

  get state(): ArenaV2CollectionFourScreenReadOwnerStateV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #clearCommitted(): void {
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#catalogIdentity = null;
    this.#formalAssetLeaseBindingCanonical = null;
    this.#definitionCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#detailContentHashBySelection.clear();
    this.#snapshot = null;
  }

  consume(value: unknown): ArenaV2CollectionFourScreenReadSnapshotV1 {
    this.#assertActive('A6.8 consume');
    this.#busy = true;
    try {
      const parsed = parseInput(value);
      const rawInput = parsed.profileCollectionProgressInput;
      const inputEpochId = nonEmptyString(rawInput.epochId, 'A6.8 input.epochId');
      if (inputEpochId !== this.#epochId) throw new RangeError('A6.8输入epochId漂移。');
      const tick = rawInput.tick;
      if (!Number.isSafeInteger(tick) || (tick as number) < 0) {
        throw new RangeError('A6.8 input.tick必须是非负安全整数。');
      }
      if ((tick as number) < this.#lastTick) throw new RangeError('A6.8输入tick回退。');
      if (tick === this.#lastTick) {
        if (parsed.canonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.8同tick输入携带冲突事实。');
        }
        if (this.#snapshot === null) throw new Error('A6.8同tick幂等快照缺失。');
        return this.#snapshot;
      }

      const detailScreen = parsed.screenId === 'weapon-detail'
        || parsed.screenId === 'map-detail';
      const indexPath = detailScreen ? null : createIndexPath(rawInput);
      const detailPath = detailScreen
        ? createDetailPath(rawInput, parsed.detail!)
        : null;
      const collectionInput = indexPath?.collectionInput
        ?? detailPath!.detailInput.collectionProgressInput;
      const binding = createFormalAssetBinding(
        collectionInput,
        parsed.formalAssetCatalog,
        parsed.availability,
      );
      const selection = detailPath?.detailInput.selection ?? null;
      const previewSlots = currentScreenSlots(
        binding,
        parsed.screenId,
        selection?.targetDefinitionId ?? null,
      );

      const nextContentIdentity = [
        binding.contentIdentity.sourceContentHash,
        binding.contentIdentity.collectionContentHash,
      ].join('|');
      const nextCatalogIdentity = [
        binding.contentIdentity.catalogRevision,
        binding.contentIdentity.catalogContentHash,
        binding.contentIdentity.productionApprovalLedgerId,
        binding.contentIdentity.productionApprovalLedgerContentHash,
      ].join('|');
      const nextFormalAssetLeaseBindingCanonical = canonicalData(
        Object.freeze({
          catalogRevision: binding.contentIdentity.catalogRevision,
          catalogContentHash: binding.contentIdentity.catalogContentHash,
          productionApprovalLedgerId: binding.contentIdentity.productionApprovalLedgerId,
          productionApprovalLedgerContentHash:
            binding.contentIdentity.productionApprovalLedgerContentHash,
          slots: binding.slots,
          budget: binding.budget,
          layouts: binding.layouts,
          reducedMotion: binding.accessibility.reducedMotion,
          governance: binding.governance,
        }),
        'A6.8 formalAssetLeaseBinding contract',
      );
      if (this.#contentIdentity !== null && nextContentIdentity !== this.#contentIdentity) {
        throw new RangeError('A6.8同epoch P5 collection content身份漂移。');
      }
      if (this.#catalogIdentity !== null && nextCatalogIdentity !== this.#catalogIdentity) {
        throw new RangeError('A6.8同epoch formal asset catalog身份漂移。');
      }
      if (
        this.#formalAssetLeaseBindingCanonical !== null
        && nextFormalAssetLeaseBindingCanonical !== this.#formalAssetLeaseBindingCanonical
      ) {
        throw new RangeError('A6.8同epoch formal asset lease binding身份漂移。');
      }

      let nextDefinitionCanonical = this.#definitionCanonical;
      let nextProfileIdentity = this.#profileIdentity;
      let nextProfileRevision = this.#profileRevision;
      let nextProfileCanonical = this.#profileCanonical;
      const profile = collectionInput.profileIdentity;
      if (profile !== null) {
        const rawDefinition = rawInput.profileDefinition;
        const rawProfile = rawInput.profile;
        if (rawDefinition === null || rawProfile === null) {
          throw new Error('A6.8 ready输出缺少Profile原始身份。');
        }
        const definitionCanonical = canonicalData(rawDefinition, 'A6.8 profileDefinition');
        const profileCanonical = canonicalData(rawProfile, 'A6.8 profile');
        const profileIdentity = [
          profile.profileDefinitionId,
          profile.profileDefinitionContentVersion,
          profile.profileId,
        ].join('|');
        if (
          this.#definitionCanonical !== null
          && definitionCanonical !== this.#definitionCanonical
        ) throw new RangeError('A6.8同epoch Profile Definition内容漂移。');
        if (this.#profileIdentity !== null && profileIdentity !== this.#profileIdentity) {
          throw new RangeError('A6.8同epoch Profile身份漂移。');
        }
        if (profile.profileRevision < this.#profileRevision) {
          throw new RangeError('A6.8 Profile revision回退。');
        }
        if (
          profile.profileRevision === this.#profileRevision
          && profileCanonical !== this.#profileCanonical
        ) throw new RangeError('A6.8相同Profile revision携带冲突事实。');
        nextDefinitionCanonical = definitionCanonical;
        nextProfileIdentity = profileIdentity;
        nextProfileRevision = profile.profileRevision;
        nextProfileCanonical = profileCanonical;
      }

      const nextDetailContentHashBySelection = new Map(this.#detailContentHashBySelection);
      if (detailPath !== null) {
        const detailContent = assertPlainRecord(
          detailPath.detailInput.p5DetailContent,
          'A6.8 p5DetailContent',
        );
        const nextDetailContentHash = nonEmptyString(
          detailContent.contentHash,
          'A6.8 p5DetailContent.contentHash',
        );
        nextDetailContentHashBySelection.set(
          `${detailPath.detailInput.selection.kind}|${detailPath.detailInput.selection.targetDefinitionId}`,
          nextDetailContentHash,
        );
        const previous = this.#detailContentHashBySelection.get(
          `${detailPath.detailInput.selection.kind}|${detailPath.detailInput.selection.targetDefinitionId}`,
        );
        if (
          previous !== undefined
          && previous !== nextDetailContentHash
        ) throw new RangeError('A6.8同epoch同selection的P5 detail content身份漂移。');
      }

      const snapshot = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        hardGate: false as const,
        defaultSurfaceWired: false as const,
        validationStatus: 'not-run' as const,
        epochId: collectionInput.epochId,
        tick: collectionInput.tick,
        screenId: parsed.screenId,
        sourceState: collectionInput.sourceState,
        indexPage: indexPath?.indexPage ?? null,
        detailPage: detailPath?.detailPage ?? null,
        previewSlots,
        formalAssetLeaseBinding: binding,
        formalAssetGovernance: Object.freeze({
          contentIdentity: binding.contentIdentity,
          budget: binding.budget,
          layouts: binding.layouts,
          accessibility: binding.accessibility,
          governance: binding.governance,
          loadsResourcesHere: false as const,
          ownsThreeResourcesHere: false as const,
        }),
      });
      this.#lastTick = tick as number;
      this.#lastInputCanonical = parsed.canonical;
      this.#contentIdentity = nextContentIdentity;
      this.#catalogIdentity = nextCatalogIdentity;
      this.#formalAssetLeaseBindingCanonical = nextFormalAssetLeaseBindingCanonical;
      this.#definitionCanonical = nextDefinitionCanonical;
      this.#profileIdentity = nextProfileIdentity;
      this.#profileRevision = nextProfileRevision;
      this.#profileCanonical = nextProfileCanonical;
      this.#detailContentHashBySelection = nextDetailContentHashBySelection;
      this.#snapshot = snapshot;
      return snapshot;
    } catch (error) {
      if (isRecoverableContractRejection(error)) throw error;
      this.#clearCommitted();
      this.#state = ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.FAILED;
      throw error;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2CollectionFourScreenReadSnapshotV1 | null {
    this.#assertActive('A6.8 getSnapshot');
    return this.#snapshot;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.8 resetPresentationEpoch');
    const source = exactRecord(
      cloneFrozenData(value, 'A6.8 epoch reset'),
      RESET_KEYS,
      'A6.8 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.8 epoch reset.epochId');
    if (epochId === this.#epochId) throw new RangeError('A6.8 reset必须使用新epochId。');
    this.#clearCommitted();
    this.#epochId = epochId;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.DESTROYED) return;
    if (this.#busy) throw new Error('A6.8 consume期间不能destroy。');
    this.#clearCommitted();
    this.#state = ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.DESTROYED;
  }
}
