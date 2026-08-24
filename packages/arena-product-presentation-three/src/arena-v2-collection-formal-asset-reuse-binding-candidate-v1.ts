import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaV2CollectionProgressComponentSetCandidateV1,
  type ArenaV2A6CollectionProgressComponentInputV1,
  type ArenaV2A6CollectionProgressComponentSnapshotV1,
  type ArenaV2A6CollectionProgressItemKindV1,
} from './arena-v2-collection-progress-component-set-candidate-v1.js';

export const ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_SCHEMA_VERSION_V1 = 1 as const;
export const ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1 = Object.freeze({
  ACTIVE: 'active',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2A6FormalAssetReuseBindingLifecycleV1 =
  typeof ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1[
    keyof typeof ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1
  ];
export type ArenaV2A6FormalPreviewAssetAvailabilityV1 = 'catalog-bound' | 'missing';
export type ArenaV2A6FormalPreviewRoleV1 = 'weapon-attachment-model' | 'map-model';

export interface ArenaV2A6FormalPreviewProvenanceV1 {
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly licenseId: 'CC0-1.0' | 'Project-Owned';
  readonly rightsHolder: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly proofDocument: string;
  readonly commercialUseDeclared: true;
  readonly modificationDeclared: true;
  readonly redistributionDeclared: true;
  readonly attributionRequired: false;
}

export interface ArenaV2A6FormalPreviewAssetRecordV1 {
  readonly assetId: string;
  readonly runtimeSourceKey: string;
  readonly runtimeKind: 'attachment' | 'map-model';
  readonly role: ArenaV2A6FormalPreviewRoleV1;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  readonly artifactPath: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly provenance: ArenaV2A6FormalPreviewProvenanceV1;
}

export interface ArenaV2A6FormalPreviewDefinitionBindingV1 {
  readonly kind: ArenaV2A6CollectionProgressItemKindV1;
  readonly definitionId: string;
  readonly assetId: string;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
}

export interface ArenaV2A6FormalPreviewCatalogV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly ownerId: 'arena-v2-formal-presentation-asset-catalog';
  readonly sourceCatalogContentHash: string;
  readonly records: readonly ArenaV2A6FormalPreviewAssetRecordV1[];
  readonly bindings: readonly ArenaV2A6FormalPreviewDefinitionBindingV1[];
  readonly budget: Readonly<{
    readonly policyId: 'arena.stage7.formal-asset-budget.v1';
    readonly maximumTotalEncodedBytes: 2_359_296;
    readonly weaponAttachmentCandidateMaximumEncodedBytes: 65_536;
    readonly totalEncodedBytes: number;
    readonly weaponEncodedBytes: number;
    readonly mapEncodedBytes: number;
    readonly withinTotalEncodedLimit: boolean;
    readonly perItemBudgetClosedCount: 20;
    readonly uncoveredPerItemBudgetCount: 2;
    readonly formalBudgetReady: false;
    readonly validationStatus: 'not-run';
  }>;
  readonly contentHash: string;
}

export interface ArenaV2A6FormalPreviewAvailabilityEntryV1 {
  readonly assetId: string;
  readonly state: ArenaV2A6FormalPreviewAssetAvailabilityV1;
}

export interface ArenaV2A6FormalPreviewAvailabilitySetV1 {
  readonly schemaVersion: 1;
  readonly ownerId: 'formal-asset-preview-availability';
  readonly catalogContentHash: string;
  readonly entries: readonly ArenaV2A6FormalPreviewAvailabilityEntryV1[];
}

export interface ArenaV2A6CollectionFormalAssetReuseBindingInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_SCHEMA_VERSION_V1;
  readonly collectionProgressInput: ArenaV2A6CollectionProgressComponentInputV1;
  readonly formalAssetCatalog: ArenaV2A6FormalPreviewCatalogV1;
  readonly availability: ArenaV2A6FormalPreviewAvailabilitySetV1;
}

export interface ArenaV2A6FormalPreviewStrategyV1 {
  readonly screenId: 'weapon-index' | 'weapon-detail' | 'map-index' | 'map-detail';
  readonly framing:
    | 'static-silhouette-thumbnail'
    | 'static-three-quarter-attachment'
    | 'static-route-isometric-thumbnail'
    | 'static-route-overview';
  readonly safeInsetCssPixels: 8 | 12;
  readonly minimumSlotCssPixels: 72 | 168;
  readonly transparentBackground: true;
  readonly autoRotate: false;
  readonly motionPolicy: 'static-no-auto-rotate' | 'single-entry-turn-then-static';
  readonly touchActionAdded: false;
  readonly selectionIntentAdded: false;
}

export interface ArenaV2A6FormalPreviewBindingSlotV1 {
  readonly kind: ArenaV2A6CollectionProgressItemKindV1;
  readonly definitionId: string;
  readonly displayName: string;
  readonly ordinal: number;
  readonly assetId: string;
  readonly runtimeSourceKey: string;
  readonly role: ArenaV2A6FormalPreviewRoleV1;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  readonly provenance: ArenaV2A6FormalPreviewProvenanceV1;
  readonly byteLength: number;
  readonly sha256: string;
  readonly availability: ArenaV2A6FormalPreviewAssetAvailabilityV1;
  readonly formalReady: boolean;
  readonly assetUsePermitted: boolean;
  readonly previewSourceUse: 'formal-glb-permitted' | 'text-shape-pattern-fallback-only';
  readonly previewStrategies: readonly [
    ArenaV2A6FormalPreviewStrategyV1,
    ArenaV2A6FormalPreviewStrategyV1,
  ];
  readonly budget: Readonly<{
    readonly policyId: 'arena.stage7.formal-asset-budget.v1';
    readonly coverage: 'candidate-attachment-limit' | 'map-glb-not-covered-by-current-policy';
    readonly maximumEncodedBytes: 65_536 | null;
    readonly withinPerItemLimit: true | null;
    readonly validationStatus: 'metadata-only-not-recomputed';
  }>;
  readonly lifecycle: Readonly<{
    readonly lazyRequest: boolean;
    readonly requestPermitted: boolean;
    readonly requestWhen: 'slot-enters-visible-layout' | null;
    readonly requestToken: string | null;
    readonly releaseWhen: 'slot-unmount-or-epoch-reset' | null;
    readonly releaseToken: string | null;
    readonly loadsBytesHere: false;
    readonly ownsThreeResourcesHere: false;
  }>;
  readonly fallback: Readonly<{
    readonly active: boolean;
    readonly content: 'text-shape-pattern-only';
    readonly preservesDefinitionIdentity: true;
    readonly programmaticGeometryAllowed: false;
    readonly claimsFormalApproval: false;
  }>;
}

