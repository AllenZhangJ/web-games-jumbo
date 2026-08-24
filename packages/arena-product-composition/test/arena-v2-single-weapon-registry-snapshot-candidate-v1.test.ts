import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_POLICY_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1,
  assessArenaV2SingleWeaponProductionCandidateV1,
  createArenaV2SingleWeaponRegistrationPlanCandidateV1,
} from '../src/index.js';

const SHA256 = '3'.repeat(64);
const readiness = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1.weapons[0]!;
const assessmentPolicy = ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1;

function blockedAssessment() {
  return assessArenaV2SingleWeaponProductionCandidateV1({
    schemaVersion: 1,
    weaponId: readiness.weaponId,
    readinessContentHash: readiness.readinessContentHash,
    evidence: assessmentPolicy.scoreDimensions.map((dimension, index) => ({
      schemaVersion: 1,
      dimensionId: dimension.dimensionId,
      evidenceClass: dimension.evidenceClass,
      evidenceId: `registry-evidence-${index}`,
      producerId: `registry-producer-${index}`,
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourceWeaponBundleContentHash: readiness.identities.weaponBundleContentHash,
      sourceCounterplayContentHash: readiness.identities.counterplayContentHash,
      status: 'passed',
      score: 100,
      evidenceSha256: SHA256,
    })),
    independentAudit: {
      schemaVersion: 1,
      auditId: 'registry-audit',
      auditorId: 'registry-independent-auditor',
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourcePolicyContentHash: assessmentPolicy.contentHash,
      decision: 'advance',
      evidenceSha256: SHA256,
    },
  });
}

describe('Arena V2 single weapon registry snapshot candidate V1', () => {
  it('keeps snapshot construction isolated from default publication', () => {
    expect(ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1).toMatchObject({
      sourceScope: 'arena-v2-collection-weapons-only',
      constructionMode: 'build-new-immutable-snapshots',
      publishMode: 'external-cas-owner-code-written-not-run',
      rollbackMode: 'retain-exact-previous-snapshot',
      groupRegistrationPermitted: false,
      acceptsUnknownBaseDefinitions: false,
      mutatesInputRegistries: false,
      publishesDefaultRegistry: false,
    });
  });

  it('delegates publication to the separate CAS lifecycle without claiming a default port', () => {
    expect(ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1).toMatchObject({
      publishMode: 'external-cas-owner-code-written-not-run',
      publishesDefaultRegistry: false,
      defaultCompositionWired: false,
    });
    expect(ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_POLICY_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        concurrency: 'synchronous-cas-with-readback',
        defaultPortImplemented: false,
        defaultRegistryWired: false,
        defaultCompositionWired: false,
        validationStatus: 'not-run',
      });
  });

  it('cannot construct snapshots before the exact weapon plan is permitted', () => {
    const assessment = blockedAssessment();
    expect(assessment.productionRegistrationPermitted).toBe(false);
    expect(() => createArenaV2SingleWeaponRegistrationPlanCandidateV1(assessment))
      .toThrow(/尚未获准/u);
  });
});
