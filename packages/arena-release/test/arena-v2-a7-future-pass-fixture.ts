import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY,
} from '@number-strategy-jump/arena-product-presentation/formal-release-evidence-candidate-v1';
import {
  ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1,
  ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1,
  ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1,
  ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.js';
import {
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.js';
import {
  createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
  type ArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
} from '../src/arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.js';
import {
  createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1,
} from '../src/arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.js';
import {
  createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3,
  evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';
import {
  createArenaV2A7BudgetIndependentApprovalTestInput,
} from './arena-v2-a7-formal-budget-structural-test-fixture.js';

interface FuturePassFixtureOptions {
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly packageLockSha256?: string;
  readonly toolchainIdentitySha256?: string;
  readonly formalBudgetEvidenceSha256?: string;
  readonly verificationReceiptSha256Override?: string;
  readonly environmentBuilds: readonly Readonly<{
    readonly environmentId: string;
    readonly buildIdentitySha256: string;
  }>[];
}

function sha(ordinal: number): string {
  return ordinal.toString(16).padStart(64, '0');
}

export const ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY =
  sha(3_900);

function passedState(ordinal: number) {
  return Object.freeze({
    status: 'passed' as const,
    evidenceSha256: sha(ordinal),
    failureReason: null,
  });
}

function missingState(reason: string) {
  return Object.freeze({
    status: 'missing' as const,
    evidenceSha256: null,
    failureReason: reason,
  });
}

function presentationForArtifact(
  kind: typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS[number]['kind'],
) {
  if (kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO) {
    return Object.freeze({
      phaseId: 'a5-hud-vfx-audio' as const,
      mediaKind: 'audio' as const,
      budgetClass: 'audio' as const,
    });
  }
  if (kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE) {
    return Object.freeze({
      phaseId: 'a4-character-weapon' as const,
      mediaKind: 'visual-texture' as const,
      budgetClass: 'texture' as const,
    });
  }
  return Object.freeze({
    phaseId: 'a4-character-weapon' as const,
    mediaKind: 'visual-model' as const,
    budgetClass: kind
      === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL
      ? 'character-glb' as const
      : 'attachment-glb' as const,
  });
}

/** Test-only future evidence. It does not represent current project approval or delivery. */
export function createArenaV2A7FuturePassFixture(options: FuturePassFixtureOptions) {
  const assetSetSha256 = sha(700);
  const environmentBuilds = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map(
    ({ environmentId }, index) => {
      const expected = options.environmentBuilds[index];
      if (expected?.environmentId !== environmentId) {
        throw new RangeError('A7 future-pass fixture六环境身份或顺序不一致。');
      }
      return {
        environmentId,
        sourceCommit: options.sourceCommit,
        contentIdentityHash: options.contentIdentityHash,
        buildIdentitySha256: expected.buildIdentitySha256,
        assetSetSha256,
        ...passedState(720 + index),
      };
    },
  );
  const assets = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map(
    (artifact, index) => {
      const presentation = presentationForArtifact(artifact.kind);
      const texture = presentation.budgetClass === 'texture';
      return {
        assetId: artifact.id,
        phaseId: presentation.phaseId,
        mediaKind: presentation.mediaKind,
        artifactPath: artifact.path,
        sourceLocator: 'future-pass-test-fixture',
        sourceRevision: 'future-approved-revision',
        byteLength: 1,
        sha256: sha(740 + index),
        license: {
          licenseId: 'Future-Test-License',
          rightsHolder: 'Future test fixture rights holder',
          proofDocument: `docs/evidence/future-a7-license-${index}.md`,
          commercialUsePermitted: true,
          modificationPermitted: true,
          redistributionPermitted: true,
          attributionRequired: false,
          attributionText: null,
          ...passedState(760 + index),
        },
        approval: {
          approvedBy: 'future-independent-art-auditor',
          approvedAt: 'future-approved-at',
          ...passedState(780 + index),
        },
        budget: {
          budgetClass: presentation.budgetClass,
          decodedTextureBytes: texture ? 4 : null,
          textureWidth: texture ? 1 : null,
          textureHeight: texture ? 1 : null,
        },
      };
    },
  );
  return evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1({
    evidence: {
      schemaVersion: 1,
      sourceIdentity: {
        sourceCommit: options.sourceCommit,
        sourceDirty: false,
        contentIdentityHash: options.contentIdentityHash,
      },
      catalogIdentity: {
        catalogId: 'arena-v2-future-approved-formal-assets.test-only',
        catalogRevision: 'future-approved-revision',
        catalogContentHash: 'a7f00001',
        assetSetSha256,
        expectedAssetCount: assets.length,
      },
      formalBudgetEvidence: {
        policyId:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyId,
        policyContentHash:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash,
        artifactObservationCount:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.artifactCount,
        ...passedState(800),
      },
      phaseEvidence: ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.map(
        (phaseId, index) => ({ phaseId, ...passedState(810 + index) }),
      ),
      assets,
      environmentBuilds,
      deliveries: ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.map(
        (platformId, index) => ({
          platformId,
          sourceCommit: options.sourceCommit,
          contentIdentityHash: options.contentIdentityHash,
          buildIdentitySha256: environmentBuilds[index === 0 ? 0 : index + 1]!
            .buildIdentitySha256,
          assetSetSha256,
          assetManifestSha256: sha(830 + index),
          packageByteLength: 1,
          ...passedState(840 + index),
        }),
      ),
      captures: ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.flatMap(
        ({ environmentId }, environmentIndex) => (
          ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.map(
            ({ kind, variant }, requirementIndex) => {
              const ordinal = environmentIndex
                * ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.length
                + requirementIndex;
              return {
                captureId: `${environmentId}:${kind}:${variant}`,
                environmentId,
                kind,
                variant,
                sourceCommit: options.sourceCommit,
                contentIdentityHash: options.contentIdentityHash,
                buildIdentitySha256: environmentBuilds[environmentIndex]!
                  .buildIdentitySha256,
                assetSetSha256,
                artifactPath: `artifacts/a7/future-capture-${ordinal}.bin`,
                byteLength: 1,
                artifactSha256: sha(850 + ordinal),
                ...passedState(900 + ordinal),
              };
            },
          )
        ),
      ),
      reviews: ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1.map(
        (dimensionId, index) => ({
          dimensionId,
          reviewer: 'future-independent-art-reviewer',
          reviewedAt: 'future-reviewed-at',
          ...passedState(950 + index),
        }),
      ),
    },
  });
}

/** Current 130-asset catalog truth with every production approval/evidence gate still missing. */
export function createArenaV2A7CurrentCatalogIncompleteFixture(
  options: FuturePassFixtureOptions,
) {
  const assetSetSha256 = sha(1_100);
  const v1BudgetById = new Map<
  string,
  typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS[number]
  >(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map((entry) => [entry.id, entry] as const),
  );
  const v2BudgetById = new Map(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(
      (entry) => [entry.id, entry] as const,
    ),
  );
  const environmentBuilds = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map(
    ({ environmentId }, index) => {
      const expected = options.environmentBuilds[index];
      if (expected?.environmentId !== environmentId) {
        throw new RangeError('A7 current-catalog fixture六环境身份或顺序不一致。');
      }
      return {
        environmentId,
        sourceCommit: options.sourceCommit,
        contentIdentityHash: options.contentIdentityHash,
        buildIdentitySha256: expected.buildIdentitySha256,
        assetSetSha256,
        ...missingState('当前真实环境视觉/媒体证据尚未采集'),
      };
    },
  );
  const assets =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.map(
      (entry) => {
        const v1Budget = v1BudgetById.get(entry.assetId);
        const isAudio = entry.kind === 'audio';
        const isTexture = entry.kind === 'texture';
        const isMap = entry.kind === 'map-model';
        const isVfx = entry.assetId.startsWith('arena.vfx.');
        const v2Budget = v2BudgetById.get(entry.assetId);
        if (v2Budget === undefined) {
          throw new RangeError(`A7 current-catalog fixture缺少V2预算资产：${entry.assetId}。`);
        }
        const budgetClass = v1Budget === undefined ? 'uncovered' as const
          : v1Budget.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO
            ? 'audio' as const
            : v1Budget.kind
              === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE
              ? 'texture' as const
              : v1Budget.kind
                === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL
                ? 'character-glb' as const
                : 'attachment-glb' as const;
        return {
          assetId: entry.assetId,
          phaseId: isMap ? 'a3-map-environment' as const
            : isAudio || isVfx ? 'a5-hud-vfx-audio' as const
              : 'a4-character-weapon' as const,
          mediaKind: isAudio ? 'audio' as const
            : isTexture ? 'visual-texture' as const : 'visual-model' as const,
          artifactPath: entry.artifactPath,
          sourceLocator: entry.sourceEvidence.sourceLocator,
          sourceRevision: entry.sourceEvidence.sourceRevision,
          byteLength: entry.byteLength,
          sha256: entry.sha256,
          license: {
            licenseId: entry.sourceEvidence.licenseId,
            rightsHolder: entry.sourceEvidence.rightsHolder,
            proofDocument: entry.sourceEvidence.proofDocument,
            commercialUsePermitted: false,
            modificationPermitted: false,
            redistributionPermitted: false,
            attributionRequired: false,
            attributionText: null,
            ...missingState('当前生产权利复核尚未完成'),
          },
          approval: {
            approvedBy: null,
            approvedAt: null,
            ...missingState('当前逐资产生产批准尚未完成'),
          },
          budget: {
            budgetClass,
            decodedTextureBytes: isTexture ? v2Budget.decodedTextureBytes : null,
            textureWidth: isTexture ? v2Budget.widthPixels : null,
            textureHeight: isTexture ? v2Budget.heightPixels : null,
          },
        };
      },
    );
  const legacyEvidence = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1({
    evidence: {
      schemaVersion: 1,
      sourceIdentity: {
        sourceCommit: options.sourceCommit,
        sourceDirty: false,
        contentIdentityHash: options.contentIdentityHash,
      },
      catalogIdentity: {
        catalogId:
          ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY.catalogId,
        catalogRevision:
          ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY.catalogRevision,
        catalogContentHash:
          ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY
            .catalogContentHash,
        assetSetSha256,
        expectedAssetCount: assets.length,
      },
      formalBudgetEvidence: {
        policyId:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyId,
        policyContentHash:
          ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash,
        artifactObservationCount: 0,
        ...missingState('当前130项目录尚未获得可用的正式预算批准证据'),
      },
      phaseEvidence: ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.map(
        (phaseId) => ({ phaseId, ...missingState('当前阶段正式证据尚未完成') }),
      ),
      assets,
      environmentBuilds,
      deliveries: ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.map(
        (platformId, index) => ({
          platformId,
          sourceCommit: options.sourceCommit,
          contentIdentityHash: options.contentIdentityHash,
          buildIdentitySha256: environmentBuilds[index === 0 ? 0 : index + 1]!
            .buildIdentitySha256,
          assetSetSha256,
          assetManifestSha256: sha(1_120 + index),
          packageByteLength: 1,
          ...missingState('当前三端正式交付证据尚未完成'),
        }),
      ),
      captures: ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.flatMap(
        ({ environmentId }, environmentIndex) => (
          ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.map(({ kind, variant }) => ({
            captureId: `${environmentId}:${kind}:${variant}`,
            environmentId,
            kind,
            variant,
            sourceCommit: options.sourceCommit,
            contentIdentityHash: options.contentIdentityHash,
            buildIdentitySha256: environmentBuilds[environmentIndex]!.buildIdentitySha256,
            assetSetSha256,
            artifactPath: null,
            byteLength: null,
            artifactSha256: null,
            ...missingState('当前六环境截图或录像证据尚未完成'),
          }))
        ),
      ),
      reviews: ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1.map((dimensionId) => ({
        dimensionId,
        reviewer: null,
        reviewedAt: null,
        ...missingState('当前人工视觉/媒体评审尚未完成'),
      })),
    },
  });
  return evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
    evidence: {
      schemaVersion: 2,
      legacyEvidence,
      formalBudgetEvidence: {
        policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId,
        policyContentHash:
          ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyContentHash,
        artifactObservationCount: 0,
        ...missingState('当前130项目录预算候选尚未获批，结构上限证据也未完成'),
      },
    },
  });
}

/** Test-only current-catalog V1 envelope with non-budget evidence marked passed. */
export function createArenaV2A7CurrentCatalogFuturePassLegacyFixture(
  options: FuturePassFixtureOptions,
) {
  const current = createArenaV2A7CurrentCatalogIncompleteFixture(options);
  const base = current.legacyEvidence.evidence;
  return evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1({
    evidence: {
      ...base,
      formalBudgetEvidence: {
        ...base.formalBudgetEvidence,
        artifactObservationCount:
          ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.length,
        ...passedState(2_000),
        evidenceSha256: options.formalBudgetEvidenceSha256 ?? sha(2_000),
      },
      phaseEvidence: base.phaseEvidence.map((entry, index) => ({
        ...entry,
        ...passedState(2_010 + index),
      })),
      assets: base.assets.map((entry, index) => ({
        ...entry,
        license: {
          ...entry.license,
          commercialUsePermitted: true,
          modificationPermitted: true,
          redistributionPermitted: true,
          ...passedState(2_100 + index),
        },
        approval: {
          ...entry.approval,
          approvedBy: 'future-independent-current-catalog-art-approver',
          approvedAt: '2026-08-15T16:30:00.000Z',
          ...passedState(2_300 + index),
        },
      })),
      environmentBuilds: base.environmentBuilds.map((entry, index) => ({
        ...entry,
        ...passedState(2_500 + index),
      })),
      deliveries: base.deliveries.map((entry, index) => ({
        ...entry,
        ...passedState(2_520 + index),
      })),
      captures: base.captures.map((entry, index) => ({
        ...entry,
        artifactPath: `artifacts/a7/future-current-catalog-capture-${index}.bin`,
        byteLength: 1,
        artifactSha256: sha(2_600 + index),
        ...passedState(2_700 + index),
      })),
      reviews: base.reviews.map((entry, index) => ({
        ...entry,
        reviewer: 'future-independent-current-catalog-reviewer',
        reviewedAt: '2026-08-15T16:45:00.000Z',
        ...passedState(2_800 + index),
      })),
    },
  });
}

function createApprovedPolicyAssemblyFixture(options: FuturePassFixtureOptions) {
  const decisionInput = createArenaV2A7BudgetIndependentApprovalTestInput(
    true,
    {
      sourceCommit: options.sourceCommit,
      environmentBuilds: options.environmentBuilds,
      ...(options.packageLockSha256 === undefined
        ? {}
        : { packageLockSha256: options.packageLockSha256 }),
      ...(options.toolchainIdentitySha256 === undefined
        ? {}
        : { toolchainIdentitySha256: options.toolchainIdentitySha256 }),
    },
  );
  const decision =
    createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      decisionInput,
    );
  const assemblyInput = {
    schemaVersion: 1,
    decisionInput,
    decisionIdentity: decision.independentApprovalDecisionIdentity,
    policyRevision: 'arena-v2-a7-future-approved-budget-test-only',
    assemblerId: 'future-structural-budget-policy-assembler',
    assembledAtUtc: '2026-08-15T16:00:00.000Z',
    assemblyRecordLocator: 'evidence://arena-v2/a7/future-approved-budget-test-only',
    assemblyRecordSha256: sha(2_900),
    notes: null,
  };
  const assembly = createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
    assemblyInput,
  );
  return Object.freeze({ assemblyInput, assembly });
}