export interface ArenaV2A6FormalPreviewLayoutContractV1 {
  readonly viewport: '390x844' | '1440x900';
  readonly safeAreaRequired: true;
  readonly indexPreviewMinimumCssPixels: 72 | 96;
  readonly detailPreviewMinimumCssPixels: 168 | 240;
  readonly previewSafeInsetCssPixels: 8 | 12;
  readonly existingItemTouchTargetMinimumCssPixels: 48;
  readonly newTouchActionsAdded: 0;
  readonly horizontalOverflowAllowed: false;
  readonly screenshotEvidence: 'not-run';
}

export interface ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly validationStatus: 'not-run';
  readonly epochId: string;
  readonly tick: number;
  readonly sourceState: ArenaV2A6CollectionProgressComponentSnapshotV1['sourceState'];
  readonly contentIdentity: Readonly<{
    readonly sourceContentHash: string;
    readonly collectionContentHash: string;
    readonly catalogContentHash: string;
    readonly catalogRevision: string;
    readonly productionApprovalLedgerId:
      'arena-v2.a3-a6.production-approval-evidence-ledger.candidate.v1';
    readonly productionApprovalLedgerContentHash: string;
  }>;
  readonly budget: ArenaV2A6FormalPreviewCatalogV1['budget'];
  readonly slots: readonly ArenaV2A6FormalPreviewBindingSlotV1[];
  readonly layouts: readonly [
    ArenaV2A6FormalPreviewLayoutContractV1,
    ArenaV2A6FormalPreviewLayoutContractV1,
  ];
  readonly accessibility: Readonly<{
    readonly reducedMotion: boolean;
    readonly automaticRotationEnabled: false;
    readonly muted: boolean;
    readonly mutedChangesPreviewMeaning: false;
    readonly assetFailurePreservesTextShapePattern: true;
  }>;
  readonly governance: Readonly<{
    readonly weaponBindingCount: 20;
    readonly mapBindingCount: 2;
    readonly pageCountAdded: 0;
    readonly actionCountAdded: 0;
    readonly binaryAssetBytesAdded: 0;
    readonly programmaticNormalPathAllowed: false;
    readonly formalAssetGatePassed: false;
    readonly deviceEvidence: 'not-run';
    readonly screenshotEvidence: 'not-run';
    readonly performanceEvidence: 'not-run';
  }>;
}

type PlainData = Record<string, unknown>;

const INPUT_KEYS = new Set([
  'schemaVersion', 'collectionProgressInput', 'formalAssetCatalog', 'availability',
]);
const CATALOG_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'ownerId', 'sourceCatalogContentHash',
  'records', 'bindings', 'budget', 'contentHash',
]);
const RECORD_KEYS = new Set([
  'assetId', 'runtimeSourceKey', 'runtimeKind', 'role', 'maturity', 'artifactPath',
  'byteLength', 'sha256', 'provenance',
]);
const PROVENANCE_KEYS = new Set([
  'sourceLocator', 'sourceRevision', 'licenseId', 'rightsHolder', 'approvedBy',
  'approvedAt', 'proofDocument', 'commercialUseDeclared', 'modificationDeclared',
  'redistributionDeclared', 'attributionRequired',
]);
const BINDING_KEYS = new Set(['kind', 'definitionId', 'assetId', 'maturity']);
const BUDGET_KEYS = new Set([
  'policyId', 'maximumTotalEncodedBytes', 'weaponAttachmentCandidateMaximumEncodedBytes',
  'totalEncodedBytes', 'weaponEncodedBytes', 'mapEncodedBytes', 'withinTotalEncodedLimit',
  'perItemBudgetClosedCount', 'uncoveredPerItemBudgetCount', 'formalBudgetReady',
  'validationStatus',
]);
const AVAILABILITY_KEYS = new Set([
  'schemaVersion', 'ownerId', 'catalogContentHash', 'entries',
]);
const AVAILABILITY_ENTRY_KEYS = new Set(['assetId', 'state']);
const CONSTRUCTOR_KEYS = new Set(['epochId']);
const RESET_KEYS = new Set(['epochId']);

