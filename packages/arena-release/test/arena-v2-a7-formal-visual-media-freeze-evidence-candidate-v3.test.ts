import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3 as CONTRACT,
  createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
  createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1,
  createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
  createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3,
  createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1,
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
} from '../src/index.js';
import {
  ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
  createArenaV2A7CurrentCatalogFuturePassLegacyFixture,
  createArenaV2A7CurrentCatalogIncompleteFixture,
  createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture,
  createArenaV2A7FormalEvidenceRecordVerificationDirectoryTestFixture,
} from './arena-v2-a7-future-pass-fixture.js';
import {
  createArenaV2A7BudgetIndependentApprovalTestInput,
} from './arena-v2-a7-formal-budget-structural-test-fixture.js';

function futureAssemblyInput() {
  const decisionInput = createArenaV2A7BudgetIndependentApprovalTestInput();
  const decision =
    createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      decisionInput,
    );
  return {
    schemaVersion: 1,
    decisionInput,
    decisionIdentity: decision.independentApprovalDecisionIdentity,
    policyRevision: 'arena-v2-a7-approved-budget-candidate-001',
    assemblerId: 'structural-budget-policy-assembler-001',
    assembledAtUtc: '2026-08-15T16:00:00.000Z',
    assemblyRecordLocator: 'evidence://arena-v2/a7/approved-budget/assembly-001',
    assemblyRecordSha256: '2'.repeat(64),
    notes: null,
  };
}

function v3Input(futurePass: boolean) {
  const approvedPolicyAssemblyInput = futureAssemblyInput();
  const assembly = createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
    approvedPolicyAssemblyInput,
  );
  const fixtureOptions = {
    sourceCommit: assembly.approvedPolicyCandidate.sourceIdentity.sourceCommit,
    contentIdentityHash: 'future-current-catalog-content-identity',
    environmentBuilds: assembly.approvedPolicyCandidate.environments.map((entry) => ({
      environmentId: entry.environmentId,
      buildIdentitySha256: entry.buildIdentitySha256,
    })),
  };
  const legacyEvidence = futurePass
    ? createArenaV2A7CurrentCatalogFuturePassLegacyFixture(fixtureOptions)
    : createArenaV2A7CurrentCatalogIncompleteFixture(fixtureOptions).legacyEvidence;
  const formalEvidenceRecordLocatorDirectory =
    createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture(
      legacyEvidence,
      assembly,
    );
  const formalEvidenceRetrievalPlan =
    createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence,
      approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
    });
  return {
    evidence: {
      schemaVersion: 3,
      legacyEvidence,
      approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
      formalEvidenceRecordVerificationDirectory:
        createArenaV2A7FormalEvidenceRecordVerificationDirectoryTestFixture(
          legacyEvidence,
          assembly,
          formalEvidenceRecordLocatorDirectory,
          formalEvidenceRetrievalPlan.retrievalPlanIdentityHash,
        ),
    },
  };
}

