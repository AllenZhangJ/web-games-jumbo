import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1,
  ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1,
  ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1,
  ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceOptionsCandidateV1,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.js';

const SOURCE_COMMIT = 'a'.repeat(40);
const CONTENT_IDENTITY = '1234abcd';
const ASSET_SET_SHA = 'b'.repeat(64);

type DeepMutable<T> = T extends readonly (infer TEntry)[]
  ? DeepMutable<TEntry>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function shaForOrdinal(ordinal: number): string {
  return ordinal.toString(16).padStart(64, '0');
}

function missingState(reason: string) {
  return {
    status: 'missing' as const,
    evidenceSha256: null,
    failureReason: reason,
  };
}

function incompleteInput(): ArenaV2A7FormalVisualMediaFreezeEvidenceOptionsCandidateV1 {
  const environmentBuilds = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map(
    ({ environmentId }, index) => ({
      environmentId,
      sourceCommit: SOURCE_COMMIT,
      contentIdentityHash: CONTENT_IDENTITY,
      buildIdentitySha256: shaForOrdinal(index + 1),
      assetSetSha256: ASSET_SET_SHA,
      ...missingState('真实环境构建与设备证据尚未采集'),
    }),
  );
  return {
    evidence: {
      schemaVersion: 1,
      sourceIdentity: {
        sourceCommit: SOURCE_COMMIT,
        sourceDirty: true,
        contentIdentityHash: CONTENT_IDENTITY,
      },
      catalogIdentity: {
        catalogId: 'arena-v2-formal-presentation-assets.candidate.v1',
        catalogRevision: 'not-frozen-test-boundary',
        catalogContentHash: '89abcdef',
        assetSetSha256: ASSET_SET_SHA,
        expectedAssetCount: 1,
      },
      formalBudgetEvidence: {
        policyId: ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyId,
        policyContentHash:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash,
        artifactObservationCount: 0,
        ...missingState('正式预算报告与结构指标证据未提供'),
      },
      phaseEvidence: ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.map(
        (phaseId) => ({ phaseId, ...missingState('该阶段正式证据未提供') }),
      ),
      assets: [{
        assetId: 'arena.asset.map.unapproved.test-boundary',
        phaseId: 'a3-map-environment',
        mediaKind: 'visual-model',
        artifactPath: 'public/assets/arena/maps/unapproved-test-boundary.glb',
        sourceLocator: 'project-authored-test-boundary',
        sourceRevision: 'not-approved',
        byteLength: 100,
        sha256: 'c'.repeat(64),
        license: {
          licenseId: 'Project-Owned',
          rightsHolder: 'Number Strategy Jump project',
          proofDocument: 'docs/research/unapproved-test-boundary.md',
          commercialUsePermitted: false,
          modificationPermitted: false,
          redistributionPermitted: false,
          attributionRequired: false,
          attributionText: null,
          ...missingState('真实权利签核未提供'),
        },
        approval: {
          approvedBy: null,
          approvedAt: null,
          ...missingState('真实资产批准未提供'),
        },
        budget: {
          budgetClass: 'uncovered',
          decodedTextureBytes: null,
          textureWidth: null,
          textureHeight: null,
        },
      }],
      environmentBuilds,
      deliveries: ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.map(
        (platformId, index) => ({
          platformId,
          sourceCommit: SOURCE_COMMIT,
          contentIdentityHash: CONTENT_IDENTITY,
          buildIdentitySha256: shaForOrdinal(index + 20),
          assetSetSha256: ASSET_SET_SHA,
          assetManifestSha256: shaForOrdinal(index + 30),
          packageByteLength: 1,
          ...missingState('真实三端交付证据未提供'),
        }),
      ),
      captures: ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.flatMap(
        ({ environmentId }, environmentIndex) => (
          ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.map(({ kind, variant }) => ({
            captureId: `${environmentId}:${kind}:${variant}`,
            environmentId,
            kind,
            variant,
            sourceCommit: SOURCE_COMMIT,
            contentIdentityHash: CONTENT_IDENTITY,
            buildIdentitySha256: environmentBuilds[environmentIndex]!.buildIdentitySha256,
            assetSetSha256: ASSET_SET_SHA,
            artifactPath: null,
            byteLength: null,
            artifactSha256: null,
            ...missingState('真实截图或录像未提供'),
          }))
        ),
      ),
      reviews: ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1.map((dimensionId) => ({
        dimensionId,
        reviewer: null,
        reviewedAt: null,
        ...missingState('真实人工评审未提供'),
      })),
    },
  };
}

function mutableIncompleteInput(): DeepMutable<
ArenaV2A7FormalVisualMediaFreezeEvidenceOptionsCandidateV1
> {
  return incompleteInput() as DeepMutable<
  ArenaV2A7FormalVisualMediaFreezeEvidenceOptionsCandidateV1
  >;
}