function cloneStrictData(
  value: unknown,
  name: string,
  seen: Set<object> = new Set(),
  depth = 0,
): unknown {
  if (depth > 30) throw new RangeError(`${name}嵌套深度超限。`);
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object') throw new TypeError(`${name}只能包含有限JSON数据。`);
  if (seen.has(value)) throw new TypeError(`${name}不能循环引用。`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const expectedKeys = new Set([
        'length',
        ...Array.from({ length: value.length }, (_, index) => String(index)),
      ]);
      if (Reflect.ownKeys(value).some((key) => (
        typeof key !== 'string' || !expectedKeys.has(key)
      ))) throw new TypeError(`${name}数组不能有空槽、Symbol或附加字段。`);
      return Object.freeze(Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined
          || !descriptor.enumerable
          || !Object.hasOwn(descriptor, 'value')
        ) throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
        return cloneStrictData(descriptor.value, `${name}[${index}]`, seen, depth + 1);
      }));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name}必须是普通数据对象，Promise/thenable不受支持。`);
    }
    const result: PlainData = Object.create(null) as PlainData;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || key === 'then') {
        throw new TypeError(`${name}不能包含Symbol或thenable字段。`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined
        || !descriptor.enumerable
        || !Object.hasOwn(descriptor, 'value')
      ) throw new TypeError(`${name}.${key}必须是数据字段，getter/setter被拒绝。`);
      result[key] = cloneStrictData(descriptor.value, `${name}.${key}`, seen, depth + 1);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const result = value as PlainData;
  const actualKeys = Object.keys(result);
  if (actualKeys.length !== keys.size || actualKeys.some((key) => !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return result;
}

function nonEmptyString(value: unknown, name: string, maximum = 2048): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function integer(value: unknown, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${name}必须是${minimum}..${maximum}的安全整数。`);
  }
  return value as number;
}

function sha256(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 64);
  if (!/^[0-9a-f]{64}$/u.test(result)) throw new RangeError(`${name}必须是64位小写SHA-256。`);
  return result;
}

function shortHash(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 8);
  if (!/^[0-9a-f]{8}$/u.test(result)) throw new RangeError(`${name}必须是8位小写内容hash。`);
  return result;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function currentCatalogProjection(): ArenaV2A6FormalPreviewCatalogV1 {
  const catalog = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1;
  const records = catalog.visualRecords
    .filter(({ role }) => role === 'weapon-attachment-model' || role === 'map-model')
    .map((record) => {
      const runtime = record.runtimeDefinition;
      const role: ArenaV2A6FormalPreviewRoleV1 = record.role === 'weapon-attachment-model'
        ? 'weapon-attachment-model'
        : 'map-model';
      const runtimeKind = role === 'weapon-attachment-model' ? 'attachment' : 'map-model';
      if (runtime.kind !== runtimeKind) {
        throw new RangeError(`A6.4正式资产${runtime.id}的role与runtime kind漂移。`);
      }
      const expectedRuntimeSourceKey = `./${record.artifactPath.slice('public/'.length)}`;
      if (!record.artifactPath.startsWith('public/assets/arena/')
        || runtime.sourceKey !== expectedRuntimeSourceKey
        || !runtime.sourceKey.endsWith('.glb')) {
        throw new RangeError(`A6.4正式资产${runtime.id}路径身份不闭合。`);
      }
      const provenance = record.provenance;
      return Object.freeze({
        assetId: runtime.id,
        runtimeSourceKey: runtime.sourceKey,
        runtimeKind,
        role,
        maturity: record.maturity,
        artifactPath: record.artifactPath,
        byteLength: record.byteLength,
        sha256: record.sha256,
        provenance: Object.freeze({
          sourceLocator: provenance.sourceLocator,
          sourceRevision: provenance.sourceRevision,
          licenseId: provenance.licenseId,
          rightsHolder: provenance.rightsHolder,
          approvedBy: provenance.approvedBy,
          approvedAt: provenance.approvedAt,
          proofDocument: provenance.proofDocument,
          commercialUseDeclared: true as const,
          modificationDeclared: true as const,
          redistributionDeclared: true as const,
          attributionRequired: false as const,
        }),
      });
    })
    .sort((left, right) => compareText(left.assetId, right.assetId));
  const bindings = [
    ...catalog.equipmentAssetBindings.map((binding) => Object.freeze({
      kind: 'weapon' as const,
      definitionId: binding.equipmentDefinitionId,
      assetId: binding.attachmentAssetId,
      maturity: binding.maturity,
    })),
    ...catalog.mapAssetBindings.map((binding) => Object.freeze({
      kind: 'map' as const,
      definitionId: binding.mapDefinitionId,
      assetId: binding.mapVisualAssetId,
      maturity: binding.maturity,
    })),
  ].sort((left, right) => compareText(left.definitionId, right.definitionId));
  const weaponEncodedBytes = records
    .filter(({ role }) => role === 'weapon-attachment-model')
    .reduce((total, record) => total + record.byteLength, 0);
  const mapEncodedBytes = records
    .filter(({ role }) => role === 'map-model')
    .reduce((total, record) => total + record.byteLength, 0);
  const totalEncodedBytes = weaponEncodedBytes + mapEncodedBytes;
  const budget = Object.freeze({
    policyId: 'arena.stage7.formal-asset-budget.v1' as const,
    maximumTotalEncodedBytes: 2_359_296 as const,
    weaponAttachmentCandidateMaximumEncodedBytes: 65_536 as const,
    totalEncodedBytes,
    weaponEncodedBytes,
    mapEncodedBytes,
    withinTotalEncodedLimit: totalEncodedBytes <= 2_359_296,
    perItemBudgetClosedCount: 20 as const,
    uncoveredPerItemBudgetCount: 2 as const,
    formalBudgetReady: false as const,
    validationStatus: 'not-run' as const,
  });
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    ownerId: 'arena-v2-formal-presentation-asset-catalog' as const,
    sourceCatalogContentHash: catalog.contentHash,
    records: Object.freeze(records),
    bindings: Object.freeze(bindings),
    budget,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 A6.4 Formal Preview Catalog V1',
    ),
  });
}

export const ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1 = currentCatalogProjection();
const CURRENT_CATALOG_CANONICAL = JSON.stringify(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);

