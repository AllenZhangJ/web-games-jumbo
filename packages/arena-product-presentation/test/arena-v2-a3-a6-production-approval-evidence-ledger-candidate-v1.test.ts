import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as LEDGER,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_INPUT as INPUT,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1 as SLOT_IDS,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1 as CATALOG,
  createArenaV2A3A6ProductionApprovalEvidenceLedgerCandidateV1 as createLedger,
} from '../src/index.js';

type MutableInput = Record<PropertyKey, unknown> & {
  entries: Array<Record<PropertyKey, unknown> & {
    budgetPolicyIdentity: Record<PropertyKey, unknown>;
    sourceEvidence: Record<PropertyKey, unknown>;
    requiredEvidenceSlots: Array<Record<PropertyKey, unknown>>;
    gapReasonIds: string[];
  }>;
};

function mutableInput(): MutableInput {
  return JSON.parse(JSON.stringify(INPUT)) as MutableInput;
}

describe('Arena V2 A3-A6 production approval evidence ledger candidate V1 (not run)', () => {
  it('binds the exact current Catalog and V2 budget identities in canonical order', () => {
    expect(LEDGER.catalogContentHash).toBe(CATALOG.contentHash);
    expect(LEDGER.budgetPolicyIdentity).toEqual(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
    );
    expect(LEDGER.entries).toHaveLength(130);
    expect(LEDGER.entries.map(({ assetId }) => assetId)).toEqual(
      [...LEDGER.entries].map(({ assetId }) => assetId).sort(),
    );
    expect(new Set(LEDGER.entries.map(({ assetId }) => assetId)).size).toBe(130);
    expect(new Set(LEDGER.entries.map(({ artifactPath }) => artifactPath)).size).toBe(130);
    expect(createLedger(INPUT).contentHash).toBe(LEDGER.contentHash);
  });

  it('separates source approval, production approval and candidate budget coverage', () => {
    expect(LEDGER.summary).toEqual({
      assetCount: 130,
      sourceApprovalRecordedAssetCount: 29,
      productionApprovedAssetCount: 0,
      productionApprovalMissingAssetCount: 130,
      budgetCandidateCoveredAssetCount: 130,
      assetUsePermittedCount: 0,
      formalReadyAssetCount: 0,
      requiredEvidenceSlotCountPerAsset: 7,
      missingEvidenceSlotCount: 910,
    });
    expect(LEDGER.entries.every((entry) => (
      entry.productionApprovalStatus === 'missing-not-approved'
      && entry.budgetCandidateCovered
      && !entry.assetUsePermitted
      && !entry.formalReady
    ))).toBe(true);
    expect(LEDGER.entries.some(({ sourceApprovalRecorded }) => sourceApprovalRecorded)).toBe(true);
    expect(LEDGER.entries.some(({ sourceApprovalRecorded }) => !sourceApprovalRecorded)).toBe(true);
  });

  it('keeps all approval evidence slots explicitly missing without fake reviewers or dates', () => {
    expect(SLOT_IDS).toEqual([
      'art-direction-review',
      'production-rights-review',
      'approved-structure-budget',
      'browser-integration-capture',
      'device-visual-performance',
      'human-readability',
      'lifecycle-release',
    ]);
    for (const entry of LEDGER.entries) {
      expect(entry.requiredEvidenceSlots.map(({ slotId }) => slotId)).toEqual(SLOT_IDS);
      expect(entry.requiredEvidenceSlots.every((slot) => (
        slot.status === 'missing'
        && slot.evidenceIdentity === null
        && slot.reviewerId === null
        && slot.reviewedAt === null
      ))).toBe(true);
    }
  });

  it('keeps approval, loading, gameplay authority and every default consumer closed', () => {
    expect(LEDGER).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      grantsApproval: false,
      hardGate: false,
      assetUsePermitted: false,
      formalReady: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
      participatesInGameplayAuthority: false,
      createsOrModifiesAssets: false,
      loadsAssets: false,
      p7AdvanceComputedHere: false,
    });
  });

  it('rejects unknown, missing, repeated, reordered and coherently substituted assets', () => {
    const unknown = mutableInput();
    unknown.entries[0]!.assetId = 'arena.asset.unknown.future.v1';
    expect(() => createLedger(unknown)).toThrow();

    const missing = mutableInput();
    missing.entries.pop();
    expect(() => createLedger(missing)).toThrow();

    const duplicate = mutableInput();
    duplicate.entries[1] = duplicate.entries[0]!;
    expect(() => createLedger(duplicate)).toThrow();

    const reordered = mutableInput();
    [reordered.entries[0], reordered.entries[1]] = [
      reordered.entries[1]!,
      reordered.entries[0]!,
    ];
    expect(() => createLedger(reordered)).toThrow();

    const coherent = mutableInput();
    const replacement = coherent.entries[1]!;
    coherent.entries[0]!.assetId = replacement.assetId;
    coherent.entries[0]!.artifactPath = replacement.artifactPath;
    coherent.entries[0]!.kind = replacement.kind;
    coherent.entries[0]!.byteLength = replacement.byteLength;
    coherent.entries[0]!.sha256 = replacement.sha256;
    coherent.entries[0]!.maturity = replacement.maturity;
    coherent.entries[0]!.sourceEvidence = replacement.sourceEvidence;
    coherent.entries[0]!.sourceApprovalRecorded = replacement.sourceApprovalRecorded;
    expect(() => createLedger(coherent)).toThrow();
  });

  it('rejects approval escalation, fake evidence and Catalog or budget identity drift', () => {
    const approval = mutableInput();
    approval.entries[0]!.productionApprovalStatus = 'approved';
    approval.entries[0]!.assetUsePermitted = true;
    approval.entries[0]!.formalReady = true;
    expect(() => createLedger(approval)).toThrow();

    const evidence = mutableInput();
    evidence.entries[0]!.requiredEvidenceSlots[0]!.status = 'passed';
    evidence.entries[0]!.requiredEvidenceSlots[0]!.reviewerId = 'fake-reviewer';
    evidence.entries[0]!.requiredEvidenceSlots[0]!.reviewedAt = '2026-08-12';
    expect(() => createLedger(evidence)).toThrow();

    const catalog = mutableInput();
    catalog.catalogContentHash = 'drift';
    expect(() => createLedger(catalog)).toThrow();

    const budget = mutableInput();
    budget.entries[0]!.budgetPolicyIdentity.policyContentHash = 'drift';
    expect(() => createLedger(budget)).toThrow();
  });

  it('rejects future fields, accessors, Symbols and unsafe byte counts before trusting values', () => {
    const future = mutableInput();
    future.entries[0]!.futureApproval = true;
    expect(() => createLedger(future)).toThrow();

    const symbol = mutableInput();
    symbol.entries[0]![Symbol('future')] = true;
    expect(() => createLedger(symbol)).toThrow();

    const unsafe = mutableInput();
    unsafe.entries[0]!.byteLength = Number.MAX_SAFE_INTEGER + 1;
    expect(() => createLedger(unsafe)).toThrow();

    const accessor = mutableInput();
    let getterCallCount = 0;
    Object.defineProperty(accessor.entries[0]!, 'sha256', {
      enumerable: true,
      get: () => {
        getterCallCount += 1;
        return LEDGER.entries[0]!.sha256;
      },
    });
    expect(() => createLedger(accessor)).toThrow();
    expect(getterCallCount).toBe(0);
  });
});
