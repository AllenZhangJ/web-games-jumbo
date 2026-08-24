import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
} from '../src/index.js';

describe('Arena V2 single weapon production readiness candidate V1', () => {
  it('projects twenty independent weapon gates in collection order', () => {
    const matrix = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1;
    expect(matrix).toMatchObject({
      status: 'production-unreachable',
      validationStatus: 'not-run',
      weaponCount: 20,
      independentlyBlockedWeaponCount: 20,
      productionRegistrationPermittedWeaponCount: 0,
      independentRollbackUnitCount: 20,
      groupRegistrationPermitted: false,
      allOrNothingRegistrationAllowed: false,
      defaultRegistryWired: false,
      acceptsCallerSuppliedApproval: false,
      productionApprovalUsesSharedLedgerIndex: true,
      modelApprovalRequiresExternalTextureDependencyClosure: true,
    });
    expect(matrix.weapons.map(({ weaponId }) => weaponId)).toEqual(
      ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    );
    expect(matrix.weapons.map(({ collectionOrder }) => collectionOrder)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it('closes exact actions, phase audio, VFX and the three-input contract per weapon', () => {
    for (const entry of ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1.weapons) {
      expect(entry.inputContract).toEqual({
        authorityContractHash: expect.stringMatching(/^[0-9a-f]{8}$/),
        concepts: ['direction', 'jump', 'primary-attack'],
        inputFrameProjection: {
          direction: ['moveX', 'moveZ'],
          jump: ['jumpPressed', 'jumpHeld'],
          primaryAttack: ['primaryPressed', 'primaryHeld'],
          forcedInactive: ['slamPressed'],
        },
        requiredWeaponActionInput: 'primary',
        requiredWeaponActionTrigger: 'pressed',
        primaryPressHoldRelease: {
          pressStartsGroundOrAerialAction: true,
          holdSupportsCommitment: true,
          releaseCommitsOrCancelsByAuthorityTicks: true,
          contextAddsButtons: false,
        },
        addsInput: false,
        addsAction: false,
        crouchEnabled: false,
        blockEnabled: false,
        dashEnabled: false,
        slamEnabled: false,
      });
      expect(entry.actionContexts.map(({ actionContext }) => actionContext)).toEqual([
        'ground',
        'aerial',
      ]);
      expect(entry.actionContexts.every(({ inputChannel, actionPresentationRegistered }) => (
        inputChannel === 'primary' && actionPresentationRegistered
      ))).toBe(true);
      expect(entry.phaseAudio.map(({ phase }) => phase)).toEqual([
        'windup',
        'release',
        'recovery',
      ]);
      expect(entry.phaseAudio.every(({ registered }) => registered)).toBe(true);
      expect(entry.phaseAudio.every(({ productionResolutionApproved }) => (
        productionResolutionApproved === false
      ))).toBe(true);
      expect(entry.coreFeedbackVfx).toHaveLength(5);
      expect(entry.coreFeedbackVfx.every(({ registered }) => registered)).toBe(true);
      expect(entry.attachment.productionApproved).toBe(false);
      expect(entry.impactAudio.productionResolutionApproved).toBe(false);
    }
  });

  it('keeps every weapon blocked, unscored and independently rollbackable', () => {
    for (const entry of ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1.weapons) {
      expect(entry.scoreEligible).toBe(false);
      expect(entry.computedScore).toBeNull();
      expect(entry.productionRegistrationPermitted).toBe(false);
      expect(entry.defaultRegistryWired).toBe(false);
      expect(entry.rollbackUnit).toMatchObject({
        kind: 'single-weapon',
        weaponId: entry.weaponId,
        mayRollbackOtherWeapons: false,
      });
      expect(entry.blockers).toEqual(expect.arrayContaining([
        'weapon-definition-validation-not-run',
        'weapon-counterplay-validation-not-run',
        'weapon-runtime-evidence-not-run',
        'weapon-deterministic-replay-evidence-not-run',
        'weapon-balance-evidence-not-run',
        'weapon-device-evidence-not-run',
        'weapon-human-evidence-not-run',
        'weapon-attachment-production-approval-missing',
        'weapon-impact-audio-production-approval-missing',
        'weapon-phase-audio-production-approval-missing',
        'core-feedback-vfx-production-approval-missing',
      ]));
    }
  });

  it('assigns unique stable-shaped identities without a group bypass', () => {
    const matrix = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1;
    expect(matrix.contentHash).toMatch(/^[0-9a-f]{8}$/);
    expect(new Set(matrix.weapons.map(({ readinessId }) => readinessId)).size).toBe(20);
    expect(new Set(matrix.weapons.map(({ readinessContentHash }) => (
      readinessContentHash
    ))).size).toBe(20);
    expect(matrix.weapons.every(({ readinessContentHash, rollbackUnit }) => (
      /^[0-9a-f]{8}$/.test(readinessContentHash)
      && rollbackUnit.actionDefinitionIds.length === 2
    ))).toBe(true);
    expect(matrix.groupRegistrationPermitted).toBe(false);
  });
});
