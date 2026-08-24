import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A5 core feedback VFX production review preparation candidate V1 (not run)', () => {
  it('closes five textures, five semantics and 483 specialized cues', () => {
    expect(PREPARATION.summary).toMatchObject({
      textureAssetCount: 5,
      feedbackSemanticCount: 5,
      specializedCueCount: 483,
      weaponSpecificStyleCount: 480,
      totalEncodedBytes: 21_539,
      totalRgba8DecodedByteEstimate: 327_680,
    });
    const rows = PREPARATION.coreFeedbackVfxReviewPack.vfxTextureReviewRows;
    expect(new Set(rows.map(({ textureAsset }) => textureAsset.assetId)).size).toBe(5);
    expect(new Set(rows.map(({ textureAsset }) => textureAsset.cueId)).size).toBe(5);
    expect(new Set(rows.map(({ semantic }) => semantic.feedbackKind)).size).toBe(5);
  });

  it('preserves shape timing value and non-color causal identities', () => {
    expect(PREPARATION.coreFeedbackVfxReviewPack.shapeTimingColorContract).toEqual({
      orderRequired: true,
      valueContrastPolicy: 'bright-core-dark-edge',
      essentialLayers: ['core', 'direction', 'result'],
      optionalLayers: ['decoration'],
      authoredCoreTextureRemainsRequired: true,
      generatedWeaponGeometryIsSupportingLayerOnly: true,
      colorIsNeverSoleSignal: true,
    });
    expect(PREPARATION.coreFeedbackVfxReviewPack.vfxTextureReviewRows.every((row) => (
      row.semantic.colorIsNeverSoleSignal === true
      && row.textureReview.grayscaleReviewStatus === 'not-run'
      && row.textureReview.darkMapReviewStatus === 'not-run'
      && row.textureReview.lightMapReviewStatus === 'not-run'
    ))).toBe(true);
  });

  it('keeps mobile particle overdraw quality and off-switch budgets bounded', () => {
    expect(PREPARATION.coreFeedbackVfxReviewPack.qualityAndParticleContract).toEqual({
      offOrReducedMotion: { maximumLayers: 1, maximumParticles: 0 },
      low: { maximumLayers: 1, maximumParticles: 24 },
      medium: { maximumLayers: 2, maximumParticles: 48 },
      high: { maximumLayers: 3, maximumParticles: 96 },
      maximumAverageOverdraw: 2,
      distortionAllowed: false,
      explicitOffSwitchRequired: true,
      boundedLifetimeRequired: true,
      pooledOwnershipRequired: true,
      maximumActiveSourceEventIdentities: 64,
      particleBoundsReviewStatus: 'not-run',
      deviceOverdrawReviewStatus: 'not-run',
    });
  });

  it('keeps all asset production and authority gates closed', () => {
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
      downloadsAssets: false,
      loadsOrDecodesAssets: false,
      rendersEffects: false,
      participatesInGameplayAuthority: false,
      changesFeedbackSemanticsOrCausality: false,
      changesVfxRuntimeLayerParticleOrOverdrawBudgets: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.coreFeedbackVfxReviewPack.vfxTextureReviewRows.every((row) => (
      row.textureAsset.productionApprovalStatus === 'missing-not-approved'
      && row.textureAsset.productionApproved === false
      && row.textureAsset.formalReady === false
      && row.textureAsset.assetUsePermitted === false
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
    expect(PREPARATION.coreFeedbackVfxReviewPack.reviewChecklist).toHaveLength(10);
  });
});
