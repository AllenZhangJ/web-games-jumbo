import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A4 playable character production review preparation candidate V1 (not run)', () => {
  it('closes six handling identities over one intentionally shared model', () => {
    expect(PREPARATION.summary).toMatchObject({
      gameplayCharacterCount: 6,
      presentationIdentityCount: 6,
      sharedModelAssetCount: 1,
      materialProfileCount: 6,
      valuePatternCount: 6,
      selectionPoseCount: 6,
    });
    expect(PREPARATION.playableCharacterReviewPack).toMatchObject({
      sharedModelReuseIntentional: true,
      sixDistinctModelAssetsRequired: false,
      sixDistinctNeutralPoseGeometrySilhouettesClaimed: false,
      sharedStaticGeometryCannotProveSixNeutralPoseSilhouettesByItself: true,
      roleRecognitionMustNotDependOnColor: true,
    });
  });

  it('preserves one simple input contract and six limited movement identities', () => {
    const rows = PREPARATION.playableCharacterReviewPack.characterReviewRows;
    expect(rows.map(({ handlingKind }) => handlingKind)).toEqual([
      'balanced', 'sprint', 'air-control', 'high-jump', 'quick-start', 'forgiving',
    ]);
    expect(rows.every((row) => (
      row.inputContract[0] === 'direction'
      && row.inputContract[1] === 'jump'
      && row.inputContract[2] === 'primary-attack'
      && row.sharedMaximumAirJumps === rows[0]?.sharedMaximumAirJumps
      && row.sharedCollisionHash === rows[0]?.sharedCollisionHash
      && row.animationSemanticBindings.length === 19
      && row.reviewStatus === 'not-run'
    ))).toBe(true);
  });

  it('binds six non-color value patterns and six selection poses without approval claims', () => {
    const rows = PREPARATION.playableCharacterReviewPack.characterReviewRows;
    expect(new Set(rows.map(({ materialProfileId }) => materialProfileId)).size).toBe(6);
    expect(new Set(rows.map(({ valuePattern }) => valuePattern.id)).size).toBe(6);
    expect(new Set(rows.map(({ selectionPose }) => (
      `${selectionPose.semantic}:${selectionPose.sampleRatio}`
    ))).size).toBe(6);
    expect(rows.every((row) => (
      row.valuePattern.meshValueMultipliers.length === 7
      && row.valuePattern.colorIsNeverSoleSignal === true
      && row.valuePattern.evidenceStatus === 'specified-not-captured'
      && row.productionApproved === false
      && row.formalReady === false
    ))).toBe(true);
  });

  it('keeps shared model, texture and all production gates closed', () => {
    expect(PREPARATION.playableCharacterReviewPack.modelAsset).toMatchObject({
      sourceApprovalRecorded: true,
      productionApprovalStatus: 'missing-not-approved',
      productionApproved: false,
      formalReady: false,
      assetUsePermitted: false,
    });
    expect(PREPARATION.playableCharacterReviewPack.externalTextureDependency).toMatchObject({
      workBatchId: 'a4-formal-material-textures',
      productionApprovalStatus: 'missing-not-approved',
      productionApproved: false,
      formalReady: false,
      assetUsePermitted: false,
    });
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
      loadsAssets: false,
      participatesInGameplayAuthority: false,
      changesCharacterCount: false,
      changesInputContract: false,
      addsCharacterSkills: false,
      changesCollisionMovementJumpOrActionTiming: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.playableCharacterReviewPack.reviewChecklist).toHaveLength(10);
    expect(PREPARATION.playableCharacterReviewPack.reviewChecklist.every(({
      evidenceStatus,
    }) => evidenceStatus === 'not-run')).toBe(true);
  });
});