describe('Arena V2 A7 formal visual/media freeze evidence candidate V1', () => {
  it('keeps the no-real-evidence fixture INCOMPLETE and never creates a PASS instance', () => {
    const result = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
      incompleteInput(),
    );
    expect(result).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      publishes: false,
      evidenceStatus: 'INCOMPLETE',
      hardGate: 'INCOMPLETE',
      formalVisualMediaReady: false,
      p7AdvanceComputedHere: false,
      p7ReleaseFreezeManifestOwnedHere: false,
    });
    expect(result.coverageSummary).toEqual({
      phaseCount: 7,
      assetCount: 1,
      formalBudgetObservationCount: 0,
      environmentCount: 6,
      deliveryPlatformCount: 3,
      captureCount: 36,
      reviewDimensionCount: 7,
    });
    expect(result.incompleteReasons).toContain('source:dirty');
    expect(result.incompleteReasons).toContain(
      'asset:arena.asset.map.unapproved.test-boundary:approval-missing',
    );
    expect(result.incompleteReasons).toContain(
      'asset:arena.asset.map.unapproved.test-boundary:per-item-budget-uncovered',
    );
    expect(validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(result))
      .toEqual(result);
    expect(ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1)
      .toMatchObject({ currentPassInstanceExists: false, p7AdvanceComputedHere: false });
  });

  it('recomputes encoded and delivery measurements instead of accepting claimed totals', () => {
    const result = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
      incompleteInput(),
    );
    expect(result.budgetSummary.measured).toMatchObject({
      totalEncodedBytes: 100,
      audioEncodedBytes: 0,
      decodedTextureBytes: 0,
      deliveryBytes: [
        { platformId: 'web', packageByteLength: 1 },
        { platformId: 'wechat', packageByteLength: 1 },
        { platformId: 'douyin', packageByteLength: 1 },
      ],
    });
  });

  it('forces assets outside the exact policy id/path whitelist to uncovered', () => {
    const input = mutableIncompleteInput();
    input.evidence.assets[0]!.budget.budgetClass = 'character-glb';
    const result = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(input);
    expect(result.evidence.assets[0]!.budget.budgetClass).toBe('uncovered');
    expect(result.incompleteReasons).toContain(
      'asset:arena.asset.map.unapproved.test-boundary:per-item-budget-uncovered',
    );
    expect(result.formalVisualMediaReady).toBe(false);
  });

  it('keeps unknown audio and texture media uncovered instead of throwing on media class', () => {
    const audio = mutableIncompleteInput();
    audio.evidence.assets[0]!.mediaKind = 'audio';
    audio.evidence.assets[0]!.budget.budgetClass = 'audio';
    const audioResult = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(audio);
    expect(audioResult.evidence.assets[0]!.budget.budgetClass).toBe('uncovered');
    expect(audioResult.evidenceStatus).toBe('INCOMPLETE');

    const texture = mutableIncompleteInput();
    texture.evidence.assets[0]!.mediaKind = 'visual-texture';
    texture.evidence.assets[0]!.budget.budgetClass = 'texture';
    texture.evidence.assets[0]!.budget.decodedTextureBytes = 400;
    texture.evidence.assets[0]!.budget.textureWidth = 10;
    texture.evidence.assets[0]!.budget.textureHeight = 10;
    const textureResult = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(texture);
    expect(textureResult.evidence.assets[0]!.budget.budgetClass).toBe('uncovered');
    expect(textureResult.evidenceStatus).toBe('INCOMPLETE');
  });

  it('rejects self-reported passed state without real evidence bytes and reviewer identity', () => {
    const input = mutableIncompleteInput();
    input.evidence.reviews[0]!.status = 'passed';
    input.evidence.reviews[0]!.failureReason = null;
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(input))
      .toThrow(/passed必须有证据SHA/);
  });

  it('rejects cross-environment build identity substitution and three-platform source drift', () => {
    const duplicateBuild = mutableIncompleteInput();
    duplicateBuild.evidence.environmentBuilds = duplicateBuild.evidence.environmentBuilds.map(
      (entry, index) => index === 1
        ? { ...entry, buildIdentitySha256: duplicateBuild.evidence.environmentBuilds[0]!.buildIdentitySha256 }
        : entry,
    );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(duplicateBuild))
      .toThrow(/build identity必须唯一/);

    const deliveryDrift = mutableIncompleteInput();
    deliveryDrift.evidence.deliveries = deliveryDrift.evidence.deliveries.map(
      (entry, index) => index === 2 ? { ...entry, contentIdentityHash: 'deadbeef' } : entry,
    );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(deliveryDrift))
      .toThrow(/source\/content\/asset-set身份漂移/);
  });

  it('rejects duplicate asset identity before publishing any result', () => {
    const input = mutableIncompleteInput();
    const first = input.evidence.assets[0]!;
    input.evidence.catalogIdentity = {
      ...input.evidence.catalogIdentity,
      expectedAssetCount: 2,
    };
    input.evidence.assets = [first, { ...first }];
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(input))
      .toThrow(/assetId唯一/);
  });

  it('rejects stored hard-gate/status mutation by full recomputation', () => {
    const result = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
      incompleteInput(),
    );
    const forged = { ...result, hardGate: 'PASS', formalVisualMediaReady: true };
    expect(() => validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(forged))
      .toThrow(/身份或结果发生漂移/);
  });

  it('rejects future fields and accessor-backed records fail closed', () => {
    const future = incompleteInput();
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1({
      ...future,
      futureField: true,
    })).toThrow(/futureField/);

    const accessor = mutableIncompleteInput();
    const delivery = { ...accessor.evidence.deliveries[0] };
    Object.defineProperty(delivery, 'platformId', {
      enumerable: true,
      get: () => 'web',
    });
    accessor.evidence.deliveries = [
      delivery as typeof accessor.evidence.deliveries[number],
      ...accessor.evidence.deliveries.slice(1),
    ];
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(accessor))
      .toThrow();
  });
});
