import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_POLICY_CANDIDATE_V1,
  assessArenaV2SingleWeaponProductionCandidateV1,
  createArenaV2SingleWeaponRegistrationPlanCandidateV1,
  validateArenaV2SingleWeaponProductionAssessmentCandidateV1,
} from '../src/index.js';

const SHA256 = '2'.repeat(64);
const readiness = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1.weapons[0]!;
const assessmentPolicy = ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1;

function perfectButAssetBlockedAssessment() {
  return assessArenaV2SingleWeaponProductionCandidateV1({
    schemaVersion: 1,
    weaponId: readiness.weaponId,
    readinessContentHash: readiness.readinessContentHash,
    evidence: assessmentPolicy.scoreDimensions.map((dimension, index) => ({
      schemaVersion: 1,
      dimensionId: dimension.dimensionId,
      evidenceClass: dimension.evidenceClass,
      evidenceId: `evidence-${index}`,
      producerId: `producer-${index}`,
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourceWeaponBundleContentHash: readiness.identities.weaponBundleContentHash,
      sourceCounterplayContentHash: readiness.identities.counterplayContentHash,
      status: 'passed',
      score: 100,
      evidenceSha256: SHA256,
    })),
    independentAudit: {
      schemaVersion: 1,
      auditId: 'audit-1',
      auditorId: 'independent-auditor',
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourcePolicyContentHash: assessmentPolicy.contentHash,
      decision: 'advance',
      evidenceSha256: SHA256,
    },
  });
}

describe('Arena V2 single weapon registration plan candidate V1', () => {
  it('fixes atomic one-weapon migration and exact reverse rollback policy', () => {
    const policy = ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_POLICY_CANDIDATE_V1;
    expect(policy).toMatchObject({
      registrationUnit: 'single-weapon',
      commitBoundary: 'one-weapon-one-commit',
      applyMode: 'atomic-new-registry-snapshots-required',
      failurePolicy: 'discard-new-snapshots-keep-current-defaults',
      rollbackOrder: 'exact-reverse-forward-order',
      groupRegistrationPermitted: false,
      partialCommitPermitted: false,
      registryApplyImplemented: false,
      defaultRegistryWired: false,
    });
  });

  it('recomputes stored assessments and rejects derived-field drift', () => {
    const assessment = perfectButAssetBlockedAssessment();
    expect(validateArenaV2SingleWeaponProductionAssessmentCandidateV1(assessment))
      .toEqual(assessment);
    expect(() => validateArenaV2SingleWeaponProductionAssessmentCandidateV1({
      ...assessment,
      productionRegistrationPermitted: true,
    })).toThrow(/存储内容hash漂移/u);
  });

  it('does not create a registration plan while current assets remain blocked', () => {
    const assessment = perfectButAssetBlockedAssessment();
    expect(assessment.hardGate).toBe('FAIL');
    expect(assessment.productionRegistrationPermitted).toBe(false);
    expect(() => createArenaV2SingleWeaponRegistrationPlanCandidateV1(assessment))
      .toThrow(/尚未获准/u);
  });
});