function parseProvenance(value: unknown, name: string): ArenaV2A6FormalPreviewProvenanceV1 {
  const source = exactRecord(value, PROVENANCE_KEYS, name);
  if (source.licenseId !== 'CC0-1.0' && source.licenseId !== 'Project-Owned') {
    throw new RangeError(`${name}.licenseId不受支持。`);
  }
  if (
    source.commercialUseDeclared !== true
    || source.modificationDeclared !== true
    || source.redistributionDeclared !== true
    || source.attributionRequired !== false
  ) throw new RangeError(`${name}许可使用边界不闭合。`);
  const approvedBy = source.approvedBy === null
    ? null
    : nonEmptyString(source.approvedBy, `${name}.approvedBy`, 200);
  const approvedAt = source.approvedAt === null
    ? null
    : nonEmptyString(source.approvedAt, `${name}.approvedAt`, 32);
  if ((approvedBy === null) !== (approvedAt === null)) {
    throw new RangeError(`${name}批准人和日期必须同时存在或同时为空。`);
  }
  return Object.freeze({
    sourceLocator: nonEmptyString(source.sourceLocator, `${name}.sourceLocator`),
    sourceRevision: nonEmptyString(source.sourceRevision, `${name}.sourceRevision`, 512),
    licenseId: source.licenseId,
    rightsHolder: nonEmptyString(source.rightsHolder, `${name}.rightsHolder`, 512),
    approvedBy,
    approvedAt,
    proofDocument: nonEmptyString(source.proofDocument, `${name}.proofDocument`, 1024),
    commercialUseDeclared: true as const,
    modificationDeclared: true as const,
    redistributionDeclared: true as const,
    attributionRequired: false as const,
  });
}

function parseCatalog(value: unknown): ArenaV2A6FormalPreviewCatalogV1 {
  const source = exactRecord(value, CATALOG_KEYS, 'A6.4 formalAssetCatalog');
  if (
    source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.ownerId !== 'arena-v2-formal-presentation-asset-catalog'
    || source.sourceCatalogContentHash
      !== ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash
  ) throw new RangeError('A6.4正式资产catalog治理或上游内容身份漂移。');
  if (!Array.isArray(source.records) || source.records.length !== 22) {
    throw new RangeError('A6.4正式预览catalog必须精确包含20武器＋2地图资产。');
  }
  const assetIds = new Set<string>();
  const runtimeSourceKeys = new Set<string>();
  const records = Object.freeze(source.records.map((value, index) => {
    const name = `A6.4 catalog.records[${index}]`;
    const record = exactRecord(value, RECORD_KEYS, name);
    if (record.role !== 'weapon-attachment-model' && record.role !== 'map-model') {
      throw new RangeError(`${name}.role不受支持。`);
    }
    const role = record.role;
    const runtimeKind = role === 'weapon-attachment-model' ? 'attachment' as const : 'map-model' as const;
    const maturity = role === 'weapon-attachment-model'
      ? 'verified-intake-only' as const
      : 'authored-candidate-not-approved' as const;
    if (record.runtimeKind !== runtimeKind || record.maturity !== maturity) {
      throw new RangeError(`${name}role、kind与成熟度不闭合。`);
    }
    const assetId = nonEmptyString(record.assetId, `${name}.assetId`, 300);
    const runtimeSourceKey = nonEmptyString(record.runtimeSourceKey, `${name}.runtimeSourceKey`, 1024);
    const artifactPath = nonEmptyString(record.artifactPath, `${name}.artifactPath`, 1024);
    if (assetIds.has(assetId) || runtimeSourceKeys.has(runtimeSourceKey)) {
      throw new RangeError(`${name}包含重复assetId或runtimeSourceKey。`);
    }
    assetIds.add(assetId);
    runtimeSourceKeys.add(runtimeSourceKey);
    if (
      !artifactPath.startsWith('public/assets/arena/')
      || runtimeSourceKey !== `./${artifactPath.slice('public/'.length)}`
      || !artifactPath.endsWith('.glb')
    ) throw new RangeError(`${name}artifact/runtime路径身份不闭合。`);
    const byteLength = integer(record.byteLength, 1, 2_359_296, `${name}.byteLength`);
    if (role === 'weapon-attachment-model' && byteLength > 65_536) {
      throw new RangeError(`${name}超过附件候选64KiB单项预算。`);
    }
    return Object.freeze({
      assetId,
      runtimeSourceKey,
      runtimeKind,
      role,
      maturity,
      artifactPath,
      byteLength,
      sha256: sha256(record.sha256, `${name}.sha256`),
      provenance: parseProvenance(record.provenance, `${name}.provenance`),
    });
  }));
  if (records.filter(({ role }) => role === 'weapon-attachment-model').length !== 20
    || records.filter(({ role }) => role === 'map-model').length !== 2) {
    throw new RangeError('A6.4 catalog资产角色数量不闭合。');
  }
  if (!Array.isArray(source.bindings) || source.bindings.length !== 22) {
    throw new RangeError('A6.4正式预览binding必须精确包含20武器＋2地图。');
  }
  const definitionIds = new Set<string>();
  const boundAssetIds = new Set<string>();
  const bindings = Object.freeze(source.bindings.map((value, index) => {
    const name = `A6.4 catalog.bindings[${index}]`;
    const binding = exactRecord(value, BINDING_KEYS, name);
    if (binding.kind !== 'weapon' && binding.kind !== 'map') {
      throw new RangeError(`${name}.kind不受支持。`);
    }
    const kind = binding.kind;
    const maturity = kind === 'weapon'
      ? 'verified-intake-only' as const
      : 'authored-candidate-not-approved' as const;
    if (binding.maturity !== maturity) throw new RangeError(`${name}.maturity漂移。`);
    const definitionId = nonEmptyString(binding.definitionId, `${name}.definitionId`, 300);
    const assetId = nonEmptyString(binding.assetId, `${name}.assetId`, 300);
    if (definitionIds.has(definitionId) || boundAssetIds.has(assetId)) {
      throw new RangeError(`${name}definition或asset发生重复绑定。`);
    }
    definitionIds.add(definitionId);
    boundAssetIds.add(assetId);
    const record = records.find((candidate) => candidate.assetId === assetId);
    if (record === undefined
      || record.role !== (kind === 'weapon' ? 'weapon-attachment-model' : 'map-model')
      || record.maturity !== maturity) {
      throw new RangeError(`${name}未与同角色、同成熟度asset一一闭合。`);
    }
    return Object.freeze({ kind, definitionId, assetId, maturity });
  }));
  if (bindings.filter(({ kind }) => kind === 'weapon').length !== 20
    || bindings.filter(({ kind }) => kind === 'map').length !== 2
    || records.some(({ assetId }) => !boundAssetIds.has(assetId))) {
    throw new RangeError('A6.4 catalog binding覆盖不闭合。');
  }
  const budgetSource = exactRecord(source.budget, BUDGET_KEYS, 'A6.4 catalog.budget');
  const weaponEncodedBytes = records
    .filter(({ role }) => role === 'weapon-attachment-model')
    .reduce((total, record) => total + record.byteLength, 0);
  const mapEncodedBytes = records
    .filter(({ role }) => role === 'map-model')
    .reduce((total, record) => total + record.byteLength, 0);
  const totalEncodedBytes = weaponEncodedBytes + mapEncodedBytes;
  if (
    budgetSource.policyId !== 'arena.stage7.formal-asset-budget.v1'
    || budgetSource.maximumTotalEncodedBytes !== 2_359_296
    || budgetSource.weaponAttachmentCandidateMaximumEncodedBytes !== 65_536
    || budgetSource.totalEncodedBytes !== totalEncodedBytes
    || budgetSource.weaponEncodedBytes !== weaponEncodedBytes
    || budgetSource.mapEncodedBytes !== mapEncodedBytes
    || budgetSource.withinTotalEncodedLimit !== (totalEncodedBytes <= 2_359_296)
    || budgetSource.perItemBudgetClosedCount !== 20
    || budgetSource.uncoveredPerItemBudgetCount !== 2
    || budgetSource.formalBudgetReady !== false
    || budgetSource.validationStatus !== 'not-run'
  ) throw new RangeError('A6.4 catalog预算事实漂移或虚构完成。');
  const budget = Object.freeze({
    policyId: 'arena.stage7.formal-asset-budget.v1' as const,
    maximumTotalEncodedBytes: 2_359_296 as const,
    weaponAttachmentCandidateMaximumEncodedBytes: 65_536 as const,
    totalEncodedBytes,
    weaponEncodedBytes,
    mapEncodedBytes,
    withinTotalEncodedLimit: totalEncodedBytes <= 2_359_296,
    perItemBudgetClosedCount: 20 as const,
    uncoveredPerItemBudgetCount: 2 as const,
    formalBudgetReady: false as const,
    validationStatus: 'not-run' as const,
  });
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    ownerId: 'arena-v2-formal-presentation-asset-catalog' as const,
    sourceCatalogContentHash: shortHash(
      source.sourceCatalogContentHash,
      'A6.4 sourceCatalogContentHash',
    ),
    records,
    bindings,
    budget,
  });
  const contentHash = shortHash(source.contentHash, 'A6.4 catalog.contentHash');
  if (contentHash !== createDeterministicDataHash(
    authority,
    'Arena V2 A6.4 Formal Preview Catalog V1',
  )) throw new RangeError('A6.4正式预览catalog hash漂移。');
  const result = Object.freeze({ ...authority, contentHash });
  if (JSON.stringify(result) !== CURRENT_CATALOG_CANONICAL) {
    throw new RangeError('A6.4正式预览catalog与当前正式catalog发生一致替换或顺序漂移。');
  }
  return result;
}

