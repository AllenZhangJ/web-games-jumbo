import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotMethod,
  type UnknownMethod,
} from '@number-strategy-jump/arena-presentation-runtime/capability-utils';
import type {
  ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
  type ArenaV2A6FormalPreviewDisposerPortV1,
  type ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1,
  type ArenaV2A6FormalPreviewLeaseResultV1,
  type ArenaV2A6FormalPreviewLoaderPortV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import type {
  ArenaV2CollectionPlannedActivePreviewLeaseV1,
  ArenaV2CollectionPreviewFallbackSlotV1,
  ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1,
} from './arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_EXECUTION_OWNER_CANDIDATE_V1 =
  Object.freeze({
    stage: 'A6.11b' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    productionReachable: false as const,
    defaultSurfaceWired: false as const,
    createsThree: false as const,
    createsDom: false as const,
    loaderAndDisposerInjected: true as const,
    beforeReleaseBarrier: 'side-effect-free-destroyed-proof-reader' as const,
    commandOrder: Object.freeze([
      'preflight-all-release-proofs',
      'release',
      'retain',
      'acquire',
      'fallback',
    ] as const),
    maximumActiveRecords: 22 as const,
    retainsExecutionHistoryCount: 1 as const,
    currentProductionApprovedPreviewAssetCount: 0 as const,
    currentAcquirePermittedAssetCount: 0 as const,
    currentResourcePathRequiresZeroCalls: true as const,
    futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedCallbackReentryRejectedBeforeSuccessCommit: true as const,
    commandOwnerPublishedBeforeExecutionMicrotask: true as const,
    commandAndLeaseSettlementCommitUnderOperationGuard: true as const,
    failedOwnerCannotBeRevivedByLateCommand: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    proofAndLeaseCallbacksCheckedBeforeLedgerCommit: true as const,
    acquiredLeasePromiseObservedBeforeRecordPublication: true as const,
    destroyReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryDestroyFailureRetainsCurrentAndLaterOwners: true as const,
    terminalLeaseDestroyWaitsForEveryReleaseProof: true as const,
    terminalCleanupCallbacksMustCompleteSynchronously: true as const,
  });

export type ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1 =
  | 'active'
  | 'executing'
  | 'failed'
  | 'destroy-incomplete'
  | 'destroyed';

function isExecutionOwnerState(
  value: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
  expected: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
): boolean {
  return value === expected;
}

export interface ArenaV2A6BeforeReleaseDestroyedProofReadInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly assetId: string;
}

export interface ArenaV2A6BeforeReleaseDestroyedProofV1 {
  readonly schemaVersion: 1;
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly destroyed: true;
}

export interface ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1 {
  readDestroyedProof(
    input: ArenaV2A6BeforeReleaseDestroyedProofReadInputV1,
  ): ArenaV2A6BeforeReleaseDestroyedProofV1;
}

export interface ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly screenId: ArenaV2CollectionPlannedActivePreviewLeaseV1['screenId'];
  readonly activationSequence: number;
  readonly visibleSlotLeaseId: string;
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly requestToken: string;
  readonly releaseToken: string;
  readonly requestIdentity: string;
  readonly leaseResultPromise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>;
  readonly settlementState: 'pending' | 'ready' | 'fallback';
  readonly settledResult: ArenaV2A6FormalPreviewLeaseResultV1 | null;
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly productionReachable: false;
  readonly defaultSurfaceWired: false;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1['screenId'];
  readonly planIdentity: string;
  readonly releaseBarrierProofs: readonly ArenaV2A6BeforeReleaseDestroyedProofV1[];
  readonly activeRecords: readonly ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1[];
  readonly fallbackSlots: readonly ArenaV2CollectionPreviewFallbackSlotV1[];
  readonly assetReadyCount: number;
  readonly leaseFallbackCount: number;
  readonly staticFallbackCount: number;
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly productionReachable: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly lastTick: number;
  readonly lastPlanIdentity: string | null;
  readonly activeRecords: readonly ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1[];
  readonly activeLeaseCount: number;
  readonly assetReadyCount: number;
  readonly leaseFallbackCount: number;
  readonly lateSettlementDiagnosticCount: number;
  readonly pendingDestroyBarrierCount: number;
  readonly destroyIncomplete: boolean;
  readonly a6_6State: ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1['state'];
  readonly a6_6CleanupFailureCount: number;
}

export interface ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1 {
  readonly schemaVersion: 1;
  readonly phase: 'before-release-proof' | 'a6.6-destroy';
  readonly visibleSlotLeaseId: string | null;
  readonly requestIdentity: string | null;
  readonly code: 'proof-reader-rejected' | 'lease-owner-destroy-rejected' | 'lease-owner-destroy-incomplete';
}

export interface ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: 'destroyed' | 'destroy-incomplete';
  readonly barrierProofs: readonly ArenaV2A6BeforeReleaseDestroyedProofV1[];
  readonly failures: readonly ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1[];
  readonly pendingBarrierLeaseCount: number;
  readonly a6_6State: ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1['state'];
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerOptionsV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly loader: ArenaV2A6FormalPreviewLoaderPortV1;
  readonly disposer: ArenaV2A6FormalPreviewDisposerPortV1;
  readonly beforeReleaseBarrier: ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1;
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandExecuteInputV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly epochId: string;
  readonly tick: number;
  readonly planIdentity: string;
  readonly plan: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1;
  readonly previousActiveLeaseLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
}

export interface ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResetInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly nextBindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
}

interface BindingSlotIdentityV1 {
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly sha256: string;
  readonly requestPermitted: boolean;
  readonly requestToken: string | null;
  readonly releaseToken: string | null;
}

interface ParsedBindingV1 {
  readonly snapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly epochId: string;
  readonly tick: number;
  readonly catalogContentHash: string;
  readonly leaseWaterlineCanonical: string;
  readonly slotsByAssetId: ReadonlyMap<string, BindingSlotIdentityV1>;
}

interface ParsedPlanV1 {
  readonly plan: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1;
  readonly planCanonical: string;
  readonly planIdentity: string;
  readonly previousLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly nextLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
}

interface ParsedExecuteInputV1 extends ParsedPlanV1 {
  readonly inputCanonical: string;
  readonly binding: ParsedBindingV1;
}

