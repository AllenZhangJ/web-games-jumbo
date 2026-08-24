import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2A6FormalPreviewBindingSlotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
  type ArenaV2A6FormalPreviewLeaseAcquireInputV1,
  type ArenaV2A6FormalPreviewLeaseReleaseInputV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_CANDIDATE_V1 =
  Object.freeze({
    stage: 'A6.10' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    loadsResources: false as const,
    createsThree: false as const,
    executesLeaseCommands: false as const,
    sameEpochFormalAssetLeaseBindingImmutable: true as const,
    samePlanLeaseIdCollisionFailClosed: true as const,
    leaseIdentityEncoding: 'structured-screen-asset-activation-sequence' as const,
    leaseIdentityMaximumLength: 200 as const,
    retainsHistoricalLeaseIds: false as const,
    commandOrder: Object.freeze([
      'releaseCommands', 'retainLeases', 'acquireCommands', 'fallbackSlots',
    ] as const),
  });

export const ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_STATE_V1 =
  Object.freeze({ ACTIVE: 'active', FAILED: 'failed', DESTROYED: 'destroyed' } as const);

export type ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerStateV1 =
  typeof ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_STATE_V1[
    keyof typeof ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_STATE_V1
  ];

export type ArenaV2CollectionPreviewViewportV1 = '390x844' | '1440x900';

export interface ArenaV2CollectionPlannedActivePreviewLeaseV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly activationSequence: number;
  readonly visibleSlotLeaseId: string;
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly requestToken: string;
  readonly releaseToken: string;
  readonly state: 'planned-active';
}

export interface ArenaV2CollectionPreviewFallbackSlotV1 {
  readonly schemaVersion: 1;
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly reason: 'map-formal-preview-not-approved' | 'missing-or-unapproved-weapon';
  readonly previewSourceUse: 'text-shape-pattern-fallback-only';
  readonly fallbackContent: 'text-shape-pattern-only';
  readonly requestPermitted: false;
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly defaultSurfaceWired: false;
  readonly executesLeaseCommands: false;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2CollectionPreviewViewportV1;
  readonly catalogContentHash: string;
  readonly releaseCommands: readonly ArenaV2A6FormalPreviewLeaseReleaseInputV1[];
  readonly retainLeases: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly acquireCommands: readonly ArenaV2A6FormalPreviewLeaseAcquireInputV1[];
  readonly fallbackSlots: readonly ArenaV2CollectionPreviewFallbackSlotV1[];
  readonly nextActiveLeaseLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'screenId', 'viewport', 'readSnapshot',
  'visibleDefinitionIds', 'previousActiveLeaseLedger',
]);
const SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'screenId', 'sourceState', 'indexPage', 'detailPage',
  'previewSlots', 'formalAssetLeaseBinding', 'formalAssetGovernance',
]);
const BINDING_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'sourceState', 'contentIdentity', 'budget', 'slots', 'layouts',
  'accessibility', 'governance',
]);
const CONTENT_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'collectionContentHash', 'catalogContentHash', 'catalogRevision',
  'productionApprovalLedgerId', 'productionApprovalLedgerContentHash',
]);
const SLOT_KEYS = new Set([
  'kind', 'definitionId', 'displayName', 'ordinal', 'assetId', 'runtimeSourceKey',
  'role', 'maturity', 'provenance', 'byteLength', 'sha256', 'availability',
  'formalReady', 'assetUsePermitted', 'previewSourceUse', 'previewStrategies',
  'budget', 'lifecycle', 'fallback',
]);
const PREVIEW_SLOT_KEYS = new Set([
  ...[...SLOT_KEYS].filter((key) => key !== 'previewStrategies'), 'previewStrategy',
]);
const LIFECYCLE_KEYS = new Set([
  'lazyRequest', 'requestPermitted', 'requestWhen', 'requestToken', 'releaseWhen',
  'releaseToken', 'loadsBytesHere', 'ownsThreeResourcesHere',
]);
const FALLBACK_KEYS = new Set([
  'active', 'content', 'preservesDefinitionIdentity', 'programmaticGeometryAllowed',
  'claimsFormalApproval',
]);
const GOVERNANCE_SUMMARY_KEYS = new Set([
  'contentIdentity', 'budget', 'layouts', 'accessibility', 'governance',
  'loadsResourcesHere', 'ownsThreeResourcesHere',
]);
const PROFILE_IDENTITY_KEYS = new Set([
  'profileSchemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion',
  'profileId', 'profileRevision',
]);
const LEDGER_KEYS = new Set([
  'schemaVersion', 'epochId', 'catalogContentHash', 'screenId', 'visibleSlotLeaseId',
  'activationSequence', 'kind', 'definitionId', 'assetId', 'ordinal', 'requestToken',
  'releaseToken', 'state',
]);
const RESET_KEYS = new Set(['epochId']);
const SCREEN_IDS = new Set<unknown>([
  'weapon-index', 'map-index', 'weapon-detail', 'map-detail',
]);
const VIEWPORTS = new Set<unknown>(['390x844', '1440x900']);

