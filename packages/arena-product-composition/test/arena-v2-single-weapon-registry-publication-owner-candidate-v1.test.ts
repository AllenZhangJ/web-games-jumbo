import { describe, expect, it, vi } from 'vitest';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
  ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_POLICY_CANDIDATE_V1,
  ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1,
  assessArenaV2SingleWeaponProductionCandidateV1,
} from '../src/index.js';

const SHA256 = '4'.repeat(64);
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
      evidenceId: `publication-evidence-${index}`,
      producerId: `publication-producer-${index}`,
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourceWeaponBundleContentHash: readiness.identities.weaponBundleContentHash,
      sourceCounterplayContentHash: readiness.identities.counterplayContentHash,
      status: 'passed',
      score: 100,
      evidenceSha256: SHA256,
    })),
    independentAudit: {
      schemaVersion: 1,
      auditId: 'publication-audit',
      auditorId: 'publication-independent-auditor',
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourcePolicyContentHash: assessmentPolicy.contentHash,
      decision: 'advance',
      evidenceSha256: SHA256,
    },
  });
}

describe('Arena V2 single weapon registry publication owner candidate V1', () => {
  it('fixes CAS, readback, rollback-head and lifecycle policy without a default port', () => {
    expect(ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_POLICY_CANDIDATE_V1)
      .toMatchObject({
        concurrency: 'synchronous-cas-with-readback',
        revisionPolicy: 'monotonic-safe-integer',
        staleSnapshotPolicy: 'fail-closed-before-cas',
        ambiguousCommitPolicy: 'readback-or-failed-indeterminate',
        rollbackPolicy: 'only-exact-published-head-can-rollback',
        reentrancyAllowed: false,
        autoRollbackOnDestroy: false,
        sealRequiredBeforePublishedOwnerDestroy: true,
        groupRegistrationPermitted: false,
        defaultPortImplemented: false,
        defaultRegistryWired: false,
      });
  });

  it('does not touch the publication port while the exact weapon remains asset-blocked', () => {
    const read = vi.fn();
    const compareAndSwap = vi.fn();
    expect(() => new ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1({
      ownerId: 'publication-owner',
      snapshotOptions: {
        assessment: blockedAssessment(),
        plan: {},
        baseCollectionWeaponIds: [],
        baseActionDefinitions: [],
        baseEquipmentDefinitions: [],
        baseGrammarDefinitions: [],
      },
      port: { read, compareAndSwap },
    })).toThrow();
    expect(read).not.toHaveBeenCalled();
    expect(compareAndSwap).not.toHaveBeenCalled();
  });
});
