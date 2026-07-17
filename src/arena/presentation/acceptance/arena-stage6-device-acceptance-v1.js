import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
  ARENA_DEVICE_ACCEPTANCE_SURFACE,
  createArenaDeviceAcceptanceDefinition,
} from './arena-device-acceptance-definition.js';

export const ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID = 'arena.stage6.device-acceptance.v1';

export const ARENA_STAGE6_DEVICE_CHECK_ID = Object.freeze({
  CANCEL_CLEARS_INPUT: 'cancel-clears-input',
  HIDE_RESUME_FRESH_TOUCH: 'hide-resume-fresh-touch',
  LAUNCH_INTERACTIVE: 'launch-interactive',
  MULTI_TOUCH_OWNERSHIP: 'multi-touch-ownership',
  NO_HIDDEN_OPPONENT_LEAK: 'no-hidden-opponent-leak',
  RESOURCE_CLEANUP: 'resource-cleanup',
  RESULT_REMATCH: 'result-rematch',
  SAFE_AREA_PORTRAIT: 'safe-area-portrait',
  WEBGL_CONTEXT_RECOVERY: 'webgl-context-recovery',
});

const COMMON_CHECKS = Object.freeze([
  ARENA_STAGE6_DEVICE_CHECK_ID.CANCEL_CLEARS_INPUT,
  ARENA_STAGE6_DEVICE_CHECK_ID.HIDE_RESUME_FRESH_TOUCH,
  ARENA_STAGE6_DEVICE_CHECK_ID.LAUNCH_INTERACTIVE,
  ARENA_STAGE6_DEVICE_CHECK_ID.MULTI_TOUCH_OWNERSHIP,
  ARENA_STAGE6_DEVICE_CHECK_ID.NO_HIDDEN_OPPONENT_LEAK,
  ARENA_STAGE6_DEVICE_CHECK_ID.RESOURCE_CLEANUP,
  ARENA_STAGE6_DEVICE_CHECK_ID.RESULT_REMATCH,
  ARENA_STAGE6_DEVICE_CHECK_ID.SAFE_AREA_PORTRAIT,
]);

const PHYSICAL_CHECKS = Object.freeze([
  ...COMMON_CHECKS,
  ARENA_STAGE6_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
]);

const REQUIRED_ARTIFACTS = Object.freeze([
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO,
]);

function target(id, platform, executionSurface, requiredCheckIds) {
  return {
    id,
    platform,
    executionSurface,
    minimumPassingRuns: 1,
    requiredCheckIds,
    requiredArtifactKinds: REQUIRED_ARTIFACTS,
  };
}

export function createArenaStage6DeviceAcceptanceV1Definition() {
  return createArenaDeviceAcceptanceDefinition({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID,
    stage: 'stage6',
    checks: [
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.CANCEL_CLEARS_INPUT,
        title: '触控取消后无残留 held/edge，必须重新触摸',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.HIDE_RESUME_FRESH_TOUCH,
        title: '前后台不追帧，恢复后旧指针不复活',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.LAUNCH_INTERACTIVE,
        title: '当前产物可启动并进入可操作的 1v1 对局',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.MULTI_TOUCH_OWNERSHIP,
        title: '移动与动作的多指归属稳定，不串控件',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.NO_HIDDEN_OPPONENT_LEAK,
        title: '界面、日志与结算不泄露 Bot 身份或难度',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.RESOURCE_CLEANUP,
        title: '切局、返回和连续对局后无双 Session/双帧循环或阻断异常',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.RESULT_REMATCH,
        title: '匹配、对局、结算与再来一局闭环可完成',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.SAFE_AREA_PORTRAIT,
        title: '竖屏安全区、HUD 与底部控件无遮挡或不可触达区',
      },
      {
        id: ARENA_STAGE6_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
        title: 'WebGL context loss 时暂停，恢复后不复活旧输入且不重复资源',
      },
    ],
    targets: [
      target(
        'douyin-developer-tool',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        COMMON_CHECKS,
      ),
      target(
        'douyin-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_CHECKS,
      ),
      target(
        'web-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.MOBILE_BROWSER,
        PHYSICAL_CHECKS,
      ),
      target(
        'wechat-developer-tool',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        COMMON_CHECKS,
      ),
      target(
        'wechat-phone',
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        PHYSICAL_CHECKS,
      ),
    ],
  });
}