/** Test-only retrievable-record locations. These are not current project evidence. */
export function createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture(
  legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  assembly: ArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
) {
  const legacy = legacyEvidence.evidence;
  const policyEvidence = assembly.approvedPolicyCandidate.evidenceIdentity;
  const result: Array<{
    recordId: string;
    evidenceLocator: string;
    evidenceMediaType: string;
    evidenceByteLength: number;
    evidenceRecordedAtUtc: string;
    evidenceProducerId: string;
  }> = [];
  let locatorOrdinal = 0;
  const append = (
    recordId: string,
    evidenceSha256: string | null,
    evidenceLocator?: string,
    evidenceRecordedAtUtc?: string,
    evidenceProducerId?: string,
  ): void => {
    if (evidenceSha256 === null) return;
    result.push({
      recordId,
      evidenceLocator: evidenceLocator
        ?? `evidence://arena-v2/a7/test-only/formal-record-${locatorOrdinal}`,
      evidenceMediaType: 'application/json',
      evidenceByteLength: 1_024 + locatorOrdinal,
      evidenceRecordedAtUtc:
        evidenceRecordedAtUtc ?? '2026-08-15T17:00:00.000Z',
      evidenceProducerId:
        evidenceProducerId ?? 'future-a7-evidence-producer',
    });
    locatorOrdinal += 1;
  };

  append(
    `formal-budget:${legacy.formalBudgetEvidence.policyId}`,
    legacy.formalBudgetEvidence.evidenceSha256,
  );
  for (const entry of legacy.phaseEvidence) {
    append(`phase:${entry.phaseId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.assets) {
    append(`asset-license:${entry.assetId}`, entry.license.evidenceSha256);
    append(`asset-approval:${entry.assetId}`, entry.approval.evidenceSha256);
  }
  for (const entry of legacy.environmentBuilds) {
    append(`environment-build:${entry.environmentId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.deliveries) {
    append(`delivery:${entry.platformId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.captures) {
    append(`capture:${entry.captureId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.reviews) {
    append(`review:${entry.dimensionId}`, entry.evidenceSha256);
  }
  for (const entry of policyEvidence.structuralEnvironmentEvidenceRecords) {
    append(
      `structural-environment:${policyEvidence.structuralEvidenceSubmissionIdentity}`
        + `:${entry.environmentId}`,
      entry.evidenceSha256,
      entry.evidenceLocator,
      policyEvidence.structuralEvidenceCapturedAtUtc,
      assembly.approvedPolicyCandidate.governanceProvenance.collectorId,
    );
  }
  append(
    `structural-report:${policyEvidence.structuralEvidenceSubmissionIdentity}`,
    policyEvidence.structuralEvidenceReportSha256,
    policyEvidence.structuralEvidenceReportLocator,
    policyEvidence.structuralEvidenceCapturedAtUtc,
    assembly.approvedPolicyCandidate.governanceProvenance.collectorId,
  );
  append(
    `structural-evaluation:${policyEvidence.structuralEvidenceEvaluationIdentity}`,
    policyEvidence.structuralEvidenceVerificationRecordSha256,
    policyEvidence.structuralEvidenceVerificationRecordLocator,
    assembly.approvedPolicyCandidate.governanceProvenance.reviewedAtUtc,
    assembly.approvedPolicyCandidate.governanceProvenance.reviewerId,
  );
  append(
    `structural-proposal:${policyEvidence.structuralLimitProposalIdentity}`,
    policyEvidence.structuralLimitProposalRecordSha256,
    policyEvidence.structuralLimitProposalRecordLocator,
    assembly.approvedPolicyCandidate.governanceProvenance.proposedAtUtc,
    assembly.approvedPolicyCandidate.governanceProvenance.proposerId,
  );
  append(
    `structural-independent-approval:${policyEvidence.independentApprovalDecisionIdentity}`,
    policyEvidence.independentApprovalRecordSha256,
    policyEvidence.independentApprovalRecordLocator,
    assembly.approvedPolicyCandidate.governanceProvenance.decidedAtUtc,
    assembly.approvedPolicyCandidate.governanceProvenance.approverId,
  );
  append(
    `structural-assembly:${assembly.approvedPolicyAssemblyIdentity}`,
    assembly.assemblyRecordSha256,
    assembly.assemblyRecordLocator,
    assembly.assembledAtUtc,
    assembly.assemblerId,
  );
  return Object.freeze(result.map((entry) => Object.freeze(entry)));
}

/** Test-only independent retrieval receipts. They do not prove current evidence. */
export function createArenaV2A7FormalEvidenceRecordVerificationDirectoryTestFixture(
  legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  assembly: ArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
  locatorDirectory: ReturnType<
    typeof createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture
  >,
  formalEvidenceRetrievalPlanIdentityHash: string,
  overrides: Readonly<{
    readonly firstVerificationReceiptSha256?: string;
    readonly storeSnapshotIdentityHash?: string;
  }> = {},
) {
  const legacy = legacyEvidence.evidence;
  const policyEvidence = assembly.approvedPolicyCandidate.evidenceIdentity;
  const shaByRecordId = new Map<string, string>();
  const append = (recordId: string, evidenceSha256: string | null): void => {
    if (evidenceSha256 !== null) shaByRecordId.set(recordId, evidenceSha256);
  };
  append(
    `formal-budget:${legacy.formalBudgetEvidence.policyId}`,
    legacy.formalBudgetEvidence.evidenceSha256,
  );
  for (const entry of legacy.phaseEvidence) {
    append(`phase:${entry.phaseId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.assets) {
    append(`asset-license:${entry.assetId}`, entry.license.evidenceSha256);
    append(`asset-approval:${entry.assetId}`, entry.approval.evidenceSha256);
  }
  for (const entry of legacy.environmentBuilds) {
    append(`environment-build:${entry.environmentId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.deliveries) {
    append(`delivery:${entry.platformId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.captures) {
    append(`capture:${entry.captureId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.reviews) {
    append(`review:${entry.dimensionId}`, entry.evidenceSha256);
  }
  for (const entry of policyEvidence.structuralEnvironmentEvidenceRecords) {
    append(
      `structural-environment:${policyEvidence.structuralEvidenceSubmissionIdentity}`
        + `:${entry.environmentId}`,
      entry.evidenceSha256,
    );
  }
  append(
    `structural-report:${policyEvidence.structuralEvidenceSubmissionIdentity}`,
    policyEvidence.structuralEvidenceReportSha256,
  );
  append(
    `structural-evaluation:${policyEvidence.structuralEvidenceEvaluationIdentity}`,
    policyEvidence.structuralEvidenceVerificationRecordSha256,
  );
  append(
    `structural-proposal:${policyEvidence.structuralLimitProposalIdentity}`,
    policyEvidence.structuralLimitProposalRecordSha256,
  );
  append(
    `structural-independent-approval:${policyEvidence.independentApprovalDecisionIdentity}`,
    policyEvidence.independentApprovalRecordSha256,
  );
  append(
    `structural-assembly:${assembly.approvedPolicyAssemblyIdentity}`,
    assembly.assemblyRecordSha256,
  );
  return Object.freeze(locatorDirectory.map((entry, index) => {
    const verifiedEvidenceSha256 = shaByRecordId.get(entry.recordId);
    if (verifiedEvidenceSha256 === undefined) {
      throw new RangeError(`A7 verification fixture缺少Evidence SHA：${entry.recordId}。`);
    }
    return Object.freeze({
      recordId: entry.recordId,
      formalEvidenceRetrievalPlanIdentityHash,
      formalEvidenceStoreSnapshotIdentityHash:
        overrides.storeSnapshotIdentityHash
        ?? ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
      verifiedEvidenceLocator: entry.evidenceLocator,
      verifiedEvidenceMediaType: entry.evidenceMediaType,
      verifiedEvidenceByteLength: entry.evidenceByteLength,
      verifiedEvidenceRecordedAtUtc: entry.evidenceRecordedAtUtc,
      verifiedEvidenceProducerId: entry.evidenceProducerId,
      verifiedEvidenceSha256,
      verifierId: 'future-independent-a7-evidence-verifier',
      verifiedAtUtc: '2026-08-15T18:00:00.000Z',
      verificationReceiptLocator:
        `evidence://arena-v2/a7/test-only/verification-receipt-${index}`,
      verificationReceiptMediaType: 'application/json',
      verificationReceiptByteLength: 512 + index,
      verificationReceiptSha256: index === 0
        ? overrides.firstVerificationReceiptSha256 ?? sha(4_000)
        : sha(4_000 + index),
    });
  }));
}

/** Test-only future V3 PASS. It is not current project evidence or wiring. */
export function createArenaV2A7FuturePassFixtureV3(
  options: FuturePassFixtureOptions,
) {
  const { assemblyInput, assembly } = createApprovedPolicyAssemblyFixture(options);
  const legacyEvidence = createArenaV2A7CurrentCatalogFuturePassLegacyFixture(options);
  const formalEvidenceRecordLocatorDirectory =
    createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture(
      legacyEvidence,
      assembly,
    );
  const formalEvidenceRetrievalPlan =
    createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence,
      approvedPolicyAssemblyInput: assemblyInput,
      approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
    });
  return evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3({
    evidence: {
      schemaVersion: 3,
      legacyEvidence,
      approvedPolicyAssemblyInput: assemblyInput,
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
          options.verificationReceiptSha256Override === undefined ? {} : {
            firstVerificationReceiptSha256:
              options.verificationReceiptSha256Override,
          },
        ),
    },
  });
}

/** Current missing visual/media truth projected through the future V3 budget boundary. */
export function createArenaV2A7CurrentCatalogIncompleteFixtureV3(
  options: FuturePassFixtureOptions,
) {
  const { assemblyInput, assembly } = createApprovedPolicyAssemblyFixture(options);
  const current = createArenaV2A7CurrentCatalogIncompleteFixture(options);
  const legacyEvidence = current.legacyEvidence;
  const formalEvidenceRecordLocatorDirectory =
    createArenaV2A7FormalEvidenceRecordLocatorDirectoryTestFixture(
      legacyEvidence,
      assembly,
    );
  const formalEvidenceRetrievalPlan =
    createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence,
      approvedPolicyAssemblyInput: assemblyInput,
      approvedPolicyAssemblyIdentity: assembly.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        ARENA_V2_A7_TEST_ONLY_FORMAL_EVIDENCE_STORE_SNAPSHOT_IDENTITY,
    });
  return evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3({
    evidence: {
      schemaVersion: 3,
      legacyEvidence,
      approvedPolicyAssemblyInput: assemblyInput,
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
  });
}
