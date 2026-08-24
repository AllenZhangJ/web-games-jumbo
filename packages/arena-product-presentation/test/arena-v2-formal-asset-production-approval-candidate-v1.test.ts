import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1,
  isArenaV2FormalAssetProductionApprovedCandidateV1,
  isArenaV2FormalModelLoadPermittedCandidateV1,
} from '../src/arena-v2-formal-asset-production-approval-candidate-v1.js';

describe('Arena V2 formal asset production approval index (not run)', () => {
  it('does not promote intake, candidate budget coverage or model dependencies', () => {
    const approval = ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1;

    expect(approval.registeredAssetCount).toBe(130);
    expect(approval.currentProductionApprovedAssetCount).toBe(0);
    expect(approval.productionApprovedAssetIds).toEqual([]);
    expect(approval.productionApprovedModelAssetIds).toEqual([]);
    expect(approval.productionApprovedAudioAssetIds).toEqual([]);
    expect(approval.productionApprovedTextureAssetIds).toEqual([]);
    expect(approval.sourceIntakeDoesNotGrantProductionApproval).toBe(true);
    expect(approval.candidateBudgetCoverageDoesNotGrantProductionApproval).toBe(true);
    expect(approval.modelLoadingRequiresApprovedExternalTextureDependencyClosure).toBe(true);
    expect(isArenaV2FormalAssetProductionApprovedCandidateV1(
      'arena.audio.impact.kenney-impact-soft-1.v1',
    )).toBe(false);
    expect(isArenaV2FormalModelLoadPermittedCandidateV1(
      'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
    )).toBe(false);
  });
});
