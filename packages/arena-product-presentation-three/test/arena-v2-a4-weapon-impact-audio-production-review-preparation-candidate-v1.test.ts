import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A4 weapon impact audio production review preparation candidate V1 (not run)', () => {
  it('closes twenty weapon impacts plus one unarmed base push', () => {
    expect(PREPARATION.summary).toMatchObject({
      impactAudioAssetCount: 21,
      weaponImpactAudioAssetCount: 20,
      unarmedImpactAudioAssetCount: 1,
      exactWeaponActionIdentityCount: 40,
      sourceApprovalRecordedAssetCount: 4,
      authoredCandidateAssetCount: 17,
      totalEncodedBytes: 125_974,
    });
    const rows = PREPARATION.impactAudioReviewPack.impactAudioReviewRows;
    expect(new Set(rows.map(({ audioAsset }) => audioAsset.assetId)).size).toBe(21);
    expect(rows.filter(({ identity }) => identity.identityKind === 'weapon-impact')).toHaveLength(20);
    expect(rows.filter(({ identity }) => identity.identityKind === 'unarmed-base-push')).toHaveLength(1);
  });

  it('binds each weapon to exact ground and aerial grammar identities', () => {
    const weaponRows = PREPARATION.impactAudioReviewPack.impactAudioReviewRows.filter(
      ({ identity }) => identity.identityKind === 'weapon-impact',
    );
    expect(weaponRows.every(({ identity }) => (
      identity.weaponId !== null
      && identity.weaponDefinitionId !== null
      && identity.actionDefinitionIds.length === 2
      && identity.actionContexts.join(',') === 'ground,aerial'
      && identity.combatGrammarIdentityCount === 2
      && identity.feedbackRecipeCount === 24
    ))).toBe(true);
    expect(PREPARATION.impactAudioReviewPack.impactActionLookupPolicy)
      .toBe('exact-action-definition-id');
  });

  it('records deterministic bounded playback and mix requirements as unverified', () => {
    expect(PREPARATION.impactAudioReviewPack.mixReviewContract).toEqual({
      route: 'voice-gain→SFX→Master→limiter→destination',
      sfxBusGainDb: 0,
      masterHeadroomDb: -6,
      limiter: {
        thresholdDb: -3,
        kneeDb: 0,
        ratio: 20,
        attackSeconds: 0.003,
        releaseSeconds: 0.18,
      },
      maximumConcurrentVoices: 8,
      overflowPolicy: 'drop-lowest-priority',
      mixGraphRuntimeReviewStatus: 'not-run',
      clippingAndMaskingReviewStatus: 'not-run',
    });
    expect(PREPARATION.impactAudioReviewPack.impactAudioReviewRows.every((row) => (
      row.playbackReviewContract.deterministicVariationSource === 'sourceEventId'
      && row.playbackReviewContract.playbackRateVariants.join(',') === '0.96,1,1.04'
      && row.playbackReviewContract.maximumConcurrentVoices === 8
      && row.playbackReviewContract.runtimeBindingReviewStatus === 'not-run'
      && row.audioQualityReview.decodeStatus === 'not-run'
      && row.audioQualityReview.blindListenIdentityStatus === 'not-run'
      && row.audioQualityReview.mobileDeviceStatus === 'not-run'
    ))).toBe(true);
  });

  it('keeps authority and silent fallback independent from sound', () => {
    expect(PREPARATION.impactAudioReviewPack.causalAndAccessibilityContract).toEqual({
      impactAudioConsumesAuthorityDerivedCommandsOnly: true,
      audioNeverInfersHitRingOutOrMovement: true,
      muteRetainsVisualShapeDirectionResultTextAndAnnouncement: true,
      audioLoadFailureDoesNotChangeAuthority: true,
      syntheticOrUnrelatedFallbackAllowed: false,
      playerBlindListenReviewRequired: true,
    });
  });

  it('keeps all asset and production gates closed', () => {
    expect(PREPARATION).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      createsOrModifiesAssets: false,
      downloadsAssets: false,
      convertsAssets: false,
      loadsOrDecodesAssets: false,
      playsAudio: false,
      participatesInGameplayAuthority: false,
      changesWeaponCount: false,
      changesActionTimingHitRingOutOrMovement: false,
      changesAudioRuntimeOrMix: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.impactAudioReviewPack.impactAudioReviewRows.every((row) => (
      row.audioAsset.productionApprovalStatus === 'missing-not-approved'
      && row.audioAsset.productionApproved === false
      && row.audioAsset.formalReady === false
      && row.audioAsset.assetUsePermitted === false
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
    expect(PREPARATION.impactAudioReviewPack.reviewChecklist).toHaveLength(10);
  });
});
