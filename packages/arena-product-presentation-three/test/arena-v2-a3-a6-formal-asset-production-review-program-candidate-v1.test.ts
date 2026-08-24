import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
} from '../src/index.js';

describe('Arena V2 A3-A6 formal asset production review program candidate V1 (not run)', () => {
  it('closes all nine preparation batches and 130 assets in queue order', () => {
    expect(PROGRAM.summary).toEqual({
      workBatchCount: 9,
      preparationCodeWrittenBatchCount: 9,
      preparationValidatedBatchCount: 0,
      assetCount: 130,
      productionApprovalMissingAssetCount: 130,
      missingEvidenceSlotCount: 910,
      reviewUnitCount: 95,
      reviewPassCount: 0,
      productionBlockoutBatchCount: 0,
      integrationBatchCount: 0,
      finalBatchCount: 0,
    });
    expect(PROGRAM.reviewProgramRows.map(({ priority }) => priority)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(new Set(PROGRAM.reviewProgramRows.map(({ preparationIdentityHash }) => (
      preparationIdentityHash
    ))).size).toBe(9);
  });

  it('separates source work while blocked from production actions after prerequisites', () => {
    expect(PROGRAM.reviewProgramRows.every((row) => (
      row.preparationCodeWritten === true
      && row.preparationValidationStatus === 'not-run'
      && row.sourcePreparationMayContinue === true
      && row.whileBlockedNextAction.endsWith('-without-executing')
      && row.afterPrerequisitesNextAction.startsWith('run-')
      && row.reviewPassCount === 0
    ))).toBe(true);
    expect(PROGRAM.blockingPrerequisites).toHaveLength(3);
  });

  it('does not execute reviews or open any production gate', () => {
    expect(PROGRAM).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      executesReviews: false,
      createsOrModifiesAssets: false,
      loadsOrDecodesAssets: false,
      rendersOrPlaysAssets: false,
      participatesInGameplayAuthority: false,
      changesBatchOrderScopeOrBudget: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PROGRAM.productionPermission).toEqual({
      productionBlockoutAllowed: false,
      integrationAllowed: false,
      finalAllowed: false,
      assetUsePermitted: false,
    });
    expect(PROGRAM.reviewProgramRows.every((row) => (
      row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
      && row.assetUsePermitted === false
    ))).toBe(true);
  });
});