describe('Arena V2 A7 formal visual/media freeze evidence candidate V3 (not run)', () => {
  it('allows only a future fully closed fixture to become a non-wired PASS', () => {
    const evidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      v3Input(true),
    );
    expect(evidence).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      currentGate: 'candidate-pass-not-wired',
      evidenceStatus: 'PASS',
      hardGate: true,
      formalVisualMediaReady: true,
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      publishes: false,
      p7AdvanceComputedHere: false,
      p7ReleaseFreezeManifestOwnedHere: false,
      budgetSummary: {
        policyArtifactCount: 130,
        policyEnvironmentCount: 6,
        approvalStatus: 'approved-by-independent-decision-candidate',
        structuralLimitsStatus: 'approved-candidate',
        hardGateUsableForA7V3BudgetCheck: true,
        approvedPolicyMediaIdentityCoverage: {
          artifactCount: 130,
          encodedMediaFormatIdentityCoverage: true,
          decodedTextureFormatIdentityCoverage: true,
          textureDimensionAndDecodedByteIdentityCoverage: true,
          decodedAudioObservationAndMaximumCoverage: true,
        },
        approvedPolicyObservationFloorCoverage: {
          artifactObservationFloorCount: 130,
          environmentObservationFloorCount: 6,
          everyMaximumAtOrAboveAcceptedObservation: true,
          everyObservedEnvironmentLifecycleSatisfied: true,
          everyEnvironmentObservationBoundToOriginalEvidenceIdentity: true,
        },
        approvedPolicyGovernanceProvenanceCoverage: {
          independentActorCount: 4,
          collectorReviewerProposerAndApproverRemainDistinct: true,
          capturedReviewedProposedAndDecidedTimelineOrdered: true,
        },
        approvedPolicyIndependentApprovalClosureCoverage: {
          decisionStatus: 'approved',
          zeroHeadroomDispositionCount: 0,
          expectedZeroHeadroomDispositionCount: 0,
          everyIndependentApprovalFactClosed: true,
        },
        approvedPolicyAssemblyGovernanceEnvelopeCoverage: {
          independentActorCountIncludingAssembler: 5,
          assemblerRemainsDistinctFromPriorFourActors: true,
          assembledAtOrAfterDecision: true,
          assemblyRecordRemainsDistinctFromUpstreamEvidence: true,
        },
      },
      coverageSummary: {
        formalBudgetObservationCount: 130,
        formalBudgetCatalogArtifactCount: 130,
        formalBudgetEnvironmentCount: 6,
      },
      incompleteReasons: [],
      failureReasons: [],
    });
    expect(validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(evidence))
      .toEqual(evidence);
    expect(evidence.formalEvidenceRecordIndex.length).toBeGreaterThan(0);
    expect(new Set(evidence.formalEvidenceRecordIndex.map(({ recordId }) => recordId)).size)
      .toBe(evidence.formalEvidenceRecordIndex.length);
    expect(new Set(
      evidence.formalEvidenceRecordIndex.map(({ evidenceLocator }) => evidenceLocator),
    ).size).toBe(evidence.formalEvidenceRecordIndex.length);
    expect(new Set(
      evidence.formalEvidenceRecordIndex.map(({ evidenceSha256 }) => evidenceSha256),
    ).size).toBe(evidence.formalEvidenceRecordIndex.length);
    expect(evidence.formalEvidenceRecordIndex).toContainEqual({
      recordId: 'formal-budget:arena.stage7.formal-asset-budget.v1',
      kind: 'formal-budget',
      evidenceLocator: expect.stringMatching(/^evidence:\/\//u),
      evidenceMediaType: 'application/json',
      evidenceByteLength: expect.any(Number),
      evidenceRecordedAtUtc: expect.stringMatching(/Z$/u),
      evidenceProducerId: 'future-a7-evidence-producer',
      evidenceSha256:
        evidence.legacyEvidence.evidence.formalBudgetEvidence.evidenceSha256,
    });
    expect(evidence.formalEvidenceRecordIndex.some((entry) => (
      entry.kind === 'structural-assembly'
      && entry.recordId.startsWith('structural-assembly:')
    ))).toBe(true);
    expect(evidence.coverageSummary.formalEvidenceRecordCount)
      .toBe(evidence.formalEvidenceRecordIndex.length);
    expect(evidence.coverageSummary.totalFormalEvidenceBytes).toBe(
      evidence.formalEvidenceRecordIndex.reduce(
        (total, entry) => total + entry.evidenceByteLength,
        0,
      ),
    );
    expect(evidence.formalEvidenceRecordIndexIdentityHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(evidence.formalEvidenceRecordVerificationIndex).toHaveLength(
      evidence.formalEvidenceRecordIndex.length,
    );
    expect(evidence.formalEvidenceRecordVerificationIndexIdentityHash)
      .toMatch(/^[a-f0-9]{64}$/u);
    expect(evidence.coverageSummary.formalEvidenceVerificationReceiptCount)
      .toBe(evidence.formalEvidenceRecordIndex.length);
    expect(evidence.coverageSummary.totalFormalEvidenceVerificationReceiptBytes).toBe(
      evidence.formalEvidenceRecordVerificationIndex.reduce(
        (total, entry) => total + entry.verificationReceiptByteLength,
        0,
      ),
    );
  });

  it('builds the same non-approving retrieval plan before independent verification', () => {
    const input = v3Input(true);
    const plan = createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence: input.evidence.legacyEvidence,
      approvedPolicyAssemblyInput: input.evidence.approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity:
        input.evidence.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory:
        input.evidence.formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        input.evidence.formalEvidenceStoreSnapshotIdentityHash,
    });
    const evidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(input);
    expect(plan).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      grantsA7Pass: false,
    });
    expect(plan.formalEvidenceRecordIndex).toEqual(evidence.formalEvidenceRecordIndex);
    expect(plan.formalEvidenceRecordIndexIdentityHash)
      .toBe(evidence.formalEvidenceRecordIndexIdentityHash);
    expect(plan.formalEvidenceStoreSnapshotIdentityHash)
      .toBe(evidence.formalEvidenceStoreSnapshotIdentityHash);
    expect(plan.retrievalPlanIdentityHash).toMatch(/^[a-f0-9]{64}$/u);

    expect(() => createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence: input.evidence.legacyEvidence,
      approvedPolicyAssemblyInput: input.evidence.approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity: 'f'.repeat(64),
      formalEvidenceRecordLocatorDirectory:
        input.evidence.formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        input.evidence.formalEvidenceStoreSnapshotIdentityHash,
    })).toThrow(/retrieval plan只接受/u);
  });

  it('forms a one-way retrieval plan to verifier to final A7 chain', async () => {
    const input = v3Input(true);
    const plan = createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence: input.evidence.legacyEvidence,
      approvedPolicyAssemblyInput: input.evidence.approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity:
        input.evidence.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory:
        input.evidence.formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        input.evidence.formalEvidenceStoreSnapshotIdentityHash,
    });
    const recordById = new Map(
      plan.formalEvidenceRecordIndex.map((record) => [record.recordId, record] as const),
    );
    const verifier = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      formalEvidenceRecordIndex: plan.formalEvidenceRecordIndex,
      formalEvidenceRetrievalPlanIdentityHash: plan.retrievalPlanIdentityHash,
      formalEvidenceRecordIndexIdentityHash: plan.formalEvidenceRecordIndexIdentityHash,
      formalEvidenceStoreSnapshotIdentityHash:
        plan.formalEvidenceStoreSnapshotIdentityHash,
      verifierId: 'future-independent-a7-evidence-verifier',
      verifiedAtUtc: '2026-08-15T18:00:00.000Z',
      retrievalAdapterId: 'future-evidence-store-reader-v1',
      sha256AdapterId: 'future-sha256-hasher-v1',
      receiptWriterAdapterId: 'future-receipt-writer-v1',
      evidenceReader: async (request) => ({
        recordId: request.expectedRecord.recordId,
        evidenceLocator: request.expectedRecord.evidenceLocator,
        evidenceMediaType: request.expectedRecord.evidenceMediaType,
        evidenceRecordedAtUtc: request.expectedRecord.evidenceRecordedAtUtc,
        evidenceProducerId: request.expectedRecord.evidenceProducerId,
        bytes: new Uint8Array(request.expectedRecord.evidenceByteLength),
      }),
      sha256Hasher: async (request) => recordById.get(request.recordId)!.evidenceSha256,
      verificationReceiptWriter: async (request) => ({
        verificationSessionIdentityHash: request.verificationSessionIdentityHash,
        retrievalPlanIdentityHash: request.retrievalPlanIdentityHash,
        recordIndexIdentityHash: request.recordIndexIdentityHash,
        storeSnapshotIdentityHash: request.storeSnapshotIdentityHash,
        receipts: request.receipts.map((entry, index) => ({
          recordId: entry.verificationPayload.recordId,
          recordIndexIdentityHash: request.recordIndexIdentityHash,
          verificationPayloadIdentityHash: entry.verificationPayloadIdentityHash,
          verificationReceiptLocator:
            `evidence://arena-v2/a7/test-only/executed-verification-${index}`,
          verificationReceiptMediaType: 'application/json',
          verificationReceiptByteLength: 512 + index,
          verificationReceiptSha256:
            (5_000 + index).toString(16).padStart(64, '0'),
        })),
      }),
    });
    const verification = await verifier.start();
    input.evidence.formalEvidenceRecordVerificationDirectory =
      verification.formalEvidenceRecordVerificationDirectory;
    const evidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(input);
    expect(evidence.evidenceStatus).toBe('PASS');
    expect(evidence.formalEvidenceRecordIndexIdentityHash)
      .toBe(plan.formalEvidenceRecordIndexIdentityHash);
    expect(evidence.formalEvidenceRecordVerificationIndex)
      .toEqual(verification.formalEvidenceRecordVerificationDirectory);
  });

  it('keeps current missing visual/media evidence incomplete', () => {
    const evidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      v3Input(false),
    );
    expect(evidence).toMatchObject({
      evidenceStatus: 'INCOMPLETE',
      hardGate: false,
      formalVisualMediaReady: false,
      currentGate: 'incomplete',
    });
    expect(evidence.incompleteReasons.length).toBeGreaterThan(0);
  });

  it('rejects assembly identity, source and environment drift', () => {
    const identityDrift = v3Input(true);
    identityDrift.evidence.approvedPolicyAssemblyIdentity = '0'.repeat(64);
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      identityDrift,
    )).toThrow(/只接受/u);

    const sourceDrift = v3Input(true);
    sourceDrift.evidence.legacyEvidence = {
      ...sourceDrift.evidence.legacyEvidence,
      evidence: {
        ...sourceDrift.evidence.legacyEvidence.evidence,
        sourceIdentity: {
          ...sourceDrift.evidence.legacyEvidence.evidence.sourceIdentity,
          sourceCommit: 'f'.repeat(40),
        },
      },
    };
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      sourceDrift,
    )).toThrow(/stored visual\/media evidence/u);
  });

  it('rejects stored self-reported gate drift', () => {
    const evidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      v3Input(true),
    );
    expect(() => validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3({
      ...evidence,
      hardGate: false,
    })).toThrow(/身份或结果发生漂移/u);
  });

  it('requires one unique retrievable locator for every non-empty evidence slot', () => {
    const oversized = v3Input(true);
    oversized.evidence.formalEvidenceRecordLocatorDirectory = Array.from(
      { length: 584 },
      (_, index) => ({
        recordId: `oversized:${index}`,
        evidenceLocator: `evidence://arena-v2/a7/oversized/${index}`,
        evidenceMediaType: 'application/json',
        evidenceByteLength: index + 1,
        evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
        evidenceProducerId: 'future-a7-evidence-producer',
      }),
    );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      oversized,
    )).toThrow(/超过有界最大记录数/u);

    const missing = v3Input(true);
    missing.evidence.formalEvidenceRecordLocatorDirectory =
      missing.evidence.formalEvidenceRecordLocatorDirectory.slice(1);
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      missing,
    )).toThrow(/缺少Locator/u);

    const duplicate = v3Input(true);
    const duplicateLocator =
      duplicate.evidence.formalEvidenceRecordLocatorDirectory[0]!.evidenceLocator;
    duplicate.evidence.formalEvidenceRecordLocatorDirectory =
      duplicate.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceLocator: index === 1 ? duplicateLocator : entry.evidenceLocator,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      duplicate,
    )).toThrow(/Locator不得跨证据槽重复/u);

    const externalLocator = v3Input(true);
    externalLocator.evidence.formalEvidenceRecordLocatorDirectory =
      externalLocator.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceLocator: index === 0
          ? 'https://mutable.example.test/a7/evidence.json'
          : entry.evidenceLocator,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      externalLocator,
    )).toThrow(/evidence:\/\/arena-v2规范证据库/u);

    const traversalLocator = v3Input(true);
    traversalLocator.evidence.formalEvidenceRecordLocatorDirectory =
      traversalLocator.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceLocator: index === 0
          ? 'evidence://arena-v2/a7/../forged-record'
          : entry.evidenceLocator,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      traversalLocator,
    )).toThrow(/无空段、无跳转/u);

    const structuralDrift = v3Input(true);
    structuralDrift.evidence.formalEvidenceRecordLocatorDirectory =
      structuralDrift.evidence.formalEvidenceRecordLocatorDirectory.map((entry) => ({
        ...entry,
        evidenceLocator: entry.recordId.startsWith('structural-assembly:')
          ? 'evidence://arena-v2/a7/forged-assembly-locator'
          : entry.evidenceLocator,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      structuralDrift,
    )).toThrow(/Locator与上游记录漂移/u);

    const invalidMediaType = v3Input(true);
    invalidMediaType.evidence.formalEvidenceRecordLocatorDirectory =
      invalidMediaType.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceMediaType: index === 0
          ? 'Application/JSON; charset=utf-8'
          : entry.evidenceMediaType,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      invalidMediaType,
    )).toThrow(/规范媒体类型/u);

    const invalidByteLength = v3Input(true);
    invalidByteLength.evidence.formalEvidenceRecordLocatorDirectory =
      invalidByteLength.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceByteLength: index === 0 ? 0 : entry.evidenceByteLength,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      invalidByteLength,
    )).toThrow(/大于等于 1/u);

    const invalidRecordedAt = v3Input(true);
    invalidRecordedAt.evidence.formalEvidenceRecordLocatorDirectory =
      invalidRecordedAt.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceRecordedAtUtc: index === 0 ? 'not-a-time' : entry.evidenceRecordedAtUtc,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      invalidRecordedAt,
    )).toThrow(/UTC|时间/u);

    const structuralTimeDrift = v3Input(true);
    structuralTimeDrift.evidence.formalEvidenceRecordLocatorDirectory =
      structuralTimeDrift.evidence.formalEvidenceRecordLocatorDirectory.map((entry) => ({
        ...entry,
        evidenceRecordedAtUtc: entry.recordId.startsWith('structural-assembly:')
          ? '2026-08-15T18:00:00.000Z'
          : entry.evidenceRecordedAtUtc,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      structuralTimeDrift,
    )).toThrow(/记录时间与上游治理时间漂移/u);

    const invalidProducer = v3Input(true);
    invalidProducer.evidence.formalEvidenceRecordLocatorDirectory =
      invalidProducer.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceProducerId: index === 0 ? 'Invalid Producer' : entry.evidenceProducerId,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      invalidProducer,
    )).toThrow(/规范标识/u);

    const structuralProducerDrift = v3Input(true);
    structuralProducerDrift.evidence.formalEvidenceRecordLocatorDirectory =
      structuralProducerDrift.evidence.formalEvidenceRecordLocatorDirectory.map((entry) => ({
        ...entry,
        evidenceProducerId: entry.recordId.startsWith('structural-assembly:')
          ? 'forged-assembler'
          : entry.evidenceProducerId,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      structuralProducerDrift,
    )).toThrow(/Producer与上游治理角色漂移/u);

    const aggregateOverflow = v3Input(true);
    aggregateOverflow.evidence.formalEvidenceRecordLocatorDirectory =
      aggregateOverflow.evidence.formalEvidenceRecordLocatorDirectory.map((entry, index) => ({
        ...entry,
        evidenceByteLength: index === 0 ? Number.MAX_SAFE_INTEGER : entry.evidenceByteLength,
      }));
    aggregateOverflow.evidence.formalEvidenceRecordVerificationDirectory =
      aggregateOverflow.evidence.formalEvidenceRecordVerificationDirectory.map((entry, index) => ({
        ...entry,
        verifiedEvidenceByteLength: index === 0
          ? Number.MAX_SAFE_INTEGER
          : entry.verifiedEvidenceByteLength,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      aggregateOverflow,
    )).toThrow(/Evidence字节聚合结果超出安全整数范围/u);
  });

  it('requires independent retrieval verification and distinct receipt identities', () => {
    const missing = v3Input(true);
    missing.evidence.formalEvidenceRecordVerificationDirectory =
      missing.evidence.formalEvidenceRecordVerificationDirectory.slice(1);
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      missing,
    )).toThrow(/独立验证目录必须精确覆盖/u);

    const snapshotDrift = v3Input(true);
    snapshotDrift.evidence.formalEvidenceRecordVerificationDirectory =
      snapshotDrift.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          formalEvidenceStoreSnapshotIdentityHash: index === 0
            ? 'f'.repeat(64)
            : entry.formalEvidenceStoreSnapshotIdentityHash,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      snapshotDrift,
    )).toThrow(/Store Snapshot身份漂移/u);

    const retrievalPlanDrift = v3Input(true);
    retrievalPlanDrift.evidence.formalEvidenceRecordVerificationDirectory =
      retrievalPlanDrift.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          formalEvidenceRetrievalPlanIdentityHash: index === 0
            ? 'e'.repeat(64)
            : entry.formalEvidenceRetrievalPlanIdentityHash,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      retrievalPlanDrift,
    )).toThrow(/Retrieval Plan身份漂移/u);

    const observationDrift = v3Input(true);
    observationDrift.evidence.formalEvidenceRecordVerificationDirectory =
      observationDrift.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verifiedEvidenceSha256: index === 0
            ? 'f'.repeat(64)
            : entry.verifiedEvidenceSha256,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      observationDrift,
    )).toThrow(/独立验证观察发生漂移/u);

    const sameActor = v3Input(true);
    sameActor.evidence.formalEvidenceRecordVerificationDirectory =
      sameActor.evidence.formalEvidenceRecordVerificationDirectory.map((entry, index) => ({
        ...entry,
        verifierId: index === 0 ? entry.verifiedEvidenceProducerId : entry.verifierId,
      }));
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      sameActor,
    )).toThrow(/Verifier不得兼任任一Evidence Producer/u);

    const crossRecordProducer = v3Input(true);
    const structuralProducer = crossRecordProducer.evidence
      .formalEvidenceRecordLocatorDirectory.find((entry) => (
        entry.recordId.startsWith('structural-assembly:')
      ))!.evidenceProducerId;
    crossRecordProducer.evidence.formalEvidenceRecordVerificationDirectory =
      crossRecordProducer.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verifierId: index === 0 ? structuralProducer : entry.verifierId,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      crossRecordProducer,
    )).toThrow(/Verifier不得兼任任一Evidence Producer/u);

    const earlyVerification = v3Input(true);
    earlyVerification.evidence.formalEvidenceRecordVerificationDirectory =
      earlyVerification.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verifiedAtUtc: index === 0
            ? '2026-08-15T16:00:00.000Z'
            : entry.verifiedAtUtc,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      earlyVerification,
    )).toThrow(/验证时间不得早于记录时间/u);

    const reusedReceiptLocator = v3Input(true);
    reusedReceiptLocator.evidence.formalEvidenceRecordVerificationDirectory =
      reusedReceiptLocator.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verificationReceiptLocator: index === 0
            ? entry.verifiedEvidenceLocator
            : entry.verificationReceiptLocator,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      reusedReceiptLocator,
    )).toThrow(/验证回执Locator不得复用/u);

    const reusedReceiptSha = v3Input(true);
    reusedReceiptSha.evidence.formalEvidenceRecordVerificationDirectory =
      reusedReceiptSha.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verificationReceiptSha256: index === 0
            ? entry.verifiedEvidenceSha256
            : entry.verificationReceiptSha256,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      reusedReceiptSha,
    )).toThrow(/验证回执SHA不得复用/u);

    const duplicateReceiptIdentity = v3Input(true);
    const firstReceipt = duplicateReceiptIdentity.evidence
      .formalEvidenceRecordVerificationDirectory[0]!;
    duplicateReceiptIdentity.evidence.formalEvidenceRecordVerificationDirectory =
      duplicateReceiptIdentity.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verificationReceiptLocator: index === 1
            ? firstReceipt.verificationReceiptLocator
            : entry.verificationReceiptLocator,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      duplicateReceiptIdentity,
    )).toThrow(/验证回执Locator不得复用/u);

    const receiptAggregateOverflow = v3Input(true);
    receiptAggregateOverflow.evidence.formalEvidenceRecordVerificationDirectory =
      receiptAggregateOverflow.evidence.formalEvidenceRecordVerificationDirectory.map(
        (entry, index) => ({
          ...entry,
          verificationReceiptByteLength: index === 0
            ? Number.MAX_SAFE_INTEGER
            : entry.verificationReceiptByteLength,
        }),
      );
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      receiptAggregateOverflow,
    )).toThrow(/验证回执字节聚合结果超出安全整数范围/u);
  });

  it('rejects an approved policy whose aggregate encoded-byte maximum overflows', () => {
    const decisionInput = createArenaV2A7BudgetIndependentApprovalTestInput();
    decisionInput.proposalInput.artifactLimits[0]!.maximumEncodedBytes =
      Number.MAX_SAFE_INTEGER;
    const proposal = createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      decisionInput.proposalInput,
    );
    decisionInput.proposalIdentity = proposal.structuralLimitProposalIdentity;
    const decision = createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      decisionInput,
    );
    const approvedPolicyAssemblyInput = {
      schemaVersion: 1,
      decisionInput,
      decisionIdentity: decision.independentApprovalDecisionIdentity,
      policyRevision: 'arena-v2-a7-approved-budget-overflow-candidate-001',
      assemblerId: 'structural-budget-policy-assembler-001',
      assembledAtUtc: '2026-08-15T16:00:00.000Z',
      assemblyRecordLocator:
        'evidence://arena-v2/a7/approved-budget/assembly-overflow-001',
      assemblyRecordSha256: '3'.repeat(64),
      notes: null,
    };
    const assembly = createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      approvedPolicyAssemblyInput,
    );
    const legacyEvidence = createArenaV2A7CurrentCatalogFuturePassLegacyFixture({
      sourceCommit: assembly.approvedPolicyCandidate.sourceIdentity.sourceCommit,
      contentIdentityHash: 'future-current-catalog-overflow-content-identity',
      environmentBuilds: assembly.approvedPolicyCandidate.environments.map((entry) => ({
        environmentId: entry.environmentId,
        buildIdentitySha256: entry.buildIdentitySha256,
      })),
    });
    const formalEvidenceRecordLocatorDirectory =
      createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture(
        legacyEvidence,
        assembly,
      );
    const formalEvidenceRetrievalPlan =
      createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
        legacyEvidence,
        approvedPolicyAssemblyInput,
        approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
        formalEvidenceRecordLocatorDirectory,
        formalEvidenceStoreSnapshotIdentityHash:
          ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
      });
    expect(() => evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3({
      evidence: {
        schemaVersion: 3,
        legacyEvidence,
        approvedPolicyAssemblyInput,
        approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
        formalEvidenceRecordLocatorDirectory,
        formalEvidenceStoreSnapshotIdentityHash:
          ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
        formalEvidenceRecordVerificationDirectory:
          createArenaV2A7FormalEvidenceRecordVerificationDirectoryTestFixture(
            legacyEvidence,
            assembly,
            formalEvidenceRecordLocatorDirectory,
            formalEvidenceRetrievalPlan.retrievalPlanIdentityHash,
          ),
      },
    })).toThrow(/超出安全整数范围/u);
  });

  it('publishes no current PASS instance or production wiring', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      currentGate: 'incomplete',
      validationStatus: 'not-run',
      currentPassInstanceExists: false,
      hardGate: false,
      formalAssetCatalogCount: 130,
      formalEvidenceRecordMaximumCount: 583,
      requiresApprovedPolicyAssembly: true,
      requiresSameSourceAndSixEnvironmentBuildSet: true,
      budgetByteAggregatesMustRemainSafeIntegers: true,
      approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true,
      approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true,
      approvedPolicyRetainsAcceptedDecodedAudioObservation: true,
      approvedPolicyRevalidatesAcceptedObservationFloorsAndLifecycle: true,
      formalEvidenceRecordIndexOwnedByA7V3: true,
      formalEvidenceRecordIdsMustRemainDistinct: true,
      formalEvidenceRecordLocatorsRequired: true,
      formalEvidenceRecordLocatorsMustRemainDistinct: true,
      formalEvidenceRecordMediaTypeAndByteLengthRequired: true,
      formalEvidenceByteLengthAggregateMustRemainSafeInteger: true,
      formalEvidenceRecordCanonicalUtcTimeRequired: true,
      formalEvidenceRecordGovernanceTimelineBindingRequired: true,
      formalEvidenceRecordProducerIdentityRequired: true,
      formalEvidenceRecordGovernanceRoleBindingRequired: true,
      formalEvidenceRecordCanonicalStoreLocatorRequired: true,
      formalEvidenceRecordIndexIdentityOwnedByA7V3: true,
      formalEvidenceRetrievalPlanOwnedByA7V3: true,
      formalEvidenceRetrievalPlanDoesNotGrantPass: true,
      formalEvidenceStoreSnapshotIdentityRequired: true,
      everyVerificationReceiptBindsSameStoreSnapshot: true,
      formalEvidenceRecordIndependentVerificationRequired: true,
      formalEvidenceRecordVerifierMustRemainDistinctFromProducer: true,
      formalEvidenceRecordVerifierMustRemainIndependentFromAllProducers: true,
      formalEvidenceRecordVerificationReceiptIdentityOwnedByA7V3: true,
      formalEvidenceRecordShasMustRemainDistinct: true,
      replacesOnlyObsoleteV1V2BudgetGate: true,
      currentV2PolicyRemainsUnchanged: true,
      p7ReleaseFreezeManifestOwnedHere: false,
      p7AdvanceComputedHere: false,
    });
  });
});
