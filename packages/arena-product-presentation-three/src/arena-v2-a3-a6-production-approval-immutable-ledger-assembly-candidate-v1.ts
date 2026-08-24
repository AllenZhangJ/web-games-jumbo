import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1,
} from './arena-v2-a3-a6-production-approval-decision-record-candidate-v1.js';
import {
  createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1,
} from './arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.js';

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_ID =
  'arena-v2.a3-a6.production-approval-immutable-ledger-assembly.candidate.v1' as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'baseLedgerId',
  'baseLedgerContentHash',
  'proposedContentVersion',
  'assemblyRequestId',
  'assemblerId',
  'assembledAtUtc',
  'decisions',
]);
const DECISION_ENVELOPE_KEYS = new Set([
  'decisionInput',
  'approvalDecisionIdentity',
]);
const DECISION_INPUT_KEYS = new Set([
  'schemaVersion',
  'evidenceSetInput',
  'evidenceSetIdentity',
  'approverId',
  'decidedAtUtc',
  'decision',
  'sourceAndRightsClosureVerified',
  'budgetIdentityVerified',
  'dependencyClosureVerified',
  'approvalRecordLocator',
  'approvalRecordSha256',
  'reasonIds',
  'notes',
]);
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function utcTimestamp(value: unknown, name: string): string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    throw new RangeError(`${name}必须是毫秒精度UTC ISO时间。`);
  }
  return value;
}

function cloneBaseEntry(
  entry: (typeof ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries)[number],
) {
  return Object.freeze({
    ...entry,
    budgetPolicyIdentity: Object.freeze({ ...entry.budgetPolicyIdentity }),
    sourceEvidence: Object.freeze({ ...entry.sourceEvidence }),
    requiredEvidenceSlots: Object.freeze(entry.requiredEvidenceSlots.map((slot) => (
      Object.freeze({ ...slot })
    ))),
    gapReasonIds: Object.freeze([...entry.gapReasonIds]),
    approvalDecision: null,
  });
}

/**
 * Mechanically assembles approved decision records into a new immutable ledger
 * proposal. The proposal is content-addressed but deliberately unpublished: it
 * cannot replace the current ledger or authorize any runtime asset use.
 */
