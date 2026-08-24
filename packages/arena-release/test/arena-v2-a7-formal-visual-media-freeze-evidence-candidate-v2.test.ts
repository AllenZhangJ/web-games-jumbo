import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2,
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2,
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.js';
import {
  createArenaV2A7CurrentCatalogIncompleteFixture,
  createArenaV2A7FuturePassFixture,
} from './arena-v2-a7-future-pass-fixture.js';

const SOURCE_COMMIT = 'a'.repeat(40);
const CONTENT_IDENTITY = '1234abcd';

function environmentBuilds() {
  return [
    'web-mobile-390x844',
    'web-desktop-1440x900',
    'wechat-developer-tool',
    'douyin-developer-tool',
    'ios-physical-device',
    'android-physical-device',
  ].map((environmentId, index) => ({
    environmentId,
    buildIdentitySha256: (index + 1).toString(16).padStart(64, '0'),
  }));
}

function currentIncomplete() {
  return createArenaV2A7CurrentCatalogIncompleteFixture({
    sourceCommit: SOURCE_COMMIT,
    contentIdentityHash: CONTENT_IDENTITY,
    environmentBuilds: environmentBuilds(),
  });
}

describe('Arena V2 A7 formal visual/media freeze evidence candidate V2', () => {
  it('covers the current 130-item catalog but keeps approval and structural gates closed', () => {
    const result = currentIncomplete();
    expect(result).toMatchObject({
      schemaVersion: 2,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      currentGate: 'incomplete',
      validationStatus: 'not-run',
      evidenceStatus: 'INCOMPLETE',
      hardGate: false,
      formalVisualMediaReady: false,
      publishes: false,
      createsOrModifiesAssets: false,
    });
    expect(result.coverageSummary).toMatchObject({
      assetCount: 130,
      formalBudgetObservationCount: 0,
      formalBudgetCatalogArtifactCount: 130,
    });
    expect(result.budgetSummary).toMatchObject({
      approvalStatus: 'proposed-not-approved',
      hardGateUsable: false,
      structuralLimitsStatus: 'unresolved-not-approved',
      catalogCoverage: {
        artifactCount: 130,
        exactIdPathByteShaCoverage: true,
        mediaKindCoverage: true,
        encodedMediaFormatPolicyCoverage: true,
        textureDecodedByteCoverage: true,
        textureDecodedFormatPolicyCoverage: true,
        textureDimensionCoverage: true,
      },
    });
    expect(result.incompleteReasons).toContain('formal-budget-v2-observation:missing');
    expect(result.incompleteReasons).toContain(
      'formal-budget-v2-policy:proposed-not-approved',
    );
    expect(result.incompleteReasons).toContain(
      'formal-budget-v2-structural-limits:unresolved-not-approved',
    );
    expect(result.incompleteReasons.some((reason) => (
      reason.endsWith(':per-item-budget-uncovered')
    ))).toBe(false);
    expect(validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2(result))
      .toEqual(result);
    expect(ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2)
      .toMatchObject({
        currentPassInstanceExists: false,
        hardGate: false,
        formalAssetCatalogCount: 130,
        p7AdvanceComputedHere: false,
      });
  });

  it('does not turn complete byte observations into approval or a release gate', () => {
    const base = currentIncomplete();
    const result = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      evidence: {
        schemaVersion: 2,
        legacyEvidence: base.legacyEvidence,
        formalBudgetEvidence: {
          policyId:
            ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId,
          policyContentHash:
            ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY
              .policyContentHash,
          artifactObservationCount:
            ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.artifactCount,
          status: 'passed',
          evidenceSha256: 'f'.repeat(64),
          failureReason: null,
        },
      },
    });
    expect(result.hardGate).toBe(false);
    expect(result.formalVisualMediaReady).toBe(false);
    expect(result.incompleteReasons).not.toContain('formal-budget-v2-observation:missing');
    expect(result.incompleteReasons).toContain(
      'formal-budget-v2-policy:proposed-not-approved',
    );
  });

  it('rejects legacy ten-item PASS evidence and current catalog byte identity drift', () => {
    const legacyPass = createArenaV2A7FuturePassFixture({
      sourceCommit: SOURCE_COMMIT,
      contentIdentityHash: CONTENT_IDENTITY,
      environmentBuilds: environmentBuilds(),
    });
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      evidence: {
        schemaVersion: 2,
        legacyEvidence: legacyPass,
        formalBudgetEvidence: {
          policyId:
            ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId,
          policyContentHash:
            ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY
              .policyContentHash,
          artifactObservationCount: 0,
          status: 'missing',
          evidenceSha256: null,
          failureReason: '预算证据未提供',
        },
      },
    })).toThrow(/130项/);

    const base = currentIncomplete();
    const forgedLegacy = {
      ...base.legacyEvidence,
      evidence: {
        ...base.legacyEvidence.evidence,
        assets: base.legacyEvidence.evidence.assets.map((asset, index) => (
          index === 0 ? { ...asset, byteLength: asset.byteLength + 1 } : asset
        )),
      },
    };
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      evidence: {
        schemaVersion: 2,
        legacyEvidence: forgedLegacy,
        formalBudgetEvidence: base.evidence.formalBudgetEvidence,
      },
    })).toThrow(/身份|漂移/);

    const textureIndex = base.legacyEvidence.evidence.assets.findIndex(
      ({ mediaKind }) => mediaKind === 'visual-texture',
    );
    if (textureIndex < 0) throw new Error('当前目录测试夹具必须包含纹理。');
    const forgedTextureDimension = {
      ...base.legacyEvidence,
      evidence: {
        ...base.legacyEvidence.evidence,
        assets: base.legacyEvidence.evidence.assets.map((asset, index) => (
          index === textureIndex
            ? {
              ...asset,
              budget: {
                ...asset.budget,
                textureWidth: Number(asset.budget.textureWidth) + 1,
              },
            }
            : asset
        )),
      },
    };
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      evidence: {
        schemaVersion: 2,
        legacyEvidence: forgedTextureDimension,
        formalBudgetEvidence: base.evidence.formalBudgetEvidence,
      },
    })).toThrow(/身份|漂移/);
  });

  it('rejects stored gate forgery and future fields by full recomputation', () => {
    const result = currentIncomplete();
    expect(() => validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      ...result,
      hardGate: true,
      formalVisualMediaReady: true,
    })).toThrow(/身份或结果发生漂移/);
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
      evidence: {
        schemaVersion: 2,
        legacyEvidence: result.legacyEvidence,
        formalBudgetEvidence: result.evidence.formalBudgetEvidence,
        futureField: true,
      },
    })).toThrow(/futureField/);
  });
});
