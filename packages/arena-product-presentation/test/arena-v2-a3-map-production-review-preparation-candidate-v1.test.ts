import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as WORK_QUEUE,
} from '../src/index.js';

describe('Arena V2 A3 map production review preparation candidate V1 (not run)', () => {
  it('closes exactly two registered maps and twenty ordered route segments', () => {
    expect(PREPARATION.mapReviewPacks).toHaveLength(2);
    expect(PREPARATION.mapReviewPacks.map(({ segmentReviewRows }) => (
      segmentReviewRows.length
    ))).toEqual([12, 8]);
    const segmentIds = PREPARATION.mapReviewPacks.flatMap(
      ({ registeredSequentialRouteSegmentIds }) => registeredSequentialRouteSegmentIds,
    );
    expect(segmentIds).toHaveLength(20);
    expect(new Set(segmentIds).size).toBe(20);
    expect(PREPARATION.mapReviewPacks.every((pack) => (
      pack.requiredInputs[0] === 'direction'
      && pack.requiredInputs[1] === 'jump'
      && pack.minimumParticipants === 2
      && pack.maximumParticipants === 4
      && pack.criticalPathClaimed === false
    ))).toBe(true);
  });

  it('binds the first work batch and preserves every production gate as closed', () => {
    const batch = WORK_QUEUE.workBatches[0];
    expect(batch?.batchId).toBe('a3-map-models');
    expect(new Set(PREPARATION.mapReviewPacks.map(({ visualAsset }) => (
      visualAsset.assetId
    )))).toEqual(new Set(batch?.assetIds));
    expect(PREPARATION).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      createsOrModifiesAssets: false,
      loadsAssets: false,
      participatesInGameplayAuthority: false,
      changesRuleCollisionOrRoute: false,
      derivesMovementMetricsFromArt: false,
      usesRegisteredMobilityEnvelope: true,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.mapReviewPacks.every((pack) => (
      pack.visualAsset.productionApprovalStatus === 'missing-not-approved'
      && pack.visualAsset.productionApproved === false
      && pack.visualAsset.formalReady === false
      && pack.visualAsset.assetUsePermitted === false
      && pack.reviewStatus === 'not-run'
      && pack.productionBlockoutAllowed === false
      && pack.integrationAllowed === false
      && pack.finalAllowed === false
    ))).toBe(true);
  });

  it('exposes pacing, guidance, recovery and dual-mode review facts without pass claims', () => {
    const [base, switchback] = PREPARATION.mapReviewPacks;
    expect(base?.branchSegmentIds.length).toBeGreaterThan(0);
    expect(switchback?.branchSegmentIds).toEqual([]);
    expect(PREPARATION.mapReviewPacks.every((pack) => (
      pack.segmentReviewRows.every((segment) => (
        segment.ordinal >= 1
        && segment.experienceIntensity >= 1
        && segment.experienceIntensity <= 5
        && segment.landmarkCue.length > 0
        && segment.leadingLineCue.length > 0
        && segment.memoryHook.length > 0
        && segment.raceRead.length > 0
        && segment.survivalRead.length > 0
        && segment.reviewStatus === 'not-run'
      ))
      && pack.reviewChecklist.length === 8
      && pack.reviewChecklist.every(({ evidenceStatus }) => evidenceStatus === 'not-run')
    ))).toBe(true);
    expect(PREPARATION.summary).toEqual({
      mapCount: 2,
      segmentCount: 20,
      assetCount: 2,
      checklistItemCountPerMap: 8,
      reviewPassCount: 0,
      productionBlockoutMapCount: 0,
      integrationMapCount: 0,
      finalMapCount: 0,
    });
  });

  it('freezes the registered movement envelope instead of deriving it from art', () => {
    expect(PREPARATION.mapReviewPacks.map(({ mobilityEnvelope }) => (
      mobilityEnvelope
    ))).toEqual([
      {
        maximumStepHeight: 0.4,
        maximumJumpGap: 2.25,
        maximumJumpRise: 0.65,
        maximumSafeDrop: 1.5,
        anchorGroundTolerance: 0.001,
      },
      {
        maximumStepHeight: 0.4,
        maximumJumpGap: 2.25,
        maximumJumpRise: 0.65,
        maximumSafeDrop: 1.5,
        anchorGroundTolerance: 0.001,
      },
    ]);
  });
});
