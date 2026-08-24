import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-readiness-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
} from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';

type FormalAssetMediaKind = 'audio' | 'model' | 'texture';

const readiness = ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1;
const ledger = ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1;
const catalogHash = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash;

if (readiness.currentCatalogContentHash !== catalogHash || ledger.catalogContentHash !== catalogHash) {
  throw new RangeError('Arena V2正式资产生产批准索引与Catalog身份漂移。');
}

const LEDGER_ENTRY_BY_ASSET_ID = new Map(ledger.entries.map((entry) => (
  [entry.assetId, entry] as const
)));

const APPROVAL_RECORDS = Object.freeze(readiness.catalogAssets.map((asset) => {
  const entry = LEDGER_ENTRY_BY_ASSET_ID.get(asset.assetId);
  if (
    entry === undefined
    || entry.artifactPath !== asset.artifactPath
    || entry.byteLength !== asset.byteLength
    || entry.sha256 !== asset.sha256
  ) throw new RangeError(`Arena V2正式资产生产批准索引缺少精确身份：${asset.assetId}。`);
  return Object.freeze({
    assetId: asset.assetId,
    mediaKind: asset.mediaKind,
    productionApproved: Boolean(asset.productionApproved),
    assetUsePermitted: Boolean(entry.assetUsePermitted),
    formalReady: Boolean(asset.formalReady) && Boolean(entry.formalReady),
  });
}));

if (
  APPROVAL_RECORDS.length !== ledger.entries.length
  || LEDGER_ENTRY_BY_ASSET_ID.size !== ledger.entries.length
) throw new RangeError('Arena V2正式资产生产批准索引必须与逐资产账本精确闭合。');

const APPROVED_ASSET_IDS = Object.freeze(APPROVAL_RECORDS
  .filter(({ productionApproved, assetUsePermitted, formalReady }) => (
    productionApproved && assetUsePermitted && formalReady
  ))
  .map(({ assetId }) => assetId)
  .sort());
const APPROVED_ASSET_ID_SET = new Set(APPROVED_ASSET_IDS);

const MATERIAL_TEXTURE_DEPENDENCIES_BY_MODEL_ID = new Map<string, string[]>();
for (const binding of ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
  .materialTextureBindings) {
  const dependencies = MATERIAL_TEXTURE_DEPENDENCIES_BY_MODEL_ID
    .get(binding.consumerVisualAssetId) ?? [];
  dependencies.push(binding.textureAssetId);
  MATERIAL_TEXTURE_DEPENDENCIES_BY_MODEL_ID.set(binding.consumerVisualAssetId, dependencies);
}

function approvedIds(mediaKind: FormalAssetMediaKind): readonly string[] {
  return Object.freeze(APPROVAL_RECORDS
    .filter((record) => (
      record.mediaKind === mediaKind && APPROVED_ASSET_ID_SET.has(record.assetId)
    ))
    .map(({ assetId }) => assetId)
    .sort());
}

const PRODUCTION_APPROVED_MODEL_ASSET_IDS = Object.freeze(APPROVAL_RECORDS
  .filter((record) => {
    if (record.mediaKind !== 'model' || !APPROVED_ASSET_ID_SET.has(record.assetId)) return false;
    const textureDependencies = MATERIAL_TEXTURE_DEPENDENCIES_BY_MODEL_ID.get(record.assetId) ?? [];
    return textureDependencies.every((textureAssetId) => (
      APPROVED_ASSET_ID_SET.has(textureAssetId)
    ));
  })
  .map(({ assetId }) => assetId)
  .sort());

if (APPROVED_ASSET_IDS.length !== 0 || PRODUCTION_APPROVED_MODEL_ASSET_IDS.length !== 0) {
  throw new RangeError('Arena V2当前V1生产批准账本必须保持零资产获批。');
}

export function isArenaV2FormalAssetProductionApprovedCandidateV1(assetId: string): boolean {
  return APPROVED_ASSET_ID_SET.has(assetId);
}

export function isArenaV2FormalModelLoadPermittedCandidateV1(assetId: string): boolean {
  return PRODUCTION_APPROVED_MODEL_ASSET_IDS.includes(assetId);
}

export const ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  catalogContentHash: catalogHash,
  ledgerIdentity: readiness.productionApprovalEvidenceProjection.ledgerIdentity,
  registeredAssetCount: APPROVAL_RECORDS.length,
  productionApprovedAssetIds: APPROVED_ASSET_IDS,
  productionApprovedModelAssetIds: PRODUCTION_APPROVED_MODEL_ASSET_IDS,
  productionApprovedAudioAssetIds: approvedIds('audio'),
  productionApprovedTextureAssetIds: approvedIds('texture'),
  currentProductionApprovedAssetCount: 0 as const,
  sourceIntakeDoesNotGrantProductionApproval: true as const,
  candidateBudgetCoverageDoesNotGrantProductionApproval: true as const,
  requiresProductionApprovalAndAssetUsePermissionAndFormalReadiness: true as const,
  modelLoadingRequiresApprovedExternalTextureDependencyClosure: true as const,
});
