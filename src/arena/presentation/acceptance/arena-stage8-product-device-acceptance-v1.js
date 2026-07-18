import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
  ARENA_DEVICE_ACCEPTANCE_SURFACE,
  createArenaDeviceAcceptanceDefinition,
} from './arena-device-acceptance-definition.js';

export const ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID =
  'arena.stage8.product-device-acceptance.v1';

export const ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID = Object.freeze({
  BUILD_IDENTITY: 'build-identity',
  COLD_LAUNCH_DEFAULT_PROFILE: 'cold-launch-default-profile',
  CORRUPT_STORAGE_RECOVERY: 'corrupt-storage-recovery',
  FUTURE_SCHEMA_PROTECTION: 'future-schema-protection',
  LIFECYCLE_SINGLE_OWNER: 'lifecycle-single-owner',
  NO_HIDDEN_OPPONENT_LEAK: 'no-hidden-opponent-leak',
  PERFORMANCE_SAMPLE: 'performance-sample',
  PERSISTED_PROFILE_RESTART: 'persisted-profile-restart',
  PRODUCT_FLOW_REWARD_REMATCH: 'product-flow-reward-rematch',
  RESOURCE_LONG_RUN: 'resource-long-run',
  SAFE_AREA_PRODUCT_UI: 'safe-area-product-ui',
  SINGLE_CANVAS_COMPOSITION: 'single-canvas-composition',
  STORAGE_WRITE_FAILURE_RETRY: 'storage-write-failure-retry',
  WEBGL_CONTEXT_RECOVERY: 'webgl-context-recovery',
});

const COMMON_CHECKS = Object.freeze([
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.BUILD_IDENTITY,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.COLD_LAUNCH_DEFAULT_PROFILE,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.LIFECYCLE_SINGLE_OWNER,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.NO_HIDDEN_OPPONENT_LEAK,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERSISTED_PROFILE_RESTART,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PRODUCT_FLOW_REWARD_REMATCH,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.RESOURCE_LONG_RUN,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.SAFE_AREA_PRODUCT_UI,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.SINGLE_CANVAS_COMPOSITION,
]);

const DEVELOPER_TOOL_CHECKS = Object.freeze([
  ...COMMON_CHECKS,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.CORRUPT_STORAGE_RECOVERY,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.FUTURE_SCHEMA_PROTECTION,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.STORAGE_WRITE_FAILURE_RETRY,
]);

const PHYSICAL_DEVICE_CHECKS = Object.freeze([
  ...COMMON_CHECKS,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERFORMANCE_SAMPLE,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
]);

const REQUIRED_ARTIFACTS = Object.freeze([
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO,
]);

function target(id, platform, executionSurface, requiredCheckIds, requiredOsNames) {
  return {
    id,
    platform,
    executionSurface,
    minimumPassingRuns: 1,
    requiredCheckIds,
    requiredArtifactKinds: REQUIRED_ARTIFACTS,
    requiredOsNames,
  };
}

export function createArenaStage8ProductDeviceAcceptanceV1Definition() {
  return createArenaDeviceAcceptanceDefinition({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
    stage: 'stage8',
    checks: [
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.BUILD_IDENTITY,
        title: 'Manifest、commit、buildId、平台和默认 Product 入口一致且源码干净',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.COLD_LAUNCH_DEFAULT_PROFILE,
        title: '清空存储后冷启动进入默认 Profile 与可操作产品大厅',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.CORRUPT_STORAGE_RECOVERY,
        title: '单槽损坏回退最后有效 Profile，双槽损坏安全恢复默认值',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.FUTURE_SCHEMA_PROTECTION,
        title: '未来 schema 阻止旧客户端覆盖并释放租约，不泄露原始存档内容',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.LIFECYCLE_SINGLE_OWNER,
        title: '前后台、硬重启和返回后只有一个 Session/Match/输入/租约拥有者',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.NO_HIDDEN_OPPONENT_LEAK,
        title: '产品 UI、日志、存档和结算不泄露 Bot 身份或隐藏难度',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERFORMANCE_SAMPLE,
        title: '记录冷启动、对局和十分钟连续运行的帧时间、内存与资源稳态',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERSISTED_PROFILE_RESTART,
        title: '角色选择和已提交奖励硬重启后保持，grant 不重复发放',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PRODUCT_FLOW_REWARD_REMATCH,
        title: '大厅、角色、匹配、对局、奖励和再来一局形成完整闭环',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.RESOURCE_LONG_RUN,
        title: '连续重赛和十分钟运行无双帧循环、无持续增长或不可恢复遮罩',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.SAFE_AREA_PRODUCT_UI,
        title: '竖屏安全区、Canvas 产品文字、角色卡和按钮均可见可触达',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.SINGLE_CANVAS_COMPOSITION,
        title: '唯一上屏 WebGL Canvas 合成产品 UI、比赛世界与 HUD',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.STORAGE_WRITE_FAILURE_RETRY,
        title: '槽、读回或 head 写失败时保留最后有效 Profile 并可安全重试',
      },
      {
        id: ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
        title: 'WebGL context loss 暂停，恢复后不复活旧输入或重复 GPU 资源',
      },
    ],
    targets: [
      target(
        'douyin-android-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_DEVICE_CHECKS,
        ['Android'],
      ),
      target(
        'douyin-developer-tool',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        DEVELOPER_TOOL_CHECKS,
        ['macOS'],
      ),
      target(
        'douyin-ios-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_DEVICE_CHECKS,
        ['iOS'],
      ),
      target(
        'wechat-android-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_DEVICE_CHECKS,
        ['Android'],
      ),
      target(
        'wechat-developer-tool',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        DEVELOPER_TOOL_CHECKS,
        ['macOS'],
      ),
      target(
        'wechat-ios-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_DEVICE_CHECKS,
        ['iOS'],
      ),
    ],
  });
}
