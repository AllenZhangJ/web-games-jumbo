import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-readiness-candidate-v1.js';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
} from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';
import {
  requireArenaV2FormalMapEnvironmentCandidateV1,
} from './arena-v2-formal-map-environment-candidate-v1.js';
import {
  ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';

export const ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const MAP_RUNTIME_SOURCES = Object.freeze([
  Object.freeze({
    mapDefinition: ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition,
    routeDefinition: ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition,
    mobilityEnvelope: ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mobilityEnvelope,
  }),
  Object.freeze({
    mapDefinition: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.mapDefinition,
    routeDefinition: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.routeDefinition,
    mobilityEnvelope: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.mobilityEnvelope,
  }),
]);

const REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'registered-route-order-solvability' as const,
    question: 'registered-route-order-remains-solvable-with-direction-and-jump-only' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'mobility-envelope-closure' as const,
    question: 'every-required-traversal-remains-inside-the-registered-mobility-envelope' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'rising-sawtooth-pacing' as const,
    question: 'intensity-reads-as-a-rising-sawtooth-with-release-before-later-pressure' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'teach-before-test' as const,
    question: 'each-required-route-lesson-is-introduced-before-higher-stakes-testing' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'landmark-and-leading-line-readability' as const,
    question: 'landmarks-leading-lines-and-memory-hooks-orient-without-new-walls' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'branch-rejoin-readability' as const,
    question: 'optional-branches-read-clearly-and-rejoin-without-breaking-momentum' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'recovery-signposting' as const,
    question: 'safe-recovery-and-respawn-consequences-are-readable-before-commitment' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'race-and-survival-dual-read' as const,
    question: 'the-same-support-geometry-reads-for-race-routing-and-survival-positioning' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const mapWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a3-map-models',
  );
