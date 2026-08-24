import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as WORK_QUEUE,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1 as READINESS,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as APPROVAL_LEDGER,
} from '../src/index.js';

describe('Arena V2 A3-A6 formal asset production work queue candidate V1 (not run)', () => {
  it('orders every current catalog asset into one preparation batch', () => {
    const assetIds = WORK_QUEUE.workBatches.flatMap((batch) => batch.assetIds);
    expect(WORK_QUEUE.workBatches).toHaveLength(9);
    expect(WORK_QUEUE.workBatches.map(({ priority }) => priority)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(WORK_QUEUE.workBatches[0]?.batchId).toBe('a3-map-models');
    expect(assetIds).toHaveLength(130);
    expect(new Set(assetIds).size).toBe(130);
    expect(new Set(assetIds)).toEqual(new Set(
      READINESS.catalogAssets.map(({ assetId }) => assetId),
    ));
  });

  it('keeps all production gates closed while allowing preparation work', () => {
    expect(WORK_QUEUE).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      createsOrModifiesAssets: false,
      loadsAssets: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(WORK_QUEUE.currentPreparationPolicy).toEqual({
      allowedScope: 'contract-source-budget-and-review-preparation-only',
      nextPreparationBatchId: 'a3-map-models',
      unblockedProductionBatchIds: [],
      productionBlockoutAllowed: false,
      integrationAllowed: false,
      finalAllowed: false,
    });
    expect(WORK_QUEUE.workBatches.every((batch) => (
      batch.currentAllowedScope
        === 'contract-source-budget-and-review-preparation-only'
      && batch.productionBlockoutAllowed === false
      && batch.integrationAllowed === false
      && batch.finalAllowed === false
      && batch.assetUsePermitted === false
    ))).toBe(true);
  });

  it('binds the current approval gaps without fabricating evidence', () => {
    expect(WORK_QUEUE.summary).toEqual({
      batchCount: 9,
      assetCount: 130,
      preparationBatchCount: 9,
      productionBlockoutBatchCount: 0,
      integrationBatchCount: 0,
      finalBatchCount: 0,
      productionApprovalMissingAssetCount:
        APPROVAL_LEDGER.summary.productionApprovalMissingAssetCount,
      missingEvidenceSlotCount: APPROVAL_LEDGER.summary.missingEvidenceSlotCount,
    });
    expect(WORK_QUEUE.blockingPrerequisites).toHaveLength(3);
    expect(WORK_QUEUE.workBatches.reduce((sum, batch) => (
      sum + batch.productionApprovalMissingAssetCount
    ), 0)).toBe(130);
    expect(WORK_QUEUE.workBatches.reduce((sum, batch) => (
      sum + batch.missingEvidenceSlotCount
    ), 0)).toBe(910);
  });
});
