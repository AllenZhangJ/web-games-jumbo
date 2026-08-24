import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as WORK_QUEUE,
} from '../src/index.js';

describe('Arena V2 A3 survival enemy production review preparation candidate V1 (not run)', () => {
  it('preserves one authority family and one visual archetype through all pressure stages', () => {
    expect(PREPARATION.summary).toMatchObject({
      enemyAuthorityFamilyCount: 1,
      enemyVisualArchetypeCount: 1,
      pressureStageCount: 10,
      maximumActiveEnemyCount: 16,
    });
    expect(PREPARATION.enemyReviewPack.pressureIdentity.desiredActiveEnemyCounts).toEqual([
      1, 2, 3, 4, 5, 6, 8, 10, 12, 16,
    ]);
    expect(PREPARATION.enemyReviewPack.silhouetteAndConsistencyBrief).toMatchObject({
      slotVisualVariationAllowed: false,
      stageVisualVariantAllowed: false,
      collisionScaleVariationAllowed: false,
      colorRarityVariationAllowed: false,
      proportionReviewStatus: 'not-run',
      thumbnailSilhouetteReviewStatus: 'not-run',
    });
  });

  it('binds the model and external texture without promoting source intake to production approval', () => {
    expect(WORK_QUEUE.workBatches[1]?.batchId).toBe('a3-survival-enemy-model');
    expect(WORK_QUEUE.workBatches[1]?.assetIds).toEqual([
      PREPARATION.enemyReviewPack.modelAsset.assetId,
    ]);
    expect(PREPARATION.enemyReviewPack.modelAsset).toMatchObject({
      sourceApprovalRecorded: true,
      productionApprovalStatus: 'missing-not-approved',
      productionApproved: false,
      formalReady: false,
      assetUsePermitted: false,
    });
    expect(PREPARATION.enemyReviewPack.externalTextureDependency).toMatchObject({
      workBatchId: 'a4-formal-material-textures',
      productionApprovalStatus: 'missing-not-approved',
      productionApproved: false,
      formalReady: false,
      assetUsePermitted: false,
    });
  });

  it('exposes every animation semantic and every review item as not run', () => {
    expect(PREPARATION.enemyReviewPack.animationSemanticBindings).toHaveLength(19);
    expect(new Set(PREPARATION.enemyReviewPack.animationSemanticBindings.map(({
      semantic,
    }) => semantic)).size).toBe(19);
    expect(PREPARATION.enemyReviewPack.animationSemanticBindings.every((binding) => (
      binding.sourceKind === 'clip'
      && binding.sourceKey.length > 0
      && binding.reviewStatus === 'not-run'
    ))).toBe(true);
    expect(PREPARATION.enemyReviewPack.sourceIntakeRuntimeClipCount).toBe(18);
    expect(PREPARATION.enemyReviewPack.reviewChecklist).toHaveLength(9);
    expect(PREPARATION.enemyReviewPack.reviewChecklist.every(({
      evidenceStatus,
    }) => evidenceStatus === 'not-run')).toBe(true);
  });

  it('keeps every production and runtime gate closed', () => {
    expect(PREPARATION).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      createsOrModifiesAssets: false,
      createsReferenceImages: false,
      usesAiGeneration: false,
      loadsAssets: false,
      participatesInGameplayAuthority: false,
      changesEnemyFamilyCount: false,
      changesPressurePolicy: false,
      changesCollisionMovementOrActionTiming: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.enemyReviewPack).toMatchObject({
      reviewStatus: 'not-run',
      productionBlockoutAllowed: false,
      integrationAllowed: false,
      finalAllowed: false,
    });
  });
});
