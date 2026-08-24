import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A4 weapon phase audio production review preparation candidate V1 (not run)', () => {
  it('closes twenty weapons by windup release and recovery', () => {
    expect(PREPARATION.summary).toMatchObject({
      weaponCount: 20,
      phaseAudioAssetCount: 60,
      phaseIdentityCount: 60,
      authoredCandidateAssetCount: 60,
    });
    const rows = PREPARATION.phaseAudioReviewPack.phaseAudioReviewRows;
    expect(new Set(rows.map(({ audioAsset }) => audioAsset.assetId)).size).toBe(60);
    expect(new Set(rows.map(({ identity }) => identity.cueId)).size).toBe(60);
    expect(new Set(rows.map(({ identity }) => identity.weaponId)).size).toBe(20);
    expect(new Set(rows.map(({ identity }) => `${identity.weaponId}:${identity.phase}`)).size)
      .toBe(60);
  });

  it('keeps audio phases bound to action-start and authority phases', () => {
    expect(PREPARATION.phaseAudioReviewPack.authorityContract).toEqual({
      localParticipantOnly: true,
      source: 'ActionStarted+participant.action.phase',
      authorityToAudioPhase: {
        windup: 'windup',
        active: 'release',
        recovery: 'recovery',
      },
      animationDoesNotDrivePhase: true,
      audioDoesNotInferHitOrDirection: true,
      exactEquipmentAndSurvivalTierIdentityRequired: true,
      restoredMidActionWithoutObservedStartStaysSilent: true,
      muteAdvancesDedupeWaterlineWithoutBackfill: true,
    });
    expect(PREPARATION.phaseAudioReviewPack.phaseAudioReviewRows.every(({ identity }) => (
      identity.actionDefinitionIds.length === 2
      && identity.actionContexts.join(',') === 'ground,aerial'
      && identity.combatGrammarIdentity === null
    ))).toBe(true);
  });

  it('separates release from impact and keeps bounded phase priorities', () => {
    expect(PREPARATION.phaseAudioReviewPack.mixReviewContract).toMatchObject({
      bus: 'SFX',
      windupGainDb: -6,
      releaseGainDb: -3,
      recoveryGainDb: -6,
      windupPriority: 1,
      releasePriority: 2,
      recoveryPriority: 1,
      maximumConcurrentVoices: 8,
      overflowPolicy: 'drop-lowest-priority',
      impactModeSupplyMaskingReviewStatus: 'not-run',
    });
    expect(PREPARATION.phaseAudioReviewPack.phaseAudioReviewRows.every((row) => (
      row.identity.phaseIntent.resultRead.startsWith('never-')
      && row.playbackReviewContract.deterministicVariationSource === 'sourceEventId'
      && row.playbackReviewContract.runtimeBindingReviewStatus === 'not-run'
      && row.audioQualityReview.phaseVersusImpactSeparationStatus === 'not-run'
      && row.audioQualityReview.mobileDeviceStatus === 'not-run'
    ))).toBe(true);
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
      changesWeaponOrActionCount: false,
      changesActionTimingControlHitRingOutOrMovement: false,
      changesAudioOwnerRuntimeOrMix: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.phaseAudioReviewPack.phaseAudioReviewRows.every((row) => (
      row.audioAsset.productionApprovalStatus === 'missing-not-approved'
      && row.audioAsset.productionApproved === false
      && row.audioAsset.formalReady === false
      && row.audioAsset.assetUsePermitted === false
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
    expect(PREPARATION.phaseAudioReviewPack.reviewChecklist).toHaveLength(10);
  });
});