function parseAvailability(
  value: unknown,
  catalog: ArenaV2A6FormalPreviewCatalogV1,
): ReadonlyMap<string, ArenaV2A6FormalPreviewAssetAvailabilityV1> {
  const source = exactRecord(value, AVAILABILITY_KEYS, 'A6.4 availability');
  if (
    source.schemaVersion !== 1
    || source.ownerId !== 'formal-asset-preview-availability'
    || source.catalogContentHash !== catalog.contentHash
  ) throw new RangeError('A6.4 asset availability身份或catalog绑定漂移。');
  if (!Array.isArray(source.entries) || source.entries.length !== catalog.records.length) {
    throw new RangeError('A6.4 asset availability必须完整覆盖catalog。');
  }
  const result = new Map<string, ArenaV2A6FormalPreviewAssetAvailabilityV1>();
  for (const [index, value] of source.entries.entries()) {
    const entry = exactRecord(value, AVAILABILITY_ENTRY_KEYS, `A6.4 availability[${index}]`);
    const assetId = nonEmptyString(entry.assetId, `A6.4 availability[${index}].assetId`, 300);
    if (entry.state !== 'catalog-bound' && entry.state !== 'missing') {
      throw new RangeError(`A6.4 availability[${index}].state不受支持。`);
    }
    if (result.has(assetId) || !catalog.records.some((record) => record.assetId === assetId)) {
      throw new RangeError(`A6.4 availability[${index}]重复或未知asset。`);
    }
    result.set(assetId, entry.state);
  }
  return result;
}

function validateCollectionProgress(value: unknown): Readonly<{
  readonly input: ArenaV2A6CollectionProgressComponentInputV1;
  readonly snapshot: ArenaV2A6CollectionProgressComponentSnapshotV1;
}> {
  const source = value as ArenaV2A6CollectionProgressComponentInputV1;
  const owner = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId: source.epochId });
  try {
    return Object.freeze({ input: source, snapshot: owner.consume(source) });
  } finally {
    owner.destroy();
  }
}