interface InternalActiveRecordV1 {
  readonly ledger: ArenaV2CollectionPlannedActivePreviewLeaseV1;
  readonly requestIdentity: string;
  readonly leaseResultPromise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>;
  settlementState: 'pending' | 'ready' | 'fallback';
  settledResult: ArenaV2A6FormalPreviewLeaseResultV1 | null;
}

const CONSTRUCTOR_KEYS = new Set([
  'schemaVersion', 'bindingSnapshot', 'loader', 'disposer', 'beforeReleaseBarrier',
]);
const EXECUTE_KEYS = new Set([
  'schemaVersion', 'bindingSnapshot', 'epochId', 'tick', 'planIdentity', 'plan',
  'previousActiveLeaseLedger',
]);
const RESET_KEYS = new Set(['schemaVersion', 'tick', 'nextBindingSnapshot']);
const BINDING_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'sourceState', 'contentIdentity', 'budget', 'slots', 'layouts',
  'accessibility', 'governance',
]);
const CONTENT_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'collectionContentHash', 'catalogContentHash', 'catalogRevision',
  'productionApprovalLedgerId', 'productionApprovalLedgerContentHash',
]);
const PLAN_KEYS = new Set([
  'schemaVersion', 'status', 'validationStatus', 'defaultSurfaceWired',
  'executesLeaseCommands', 'epochId', 'tick', 'screenId', 'viewport',
  'catalogContentHash', 'releaseCommands', 'retainLeases', 'acquireCommands',
  'fallbackSlots', 'nextActiveLeaseLedger',
]);
const LEDGER_KEYS = new Set([
  'schemaVersion', 'epochId', 'catalogContentHash', 'screenId', 'activationSequence',
  'visibleSlotLeaseId', 'kind', 'definitionId', 'assetId', 'ordinal', 'requestToken',
  'releaseToken', 'state',
]);
const RELEASE_KEYS = new Set(['schemaVersion', 'tick', 'visibleSlotLeaseId', 'releaseToken']);
const ACQUIRE_KEYS = new Set([
  'schemaVersion', 'tick', 'visibleSlotLeaseId', 'assetId', 'requestToken',
]);
const FALLBACK_KEYS = new Set([
  'schemaVersion', 'kind', 'definitionId', 'assetId', 'ordinal', 'reason',
  'previewSourceUse', 'fallbackContent', 'requestPermitted',
]);
const PROOF_KEYS = new Set([
  'schemaVersion', 'visibleSlotLeaseId', 'requestIdentity', 'destroyed',
]);
const SCREEN_IDS = new Set<unknown>([
  'weapon-index', 'map-index', 'weapon-detail', 'map-detail',
]);
const VIEWPORTS = new Set<unknown>(['390x844', '1440x900']);
const PLAN_IDENTITY_LABEL = 'Arena V2 A6.11b Visible Preview Lease Command Plan V1';
const A6_6_REQUEST_IDENTITY_LABEL = 'Arena V2 A6.6 Formal Preview Request Identity V1';
const NATIVE_PROMISE_THEN = Promise.prototype.then;
const EXECUTION_MICROTASK_TRIGGER = Promise.resolve(undefined);
const MAX_LATE_SETTLEMENT_DIAGNOSTICS = 22;

function createDeferredPromiseOwner<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
  return record;
}

function captureExternalOptions(value: unknown): PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('A6.11b constructor必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('A6.11b constructor必须是普通对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== CONSTRUCTOR_KEYS.size
    || keys.some((key) => typeof key !== 'string' || !CONSTRUCTOR_KEYS.has(key))) {
    throw new RangeError('A6.11b constructor字段必须exact-key闭合。');
  }
  const captured: PlainRecord = Object.create(null) as PlainRecord;
  for (const key of CONSTRUCTOR_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`A6.11b constructor.${key}必须是可枚举数据字段。`);
    }
    captured[key] = descriptor.value;
  }
  return captured;
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

function sha256(value: unknown, name: string): string {
  const result = text(value, name, 64);
  if (!/^[0-9a-f]{64}$/u.test(result)) throw new RangeError(`${name}必须是64位小写SHA-256。`);
  return result;
}

function canonical(value: unknown): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError('A6.11b数据无法规范序列化。');
  return result;
}

function sortedOrdinals(entries: readonly Readonly<{ ordinal: number }>[]): boolean {
  return entries.every((entry, index) => index === 0 || entries[index - 1]!.ordinal < entry.ordinal);
}

function leaseId(screenId: string, assetId: string, activationSequence: number): string {
  const result = `a6.10:${screenId}:${assetId}:${activationSequence}`;
  if (result.length > 200) throw new RangeError('A6.11b visibleSlotLeaseId超过200字符。');
  return result;
}

function stableBindingCanonical(binding: PlainRecord): string {
  const accessibility = assertPlainRecord(binding.accessibility, 'A6.11b binding.accessibility');
  const stableAccessibility: PlainRecord = Object.create(null) as PlainRecord;
  for (const key of Object.keys(accessibility)) {
    if (key !== 'muted') stableAccessibility[key] = accessibility[key];
  }
  const stable: PlainRecord = Object.create(null) as PlainRecord;
  for (const key of BINDING_KEYS) {
    if (key !== 'tick' && key !== 'sourceState' && key !== 'accessibility') {
      stable[key] = binding[key];
    }
  }
  stable.accessibility = stableAccessibility;
  return canonical(stable);
}

