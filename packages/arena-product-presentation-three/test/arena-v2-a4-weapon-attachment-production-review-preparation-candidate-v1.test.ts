import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A4 weapon attachment production review preparation candidate V1 (not run)', () => {
  it('closes twenty gameplay weapons, attachments and silhouette families one to one', () => {
    expect(PREPARATION.summary).toMatchObject({
      weaponCount: 20,
      attachmentAssetCount: 20,
      silhouetteFamilyCount: 20,
      externalTextureDependencyCount: 1,
    });
    const rows = PREPARATION.weaponAttachmentReviewPack.weaponReviewRows;
    expect(new Set(rows.map(({ weaponId }) => weaponId)).size).toBe(20);
    expect(new Set(rows.map(({ modelAsset }) => modelAsset.assetId)).size).toBe(20);
    expect(new Set(rows.map(({ silhouette }) => silhouette.family)).size).toBe(20);
  });

  it('preserves the simple shared input and two-action combat grammar', () => {
    expect(PREPARATION.weaponAttachmentReviewPack.sharedInputConcepts).toEqual([
      'direction', 'jump', 'primary',
    ]);
    expect(PREPARATION.weaponAttachmentReviewPack.weaponReviewRows.every((row) => (
      row.requiredInput === 'primary'
      && row.actionReads.length === 2
      && row.actionReads[0]?.context === 'ground'
      && row.actionReads[1]?.context === 'aerial'
      && row.modeConsequences.length === 3
      && row.actionReadability.noHitInference === true
    ))).toBe(true);
  });

  it('prepares held, ground and three-phase readability without claiming rendered proof', () => {
    expect(PREPARATION.weaponAttachmentReviewPack.weaponReviewRows.every((row) => (
      row.grip.slotId === 'handslot.r'
      && row.grip.forwardAxis === '-Z'
      && row.grip.transformProof === 'candidate-local-transform-not-render-verified'
      && row.groundPickup.motionRequired === false
      && row.cameraBands.map(({ distanceMeters }) => distanceMeters).join(',') === '0,5,12'
      && row.postLoadVerification.boundingBoxStatus === 'not-run'
      && row.postLoadVerification.facingStatus === 'not-run'
      && row.postLoadVerification.heldScaleAndFitStatus === 'not-run'
      && row.postLoadVerification.groundAlignmentStatus === 'not-run'
      && row.postLoadVerification.screenshotStatus === 'not-run'
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
      loadsAssets: false,
      participatesInGameplayAuthority: false,
      changesWeaponCount: false,
      changesInputContract: false,
      changesActionTimingHitOrMovement: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.weaponAttachmentReviewPack.weaponReviewRows.every((row) => (
      row.modelAsset.productionApprovalStatus === 'missing-not-approved'
      && row.modelAsset.productionApproved === false
      && row.modelAsset.formalReady === false
      && row.modelAsset.assetUsePermitted === false
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
    expect(PREPARATION.weaponAttachmentReviewPack.reviewChecklist).toHaveLength(11);
  });
});
