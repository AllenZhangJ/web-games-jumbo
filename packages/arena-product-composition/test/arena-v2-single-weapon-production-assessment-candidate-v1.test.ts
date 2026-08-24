import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
  assessArenaV2SingleWeaponProductionCandidateV1,
} from '../src/index.js';

const SHA256 = '1'.repeat(64);
const readiness = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1.weapons[0]!;
const policy = ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1;

function evidence(status: 'missing' | 'failed' | 'passed', score: number) {
  return policy.scoreDimensions.map((dimension, index) => ({
    schemaVersion: 1,
    dimensionId: dimension.dimensionId,
    evidenceClass: dimension.evidenceClass,
    evidenceId: status === 'missing' ? null : `evidence-${index}`,
    producerId: status === 'missing' ? null : `producer-${index}`,
    sourceReadinessContentHash: readiness.readinessContentHash,
    sourceWeaponBundleContentHash: readiness.identities.weaponBundleContentHash,
    sourceCounterplayContentHash: readiness.identities.counterplayContentHash,
    status,
    score: status === 'missing' ? 0 : score,
    evidenceSha256: status === 'missing' ? null : SHA256,
  }));
}

function audit(decision: 'missing' | 'remain' | 'rollback' | 'advance') {
  return {
    schemaVersion: 1,
    auditId: decision === 'missing' ? null : 'audit-1',
    auditorId: decision === 'missing' ? null : 'independent-auditor',
    sourceReadinessContentHash: readiness.readinessContentHash,
    sourcePolicyContentHash: policy.contentHash,
    decision,
    evidenceSha256: decision === 'missing' ? null : SHA256,
  };
}

function input(
  status: 'missing' | 'failed' | 'passed',
  score: number,
  decision: 'missing' | 'remain' | 'rollback' | 'advance',
) {
  return {
    schemaVersion: 1,
    weaponId: readiness.weaponId,
    readinessContentHash: readiness.readinessContentHash,
    evidence: evidence(status, score),
    independentAudit: audit(decision),
  };
}

describe('Arena V2 single weapon production assessment candidate V1', () => {
  it('freezes the exact seven-dimension 90/80 policy', () => {
    expect(policy.minimumWeightedScore).toBe(90);
    expect(policy.minimumDimensionScore).toBe(80);
    expect(policy.scoreDimensions).toHaveLength(7);
    expect(policy.scoreDimensions.reduce((sum, dimension) => sum + dimension.weight, 0)).toBe(100);
    expect(policy.groupRegistrationPermitted).toBe(false);
    expect(policy.acceptsCallerSuppliedApproval).toBe(false);
  });

  it('keeps absent evidence incomplete and unscored', () => {
    const result = assessArenaV2SingleWeaponProductionCandidateV1(
      input('missing', 0, 'missing'),
    );
    expect(result.evaluationStatus).toBe('incomplete');
    expect(result.hardGate).toBe('INCOMPLETE');
    expect(result.scoreEligible).toBe(false);
    expect(result.computedScore).toBeNull();
    expect(result.productionRegistrationPermitted).toBe(false);
  });

  it('does not let perfect self-contained evidence bypass unapproved production assets', () => {
    const result = assessArenaV2SingleWeaponProductionCandidateV1(
      input('passed', 100, 'advance'),
    );
    expect(result.computedScore).toBe(100);
    expect(result.totalScorePassed).toBe(true);
    expect(result.everyDimensionPassed).toBe(true);
    expect(result.allProductionAssetsApproved).toBe(false);
    expect(result.evaluationStatus).toBe('failed');
    expect(result.productionRegistrationPermitted).toBe(false);
    expect(result.failureReasons).toEqual(expect.arrayContaining([
      'asset:attachmentProductionApproved',
      'asset:impactAudioProductionApproved',
      'asset:everyPhaseAudioProductionApproved',
      'asset:everyCoreFeedbackVfxProductionApproved',
    ]));
  });

  it('rejects readiness identity drift and non-independent audit ownership', () => {
    expect(() => assessArenaV2SingleWeaponProductionCandidateV1({
      ...input('passed', 100, 'advance'),
      readinessContentHash: '00000000',
    })).toThrow(/readiness身份漂移/u);

    const sameOwner = input('passed', 100, 'advance');
    expect(() => assessArenaV2SingleWeaponProductionCandidateV1({
      ...sameOwner,
      independentAudit: {
        ...sameOwner.independentAudit,
        auditorId: 'producer-0',
      },
    })).toThrow(/不得兼任/u);
  });
});