function parseBinding(value: unknown, name: string): ParsedBindingV1 {
  const cloned = cloneFrozenData(value, name);
  const source = exactRecord(cloned, BINDING_KEYS, name);
  if (
    source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.validationStatus !== 'not-run'
  ) throw new RangeError(`${name}治理字段不闭合。`);
  const epochId = text(source.epochId, `${name}.epochId`, 200);
  const tick = integer(source.tick, `${name}.tick`);
  const content = exactRecord(source.contentIdentity, CONTENT_IDENTITY_KEYS, `${name}.contentIdentity`);
  const catalogContentHash = text(content.catalogContentHash, `${name}.catalogContentHash`, 64);
  if (!Array.isArray(source.slots) || source.slots.length !== 22) {
    throw new RangeError(`${name}.slots必须精确包含22槽。`);
  }
  const slotsByAssetId = new Map<string, BindingSlotIdentityV1>();
  for (let index = 0; index < source.slots.length; index += 1) {
    const slot = assertPlainRecord(source.slots[index], `${name}.slots[${index}]`);
    const lifecycle = assertPlainRecord(slot.lifecycle, `${name}.slots[${index}].lifecycle`);
    const kind = slot.kind;
    if (kind !== 'weapon' && kind !== 'map') throw new RangeError(`${name}.slots[${index}].kind无效。`);
    const assetId = text(slot.assetId, `${name}.slots[${index}].assetId`, 300);
    if (slotsByAssetId.has(assetId)) throw new RangeError(`${name}包含重复assetId。`);
    const identity = Object.freeze({
      kind,
      definitionId: text(slot.definitionId, `${name}.slots[${index}].definitionId`, 300),
      assetId,
      ordinal: integer(slot.ordinal, `${name}.slots[${index}].ordinal`, 1),
      sha256: sha256(slot.sha256, `${name}.slots[${index}].sha256`),
      requestPermitted: lifecycle.requestPermitted === true,
      requestToken: lifecycle.requestToken === null
        ? null
        : text(lifecycle.requestToken, `${name}.slots[${index}].requestToken`, 200),
      releaseToken: lifecycle.releaseToken === null
        ? null
        : text(lifecycle.releaseToken, `${name}.slots[${index}].releaseToken`, 200),
    });
    slotsByAssetId.set(assetId, identity);
  }
  return Object.freeze({
    snapshot: cloned as ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
    epochId,
    tick,
    catalogContentHash,
    leaseWaterlineCanonical: stableBindingCanonical(source),
    slotsByAssetId,
  });
}

function parseLedger(
  value: unknown,
  binding: ParsedBindingV1,
  name: string,
): readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] {
  if (!Array.isArray(value) || value.length > 22) throw new RangeError(`${name}必须是最多22项的数组。`);
  const ids = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const source = exactRecord(candidate, LEDGER_KEYS, `${name}[${index}]`);
    const screenId = source.screenId;
    const kind = source.kind;
    if (!SCREEN_IDS.has(screenId) || (kind !== 'weapon' && kind !== 'map')) {
      throw new RangeError(`${name}[${index}] screen/kind无效。`);
    }
    const activationSequence = integer(
      source.activationSequence,
      `${name}[${index}].activationSequence`,
      1,
    );
    const definitionId = text(source.definitionId, `${name}[${index}].definitionId`, 300);
    const assetId = text(source.assetId, `${name}[${index}].assetId`, 300);
    const visibleSlotLeaseId = text(
      source.visibleSlotLeaseId,
      `${name}[${index}].visibleSlotLeaseId`,
      200,
    );
    const slot = binding.slotsByAssetId.get(assetId);
    if (
      source.schemaVersion !== 1
      || source.epochId !== binding.epochId
      || source.catalogContentHash !== binding.catalogContentHash
      || source.state !== 'planned-active'
      || visibleSlotLeaseId !== leaseId(String(screenId), assetId, activationSequence)
      || slot === undefined
      || slot.kind !== kind
      || slot.definitionId !== definitionId
      || slot.ordinal !== source.ordinal
      || !slot.requestPermitted
      || slot.requestToken === null
      || slot.releaseToken === null
      || source.requestToken !== slot.requestToken
      || source.releaseToken !== slot.releaseToken
      || ids.has(visibleSlotLeaseId)
    ) throw new RangeError(`${name}[${index}] lease/token/asset身份不闭合。`);
    ids.add(visibleSlotLeaseId);
    return Object.freeze({
      schemaVersion: 1 as const,
      epochId: binding.epochId,
      catalogContentHash: binding.catalogContentHash,
      screenId: screenId as ArenaV2CollectionPlannedActivePreviewLeaseV1['screenId'],
      activationSequence,
      visibleSlotLeaseId,
      kind,
      definitionId,
      assetId,
      ordinal: slot.ordinal,
      requestToken: slot.requestToken,
      releaseToken: slot.releaseToken,
      state: 'planned-active' as const,
    });
  }));
}

function parseFallbacks(
  value: unknown,
  binding: ParsedBindingV1,
  expectedKind: 'weapon' | 'map',
): readonly ArenaV2CollectionPreviewFallbackSlotV1[] {
  if (!Array.isArray(value) || value.length > 22) throw new RangeError('A6.11b fallbackSlots无效。');
  const ids = new Set<string>();
  const result = value.map((candidate, index) => {
    const source = exactRecord(candidate, FALLBACK_KEYS, `A6.11b fallbackSlots[${index}]`);
    const definitionId = text(source.definitionId, `A6.11b fallbackSlots[${index}].definitionId`, 300);
    const assetId = text(source.assetId, `A6.11b fallbackSlots[${index}].assetId`, 300);
    const slot = binding.slotsByAssetId.get(assetId);
    const expectedReason = expectedKind === 'map'
      ? 'map-formal-preview-not-approved'
      : 'missing-or-unapproved-weapon';
    if (
      source.schemaVersion !== 1
      || source.kind !== expectedKind
      || slot === undefined
      || slot.kind !== expectedKind
      || slot.definitionId !== definitionId
      || slot.ordinal !== source.ordinal
      || slot.requestPermitted
      || source.reason !== expectedReason
      || source.previewSourceUse !== 'text-shape-pattern-fallback-only'
      || source.fallbackContent !== 'text-shape-pattern-only'
      || source.requestPermitted !== false
      || ids.has(definitionId)
    ) throw new RangeError(`A6.11b fallbackSlots[${index}]与binding不闭合。`);
    ids.add(definitionId);
    return Object.freeze({
      schemaVersion: 1 as const,
      kind: expectedKind,
      definitionId,
      assetId,
      ordinal: slot.ordinal,
      reason: expectedReason,
      previewSourceUse: 'text-shape-pattern-fallback-only' as const,
      fallbackContent: 'text-shape-pattern-only' as const,
      requestPermitted: false as const,
    });
  });
  if (!sortedOrdinals(result)) throw new RangeError('A6.11b fallbackSlots顺序漂移。');
  return Object.freeze(result);
}

export function createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1(
  value: unknown,
): string {
  return createDeterministicDataHash(
    cloneFrozenData(value, 'A6.11b plan identity'),
    PLAN_IDENTITY_LABEL,
  );
}

