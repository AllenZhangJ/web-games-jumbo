import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_INPUT_PILOT_V1_ID,
  createArenaInputPilotV1Definition,
} from '../arena/presentation/pilot/arena-input-pilot-v1.js';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
} from '../arena/presentation/acceptance/arena-stage9-performance-device-acceptance-v1.js';
import {
  createArenaStage9BuildBudgetV1Policy,
} from '@number-strategy-jump/arena-performance-evidence';
import {
  createArenaStage9PerformanceV1Policy,
} from '../arena/presentation/performance/arena-stage9-performance-v1.js';
import {
  ARENA_STAGE9_BALANCE_VALIDATION_CANDIDATE_ID,
  ARENA_STAGE9_BALANCE_VALIDATION_EXPERIMENT_ID,
  ARENA_STAGE9_BALANCE_SELECTION_BUNDLE_HASH,
  createArenaStage9BalanceValidationExperimentDefinition,
} from '../arena/experiment/arena-balance-validation-composition.js';
import {
  ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
  createArenaV1GoldenReplayScenarioRegistry,
} from '../arena/regression/arena-v1-golden-replay-scenarios.js';
import { ARENA_REPLAY_SCHEMA_VERSION } from '@number-strategy-jump/arena-match';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '../arena/study/arena-stage9-human-fairness-v1.js';
import {
  ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE,
  ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION,
  createArenaReleaseReadinessDefinition,
} from './release-readiness-definition.js';

export const ARENA_STAGE9_RC_HANDOFF_V1_ID = 'arena.stage9.rc-handoff.v1';

export const ARENA_STAGE9_RC_HANDOFF_GATE_ID = Object.freeze({
  INPUT_PILOT: 'stage6.input-pilot',
  FORMAL_ASSETS: 'stage7.formal-assets',
  GOLDEN_REPLAY: 'stage9.golden-replay',
  REGRESSION: 'stage9.regression',
  BALANCE_VALIDATION: 'stage9.balance-validation',
  BUILD_INTEGRITY: 'stage9.build-integrity',
  BUILD_BUDGET: 'stage9.build-budget',
  STAGE6_DEVICE: 'stage9.stage6-device',
  STAGE8_PRODUCT_DEVICE: 'stage9.stage8-product-device',
  PERFORMANCE_DEVICE: 'stage9.performance-device',
  HUMAN_FAIRNESS: 'stage9.human-fairness',
  DEFECTS: 'stage9.defects',
});

function requirementHash(value, name) {
  return createDeterministicDataHash(value, `Arena Stage 9 RC requirement ${name}`);
}

function definitionIdentity(definition) {
  return Object.freeze({ id: definition.id, hash: definition.getContentHash() });
}

function createBalanceRequirement() {
  const definition = createArenaStage9BalanceValidationExperimentDefinition({
    sourceCommit: '0000000000000000000000000000000000000000',
    sourceDirty: false,
  }).toJSON();
  const { sourceCommit: ignoredCommit, sourceDirty: ignoredDirty, ...candidate } = definition.candidate;
  return Object.freeze({
    experimentId: ARENA_STAGE9_BALANCE_VALIDATION_EXPERIMENT_ID,
    candidateId: ARENA_STAGE9_BALANCE_VALIDATION_CANDIDATE_ID,
    explorationSelectionBundleHash: ARENA_STAGE9_BALANCE_SELECTION_BUNDLE_HASH,
    definition: Object.freeze({ ...definition, candidate: Object.freeze(candidate) }),
    requiredOutcome: 'passed',
    requireFreezeEligible: true,
  });
}

function createGate({
  id,
  stage,
  title,
  producerId,
  subjectScope,
  requirement,
}) {
  return Object.freeze({
    id,
    stage,
    title,
    producerId,
    subjectScope,
    requirementHash: requirementHash(requirement, id),
  });
}