if (
  mapWorkBatch === undefined
  || mapWorkBatch.priority !== 1
  || mapWorkBatch.assetCount !== 2
  || mapWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || mapWorkBatch.productionBlockoutAllowed
  || mapWorkBatch.integrationAllowed
  || mapWorkBatch.finalAllowed
  || mapWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A3地图生产评审准备必须绑定首个关闭生产门的两资产批次。');

const MAP_REVIEW_PACKS = Object.freeze(
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.map((mapRead) => {
    const runtimeSource = MAP_RUNTIME_SOURCES.find(
      ({ mapDefinition }) => mapDefinition.id === mapRead.mapDefinitionId,
    );
    const assetBinding = ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1.find(
      ({ mapDefinitionId }) => mapDefinitionId === mapRead.mapDefinitionId,
    );
    if (runtimeSource === undefined || assetBinding === undefined) {
      throw new RangeError(`Arena V2 A3地图${mapRead.mapDefinitionId}缺少权威路线或资产绑定。`);
    }
    const catalogAsset =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
        ({ assetId }) => assetId === assetBinding.mapVisualAssetId,
      );
    const approvalEntry =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === assetBinding.mapVisualAssetId,
      );
    if (catalogAsset === undefined || approvalEntry === undefined) {
      throw new RangeError(`Arena V2 A3地图${mapRead.mapDefinitionId}缺少Catalog或批准账本身份。`);
    }
    const environment = requireArenaV2FormalMapEnvironmentCandidateV1(
      mapRead.mapDefinitionId,
    );
    if (
      runtimeSource.routeDefinition.id !== mapRead.routeDefinitionId
      || runtimeSource.routeDefinition.mapDefinitionId !== mapRead.mapDefinitionId
      || runtimeSource.routeDefinition.segments.length !== mapRead.segments.length
      || runtimeSource.routeDefinition.requiredInputs.length !== 2
      || runtimeSource.routeDefinition.requiredInputs[0] !== 'direction'
      || runtimeSource.routeDefinition.requiredInputs[1] !== 'jump'
      || runtimeSource.routeDefinition.minimumParticipants !== mapRead.minimumParticipants
      || runtimeSource.routeDefinition.maximumParticipants !== mapRead.maximumParticipants
      || runtimeSource.routeDefinition.respawnDelayTicks !== mapRead.respawnDelayTicks
    ) throw new RangeError(`Arena V2 A3地图${mapRead.mapDefinitionId}的内容阅读与路线合同漂移。`);
    if (
      !mapWorkBatch.assetIds.includes(assetBinding.mapVisualAssetId)
      || catalogAsset.phaseId !== 'A3'
      || catalogAsset.role !== 'map-model'
      || catalogAsset.maturity !== assetBinding.maturity
      || catalogAsset.artifactPath !== approvalEntry.artifactPath
      || catalogAsset.byteLength !== approvalEntry.byteLength
      || catalogAsset.sha256 !== approvalEntry.sha256
      || catalogAsset.productionApproved
      || catalogAsset.formalReady
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted
      || approvalEntry.formalReady
    ) throw new RangeError(`Arena V2 A3地图${mapRead.mapDefinitionId}的资产准备事实漂移。`);

    const segmentReviewRows = Object.freeze(mapRead.segments.map((segment, index) => {
      const routeSegment = runtimeSource.routeDefinition.segments[index];
      if (
        routeSegment === undefined
        || routeSegment.id !== segment.segmentDefinitionId
        || routeSegment.kind !== segment.kind
        || routeSegment.survivalRole !== segment.survivalRole
        || routeSegment.responseWindowTicks !== segment.responseWindowTicks
        || routeSegment.hitRecovery !== segment.hitRecovery
        || routeSegment.branches.length !== segment.branchCount
      ) throw new RangeError(`Arena V2 A3地图段落${segment.segmentDefinitionId}的评审事实漂移。`);
      return Object.freeze({
        segmentDefinitionId: segment.segmentDefinitionId,
        ordinal: segment.ordinal,
        nameMessageId: segment.nameMessageId,
        lessonMessageId: segment.lessonMessageId,
        kind: segment.kind,
        pacingArc: segment.pacingArc,
        cycleOrdinal: segment.cycleOrdinal,
        experienceBeat: segment.experienceBeat,
        experienceIntensity: segment.experienceIntensity,
        survivalRole: segment.survivalRole,
        responseOptions: segment.responseOptions,
        responseWindowTicks: segment.responseWindowTicks,
        hitRecovery: segment.hitRecovery,
        difficulty: segment.difficulty,
        branchCount: segment.branchCount,
        supplyPointId: segment.supplyPointId,
        landmarkCue: segment.landmarkCue,
        leadingLineCue: segment.leadingLineCue,
        memoryHook: segment.memoryHook,
        raceRead: segment.raceRead,
        survivalRead: segment.survivalRead,
        reviewStatus: 'not-run' as const,
      });
    }));
    const registeredSequentialRouteSegmentIds = Object.freeze(
      segmentReviewRows.map(({ segmentDefinitionId }) => segmentDefinitionId),
    );
    return Object.freeze({
      mapDefinitionId: mapRead.mapDefinitionId,
      routeDefinitionId: mapRead.routeDefinitionId,
      nameMessageId: mapRead.nameMessageId,
      requiredInputs: runtimeSource.routeDefinition.requiredInputs,
      minimumParticipants: mapRead.minimumParticipants,
      maximumParticipants: mapRead.maximumParticipants,
      respawnDelayTicks: mapRead.respawnDelayTicks,
      mobilityEnvelope: runtimeSource.mobilityEnvelope,
      registeredSequentialRouteSegmentIds,
      criticalPathClaimed: false as const,
      visualAsset: Object.freeze({
        assetId: assetBinding.mapVisualAssetId,
        artifactPath: catalogAsset.artifactPath,
        byteLength: catalogAsset.byteLength,
        sha256: catalogAsset.sha256,
        maturity: catalogAsset.maturity,
        v2CandidateBudgetCoverage: catalogAsset.v2CandidateBudgetCoverage.status,
        productionApprovalStatus: approvalEntry.productionApprovalStatus,
        sourceApprovalRecorded: catalogAsset.provenance.sourceApprovalRecorded,
        productionApproved: false as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
      }),
      environment: Object.freeze({
        identity: environment.identity,
        contentHash: environment.contentHash,
      }),
      segmentReviewRows,
      intensityCurve: Object.freeze(segmentReviewRows.map(({
        segmentDefinitionId,
        experienceBeat,
        experienceIntensity,
      }) => Object.freeze({
        segmentDefinitionId,
        experienceBeat,
        experienceIntensity,
      }))),
      branchSegmentIds: Object.freeze(segmentReviewRows
        .filter(({ branchCount }) => branchCount > 0)
        .map(({ segmentDefinitionId }) => segmentDefinitionId)),
      safeOrRecoverySegmentIds: Object.freeze(segmentReviewRows
        .filter(({ survivalRole }) => survivalRole === 'safe' || survivalRole === 'recovery')
        .map(({ segmentDefinitionId }) => segmentDefinitionId)),
      climaxSegmentIds: Object.freeze(segmentReviewRows
        .filter(({ experienceBeat }) => experienceBeat === 'climax')
        .map(({ segmentDefinitionId }) => segmentDefinitionId)),
      releaseSegmentIds: Object.freeze(segmentReviewRows
        .filter(({ experienceBeat }) => experienceBeat === 'release')
        .map(({ segmentDefinitionId }) => segmentDefinitionId)),
      resolutionSegmentIds: Object.freeze(segmentReviewRows
        .filter(({ experienceBeat }) => experienceBeat === 'resolution')
        .map(({ segmentDefinitionId }) => segmentDefinitionId)),
      reviewChecklist: REVIEW_CHECKLIST,
      reviewStatus: 'not-run' as const,
      productionBlockoutAllowed: false as const,
      integrationAllowed: false as const,
      finalAllowed: false as const,
    });
  }),
);