function parsePlan(
  value: unknown,
  previousValue: unknown,
  binding: ParsedBindingV1,
  expectedPlanIdentity: unknown,
): ParsedPlanV1 {
  const cloned = cloneFrozenData(value, 'A6.11b plan');
  const source = exactRecord(cloned, PLAN_KEYS, 'A6.11b plan');
  if (
    source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.validationStatus !== 'not-run'
    || source.defaultSurfaceWired !== false
    || source.executesLeaseCommands !== false
    || source.epochId !== binding.epochId
    || source.catalogContentHash !== binding.catalogContentHash
    || !SCREEN_IDS.has(source.screenId)
    || !VIEWPORTS.has(source.viewport)
  ) throw new RangeError('A6.11b plan治理或binding身份不闭合。');
  const tick = integer(source.tick, 'A6.11b plan.tick');
  if (tick !== binding.tick) throw new RangeError('A6.11b plan.tick与完整binding不闭合。');
  const previousLedger = parseLedger(previousValue, binding, 'A6.11b previous ledger');
  const nextLedger = parseLedger(source.nextActiveLeaseLedger, binding, 'A6.11b next ledger');
  if (nextLedger.some((entry) => entry.screenId !== source.screenId) || !sortedOrdinals(nextLedger)) {
    throw new RangeError('A6.11b next ledger screen或ordinal顺序漂移。');
  }
  const previousById = new Map(previousLedger.map((entry) => [entry.visibleSlotLeaseId, entry]));
  const nextById = new Map(nextLedger.map((entry) => [entry.visibleSlotLeaseId, entry]));
  const expectedRetained = nextLedger.filter((entry) => previousById.has(entry.visibleSlotLeaseId));
  for (const retained of expectedRetained) {
    if (canonical(previousById.get(retained.visibleSlotLeaseId)) !== canonical(retained)) {
      throw new RangeError('A6.11b retain ledger身份发生改写。');
    }
  }
  const retainLeases = parseLedger(source.retainLeases, binding, 'A6.11b retain leases');
  if (canonical(retainLeases) !== canonical(expectedRetained)) {
    throw new RangeError('A6.11b retain leases没有精确覆盖前后ledger交集。');
  }
  const expectedReleased = previousLedger
    .filter((entry) => !nextById.has(entry.visibleSlotLeaseId))
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((entry) => Object.freeze({
      schemaVersion: 1 as const,
      tick,
      visibleSlotLeaseId: entry.visibleSlotLeaseId,
      releaseToken: entry.releaseToken,
    }));
  if (!Array.isArray(source.releaseCommands)) throw new TypeError('A6.11b releaseCommands必须是数组。');
  const releaseCommands = source.releaseCommands.map((candidate, index) => {
    const command = exactRecord(candidate, RELEASE_KEYS, `A6.11b releaseCommands[${index}]`);
    return Object.freeze({
      schemaVersion: command.schemaVersion,
      tick: command.tick,
      visibleSlotLeaseId: command.visibleSlotLeaseId,
      releaseToken: command.releaseToken,
    });
  });
  if (canonical(releaseCommands) !== canonical(expectedReleased)) {
    throw new RangeError('A6.11b releaseCommands未按ordinal精确覆盖离开租约。');
  }
  const expectedAcquired = nextLedger
    .filter((entry) => !previousById.has(entry.visibleSlotLeaseId))
    .map((entry) => Object.freeze({
      schemaVersion: 1 as const,
      tick,
      visibleSlotLeaseId: entry.visibleSlotLeaseId,
      assetId: entry.assetId,
      requestToken: entry.requestToken,
    }));
  if (!Array.isArray(source.acquireCommands)) throw new TypeError('A6.11b acquireCommands必须是数组。');
  const acquireCommands = source.acquireCommands.map((candidate, index) => {
    const command = exactRecord(candidate, ACQUIRE_KEYS, `A6.11b acquireCommands[${index}]`);
    return Object.freeze({
      schemaVersion: command.schemaVersion,
      tick: command.tick,
      visibleSlotLeaseId: command.visibleSlotLeaseId,
      assetId: command.assetId,
      requestToken: command.requestToken,
    });
  });
  if (canonical(acquireCommands) !== canonical(expectedAcquired)) {
    throw new RangeError('A6.11b acquireCommands未按plan原顺序覆盖新租约。');
  }
  const expectedKind = String(source.screenId).startsWith('weapon') ? 'weapon' : 'map';
  const fallbackSlots = parseFallbacks(source.fallbackSlots, binding, expectedKind);
  const visibleDefinitionIds = new Set<string>();
  for (const entry of [...nextLedger, ...fallbackSlots]) {
    if (visibleDefinitionIds.has(entry.definitionId)) throw new RangeError('A6.11b当前页Definition重复。');
    visibleDefinitionIds.add(entry.definitionId);
  }
  const detail = String(source.screenId).endsWith('-detail');
  const maximum = expectedKind === 'weapon' ? 20 : 2;
  if ((detail && visibleDefinitionIds.size !== 1) || (!detail && visibleDefinitionIds.size > maximum)) {
    throw new RangeError('A6.11b plan可见槽数量不闭合。');
  }
  const planIdentity = createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1(cloned);
  if (expectedPlanIdentity !== planIdentity) throw new RangeError('A6.11b planIdentity重算不匹配。');
  return Object.freeze({
    plan: cloned as ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1,
    planCanonical: canonical(cloned),
    planIdentity,
    previousLedger,
    nextLedger,
  });
}

function projectRecordLedger(
  records: ReadonlyMap<string, InternalActiveRecordV1>,
): readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] {
  return Object.freeze([...records.values()].map(({ ledger }) => Object.freeze({
    schemaVersion: 1 as const,
    epochId: ledger.epochId,
    catalogContentHash: ledger.catalogContentHash,
    screenId: ledger.screenId,
    activationSequence: ledger.activationSequence,
    visibleSlotLeaseId: ledger.visibleSlotLeaseId,
    kind: ledger.kind,
    definitionId: ledger.definitionId,
    assetId: ledger.assetId,
    ordinal: ledger.ordinal,
    requestToken: ledger.requestToken,
    releaseToken: ledger.releaseToken,
    state: 'planned-active' as const,
  })));
}