export function createArenaStage9RcHandoffV1Definition() {
  const inputPilot = createArenaInputPilotV1Definition();
  const stage6Device = createArenaStage6DeviceAcceptanceV1Definition();
  const stage8Device = createArenaStage8ProductDeviceAcceptanceV1Definition();
  const performanceDevice = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  const performancePolicy = createArenaStage9PerformanceV1Policy();
  const buildBudgetPolicy = createArenaStage9BuildBudgetV1Policy();
  const humanFairness = createArenaStage9HumanFairnessV1Definition();
  const goldenScenarios = createArenaV1GoldenReplayScenarioRegistry().list();
  return createArenaReleaseReadinessDefinition({
    schemaVersion: ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_RC_HANDOFF_V1_ID,
    stage: 'S9.6',
    gates: [
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.INPUT_PILOT,
        stage: 'S6.6',
        title: '真人新手输入盲测形成冻结决策',
        producerId: 'arena:input-pilot:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          definition: definitionIdentity(inputPilot),
          definitionId: ARENA_INPUT_PILOT_V1_ID,
          requiredAssessmentStatus: 'candidate-winner',
          requireTargetDeviceEvidence: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.FORMAL_ASSETS,
        stage: 'S7.5',
        title: '正式双角色、动作、音画、预算与许可验收',
        producerId: 'arena:assets:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          characterIds: Object.values(ARENA_V1_CHARACTER_ID).sort(),
          directions: 6,
          semanticActions: ARENA_ANIMATION_SEMANTIC_IDS,
          requireAssetBudget: true,
          requireLicenseManifest: true,
          requireReducedMotionVerification: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.GOLDEN_REPLAY,
        stage: 'S9.2',
        title: '当前黄金回放严格复验',
        producerId: 'arena:replay:verify',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE,
        requirement: {
          manifestId: ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
          replaySchemaVersion: ARENA_REPLAY_SCHEMA_VERSION,
          rejectedReplaySchemaVersions: [ARENA_REPLAY_SCHEMA_VERSION - 1],
          scenarios: goldenScenarios,
          mode: 'current-strict-replay-and-regeneration',
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.REGRESSION,
        stage: 'S9.2',
        title: '模糊、生命周期、长稳与产品压力回归',
        producerId: 'arena:regression:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE,
        requirement: {
          commands: ['arena:regression', 'arena:product:stress'],
          minimumInputFuzzMatches: 80,
          minimumSessionSoakMatches: 100,
          minimumProductSessionSoakMatches: 100,
          minimumProductStressMatches: 200,
          requireNoResidualFramesOrListeners: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.BALANCE_VALIDATION,
        stage: 'S9.3',
        title: '冻结平衡候选的独立批量验证',
        producerId: 'arena:experiment:report:verify',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE,
        requirement: createBalanceRequirement(),
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY,
        stage: 'S9.4',
        title: '三端 clean product 构建身份与产物完整性',
        producerId: 'arena:build:verify',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          targets: ['web', 'wechat', 'douyin'],
          defaultEntry: 'product',
          requireSameCommitAndBuildId: true,
          requireCleanSource: true,
          requireArtifactDigestVerification: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_BUDGET,
        stage: 'S9.4',
        title: '三端构建预算全部通过并可冻结',
        producerId: 'arena:build:budget',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          policy: definitionIdentity(buildBudgetPolicy),
          requiredPlatforms: ['web', 'wechat', 'douyin'],
          requiredStatus: 'passed',
          requireFreezeEligible: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
        stage: 'S9.4',
        title: 'Stage 6 目标设备触控与生命周期验收',
        producerId: 'arena:device:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          definition: definitionIdentity(stage6Device),
          requiredStatus: 'ready',
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE,
        stage: 'S9.4',
        title: 'Stage 8 三端产品闭环设备验收',
        producerId: 'arena:product:device:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          definition: definitionIdentity(stage8Device),
          requiredStatus: 'ready',
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.PERFORMANCE_DEVICE,
        stage: 'S9.4',
        title: '六目标设备性能、内存与恢复预算验收',
        producerId: 'arena:performance:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          deviceDefinition: definitionIdentity(performanceDevice),
          performancePolicy: definitionIdentity(performancePolicy),
          requiredStatus: 'ready',
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS,
        stage: 'S9.5',
        title: '预注册真人公平性与自然度研究',
        producerId: 'arena:human-fairness:evidence',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirement: {
          definition: definitionIdentity(humanFairness),
          requiredStatus: 'ready',
          minimumCompletedParticipants: 90,
          minimumCompletedMatches: 270,
          requireStrictReplayAndBotVerification: true,
        },
      }),
      createGate({
        id: ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS,
        stage: 'S9.6',
        title: '阻断级和高优先级缺陷清零并保留风险账本',
        producerId: 'arena:defects:verify',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE,
        requirement: {
          ledgerSchemaVersion: 1,
          maximumOpenBlockingDefects: 0,
          maximumOpenHighPriorityDefects: 0,
          requireKnownIssues: true,
          requireResidualRiskOwners: true,
        },
      }),
    ],
  });
}