const allSegmentIds = MAP_REVIEW_PACKS.flatMap(
  ({ registeredSequentialRouteSegmentIds }) => [...registeredSequentialRouteSegmentIds],
);
const allAssetIds = MAP_REVIEW_PACKS.map(({ visualAsset }) => visualAsset.assetId);
if (
  MAP_REVIEW_PACKS.length !== 2
  || allSegmentIds.length !== 20
  || new Set(allSegmentIds).size !== 20
  || new Set(allAssetIds).size !== 2
  || new Set(allAssetIds).size !== mapWorkBatch.assetIds.length
  || mapWorkBatch.assetIds.some((assetId) => !allAssetIds.includes(assetId))
  || MAP_REVIEW_PACKS.some((pack) => (
    pack.segmentReviewRows.length !== pack.registeredSequentialRouteSegmentIds.length
    || pack.reviewChecklist.length !== REVIEW_CHECKLIST.length
    || pack.reviewChecklist.some(({ evidenceStatus }) => evidenceStatus !== 'not-run')
    || pack.visualAsset.productionApprovalStatus !== 'missing-not-approved'
    || pack.visualAsset.assetUsePermitted
    || pack.productionBlockoutAllowed
    || pack.integrationAllowed
    || pack.finalAllowed
  ))
) throw new RangeError('Arena V2 A3地图生产评审准备必须精确闭合2张地图、20段和2项未批准资产。');

const core = Object.freeze({
  schemaVersion: ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a3-map-production-review-preparation.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  createsOrModifiesAssets: false as const,
  loadsAssets: false as const,
  participatesInGameplayAuthority: false as const,
  changesRuleCollisionOrRoute: false as const,
  derivesMovementMetricsFromArt: false as const,
  usesRegisteredMobilityEnvelope: true as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: mapWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  informationContentHash:
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  usedSkillIds: Object.freeze(['level-design', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    '.agents/skills/level-design/SKILL.md',
    '.agents/skills/level-design/references/pacing-and-flow.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-brief-structure-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sourceFactsAreNotPassEvidence: true as const,
    registeredSequentialRouteIsNotClaimedAsValidatedCriticalPath: true as const,
    playerReviewRequired: true as const,
    browserAndDeviceReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  mapReviewPacks: MAP_REVIEW_PACKS,
  summary: Object.freeze({
    mapCount: MAP_REVIEW_PACKS.length,
    segmentCount: allSegmentIds.length,
    assetCount: allAssetIds.length,
    checklistItemCountPerMap: REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    productionBlockoutMapCount: 0 as const,
    integrationMapCount: 0 as const,
    finalMapCount: 0 as const,
  }),
});

export const ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A3 map production review preparation candidate V1',
    ),
  });

export type ArenaV2A3MapProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
