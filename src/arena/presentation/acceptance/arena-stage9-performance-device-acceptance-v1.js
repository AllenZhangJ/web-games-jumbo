import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_SURFACE,
  createArenaDeviceAcceptanceDefinition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_STAGE9_PERFORMANCE_TARGET_ID,
  createArenaStage9PerformanceV1Policy,
} from '../performance/arena-stage9-performance-v1.js';

export const ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID =
  'arena.stage9.performance-device-acceptance.v1';

export const ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID = Object.freeze({
  BUILD_IDENTITY: 'build-identity',
  HIDDEN_OPPONENT_PRIVACY: 'hidden-opponent-privacy',
  LIFECYCLE_RECOVERY: 'lifecycle-recovery',
  PERFORMANCE_BUDGET: 'performance-budget',
  PRODUCT_FLOW: 'product-flow',
  QUALITY_PROFILE: 'quality-profile',
  READABILITY: 'readability',
  RESOURCE_STEADY_STATE: 'resource-steady-state',
});

const CHECK_IDS = Object.freeze(Object.values(ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID));
const ARTIFACT_KINDS = Object.freeze([
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO,
]);

function executionSurface(platform) {
  return platform === 'web'
    ? ARENA_DEVICE_ACCEPTANCE_SURFACE.MOBILE_BROWSER
    : ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE;
}

export function createArenaStage9PerformanceDeviceAcceptanceV1Definition() {
  const policy = createArenaStage9PerformanceV1Policy();
  const targets = policy.targets.map((target) => ({
    id: target.id,
    platform: target.platform,
    executionSurface: executionSurface(target.platform),
    minimumPassingRuns: 1,
    requiredCheckIds: CHECK_IDS,
    requiredArtifactKinds: ARTIFACT_KINDS,
    requiredOsNames: target.requiredOsNames,
  }));
  const definition = createArenaDeviceAcceptanceDefinition({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
    stage: 'stage9.s9.4',
    checks: [
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.BUILD_IDENTITY,
        title: '源码干净且 Manifest、commit、buildId、平台与 Product 默认入口一致',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.HIDDEN_OPPONENT_PRIVACY,
        title: '性能日志、Trace、界面和结算均不泄露机器人身份或隐藏难度',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.LIFECYCLE_RECOVERY,
        title: '前后台与 WebGL context 丢失/恢复后仍为单 Session 且输入不复活',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.PERFORMANCE_BUDGET,
        title: '机器重算 Performance Trace 的全部必需 Gate 通过',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.PRODUCT_FLOW,
        title: '最终包至少连续完成三局大厅、匹配、对局、奖励与重赛闭环',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.QUALITY_PROFILE,
        title: '目标机使用 Policy 指定质量 Definition，低档只降表现且 Core 保持 60 Hz',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.READABILITY,
        title: '降级后风场、塌陷、装备、动作前摇、受击和淘汰边界仍清晰可读',
      },
      {
        id: ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.RESOURCE_STEADY_STATE,
        title: '十分钟与连续重赛后 geometry、texture、program 和内存保持有界稳态',
      },
    ],
    targets,
  });
  for (const targetId of Object.values(ARENA_STAGE9_PERFORMANCE_TARGET_ID)) {
    if (!definition.getTarget(targetId) || !policy.getTarget(targetId)) {
      throw new Error(`S9.4 device/performance target 未双向注册：${targetId}。`);
    }
  }
  return definition;
}