function parseExecuteInput(value: unknown): ParsedExecuteInputV1 {
  const cloned = cloneFrozenData(value, 'A6.11b execute input');
  const source = exactRecord(cloned, EXECUTE_KEYS, 'A6.11b execute input');
  if (source.schemaVersion !== 1) throw new RangeError('A6.11b execute.schemaVersion必须为1。');
  const binding = parseBinding(source.bindingSnapshot, 'A6.11b execute.bindingSnapshot');
  const epochId = text(source.epochId, 'A6.11b execute.epochId', 200);
  const tick = integer(source.tick, 'A6.11b execute.tick');
  if (epochId !== binding.epochId || tick !== binding.tick) {
    throw new RangeError('A6.11b execute epoch/tick与binding不闭合。');
  }
  const parsedPlan = parsePlan(
    source.plan,
    source.previousActiveLeaseLedger,
    binding,
    source.planIdentity,
  );
  if (parsedPlan.plan.epochId !== epochId || parsedPlan.plan.tick !== tick) {
    throw new RangeError('A6.11b execute epoch/tick与plan不闭合。');
  }
  return Object.freeze({
    ...parsedPlan,
    inputCanonical: canonical(cloned),
    binding,
  });
}

function requestIdentity(
  binding: ParsedBindingV1,
  ledger: ArenaV2CollectionPlannedActivePreviewLeaseV1,
): string {
  const slot = binding.slotsByAssetId.get(ledger.assetId);
  if (slot === undefined || slot.requestToken !== ledger.requestToken) {
    throw new RangeError('A6.11b无法从binding闭合A6.6 request identity。');
  }
  return createDeterministicDataHash({
    epochId: binding.epochId,
    catalogContentHash: binding.catalogContentHash,
    assetId: slot.assetId,
    sha256: slot.sha256,
    requestToken: ledger.requestToken,
  }, A6_6_REQUEST_IDENTITY_LABEL);
}

function isNativePromise(value: unknown): value is Promise<ArenaV2A6FormalPreviewLeaseResultV1> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function internalActiveRecord(
  binding: ParsedBindingV1,
  ledger: ArenaV2CollectionPlannedActivePreviewLeaseV1,
  leaseResultPromise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>,
): InternalActiveRecordV1 {
  return {
    ledger,
    requestIdentity: requestIdentity(binding, ledger),
    leaseResultPromise,
    settlementState: 'pending',
    settledResult: null,
  };
}

function publicActiveRecord(
  record: InternalActiveRecordV1,
): ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1 {
  const { ledger } = record;
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: ledger.epochId,
    catalogContentHash: ledger.catalogContentHash,
    screenId: ledger.screenId,
    activationSequence: ledger.activationSequence,
    visibleSlotLeaseId: ledger.visibleSlotLeaseId,
    kind: ledger.kind,
    definitionId: ledger.definitionId,
    assetId: ledger.assetId,
    ordinal: ledger.ordinal,
    requestToken: ledger.requestToken,
    releaseToken: ledger.releaseToken,
    requestIdentity: record.requestIdentity,
    leaseResultPromise: record.leaseResultPromise,
    settlementState: record.settlementState,
    settledResult: record.settledResult,
  });
}

function freezeProof(value: unknown, expected: ArenaV2A6BeforeReleaseDestroyedProofReadInputV1) {
  rejectThenable(value, 'A6.11b beforeRelease barrier');
  const cloned = cloneFrozenData(value, 'A6.11b beforeRelease proof');
  const proof = exactRecord(cloned, PROOF_KEYS, 'A6.11b beforeRelease proof');
  if (
    proof.schemaVersion !== 1
    || proof.visibleSlotLeaseId !== expected.visibleSlotLeaseId
    || proof.requestIdentity !== expected.requestIdentity
    || proof.destroyed !== true
  ) throw new RangeError('A6.11b beforeRelease proof身份或destroyed事实不闭合。');
  return Object.freeze({
    schemaVersion: 1 as const,
    visibleSlotLeaseId: expected.visibleSlotLeaseId,
    requestIdentity: expected.requestIdentity,
    destroyed: true as const,
  });
}

function destroyFailure(
  phase: ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1['phase'],
  code: ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1['code'],
  record: InternalActiveRecordV1 | null,
): ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    phase,
    visibleSlotLeaseId: record?.ledger.visibleSlotLeaseId ?? null,
    requestIdentity: record?.requestIdentity ?? null,
    code,
  });
}

export class ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1 {
  #state: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1 = 'active';
  #binding: ParsedBindingV1;
  readonly #leaseOwner: ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1;
  readonly #readDestroyedProof: UnknownMethod;
  #records = new Map<string, InternalActiveRecordV1>();
  #pendingDestroyBarriers = new Map<string, InternalActiveRecordV1>();
  #lateSettlementDiagnostics: readonly string[] = Object.freeze([]);
  #lastTick: number;
  #lastInputCanonical: string | null = null;
  #lastPlanIdentity: string | null = null;
  #lastPromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #inFlightCanonical: string | null = null;
  #inFlightPromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #snapshot: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1;
  #destroyResult: ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 | null = null;