interface ParsedInputV1 {
  readonly collectionInput: ArenaV2A6CollectionProgressComponentInputV1;
  readonly collectionSnapshot: ArenaV2A6CollectionProgressComponentSnapshotV1;
  readonly catalog: ArenaV2A6FormalPreviewCatalogV1;
  readonly availability: ReadonlyMap<string, ArenaV2A6FormalPreviewAssetAvailabilityV1>;
  readonly canonical: string;
}

function parseInput(value: unknown): ParsedInputV1 {
  const cloned = exactRecord(
    cloneStrictData(value, 'A6.4 input'),
    INPUT_KEYS,
    'A6.4 input',
  );
  if (cloned.schemaVersion !== 1) throw new RangeError('A6.4 input schema不受支持。');
  const collection = validateCollectionProgress(cloned.collectionProgressInput);
  const catalog = parseCatalog(cloned.formalAssetCatalog);
  const availability = parseAvailability(cloned.availability, catalog);
  return Object.freeze({
    collectionInput: collection.input,
    collectionSnapshot: collection.snapshot,
    catalog,
    availability,
    canonical: JSON.stringify({
      schemaVersion: 1,
      collectionProgressInput: collection.input,
      formalAssetCatalog: catalog,
      availability: cloned.availability,
    }),
  });
}

function previewStrategies(
  kind: ArenaV2A6CollectionProgressItemKindV1,
  reducedMotion: boolean,
): readonly [ArenaV2A6FormalPreviewStrategyV1, ArenaV2A6FormalPreviewStrategyV1] {
  const motionPolicy = reducedMotion
    ? 'static-no-auto-rotate' as const
    : 'single-entry-turn-then-static' as const;
  if (kind === 'weapon') return Object.freeze([
    Object.freeze({
      screenId: 'weapon-index' as const,
      framing: 'static-silhouette-thumbnail' as const,
      safeInsetCssPixels: 8 as const,
      minimumSlotCssPixels: 72 as const,
      transparentBackground: true as const,
      autoRotate: false as const,
      motionPolicy,
      touchActionAdded: false as const,
      selectionIntentAdded: false as const,
    }),
    Object.freeze({
      screenId: 'weapon-detail' as const,
      framing: 'static-three-quarter-attachment' as const,
      safeInsetCssPixels: 12 as const,
      minimumSlotCssPixels: 168 as const,
      transparentBackground: true as const,
      autoRotate: false as const,
      motionPolicy,
      touchActionAdded: false as const,
      selectionIntentAdded: false as const,
    }),
  ]);
  return Object.freeze([
    Object.freeze({
      screenId: 'map-index' as const,
      framing: 'static-route-isometric-thumbnail' as const,
      safeInsetCssPixels: 8 as const,
      minimumSlotCssPixels: 72 as const,
      transparentBackground: true as const,
      autoRotate: false as const,
      motionPolicy,
      touchActionAdded: false as const,
      selectionIntentAdded: false as const,
    }),
    Object.freeze({
      screenId: 'map-detail' as const,
      framing: 'static-route-overview' as const,
      safeInsetCssPixels: 12 as const,
      minimumSlotCssPixels: 168 as const,
      transparentBackground: true as const,
      autoRotate: false as const,
      motionPolicy,
      touchActionAdded: false as const,
      selectionIntentAdded: false as const,
    }),
  ]);
}