interface ParsedSlotV1 {
  readonly slot: ArenaV2A6FormalPreviewBindingSlotV1;
  readonly lifecycle: PlainRecord;
  readonly eligible: boolean;
}

interface ParsedPlanInputV1 {
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2CollectionPreviewViewportV1;
  readonly snapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly currentSlots: readonly ParsedSlotV1[];
  readonly allSlots: ReadonlyMap<string, ParsedSlotV1>;
  readonly visibleDefinitionIds: readonly string[];
  readonly previousLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly catalogContentHash: string;
  readonly contentIdentity: string;
  readonly bindingCanonical: string;
  readonly profileIdentity: string | null;
  readonly profileRevision: number | null;
  readonly canonical: string;
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
  return record;
}

function text(value: unknown, name: string, maximum = 2048): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function integer(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是不小于${minimum}的安全整数。`);
  }
  return value as number;
}

function canonical(value: unknown): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError('A6.10数据无法规范序列化。');
  return result;
}

function bindingLeaseWaterline(
  binding: PlainRecord,
  contentIdentity: PlainRecord,
): string {
  const accessibility = assertPlainRecord(
    binding.accessibility,
    'A6.10 binding.accessibility',
  );
  if (typeof accessibility.reducedMotion !== 'boolean') {
    throw new TypeError('A6.10 binding.accessibility.reducedMotion必须是boolean。');
  }
  return canonical({
    catalogRevision: contentIdentity.catalogRevision,
    catalogContentHash: contentIdentity.catalogContentHash,
    productionApprovalLedgerId: contentIdentity.productionApprovalLedgerId,
    productionApprovalLedgerContentHash: contentIdentity.productionApprovalLedgerContentHash,
    slots: binding.slots,
    budget: binding.budget,
    layouts: binding.layouts,
    reducedMotion: accessibility.reducedMotion,
    governance: binding.governance,
  });
}

function validateCompleteBindingWithA6_6(value: unknown): void {
  let loaderCalls = 0;
  let disposerCalls = 0;
  const validator = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: value,
    loader: {
      load() {
        loaderCalls += 1;
        throw new Error('A6.10 binding验证不得调用loader。');
      },
    },
    disposer: {
      dispose() {
        disposerCalls += 1;
        throw new Error('A6.10 binding验证不得调用disposer。');
      },
    },
  });
  try {
    const snapshot = validator.getSnapshot();
    if (
      snapshot.activeLeaseCount !== 0
      || snapshot.loadingResourceCount !== 0
      || snapshot.readyResourceCount !== 0
      || loaderCalls !== 0
      || disposerCalls !== 0
    ) throw new Error('A6.10 A6.6 binding验证意外创建了资源或租约。');
  } finally {
    validator.destroy();
  }
}

function plannedLeaseId(
  screenId: ArenaV2CollectionFourScreenIdV1,
  assetId: string,
  activationSequence: number,
): string {
  const leaseId = `a6.10:${screenId}:${assetId}:${activationSequence}`;
  if (leaseId.length > 200) {
    throw new RangeError('A6.10 visibleSlotLeaseId总长不得超过200。');
  }
  return leaseId;
}

function slotKey(kind: 'weapon' | 'map', definitionId: string): string {
  return `${kind}|${definitionId}`;
}

function parseSlot(value: unknown, index: number): ParsedSlotV1 {
  const slot = exactRecord(value, SLOT_KEYS, `A6.10 binding.slots[${index}]`);
  if (slot.kind !== 'weapon' && slot.kind !== 'map') throw new RangeError('A6.10 slot.kind不受支持。');
  const kind = slot.kind;
  const definitionId = text(slot.definitionId, 'A6.10 slot.definitionId', 300);
  const assetId = text(slot.assetId, 'A6.10 slot.assetId', 300);
  const ordinal = integer(slot.ordinal, 'A6.10 slot.ordinal', 1);
  const lifecycle = exactRecord(slot.lifecycle, LIFECYCLE_KEYS, 'A6.10 slot.lifecycle');
  const fallback = exactRecord(slot.fallback, FALLBACK_KEYS, 'A6.10 slot.fallback');
  const eligible = kind === 'weapon'
    && slot.formalReady === true
    && slot.assetUsePermitted === true
    && lifecycle.requestPermitted === true;
  if (eligible) {
    text(lifecycle.requestToken, 'A6.10 slot.requestToken', 200);
    text(lifecycle.releaseToken, 'A6.10 slot.releaseToken', 200);
    if (fallback.active !== false) throw new RangeError('A6.10可请求武器不得同时使用fallback。');
  } else if (
    lifecycle.requestPermitted !== false
    || lifecycle.requestToken !== null
    || lifecycle.releaseToken !== null
    || fallback.active !== true
    || slot.previewSourceUse !== 'text-shape-pattern-fallback-only'
  ) {
    throw new RangeError('A6.10地图、缺失或未批准武器必须无token fallback。');
  }
  return Object.freeze({
    slot: slot as unknown as ArenaV2A6FormalPreviewBindingSlotV1,
    lifecycle,
    eligible,
    kind,
    definitionId,
    assetId,
    ordinal,
  } as ParsedSlotV1 & Readonly<{
    kind: 'weapon' | 'map'; definitionId: string; assetId: string; ordinal: number;
  }>);
}

function parseLedger(
  value: unknown,
  epochId: string,
  catalogContentHash: string,
): readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] {
  if (!Array.isArray(value)) throw new TypeError('A6.10 previousActiveLeaseLedger必须是数组。');
  const ids = new Set<string>();
  const entries = value.map((candidate, index) => {
    const source = exactRecord(candidate, LEDGER_KEYS, `A6.10 ledger[${index}]`);
    if (
      source.schemaVersion !== 1
      || source.epochId !== epochId
      || source.catalogContentHash !== catalogContentHash
      || !SCREEN_IDS.has(source.screenId)
      || (source.kind !== 'weapon' && source.kind !== 'map')
      || source.state !== 'planned-active'
    ) throw new RangeError(`A6.10 ledger[${index}]治理或身份不闭合。`);
    const kind = source.kind;
    const definitionId = text(source.definitionId, `A6.10 ledger[${index}].definitionId`, 300);
    const assetId = text(source.assetId, `A6.10 ledger[${index}].assetId`, 300);
    const activationSequence = integer(
      source.activationSequence,
      `A6.10 ledger[${index}].activationSequence`,
      1,
    );
    const leaseId = text(source.visibleSlotLeaseId, `A6.10 ledger[${index}].visibleSlotLeaseId`, 200);
    if (
      leaseId !== plannedLeaseId(
        source.screenId as ArenaV2CollectionFourScreenIdV1,
        assetId,
        activationSequence,
      )
      || ids.has(leaseId)
    ) throw new RangeError(`A6.10 ledger[${index}]伪造或重复lease/token/asset身份。`);
    ids.add(leaseId);
    return Object.freeze({
      schemaVersion: 1 as const,
      epochId,
      catalogContentHash,
      screenId: source.screenId as ArenaV2CollectionFourScreenIdV1,
      activationSequence,
      visibleSlotLeaseId: leaseId,
      kind,
      definitionId,
      assetId,
      ordinal: source.ordinal as number,
      requestToken: source.requestToken as string,
      releaseToken: source.releaseToken as string,
      state: 'planned-active' as const,
    });
  });
  return Object.freeze(entries);
}

function assertLedgerMatchesBinding(
  ledger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[],
  allSlots: ReadonlyMap<string, ParsedSlotV1>,
): void {
  ledger.forEach((entry, index) => {
    const slot = allSlots.get(slotKey(entry.kind, entry.definitionId));
    if (
      slot === undefined
      || !slot.eligible
      || slot.slot.assetId !== entry.assetId
      || slot.slot.ordinal !== entry.ordinal
      || slot.lifecycle.requestToken !== entry.requestToken
      || slot.lifecycle.releaseToken !== entry.releaseToken
    ) throw new RangeError(`A6.10 ledger[${index}]伪造lease/token/asset身份。`);
  });
}

function parseInput(value: unknown): ParsedPlanInputV1 {
  const cloned = cloneFrozenData(value, 'A6.10 planner input');
  const source = exactRecord(cloned, INPUT_KEYS, 'A6.10 planner input');
  if (source.schemaVersion !== 1 || !SCREEN_IDS.has(source.screenId) || !VIEWPORTS.has(source.viewport)) {
    throw new RangeError('A6.10 schema/screen/viewport不受支持。');
  }
  const epochId = text(source.epochId, 'A6.10 epochId', 200);
  const tick = integer(source.tick, 'A6.10 tick');
  const screenId = source.screenId as ArenaV2CollectionFourScreenIdV1;
  const snapshot = exactRecord(source.readSnapshot, SNAPSHOT_KEYS, 'A6.10 A6.8 snapshot');
  if (
    snapshot.schemaVersion !== 1
    || snapshot.status !== 'production-unreachable'
    || snapshot.hardGate !== false
    || snapshot.defaultSurfaceWired !== false
    || snapshot.validationStatus !== 'not-run'
    || snapshot.epochId !== epochId
    || snapshot.tick !== tick
    || snapshot.screenId !== screenId
  ) throw new RangeError('A6.10 screen/epoch/tick与A6.8快照不闭合。');
  const detail = screenId.endsWith('-detail');
  if (detail ? snapshot.detailPage === null || snapshot.indexPage !== null
    : snapshot.indexPage === null || snapshot.detailPage !== null) {
    throw new RangeError('A6.10 A6.8 index/detail页形状不闭合。');
  }
  const page = assertPlainRecord(
    detail ? snapshot.detailPage : snapshot.indexPage,
    'A6.10 current page',
  );
  let profileIdentity: string | null = null;
  let profileRevision: number | null = null;
  if (page.profileIdentity !== null) {
    const profile = exactRecord(
      page.profileIdentity,
      PROFILE_IDENTITY_KEYS,
      'A6.10 current page.profileIdentity',
    );
    profileRevision = integer(profile.profileRevision, 'A6.10 profileRevision');
    profileIdentity = canonical({
      profileSchemaVersion: integer(
        profile.profileSchemaVersion,
        'A6.10 profileSchemaVersion',
        1,
      ),
      profileDefinitionId: text(profile.profileDefinitionId, 'A6.10 profileDefinitionId', 300),
      profileDefinitionContentVersion: integer(
        profile.profileDefinitionContentVersion,
        'A6.10 profileDefinitionContentVersion',
        1,
      ),
      profileId: text(profile.profileId, 'A6.10 profileId', 300),
    });
  }
  const binding = exactRecord(snapshot.formalAssetLeaseBinding, BINDING_KEYS, 'A6.10 binding');
  validateCompleteBindingWithA6_6(binding);
  const contentIdentity = exactRecord(binding.contentIdentity, CONTENT_IDENTITY_KEYS, 'A6.10 binding.contentIdentity');
  if (
    binding.schemaVersion !== 1
    || binding.epochId !== epochId
    || binding.tick !== tick
    || binding.sourceState !== snapshot.sourceState
    || !Array.isArray(binding.slots)
    || binding.slots.length !== 22
  ) throw new RangeError('A6.10 A6.4完整binding身份或数量不闭合。');
  const parsedSlots = Object.freeze(binding.slots.map(parseSlot));
  const allSlots = new Map<string, ParsedSlotV1>();
  const assetIds = new Set<string>();
  for (const parsed of parsedSlots) {
    const key = slotKey(parsed.slot.kind, parsed.slot.definitionId);
    if (allSlots.has(key) || assetIds.has(parsed.slot.assetId)) {
      throw new RangeError('A6.10 A6.4 binding包含重复Definition或asset。');
    }
    allSlots.set(key, parsed);
    assetIds.add(parsed.slot.assetId);
  }
  if (
    parsedSlots.filter(({ slot }) => slot.kind === 'weapon').length !== 20
    || parsedSlots.filter(({ slot }) => slot.kind === 'map').length !== 2
  ) throw new RangeError('A6.10 A6.4 binding必须为20武器＋2地图。');
  if (!Array.isArray(snapshot.previewSlots)) throw new TypeError('A6.10 previewSlots必须是数组。');
  const expectedKind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const currentSlots = snapshot.previewSlots.map((candidate, index) => {
    const preview = exactRecord(candidate, PREVIEW_SLOT_KEYS, `A6.10 previewSlots[${index}]`);
    if (preview.kind !== expectedKind) throw new RangeError('A6.10当前页preview kind漂移。');
    const parsed = allSlots.get(slotKey(expectedKind, text(preview.definitionId, 'A6.10 preview definitionId')));
    if (parsed === undefined) throw new RangeError('A6.10 preview不属于完整binding。');
    const strategies = parsed.slot.previewStrategies;
    const expectedStrategy = strategies.find((strategy) => strategy.screenId === screenId);
    const { previewStrategies: _strategies, ...base } = parsed.slot;
    void _strategies;
    if (expectedStrategy === undefined || canonical(preview) !== canonical({ ...base, previewStrategy: expectedStrategy })) {
      throw new RangeError('A6.10 preview与A6.4完整slot投影不闭合。');
    }
    return parsed;
  });
  const expectedCount = screenId === 'weapon-index' ? 20 : screenId === 'map-index' ? 2 : 1;
  if (currentSlots.length !== expectedCount) throw new RangeError('A6.10当前页slot数量不闭合。');
  if (detail && (
    page.screenId !== screenId
    || page.targetDefinitionId !== currentSlots[0]!.slot.definitionId
  )) throw new RangeError('A6.10 detail page与screen/selection slot不闭合。');
  const governance = exactRecord(snapshot.formalAssetGovernance, GOVERNANCE_SUMMARY_KEYS, 'A6.10 governance');
  if (
    governance.loadsResourcesHere !== false
    || governance.ownsThreeResourcesHere !== false
    || canonical(governance.contentIdentity) !== canonical(binding.contentIdentity)
    || canonical(governance.budget) !== canonical(binding.budget)
    || canonical(governance.layouts) !== canonical(binding.layouts)
    || canonical(governance.accessibility) !== canonical(binding.accessibility)
    || canonical(governance.governance) !== canonical(binding.governance)
  ) throw new RangeError('A6.10 A6.8 formal asset治理摘要与完整binding漂移。');
  if (!Array.isArray(source.visibleDefinitionIds)) throw new TypeError('A6.10 visibleDefinitionIds必须是数组。');
  const visibleDefinitionIds = source.visibleDefinitionIds.map((id, index) => (
    text(id, `A6.10 visibleDefinitionIds[${index}]`, 300)
  ));
  const currentById = new Map(currentSlots.map((slot) => [slot.slot.definitionId, slot]));
  let previousOrdinal = -1;
  const seenVisible = new Set<string>();
  for (const id of visibleDefinitionIds) {
    const slot = currentById.get(id);
    if (slot === undefined || seenVisible.has(id) || slot.slot.ordinal <= previousOrdinal) {
      throw new RangeError('A6.10 visibleDefinitionIds必须是当前页按ordinal排列的唯一子集。');
    }
    seenVisible.add(id);
    previousOrdinal = slot.slot.ordinal;
  }
  if (detail && (visibleDefinitionIds.length !== 1
    || visibleDefinitionIds[0] !== currentSlots[0]!.slot.definitionId)) {
    throw new RangeError('A6.10 detail页可见集必须精确等于唯一selection slot。');
  }
  const catalogContentHash = text(contentIdentity.catalogContentHash, 'A6.10 catalogContentHash', 64);
  const previousLedger = parseLedger(source.previousActiveLeaseLedger, epochId, catalogContentHash);
  return Object.freeze({
    epochId,
    tick,
    screenId,
    viewport: source.viewport as ArenaV2CollectionPreviewViewportV1,
    snapshot: snapshot as unknown as ArenaV2CollectionFourScreenReadSnapshotV1,
    currentSlots: Object.freeze(currentSlots),
    allSlots,
    visibleDefinitionIds: Object.freeze(visibleDefinitionIds),
    previousLedger,
    catalogContentHash,
    contentIdentity: canonical({
      sourceContentHash: contentIdentity.sourceContentHash,
      collectionContentHash: contentIdentity.collectionContentHash,
      catalogRevision: contentIdentity.catalogRevision,
      catalogContentHash,
      productionApprovalLedgerId: contentIdentity.productionApprovalLedgerId,
      productionApprovalLedgerContentHash: contentIdentity.productionApprovalLedgerContentHash,
    }),
    bindingCanonical: bindingLeaseWaterline(binding, contentIdentity),
    profileIdentity,
    profileRevision,
    canonical: canonical(cloned),
  });
}

function isRecoverable(error: unknown): boolean {
  return error instanceof TypeError || error instanceof RangeError;
}

function freezeLease(entry: ArenaV2CollectionPlannedActivePreviewLeaseV1): ArenaV2CollectionPlannedActivePreviewLeaseV1 {
  return Object.freeze({ ...entry });
}

export class ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1 {
  #state: ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerStateV1 = 'active';
  #epochId: string;
  #busy = false;
  #lastTick = -1;
  #lastCanonical: string | null = null;
  #contentIdentity: string | null = null;
  #bindingCanonical: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #activationSequences = new Map<string, number>();
  #ledger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] = Object.freeze([]);
  #plan: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(cloneFrozenData(value, 'A6.10 constructor'), RESET_KEYS, 'A6.10 constructor');
    this.#epochId = text(source.epochId, 'A6.10 constructor.epochId', 200);
  }

  get state(): ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerStateV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== 'active') throw new Error(`${operation}拒绝状态${this.#state}。`);
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #clear(): void {
    this.#lastTick = -1;
    this.#lastCanonical = null;
    this.#contentIdentity = null;
    this.#bindingCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#activationSequences.clear();
    this.#ledger = Object.freeze([]);
    this.#plan = null;
  }

  plan(value: unknown): ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1 {
    this.#assertActive('A6.10 plan');
    this.#busy = true;
    try {
      const parsed = parseInput(value);
      if (parsed.epochId !== this.#epochId) throw new RangeError('A6.10 epochId漂移。');
      if (parsed.tick < this.#lastTick) throw new RangeError('A6.10 tick回退。');
      if (parsed.tick === this.#lastTick) {
        if (parsed.canonical !== this.#lastCanonical) throw new RangeError('A6.10同tick输入冲突。');
        if (this.#plan === null) throw new Error('A6.10同tick计划丢失。');
        return this.#plan;
      }
      if (this.#bindingCanonical !== null && parsed.bindingCanonical !== this.#bindingCanonical) {
        throw new RangeError('A6.10同epoch formalAssetLeaseBinding完整身份漂移，必须reset新presentation epoch。');
      }
      assertLedgerMatchesBinding(parsed.previousLedger, parsed.allSlots);
      if (canonical(parsed.previousLedger) !== canonical(this.#ledger)) {
        throw new RangeError('A6.10调用方未提交本Owner上轮完整active ledger。');
      }
      if (this.#contentIdentity !== null && parsed.contentIdentity !== this.#contentIdentity) {
        throw new RangeError('A6.10同epoch Profile/content/catalog身份漂移。');
      }
      if (parsed.profileIdentity !== null) {
        if (this.#profileIdentity !== null && parsed.profileIdentity !== this.#profileIdentity) {
          throw new RangeError('A6.10同epoch Profile身份漂移。');
        }
        if (parsed.profileRevision! < this.#profileRevision) {
          throw new RangeError('A6.10 Profile revision回退。');
        }
      }
      const visible = parsed.currentSlots
        .filter(({ slot }) => parsed.visibleDefinitionIds.includes(slot.definitionId))
        .sort((left, right) => left.slot.ordinal - right.slot.ordinal);
      const previousByLeaseId = new Map(parsed.previousLedger.map((entry) => [entry.visibleSlotLeaseId, entry]));
      const retainLeases: ArenaV2CollectionPlannedActivePreviewLeaseV1[] = [];
      const acquireCommands: ArenaV2A6FormalPreviewLeaseAcquireInputV1[] = [];
      const fallbackSlots: ArenaV2CollectionPreviewFallbackSlotV1[] = [];
      const nextLedger: ArenaV2CollectionPlannedActivePreviewLeaseV1[] = [];
      const nextActivationSequences = new Map(this.#activationSequences);
      const nextLeaseIds = new Set<string>();
      for (const parsedSlot of visible) {
        const slot = parsedSlot.slot;
        if (!parsedSlot.eligible) {
          fallbackSlots.push(Object.freeze({
            schemaVersion: 1 as const,
            kind: slot.kind,
            definitionId: slot.definitionId,
            assetId: slot.assetId,
            ordinal: slot.ordinal,
            reason: slot.kind === 'map'
              ? 'map-formal-preview-not-approved' as const
              : 'missing-or-unapproved-weapon' as const,
            previewSourceUse: 'text-shape-pattern-fallback-only' as const,
            fallbackContent: 'text-shape-pattern-only' as const,
            requestPermitted: false as const,
          }));
          continue;
        }
        const activationKey = canonical([parsed.screenId, slot.definitionId, slot.assetId]);
        const retained = parsed.previousLedger.find((entry) => (
          entry.screenId === parsed.screenId
          && entry.definitionId === slot.definitionId
          && entry.assetId === slot.assetId
        ));
        if (retained !== undefined) {
          if (nextLeaseIds.has(retained.visibleSlotLeaseId)) {
            throw new Error('A6.10同计划retain leaseId发生身份碰撞。');
          }
          nextLeaseIds.add(retained.visibleSlotLeaseId);
          const copy = freezeLease(retained);
          retainLeases.push(copy);
          nextLedger.push(copy);
          continue;
        }
        const previousActivationSequence = nextActivationSequences.get(activationKey) ?? 0;
        if (previousActivationSequence >= Number.MAX_SAFE_INTEGER) {
          throw new RangeError('A6.10 activationSequence已耗尽安全整数空间。');
        }
        const activationSequence = previousActivationSequence + 1;
        nextActivationSequences.set(activationKey, activationSequence);
        const leaseId = plannedLeaseId(
          parsed.screenId,
          slot.assetId,
          activationSequence,
        );
        if (
          previousByLeaseId.has(leaseId)
          || nextLeaseIds.has(leaseId)
        ) {
          throw new Error('A6.10同计划acquire leaseId发生身份碰撞。');
        }
        nextLeaseIds.add(leaseId);
        const ledgerEntry = freezeLease({
          schemaVersion: 1,
          epochId: parsed.epochId,
          catalogContentHash: parsed.catalogContentHash,
          screenId: parsed.screenId,
          activationSequence,
          visibleSlotLeaseId: leaseId,
          kind: slot.kind,
          definitionId: slot.definitionId,
          assetId: slot.assetId,
          ordinal: slot.ordinal,
          requestToken: parsedSlot.lifecycle.requestToken as string,
          releaseToken: parsedSlot.lifecycle.releaseToken as string,
          state: 'planned-active',
        });
        acquireCommands.push(Object.freeze({
          schemaVersion: 1 as const,
          tick: parsed.tick,
          visibleSlotLeaseId: leaseId,
          assetId: slot.assetId,
          requestToken: ledgerEntry.requestToken,
        }));
        nextLedger.push(ledgerEntry);
      }
      const retainedIds = new Set(retainLeases.map(({ visibleSlotLeaseId }) => visibleSlotLeaseId));
      const releaseCommands = parsed.previousLedger
        .filter(({ visibleSlotLeaseId }) => !retainedIds.has(visibleSlotLeaseId))
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((entry) => Object.freeze({
          schemaVersion: 1 as const,
          tick: parsed.tick,
          visibleSlotLeaseId: entry.visibleSlotLeaseId,
          releaseToken: entry.releaseToken,
        }));
      const plan = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        validationStatus: 'not-run' as const,
        defaultSurfaceWired: false as const,
        executesLeaseCommands: false as const,
        epochId: parsed.epochId,
        tick: parsed.tick,
        screenId: parsed.screenId,
        viewport: parsed.viewport,
        catalogContentHash: parsed.catalogContentHash,
        releaseCommands: Object.freeze(releaseCommands),
        retainLeases: Object.freeze(retainLeases),
        acquireCommands: Object.freeze(acquireCommands),
        fallbackSlots: Object.freeze(fallbackSlots),
        nextActiveLeaseLedger: Object.freeze(nextLedger),
      });
      this.#lastTick = parsed.tick;
      this.#lastCanonical = parsed.canonical;
      this.#contentIdentity = parsed.contentIdentity;
      this.#bindingCanonical = parsed.bindingCanonical;
      if (parsed.profileIdentity !== null) {
        this.#profileIdentity = parsed.profileIdentity;
        this.#profileRevision = parsed.profileRevision!;
      }
      this.#activationSequences = nextActivationSequences;
      this.#ledger = plan.nextActiveLeaseLedger;
      this.#plan = plan;
      return plan;
    } catch (error) {
      if (isRecoverable(error)) throw error;
      this.#clear();
      this.#state = 'failed';
      throw error;
    } finally {
      this.#busy = false;
    }
  }

  getPlan(): ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1 | null {
    this.#assertActive('A6.10 getPlan');
    return this.#plan;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.10 resetPresentationEpoch');
    const source = exactRecord(cloneFrozenData(value, 'A6.10 reset'), RESET_KEYS, 'A6.10 reset');
    const epochId = text(source.epochId, 'A6.10 reset.epochId', 200);
    if (epochId === this.#epochId) throw new RangeError('A6.10 reset必须使用新epochId。');
    this.#clear();
    this.#epochId = epochId;
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#busy) throw new Error('A6.10 plan期间不能destroy。');
    this.#clear();
    this.#state = 'destroyed';
  }
}