export function createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(
    value,
    'Arena V2生产批准新不可变账本组装候选V1',
  );
  exactRecord(
    source,
    INPUT_KEYS,
    'Arena V2生产批准新不可变账本组装候选V1',
  );

  const baseLedger =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1;
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION
    || source.baseLedgerId !== baseLedger.id
    || source.baseLedgerContentHash !== baseLedger.contentHash
    || baseLedger.status !== 'production-unreachable'
    || baseLedger.grantsApproval
    || baseLedger.hardGate
    || baseLedger.assetUsePermitted
    || baseLedger.formalReady
  ) throw new RangeError('Arena V2新不可变账本组装的当前基线账本身份或关闭门状态漂移。');

  const proposedContentVersion = assertIntegerAtLeast(
    source.proposedContentVersion,
    2,
    'Arena V2新不可变账本组装.proposedContentVersion',
  );
  if (proposedContentVersion !== baseLedger.contentVersion + 1) {
    throw new RangeError('Arena V2新不可变账本组装只允许从当前版本生成下一版本提案。');
  }
  const assemblyRequestId = assertNonEmptyString(
    source.assemblyRequestId,
    'Arena V2新不可变账本组装.assemblyRequestId',
  );
  const assemblerId = assertNonEmptyString(
    source.assemblerId,
    'Arena V2新不可变账本组装.assemblerId',
  );
  const assembledAtUtc = utcTimestamp(
    source.assembledAtUtc,
    'Arena V2新不可变账本组装.assembledAtUtc',
  );

  if (!Array.isArray(source.decisions)
    || source.decisions.length === 0
    || source.decisions.length > baseLedger.entries.length) {
    throw new RangeError('Arena V2新不可变账本组装必须包含1至130项批准决定。');
  }

  const approvedRows = source.decisions.map((raw, index) => {
    const name = `Arena V2新不可变账本组装.decisions[${index}]`;
    exactRecord(raw, DECISION_ENVELOPE_KEYS, name);
    const decisionRecord =
      createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1(
        raw.decisionInput,
      );
    if (
      raw.approvalDecisionIdentity !== decisionRecord.approvalDecisionIdentity
      || decisionRecord.decisionStatus !== 'approved'
      || !decisionRecord.eligibleForNewImmutableLedgerAssembly
      || decisionRecord.ledgerContentHash !== baseLedger.contentHash
      || !decisionRecord.decisionRecordDoesNotMutateCurrentLedger
      || decisionRecord.ledgerMutationApplied
      || decisionRecord.currentLedgerProductionApprovalStatus !== 'missing-not-approved'
      || decisionRecord.currentLedgerAssetUsePermitted
      || decisionRecord.grantsApprovalForCurrentLedger
      || decisionRecord.grantsApproval
      || decisionRecord.hardGate
      || decisionRecord.formalReady
      || decisionRecord.assetUsePermitted
    ) throw new RangeError(`${name}不是绑定当前基线的已批准独立Decision Record。`);

    const decisionInput = cloneFrozenData(raw.decisionInput, `${name}.decisionInput`);
    exactRecord(decisionInput, DECISION_INPUT_KEYS, `${name}.decisionInput`);
    const evidenceSet =
      createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1(
        decisionInput.evidenceSetInput,
      );
    const baseEntry = baseLedger.entries.find(
      ({ assetId }) => assetId === decisionRecord.assetId,
    );
    if (
      baseEntry === undefined
      || decisionRecord.evidenceSetIdentity !== evidenceSet.evidenceSetIdentity
      || decisionRecord.acceptedEvidenceSlotCount
        !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1.length
      || !evidenceSet.completeAcceptedEvidenceSet
      || evidenceSet.assetId !== baseEntry.assetId
      || evidenceSet.artifactPath !== baseEntry.artifactPath
      || evidenceSet.artifactSha256 !== baseEntry.sha256
      || decisionRecord.artifactPath !== baseEntry.artifactPath
      || decisionRecord.artifactSha256 !== baseEntry.sha256
      || baseEntry.productionApprovalStatus !== 'missing-not-approved'
      || baseEntry.assetUsePermitted
      || baseEntry.formalReady
    ) throw new RangeError(`${name}的Asset、Evidence Set或Catalog身份漂移。`);
    if (
      assemblerId === decisionRecord.approverId
      || evidenceSet.evaluationRows.some(({ collectorId, reviewerId }) => (
        assemblerId === collectorId || assemblerId === reviewerId
      ))
    ) throw new RangeError('Arena V2账本组装者不得兼任已组装资产的采集、评估或批准角色。');
    if (assembledAtUtc < decisionRecord.decidedAtUtc) {
      throw new RangeError('Arena V2账本组装时间不得早于任何已组装批准决定。');
    }
    return Object.freeze({ decisionRecord, evidenceSet });
  }).sort((left, right) => (
    left.decisionRecord.assetId < right.decisionRecord.assetId
      ? -1
      : left.decisionRecord.assetId > right.decisionRecord.assetId ? 1 : 0
  ));

  const assetIds = approvedRows.map(({ decisionRecord }) => decisionRecord.assetId);
  const decisionIdentities = approvedRows.map(
    ({ decisionRecord }) => decisionRecord.approvalDecisionIdentity,
  );
  const evidenceSetIdentities = approvedRows.map(
    ({ decisionRecord }) => decisionRecord.evidenceSetIdentity,
  );
  const recordLocators = approvedRows.map(
    ({ decisionRecord }) => decisionRecord.approvalRecordLocator,
  );
  const recordHashes = approvedRows.map(
    ({ decisionRecord }) => decisionRecord.approvalRecordSha256,
  );
  for (const [name, values] of [
    ['Asset', assetIds],
    ['Decision', decisionIdentities],
    ['Evidence Set', evidenceSetIdentities],
    ['Approval Record Locator', recordLocators],
    ['Approval Record SHA', recordHashes],
  ] as const) {
    if (new Set(values).size !== values.length) {
      throw new RangeError(`Arena V2新不可变账本组装的${name}身份必须唯一。`);
    }
  }

  const approvalByAssetId = new Map(approvedRows.map((row) => (
    [row.decisionRecord.assetId, row] as const
  )));
  const entries = Object.freeze(baseLedger.entries.map((entry) => {
    const approved = approvalByAssetId.get(entry.assetId);
    if (approved === undefined) return cloneBaseEntry(entry);
    const { decisionRecord, evidenceSet } = approved;
    return Object.freeze({
      ...cloneBaseEntry(entry),
      productionApprovalStatus: 'approved-decision-assembled-not-published' as const,
      requiredEvidenceSlots: Object.freeze(evidenceSet.evaluationRows.map((row) => (
        Object.freeze({
          slotId: row.evidenceSlotId,
          status: 'accepted' as const,
          evidenceIdentity: row.evidenceIdentity,
          reviewerId: row.reviewerId,
          reviewedAt: row.reviewedAtUtc,
        })
      ))),
      gapReasonIds: Object.freeze([] as string[]),
      approvalDecision: Object.freeze({
        evidenceSetIdentity: decisionRecord.evidenceSetIdentity,
        approvalDecisionIdentity: decisionRecord.approvalDecisionIdentity,
        approverId: decisionRecord.approverId,
        decidedAtUtc: decisionRecord.decidedAtUtc,
        approvalRecordLocator: decisionRecord.approvalRecordLocator,
        approvalRecordSha256: decisionRecord.approvalRecordSha256,
        sourceAndRightsClosureVerified:
          decisionRecord.sourceAndRightsClosureVerified,
        budgetIdentityVerified: decisionRecord.budgetIdentityVerified,
        dependencyClosureVerified: decisionRecord.dependencyClosureVerified,
      }),
      assetUsePermitted: false as const,
      formalReady: false as const,
    });
  }));

  const approvedDecisionCount = approvedRows.length;
  const remainingMissingApprovalCount = entries.length - approvedDecisionCount;
  const summary = Object.freeze({
    assetCount: entries.length,
    sourceApprovalRecordedAssetCount:
      entries.filter(({ sourceApprovalRecorded }) => sourceApprovalRecorded).length,
    approvedDecisionAssembledAssetCount: approvedDecisionCount,
    productionApprovalMissingAssetCount: remainingMissingApprovalCount,
    acceptedEvidenceSlotCount:
      approvedDecisionCount
        * ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1.length,
    missingEvidenceSlotCount:
      remainingMissingApprovalCount
        * ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1.length,
    assetUsePermittedCount: 0 as const,
    formalReadyAssetCount: 0 as const,
    completeCatalogDecisionCoverage: remainingMissingApprovalCount === 0,
  });
  const proposedLedgerCore = Object.freeze({
    schemaVersion: baseLedger.schemaVersion,
    id: baseLedger.id,
    contentVersion: proposedContentVersion,
    baseContentHash: baseLedger.contentHash,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    publicationStatus: 'immutable-proposal-not-published' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    assetUsePermitted: false as const,
    formalReady: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
    participatesInGameplayAuthority: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    p7AdvanceComputedHere: false as const,
    catalogContentHash: baseLedger.catalogContentHash,
    budgetPolicyIdentity: Object.freeze({ ...baseLedger.budgetPolicyIdentity }),
    requiredEvidenceSlotIds: Object.freeze([...baseLedger.requiredEvidenceSlotIds]),
    entries,
    summary,
  });
  const proposedLedger = Object.freeze({
    ...proposedLedgerCore,
    contentHash: createDeterministicDataHash(
      proposedLedgerCore,
      'Arena V2 A3-A6 production approval immutable ledger proposal V1',
    ),
  });
  const proposalCore = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    id: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_ID,
    assemblyRequestId,
    assemblerId,
    assembledAtUtc,
    baseLedgerContentHash: baseLedger.contentHash,
    proposedLedgerContentHash: proposedLedger.contentHash,
    proposedContentVersion,
    approvalDecisionIdentities: Object.freeze([...decisionIdentities]),
    approvedAssetIds: Object.freeze([...assetIds]),
  });
  return Object.freeze({
    ...proposalCore,
    immutableLedgerProposalIdentity: createDeterministicDataHash(
      proposalCore,
      'Arena V2 A3-A6 production approval immutable ledger assembly candidate V1',
    ),
    proposedLedger,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    assemblyStatus: 'assembled-proposal-not-published' as const,
    immutableProposalCreated: true as const,
    currentLedgerMutated: false as const,
    publishesLedger: false as const,
    grantsApproval: false as const,
    hardGate: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
    executesEvidenceApprovalOrPublicationWork: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    id: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1_ID,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    formalReady: false as const,
    grantsApproval: false as const,
    assetUsePermitted: false as const,
    currentAllowedScope: 'plain-data-unpublished-immutable-ledger-proposal-only' as const,
    revalidatesEveryRawApprovedDecision: true as const,
    requiresCurrentBaselineLedgerIdentity: true as const,
    requiresIndependentAssembler: true as const,
    preservesUnapprovedEntriesAsMissing: true as const,
    approvedEntriesRemainRuntimeUnusableUntilSeparatePublication: true as const,
    proposalIsContentAddressedAndDeepFrozen: true as const,
    mutatesCurrentLedger: false as const,
    publishesLedger: false as const,
    executesEvidenceApprovalOrPublicationWork: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1 =
  ReturnType<
    typeof createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1
  >;
