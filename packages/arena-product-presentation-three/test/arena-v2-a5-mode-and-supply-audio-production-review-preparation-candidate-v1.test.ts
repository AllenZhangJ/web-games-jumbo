import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A5 mode and supply audio production review preparation candidate V1 (not run)', () => {
  it('closes thirteen mode and four supply audio candidates', () => {
    expect(PREPARATION.summary).toMatchObject({
      modeAudioAssetCount: 13,
      supplyAudioAssetCount: 4,
      totalAudioAssetCount: 17,
      sourceApprovalRecordedAssetCount: 0,
      authoredCandidateAssetCount: 17,
      totalEncodedBytes: 92_077,
    });
    const rows = PREPARATION.modeAndSupplyAudioReviewPack.modeSupplyAudioReviewRows;
    expect(new Set(rows.map(({ audioAsset }) => audioAsset.assetId)).size).toBe(17);
    expect(new Set(rows.map(({ audioAsset }) => audioAsset.cueId)).size).toBe(17);
  });

  it('keeps mode and supply cues on explicit authority identities only', () => {
    const rows = PREPARATION.modeAndSupplyAudioReviewPack.modeSupplyAudioReviewRows;
    expect(rows.every((row) => (
      row.causalIdentity.actionDefinitionId === null
      && row.causalIdentity.combatGrammarIdentity === null
      && row.causalIdentity.worldStateOrAnimationInferenceAllowed === false
      && row.causalIdentity.audioPlaybackMayWriteAuthority === false
    ))).toBe(true);
    expect(PREPARATION.modeAndSupplyAudioReviewPack.causalPriorityContract).toMatchObject({
      supplyVoicePriority: 1,
      matchEndedVoicePriority: 3,
      audioNeverInfersModeSupplyFallRespawnOrResult: true,
      supplyNeverInfersLifecycleFromMarkerDisappearance: true,
      combatGrammarIdentity: null,
    });
  });

  it('preserves semantic congestion mute and lifecycle boundaries', () => {
    const rows = PREPARATION.modeAndSupplyAudioReviewPack.modeSupplyAudioReviewRows;
    expect(rows.filter(({ causalIdentity }) => causalIdentity.category === 'supply').every(
      ({ playbackReviewContract }) => playbackReviewContract.voicePriority === 1,
    )).toBe(true);
    expect(PREPARATION.modeAndSupplyAudioReviewPack.mixReviewContract).toMatchObject({
      maximumConcurrentVoices: 8,
      overflowPolicy: 'drop-lowest-priority',
      maximumSeenSourceEventIdentities: 64,
      mixGraphRuntimeReviewStatus: 'not-run',
    });
    expect(PREPARATION.modeAndSupplyAudioReviewPack.muteRestoreAndLifecycleContract).toEqual({
      muteRetainsVisualTextAndAnnouncementCausality: true,
      muteAdvancesConsumedSourceEventWatermark: true,
      unmuteDoesNotBackfillPastOneShots: true,
      restoredPastEventsRemainSilent: true,
      audioLoadFailureDoesNotChangeAuthority: true,
      stopAllAndDestroyReviewStatus: 'not-run',
    });
  });

  it('keeps all production playback and approval gates closed', () => {
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
      changesModeSupplyFallRespawnOrResultSemantics: false,
      changesAudioRuntimeQueueVoiceOrMixBudgets: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.modeAndSupplyAudioReviewPack.reviewChecklist).toHaveLength(10);
    expect(PREPARATION.modeAndSupplyAudioReviewPack.modeSupplyAudioReviewRows.every((row) => (
      row.audioAsset.productionApprovalStatus === 'missing-not-approved'
      && row.audioAsset.productionApproved === false
      && row.audioAsset.formalReady === false
      && row.audioAsset.assetUsePermitted === false
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
  });
});