const LAYOUTS = Object.freeze([
  Object.freeze({
    viewport: '390x844' as const,
    safeAreaRequired: true as const,
    indexPreviewMinimumCssPixels: 72 as const,
    detailPreviewMinimumCssPixels: 168 as const,
    previewSafeInsetCssPixels: 8 as const,
    existingItemTouchTargetMinimumCssPixels: 48 as const,
    newTouchActionsAdded: 0 as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
  Object.freeze({
    viewport: '1440x900' as const,
    safeAreaRequired: true as const,
    indexPreviewMinimumCssPixels: 96 as const,
    detailPreviewMinimumCssPixels: 240 as const,
    previewSafeInsetCssPixels: 12 as const,
    existingItemTouchTargetMinimumCssPixels: 48 as const,
    newTouchActionsAdded: 0 as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
] as const satisfies readonly [
  ArenaV2A6FormalPreviewLayoutContractV1,
  ArenaV2A6FormalPreviewLayoutContractV1,
]);

function lifecycleTokens(): ArenaV2A6FormalPreviewBindingSlotV1['lifecycle'] {
  return Object.freeze({
    lazyRequest: false,
    requestPermitted: false,
    requestWhen: null,
    requestToken: null,
    releaseWhen: null,
    releaseToken: null,
    loadsBytesHere: false,
    ownsThreeResourcesHere: false,
  });
}

function projectSnapshot(
  parsed: ParsedInputV1,
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const collectionItems = [
    ...parsed.collectionInput.collectionContent.weapons.map((content) => ({
      kind: 'weapon' as const,
      definitionId: content.weaponDefinitionId,
      displayName: content.displayName,
      ordinal: content.collectionOrder,
    })),
    ...parsed.collectionInput.collectionContent.maps.map((content, index) => ({
      kind: 'map' as const,
      definitionId: content.mapDefinitionId,
      displayName: content.displayName,
      ordinal: index + 1,
    })),
  ];
  if (collectionItems.length !== 22) throw new RangeError('A6.4动态收藏目录数量不闭合。');
  const collectionDefinitionIds = new Set(collectionItems.map(({ definitionId }) => definitionId));
  if (parsed.catalog.bindings.some(({ definitionId }) => !collectionDefinitionIds.has(definitionId))) {
    throw new RangeError('A6.4 formal binding包含动态collectionContent未知Definition。');
  }
  const slots = Object.freeze(collectionItems.map((item) => {
    const binding = parsed.catalog.bindings.find((candidate) => (
      candidate.kind === item.kind && candidate.definitionId === item.definitionId
    ));
    if (binding === undefined) throw new RangeError(`A6.4 ${item.definitionId}缺少formal asset binding。`);
    const record = parsed.catalog.records.find(({ assetId }) => assetId === binding.assetId);
    if (record === undefined) throw new RangeError(`A6.4 ${binding.assetId}缺少formal asset record。`);
    const approvalEntry =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries
        .find(({ assetId }) => assetId === record.assetId);
    if (approvalEntry === undefined
      || approvalEntry.catalogContentHash
        !== ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash
      || approvalEntry.assetId !== record.assetId
      || approvalEntry.artifactPath !== record.artifactPath
      || approvalEntry.byteLength !== record.byteLength
      || approvalEntry.sha256 !== record.sha256
      || approvalEntry.maturity !== record.maturity
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted !== false
      || approvalEntry.formalReady !== false) {
      throw new RangeError(`A6.4 ${record.assetId}与当前生产批准证据账本身份或缺口事实漂移。`);
    }
    const availability = parsed.availability.get(record.assetId);
    if (availability === undefined) throw new RangeError(`A6.4 ${record.assetId}缺少availability。`);
    const withinPerItemLimit = item.kind === 'weapon' ? true as const : null;
    // provenance.approvedBy/approvedAt仅表示来源 intake 审批，不得推导生产资产批准。
    const formalReady = false as const;
    return Object.freeze({
      kind: item.kind,
      definitionId: item.definitionId,
      displayName: item.displayName,
      ordinal: item.ordinal,
      assetId: record.assetId,
      runtimeSourceKey: record.runtimeSourceKey,
      role: record.role,
      maturity: record.maturity,
      provenance: record.provenance,
      byteLength: record.byteLength,
      sha256: record.sha256,
      availability,
      formalReady,
      assetUsePermitted: false as const,
      previewSourceUse: 'text-shape-pattern-fallback-only' as const,
      previewStrategies: previewStrategies(item.kind, parsed.collectionInput.reducedMotion),
      budget: Object.freeze({
        policyId: 'arena.stage7.formal-asset-budget.v1' as const,
        coverage: item.kind === 'weapon'
          ? 'candidate-attachment-limit' as const
          : 'map-glb-not-covered-by-current-policy' as const,
        maximumEncodedBytes: item.kind === 'weapon' ? 65_536 as const : null,
        withinPerItemLimit,
        validationStatus: 'metadata-only-not-recomputed' as const,
      }),
      lifecycle: lifecycleTokens(),
      fallback: Object.freeze({
        active: !formalReady,
        content: 'text-shape-pattern-only' as const,
        preservesDefinitionIdentity: true as const,
        programmaticGeometryAllowed: false as const,
        claimsFormalApproval: false as const,
      }),
    });
  }));
  if (slots.filter(({ kind }) => kind === 'weapon').length !== 20
    || slots.filter(({ kind }) => kind === 'map').length !== 2
    || new Set(slots.map(({ assetId }) => assetId)).size !== slots.length) {
    throw new RangeError('A6.4 preview slot数量或asset一一映射不闭合。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    validationStatus: 'not-run' as const,
    epochId: parsed.collectionInput.epochId,
    tick: parsed.collectionInput.tick,
    sourceState: parsed.collectionSnapshot.sourceState,
    contentIdentity: Object.freeze({
      sourceContentHash: parsed.collectionSnapshot.contentIdentity.sourceContentHash,
      collectionContentHash: parsed.collectionSnapshot.contentIdentity.contentHash,
      catalogContentHash: parsed.catalog.contentHash,
      catalogRevision: parsed.catalog.sourceCatalogContentHash,
      productionApprovalLedgerId:
        ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.ledgerId,
      productionApprovalLedgerContentHash:
        ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.contentHash,
    }),
    budget: parsed.catalog.budget,
    slots,
    layouts: LAYOUTS,
    accessibility: Object.freeze({
      reducedMotion: parsed.collectionInput.reducedMotion,
      automaticRotationEnabled: false as const,
      muted: parsed.collectionInput.muted,
      mutedChangesPreviewMeaning: false as const,
      assetFailurePreservesTextShapePattern: true as const,
    }),
    governance: Object.freeze({
      weaponBindingCount: 20 as const,
      mapBindingCount: 2 as const,
      pageCountAdded: 0 as const,
      actionCountAdded: 0 as const,
      binaryAssetBytesAdded: 0 as const,
      programmaticNormalPathAllowed: false as const,
      formalAssetGatePassed: false as const,
      deviceEvidence: 'not-run' as const,
      screenshotEvidence: 'not-run' as const,
      performanceEvidence: 'not-run' as const,
    }),
  });
}

export function createArenaV2A6CurrentFormalPreviewAvailabilityV1(
  missingAssetIds: readonly string[] = Object.freeze([]),
): ArenaV2A6FormalPreviewAvailabilitySetV1 {
  const missing = new Set(missingAssetIds);
  if (missing.size !== missingAssetIds.length
    || [...missing].some((assetId) => !ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records
      .some((record) => record.assetId === assetId))) {
    throw new RangeError('A6.4 availability factory收到重复或未知assetId。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    ownerId: 'formal-asset-preview-availability' as const,
    catalogContentHash: ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash,
    entries: Object.freeze(
      ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records.map(({ assetId }) => Object.freeze({
        assetId,
        state: missing.has(assetId) ? 'missing' as const : 'catalog-bound' as const,
      })),
    ),
  });
}

export class ArenaV2CollectionFormalAssetReuseBindingCandidateV1 {
  #epochId: string;
  #state: ArenaV2A6FormalAssetReuseBindingLifecycleV1 =
    ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1.ACTIVE;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #contentIdentity: string | null = null;
  #catalogIdentity: string | null = null;
  #snapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 | null = null;
  #snapshotCanonical: string | null = null;
  #busy = false;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneStrictData(value, 'A6.4 constructor'),
      CONSTRUCTOR_KEYS,
      'A6.4 constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.4 constructor.epochId', 200);
  }

  get state(): ArenaV2A6FormalAssetReuseBindingLifecycleV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #assertSnapshotIntegrity(): void {
    if (this.#snapshot !== null && JSON.stringify(this.#snapshot) !== this.#snapshotCanonical) {
      throw new Error('A6.4已存快照完整性漂移，组件失败关闭。');
    }
  }

  consume(value: unknown): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
    this.#assertActive('A6.4 consume');
    this.#assertSnapshotIntegrity();
    this.#busy = true;
    try {
      const parsed = parseInput(value);
      if (parsed.collectionInput.epochId !== this.#epochId) {
        throw new RangeError('A6.4输入epochId漂移。');
      }
      const tick = parsed.collectionInput.tick;
      if (tick < this.#lastTick) throw new RangeError('A6.4输入tick回退。');
      if (tick === this.#lastTick) {
        if (parsed.canonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.4同tick输入携带冲突事实。');
        }
        if (this.#snapshot === null) throw new Error('A6.4同tick幂等状态缺少快照。');
        return this.#snapshot;
      }
      const nextContentIdentity = [
        parsed.collectionInput.collectionContent.sourceContentHash,
        parsed.collectionInput.collectionContent.contentHash,
      ].join('|');
      if (this.#contentIdentity !== null && nextContentIdentity !== this.#contentIdentity) {
        throw new RangeError('A6.4同epoch collectionContent identity/hash漂移。');
      }
      const nextCatalogIdentity = [
        parsed.catalog.sourceCatalogContentHash,
        parsed.catalog.contentHash,
      ].join('|');
      if (this.#catalogIdentity !== null && nextCatalogIdentity !== this.#catalogIdentity) {
        throw new RangeError('A6.4同epoch formal catalog revision/hash漂移。');
      }
      const snapshot = projectSnapshot(parsed);
      const snapshotCanonical = JSON.stringify(snapshot);
      this.#lastTick = tick;
      this.#lastInputCanonical = parsed.canonical;
      this.#contentIdentity = nextContentIdentity;
      this.#catalogIdentity = nextCatalogIdentity;
      this.#snapshot = snapshot;
      this.#snapshotCanonical = snapshotCanonical;
      return snapshot;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 | null {
    this.#assertActive('A6.4 getSnapshot');
    this.#assertSnapshotIntegrity();
    return this.#snapshot;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.4 resetPresentationEpoch');
    this.#assertSnapshotIntegrity();
    const source = exactRecord(
      cloneStrictData(value, 'A6.4 epoch reset'),
      RESET_KEYS,
      'A6.4 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.4 epoch reset.epochId', 200);
    if (epochId === this.#epochId) throw new RangeError('A6.4 reset必须使用新epochId。');
    this.#epochId = epochId;
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#catalogIdentity = null;
    this.#snapshot = null;
    this.#snapshotCanonical = null;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1.DESTROYED) return;
    if (this.#busy) throw new Error('A6.4 consume期间不能destroy。');
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#catalogIdentity = null;
    this.#snapshot = null;
    this.#snapshotCanonical = null;
    this.#state = ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_LIFECYCLE_V1.DESTROYED;
  }
}

export const ARENA_V2_A6_FORMAL_ASSET_REUSE_REFERENCE_LEDGER_V1 = Object.freeze([
  Object.freeze({ read: true as const, path: '.agents/skills/game-art-director/SKILL.md' }),
  Object.freeze({ read: false as const, path: '.agents/skills/game-art-director/templates/art-bible.md', failureReason: 'skill-package-missing-use-project-art-bible' as const }),
  Object.freeze({ read: false as const, path: 'docs/collaboration-protocol.md', failureReason: 'repository-missing-use-project-governance' as const }),
  Object.freeze({ read: false as const, path: 'docs/game-design-theory.md', failureReason: 'repository-missing-use-project-production-plan' as const }),
  Object.freeze({ read: true as const, path: '.agents/skills/media-asset-management/SKILL.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/media-asset-management/references/responsive-image-patterns.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/SKILL.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/ui-patterns.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-art-bible.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-art-development-alignment-matrix.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-v2-production-development-plan.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-art-and-audio-development-flow.md' }),
  Object.freeze({ read: true as const, path: 'docs/decisions/027-arena-formal-asset-intake-provenance.md' }),
  Object.freeze({ read: true as const, path: 'docs/acceptance/stage7-formal-assets/README.md' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation-three/src/arena-v2-collection-progress-component-set-candidate-v1.ts' }),
] as const);

export const ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
  rendererNeutral: true as const,
  pageCountAdded: 0 as const,
  actionCountAdded: 0 as const,
  binaryAssetBytesAdded: 0 as const,
  localProductionContentIdCatalog: false as const,
  loadsAssetBytes: false as const,
  createsThreeResources: false as const,
  programmaticNormalPathAllowed: false as const,
  currentProductionApprovalLedgerVersion: 1 as const,
  currentProductionApprovedPreviewAssetCount: 0 as const,
  currentAssetUsePermittedPreviewAssetCount: 0 as const,
  futureApprovalRequiresNewLedgerVersionAndIndependentGate: true as const,
  supportedScreens: Object.freeze([
    'weapon-index', 'weapon-detail', 'map-index', 'map-detail',
  ] as const),
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  performanceEvidence: 'not-run' as const,
  referenceLedger: ARENA_V2_A6_FORMAL_ASSET_REUSE_REFERENCE_LEDGER_V1,
});