  constructor(value: unknown) {
    const source = captureExternalOptions(value);
    if (source.schemaVersion !== 1) throw new RangeError('A6.11b constructor.schemaVersion必须为1。');
    const binding = parseBinding(source.bindingSnapshot, 'A6.11b constructor.bindingSnapshot');
    const readDestroyedProof = snapshotMethod(
      source.beforeReleaseBarrier,
      'A6.11b beforeReleaseBarrier',
      'readDestroyedProof',
    );
    this.#leaseOwner = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: binding.snapshot,
      loader: source.loader,
      disposer: source.disposer,
    });
    this.#readDestroyedProof = readDestroyedProof;
    this.#binding = binding;
    this.#lastTick = binding.tick;
    this.#snapshot = this.#runSynchronousOperation(
      'constructor-snapshot',
      () => this.#makeSnapshot('active'),
    );
  }

  get state(): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.11b ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.11b缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `A6.11b ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #makeSnapshot(
    state: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
  ): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1 {
    const leaseSnapshot = this.#leaseOwner.getSnapshot();
    this.#assertCurrentOperationCommit();
    return this.#makeSnapshotFromLease(state, leaseSnapshot);
  }

  #makeSnapshotFromLease(
    state: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
    leaseSnapshot: ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1,
  ): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1 {
    const activeRecords = Object.freeze([...this.#records.values()].map(publicActiveRecord));
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      productionReachable: false as const,
      defaultSurfaceWired: false as const,
      state,
      epochId: this.#binding.epochId,
      catalogContentHash: this.#binding.catalogContentHash,
      lastTick: leaseSnapshot.lastTick,
      lastPlanIdentity: this.#lastPlanIdentity,
      activeRecords,
      activeLeaseCount: activeRecords.length,
      assetReadyCount: activeRecords.filter(({ settlementState }) => settlementState === 'ready').length,
      leaseFallbackCount: activeRecords.filter(({ settlementState }) => settlementState === 'fallback').length,
      lateSettlementDiagnosticCount: this.#lateSettlementDiagnostics.length,
      pendingDestroyBarrierCount: this.#pendingDestroyBarriers.size,
      destroyIncomplete: state === 'destroy-incomplete',
      a6_6State: leaseSnapshot.state,
      a6_6CleanupFailureCount: leaseSnapshot.cleanupFailureCount,
    });
  }

  #readProof(
    record: InternalActiveRecordV1,
    tick: number,
  ): ArenaV2A6BeforeReleaseDestroyedProofV1 {
    const { ledger } = record;
    const request = Object.freeze({
      schemaVersion: 1 as const,
      epochId: ledger.epochId,
      tick,
      visibleSlotLeaseId: ledger.visibleSlotLeaseId,
      requestIdentity: record.requestIdentity,
      assetId: ledger.assetId,
    });
    const value: unknown = this.#readDestroyedProof(request);
    this.#assertCurrentOperationCommit();
    return freezeProof(value, request);
  }

  #assertLeaseOwnerActive(operation: string): void {
    const snapshot = this.#leaseOwner.getSnapshot();
    this.#assertCurrentOperationCommit();
    if (snapshot.state !== 'active') throw new Error(`${operation}后A6.6进入${snapshot.state}。`);
  }

  #recordLateSettlement(leaseIdValue: string): void {
    const previous = this.#lateSettlementDiagnostics;
    const next = [...this.#lateSettlementDiagnostics, leaseIdValue];
    this.#lateSettlementDiagnostics = Object.freeze(
      next.slice(Math.max(0, next.length - MAX_LATE_SETTLEMENT_DIAGNOSTICS)),
    );
    if (this.#state !== 'executing') {
      try {
        this.#snapshot = this.#makeSnapshot(this.#state);
      } catch (error) {
        if (this.#reentryError !== null) {
          this.#lateSettlementDiagnostics = previous;
          throw error;
        }
        // A late result is diagnostic-only and must never revive or throw into its ignored chain.
      }
    }
  }

  #settleRecord(
    record: InternalActiveRecordV1,
    value: unknown,
  ): void {
    const { ledger } = record;
    const current = this.#records.get(ledger.visibleSlotLeaseId);
    if (current !== record || current.leaseResultPromise !== record.leaseResultPromise) {
      this.#recordLateSettlement(ledger.visibleSlotLeaseId);
      return;
    }
    if (typeof value !== 'object' || value === null) {
      this.#failFromSettlement();
      return;
    }
    const result = value as ArenaV2A6FormalPreviewLeaseResultV1;
    if (
      result.visibleSlotLeaseId !== ledger.visibleSlotLeaseId
      || result.requestIdentity !== record.requestIdentity
      || result.assetId !== ledger.assetId
      || (result.status !== 'ready' && result.status !== 'fallback')
    ) {
      this.#failFromSettlement();
      return;
    }
    const previousResult = record.settledResult;
    const previousState = record.settlementState;
    record.settledResult = result;
    record.settlementState = result.status;
    try {
      if (this.#state === 'active') this.#snapshot = this.#makeSnapshot('active');
    } catch (error) {
      record.settledResult = previousResult;
      record.settlementState = previousState;
      throw error;
    }
  }

  #rejectRecordSettlement(record: InternalActiveRecordV1): void {
    const current = this.#records.get(record.ledger.visibleSlotLeaseId);
    if (current !== record || current.leaseResultPromise !== record.leaseResultPromise) {
      this.#recordLateSettlement(record.ledger.visibleSlotLeaseId);
      return;
    }
    this.#failFromSettlement();
  }

  #failFromSettlement(): void {
    this.#state = 'failed';
    try {
      this.#snapshot = this.#makeSnapshot('failed');
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      // Settlement observers never rethrow into an ignored Promise chain.
    }
  }

  #observeSettlement(record: InternalActiveRecordV1): void {
    Reflect.apply(NATIVE_PROMISE_THEN, record.leaseResultPromise, [
      (result: unknown) => {
        try {
          this.#runSynchronousOperation(
            'lease-settled',
            () => this.#settleRecord(record, result),
          );
        } catch {
          try {
            this.#runSynchronousOperation(
              'lease-settlement-failure',
              () => this.#failFromSettlement(),
            );
          } catch { this.#state = 'failed'; }
        }
      },
      () => {
        try {
          this.#runSynchronousOperation(
            'lease-rejected',
            () => this.#rejectRecordSettlement(record),
          );
        } catch {
          try {
            this.#runSynchronousOperation(
              'lease-rejection-failure',
              () => this.#failFromSettlement(),
            );
          } catch { this.#state = 'failed'; }
        }
      },
    ]);
  }

  #executeParsed(
    parsed: ParsedExecuteInputV1,
  ): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1 {
    let mutationStarted = false;
    try {
      const releaseRecords = parsed.plan.releaseCommands.map((command) => {
        const record = this.#records.get(command.visibleSlotLeaseId);
        if (record === undefined) throw new RangeError('A6.11b release引用未知active record。');
        return record;
      });
      const proofs = Object.freeze(releaseRecords.map((record) => (
        this.#readProof(record, parsed.plan.tick)
      )));
      mutationStarted = true;
      const working = new Map(this.#records);
      for (const command of parsed.plan.releaseCommands) {
        this.#leaseOwner.release(command);
        this.#assertCurrentOperationCommit();
        this.#assertLeaseOwnerActive('A6.11b release');
        working.delete(command.visibleSlotLeaseId);
        this.#records = new Map(working);
      }
      for (const retained of parsed.plan.retainLeases) {
        const record = working.get(retained.visibleSlotLeaseId);
        if (record === undefined) throw new Error('A6.11b retain active record丢失。');
      }
      const acquired = new Map<string, InternalActiveRecordV1>();
      const batchPromises = new Set<Promise<ArenaV2A6FormalPreviewLeaseResultV1>>();
      const nextById = new Map(parsed.nextLedger.map((entry) => [entry.visibleSlotLeaseId, entry]));
      for (const command of parsed.plan.acquireCommands) {
        const ledger = nextById.get(command.visibleSlotLeaseId);
        if (ledger === undefined) throw new Error('A6.11b acquire ledger丢失。');
        const leaseResultPromise = this.#leaseOwner.acquire(command);
        if (!isNativePromise(leaseResultPromise) || batchPromises.has(leaseResultPromise)) {
          throw new Error('A6.11b A6.6 acquire必须返回本批唯一原生Promise。');
        }
        batchPromises.add(leaseResultPromise);
        const record = internalActiveRecord(parsed.binding, ledger, leaseResultPromise);
        this.#observeSettlement(record);
        this.#assertCurrentOperationCommit();
        this.#assertLeaseOwnerActive('A6.11b acquire');
        acquired.set(ledger.visibleSlotLeaseId, record);
        working.set(ledger.visibleSlotLeaseId, record);
        this.#records = new Map(working);
      }
      const ordered = new Map<string, InternalActiveRecordV1>();
      for (const ledger of parsed.nextLedger) {
        const record = acquired.get(ledger.visibleSlotLeaseId) ?? working.get(ledger.visibleSlotLeaseId);
        if (record === undefined) throw new Error('A6.11b next active record未完整构造。');
        ordered.set(ledger.visibleSlotLeaseId, record);
      }
      if (ordered.size !== parsed.nextLedger.length) throw new Error('A6.11b next active record数量漂移。');
      const activeRecords = Object.freeze([...ordered.values()].map(publicActiveRecord));
      const result = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        validationStatus: 'not-run' as const,
        productionReachable: false as const,
        defaultSurfaceWired: false as const,
        epochId: parsed.binding.epochId,
        tick: parsed.plan.tick,
        screenId: parsed.plan.screenId,
        planIdentity: parsed.planIdentity,
        releaseBarrierProofs: proofs,
        activeRecords,
        fallbackSlots: parsed.plan.fallbackSlots,
        assetReadyCount: activeRecords.filter(({ settlementState }) => settlementState === 'ready').length,
        leaseFallbackCount: activeRecords.filter(({ settlementState }) => settlementState === 'fallback').length,
        staticFallbackCount: parsed.plan.fallbackSlots.length,
      });
      const leaseSnapshot = this.#leaseOwner.getSnapshot();
      this.#assertCurrentOperationCommit();
      this.#records = ordered;
      this.#lastTick = parsed.plan.tick;
      this.#lastInputCanonical = parsed.inputCanonical;
      this.#lastPlanIdentity = parsed.planIdentity;
      this.#state = 'active';
      this.#snapshot = this.#makeSnapshotFromLease('active', leaseSnapshot);
      return result;
    } catch (error) {
      if (this.#reentryError !== null) {
        this.#state = 'failed';
      } else if (!mutationStarted) {
        this.#state = 'active';
      } else {
        // 一旦资源事务开始，销毁屏障必须使用本次尝试的tick读取mount proof。
        // 否则部分release/acquire失败后仍沿用旧tick，会让上层已经发布的新proof永远不可读。
        this.#lastTick = Math.max(this.#lastTick, parsed.plan.tick);
        this.#failFromSettlement();
      }
      throw error;
    }
  }

  execute(value: unknown): Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> {
    return this.#runSynchronousOperation('execute', () => {
      const parsed = parseExecuteInput(value);
      if (
        parsed.binding.epochId !== this.#binding.epochId
        || parsed.binding.leaseWaterlineCanonical !== this.#binding.leaseWaterlineCanonical
      ) throw new RangeError('A6.11b同epoch完整binding漂移。');
      if (this.#inFlightPromise !== null) {
        if (parsed.inputCanonical === this.#inFlightCanonical) return this.#inFlightPromise;
        throw new Error('A6.11b运行中拒绝冲突execute。');
      }
      if (this.#state !== 'active') throw new Error(`A6.11b execute拒绝状态${this.#state}。`);
      if (parsed.plan.tick < this.#lastTick) throw new RangeError('A6.11b execute tick回退。');
      if (parsed.plan.tick === this.#lastTick && this.#lastInputCanonical !== null) {
        if (parsed.inputCanonical !== this.#lastInputCanonical || this.#lastPromise === null) {
          throw new RangeError('A6.11b同tick执行事实冲突。');
        }
        return this.#lastPromise;
      }
      if (canonical(parsed.previousLedger) !== canonical(projectRecordLedger(this.#records))) {
        throw new RangeError('A6.11b previous ledger与Owner active records不一致。');
      }

      const commandOwner = createDeferredPromiseOwner<
        ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1
      >();
      const operation = commandOwner.promise;
      Reflect.apply(NATIVE_PROMISE_THEN, operation, [undefined, () => undefined]);
      this.#state = 'executing';
      this.#inFlightCanonical = parsed.inputCanonical;
      this.#inFlightPromise = operation;
      try {
        Reflect.apply(NATIVE_PROMISE_THEN, EXECUTION_MICROTASK_TRIGGER, [
          () => {
            try {
              const result = this.#runSynchronousOperation('command-commit', () => {
                if (this.#inFlightPromise !== operation
                  || this.#inFlightCanonical !== parsed.inputCanonical) {
                  throw new Error('A6.11b拒绝过期command执行。');
                }
                if (this.#state !== 'executing') {
                  throw new Error(`A6.11b command执行时拒绝状态${this.#state}复活。`);
                }
                const committed = this.#executeParsed(parsed);
                if (!isExecutionOwnerState(this.#state, 'active')) {
                  throw new Error('A6.11b command提交后未回到active。');
                }
                this.#inFlightCanonical = null;
                this.#inFlightPromise = null;
                this.#lastPromise = operation;
                return committed;
              });
              commandOwner.resolve(result);
            } catch (error) {
              let failure = error;
              try {
                this.#runSynchronousOperation('command-failure', () => {
                  if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
                  if (this.#inFlightCanonical === parsed.inputCanonical) {
                    this.#inFlightCanonical = null;
                  }
                  if (this.#state === 'executing') this.#failFromSettlement();
                });
              } catch (commitError) {
                failure = new AggregateError(
                  [error, commitError],
                  'A6.11b command失败提交未能完整关闭。',
                );
                try {
                  this.#runSynchronousOperation('command-failure-close', () => {
                    if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
                    if (this.#inFlightCanonical === parsed.inputCanonical) {
                      this.#inFlightCanonical = null;
                    }
                    this.#failFromSettlement();
                  });
                } catch (closeError) {
                  failure = new AggregateError(
                    [failure, closeError],
                    'A6.11b command失败后的关闭仍不完整。',
                  );
                  this.#state = 'failed';
                }
              }
              commandOwner.reject(failure);
            }
          },
        ]);
      } catch (error) {
        if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
        if (this.#inFlightCanonical === parsed.inputCanonical) this.#inFlightCanonical = null;
        this.#state = 'active';
        commandOwner.reject(error);
        throw error;
      }
      return operation;
    });
  }

  getSnapshot(): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-read', () => this.#snapshot);
  }

  resetPresentationEpoch(value: unknown): void {
    this.#runSynchronousOperation('reset-epoch', () => {
      if (this.#state !== 'active' || this.#inFlightPromise !== null) {
        throw new Error(`A6.11b reset拒绝状态${this.#state}。`);
      }
      if (this.#records.size !== 0 || this.#pendingDestroyBarriers.size !== 0) {
        throw new Error('A6.11b reset只允许active lease为0。');
      }
      const cloned = cloneFrozenData(value, 'A6.11b reset input');
      const source = exactRecord(cloned, RESET_KEYS, 'A6.11b reset input');
      if (source.schemaVersion !== 1) throw new RangeError('A6.11b reset.schemaVersion必须为1。');
      const tick = integer(source.tick, 'A6.11b reset.tick');
      if (tick < this.#lastTick) throw new RangeError('A6.11b reset命令tick回退。');
      const next = parseBinding(source.nextBindingSnapshot, 'A6.11b reset.nextBindingSnapshot');
      if (next.epochId === this.#binding.epochId) throw new RangeError('A6.11b reset必须切换新epoch。');
      let leaseSnapshot: ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1;
      try {
        this.#leaseOwner.resetPresentationEpoch({
          schemaVersion: 1,
          tick,
          nextBindingSnapshot: next.snapshot,
        });
        this.#assertCurrentOperationCommit();
        leaseSnapshot = this.#leaseOwner.getSnapshot();
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) {
          this.#state = 'failed';
        } else if (!(error instanceof TypeError) && !(error instanceof RangeError)) {
          this.#failFromSettlement();
        }
        throw error;
      }
      this.#binding = next;
      this.#lastTick = next.tick;
      this.#lastInputCanonical = null;
      this.#lastPlanIdentity = null;
      this.#lastPromise = null;
      this.#lateSettlementDiagnostics = Object.freeze([]);
      this.#destroyResult = null;
      this.#snapshot = this.#makeSnapshotFromLease('active', leaseSnapshot);
    });
  }

  destroy(): ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 {
    return this.#runSynchronousOperation('destroy', () => {
    if (this.#inFlightPromise !== null || this.#state === 'executing') {
      throw new Error('A6.11b execute运行中拒绝destroy。');
    }
    if (this.#state === 'destroyed' && this.#destroyResult !== null) return this.#destroyResult;
    const candidates = this.#pendingDestroyBarriers.size > 0
      ? [...this.#pendingDestroyBarriers.values()]
      : [...this.#records.values()];
    const proofs: ArenaV2A6BeforeReleaseDestroyedProofV1[] = [];
    const failures: ArenaV2CollectionVisiblePreviewLeaseDestroyFailureV1[] = [];
    const pending = new Map<string, InternalActiveRecordV1>();
    for (let index = 0; index < candidates.length; index += 1) {
      const record = candidates[index]!;
      try {
        proofs.push(this.#readProof(record, this.#lastTick));
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        for (const retained of candidates.slice(index)) {
          pending.set(retained.ledger.visibleSlotLeaseId, retained);
        }
        failures.push(destroyFailure('before-release-proof', 'proof-reader-rejected', record));
        break;
      }
    }
    let leaseSnapshot = this.#leaseOwner.getSnapshot();
    rejectThenable(leaseSnapshot, 'A6.11b lease owner baseline snapshot');
    this.#assertCurrentOperationCommit();
    if (failures.length === 0) {
      try {
        rejectThenable(this.#leaseOwner.destroy(), 'A6.11b lease owner.destroy');
        this.#assertCurrentOperationCommit();
        leaseSnapshot = this.#leaseOwner.getSnapshot();
        rejectThenable(leaseSnapshot, 'A6.11b lease owner terminal snapshot');
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        failures.push(destroyFailure('a6.6-destroy', 'lease-owner-destroy-rejected', null));
      }
    } else {
      for (const record of this.#records.values()) {
        pending.set(record.ledger.visibleSlotLeaseId, record);
      }
    }
    const leaseOwnerFinished = leaseSnapshot.state === 'destroyed'
      || leaseSnapshot.state === 'destroy-incomplete';
    if (leaseOwnerFinished) this.#records.clear();
    if (leaseSnapshot.state === 'destroy-incomplete') {
      failures.push(destroyFailure('a6.6-destroy', 'lease-owner-destroy-incomplete', null));
    }
    if (!leaseOwnerFinished) {
      for (const record of this.#records.values()) {
        pending.set(record.ledger.visibleSlotLeaseId, record);
      }
    }
    this.#pendingDestroyBarriers = pending;
    const complete = pending.size === 0 && leaseSnapshot.state === 'destroyed';
    this.#state = complete ? 'destroyed' : 'destroy-incomplete';
    const result = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      state: this.#state as 'destroyed' | 'destroy-incomplete',
      barrierProofs: Object.freeze(proofs),
      failures: Object.freeze(failures),
      pendingBarrierLeaseCount: pending.size,
      a6_6State: leaseSnapshot.state,
    });
    this.#destroyResult = result;
    this.#inFlightCanonical = null;
    this.#inFlightPromise = null;
    this.#lastPromise = null;
    this.#snapshot = this.#makeSnapshotFromLease(this.#state, leaseSnapshot);
    return result;
    });
  }
}
