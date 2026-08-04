import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
  ARENA_DEVICE_ACCEPTANCE_SURFACE,
  createArenaDeviceAcceptanceDefinition,
} from './arena-device-acceptance-definition.js';
import type {
  ArenaDeviceAcceptanceArtifactKind,
  ArenaDeviceAcceptancePlatform,
  ArenaDeviceAcceptanceSurface,
  ArenaDeviceAcceptanceTarget,
} from './arena-device-acceptance-definition.js';

export const ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID =
  'arena.p1.supply-device-acceptance.v1';

export const ARENA_P1_SUPPLY_DEVICE_CHECK_ID = Object.freeze({
  CLEAN_BUILD_SOURCE_IDENTITY: 'clean-build-source-identity',
  THREE_MARKERS_NO_POPUP_OR_EXTRA_INPUT: 'three-markers-no-popup-or-extra-input',
  WAVES_1200_2400: 'waves-1200-2400',
  AUTHORITY_REMAINING_TICKS: 'authority-remaining-ticks',
  LIFECYCLE_599_600_601: 'lifecycle-599-600-601',
  ATOMIC_REPLACEMENT: 'atomic-replacement',
  PAUSE_BACKGROUND_NO_WALL_CLOCK: 'pause-background-no-wall-clock',
  CATCHUP_NO_DUPLICATE_ONE_SHOT: 'catchup-no-duplicate-one-shot',
  REDUCED_MOTION_MUTED_ASSET_FALLBACK: 'reduced-motion-muted-asset-fallback',
  BOUNDED_RESOURCES_DOUBLE_DESTROY: 'bounded-resources-double-destroy',
  HARNESS_NOT_PRODUCTION_REACHABLE: 'harness-not-production-reachable',
} as const);

export const ARENA_P1_SUPPLY_DEVICE_TARGET_ID = Object.freeze({
  WEB_BROWSER: 'web-browser',
  DOUYIN_DEVELOPER_TOOL: 'douyin-developer-tool',
  DOUYIN_IOS_PHONE: 'douyin-ios-phone',
  DOUYIN_ANDROID_PHONE: 'douyin-android-phone',
  WECHAT_DEVELOPER_TOOL: 'wechat-developer-tool',
  WECHAT_IOS_PHONE: 'wechat-ios-phone',
  WECHAT_ANDROID_PHONE: 'wechat-android-phone',
} as const);

export const ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION = 1;
export const ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE =
  'p1-supply-acceptance';
export const ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
} as const);

export type ArenaP1SupplyAcceptancePlatform =
  typeof ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM[
    keyof typeof ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM
  ];

export interface ArenaP1SupplyAcceptanceBuildAttestationV1 {
  readonly schemaVersion:
    typeof ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION;
  readonly purpose: typeof ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE;
  readonly commit: string;
  readonly sourceDirty: false;
  readonly repositoryFingerprint: string;
  readonly buildId: string;
  readonly platform: ArenaP1SupplyAcceptancePlatform;
  readonly adapterModuleHash: string;
  readonly harnessModuleHash: string;
  readonly productionReachabilityAuditHash: string;
  readonly assetManifestHash: string;
  readonly artifactManifestHash: string;
  readonly attestationHash: string;
}

const BUILD_ATTESTATION_KEYS = new Set([
  'schemaVersion',
  'purpose',
  'commit',
  'sourceDirty',
  'repositoryFingerprint',
  'buildId',
  'platform',
  'adapterModuleHash',
  'harnessModuleHash',
  'productionReachabilityAuditHash',
  'assetManifestHash',
  'artifactManifestHash',
  'attestationHash',
]);

const CHECK_IDS = Object.freeze(Object.values(ARENA_P1_SUPPLY_DEVICE_CHECK_ID));
const REQUIRED_ARTIFACTS: readonly ArenaDeviceAcceptanceArtifactKind[] = Object.freeze([
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT,
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO,
]);

function target(
  id: string,
  platform: ArenaDeviceAcceptancePlatform,
  executionSurface: ArenaDeviceAcceptanceSurface,
  requiredOsNames?: readonly string[],
): ArenaDeviceAcceptanceTarget {
  return {
    id,
    platform,
    executionSurface,
    minimumPassingRuns: 1,
    requiredCheckIds: CHECK_IDS,
    requiredArtifactKinds: REQUIRED_ARTIFACTS,
    ...(requiredOsNames === undefined ? {} : { requiredOsNames }),
  };
}

function attestationPlatform(
  value: unknown,
  name: string,
): ArenaP1SupplyAcceptancePlatform {
  if (
    value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WEB
    && value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WECHAT
    && value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.DOUYIN
  ) {
    throw new RangeError(`${name} 不受支持。`);
  }
  return value;
}

export function createArenaP1SupplyAcceptanceBuildAttestationV1(
  value: unknown,
): ArenaP1SupplyAcceptanceBuildAttestationV1 {
  const source = cloneFrozenData(value, 'ArenaP1SupplyAcceptanceBuildAttestationV1');
  assertKnownKeys(
    source,
    BUILD_ATTESTATION_KEYS,
    'ArenaP1SupplyAcceptanceBuildAttestationV1',
  );
  if (source.schemaVersion !== ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaP1SupplyAcceptanceBuildAttestationV1 schema ${String(source.schemaVersion)}。`,
    );
  }
  if (source.purpose !== ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE) {
    throw new RangeError(
      `ArenaP1SupplyAcceptanceBuildAttestationV1.purpose 必须为 ${ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE}。`,
    );
  }
  if (source.sourceDirty !== false) {
    throw new RangeError('ArenaP1SupplyAcceptanceBuildAttestationV1.sourceDirty 必须为 false。');
  }
  return Object.freeze({
    schemaVersion: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION,
    purpose: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE,
    commit: assertEvidenceGitCommit(
      source.commit,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.commit',
    ),
    sourceDirty: false,
    repositoryFingerprint: assertEvidenceSha256(
      source.repositoryFingerprint,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.repositoryFingerprint',
    ),
    buildId: assertEvidenceBoundedString(
      source.buildId,
      256,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.buildId',
      { rejectControlCharacters: true },
    ),
    platform: attestationPlatform(
      source.platform,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.platform',
    ),
    adapterModuleHash: assertEvidenceSha256(
      source.adapterModuleHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.adapterModuleHash',
    ),
    harnessModuleHash: assertEvidenceSha256(
      source.harnessModuleHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.harnessModuleHash',
    ),
    productionReachabilityAuditHash: assertEvidenceSha256(
      source.productionReachabilityAuditHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.productionReachabilityAuditHash',
    ),
    assetManifestHash: assertEvidenceSha256(
      source.assetManifestHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.assetManifestHash',
    ),
    artifactManifestHash: assertEvidenceSha256(
      source.artifactManifestHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.artifactManifestHash',
    ),
    attestationHash: assertEvidenceSha256(
      source.attestationHash,
      'ArenaP1SupplyAcceptanceBuildAttestationV1.attestationHash',
    ),
  });
}

export function createArenaP1SupplyDeviceAcceptanceV1Definition() {
  return createArenaDeviceAcceptanceDefinition({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
    id: ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID,
    stage: 'p1-supply-acceptance',
    checks: [
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.CLEAN_BUILD_SOURCE_IDENTITY, title: 'P1 acceptance 使用同一 clean commit、仓库指纹、逻辑 buildId 与内容寻址模块' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.THREE_MARKERS_NO_POPUP_OR_EXTRA_INPUT, title: '三项供给只显示三个 marker，不增加弹窗、选择或输入动作' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.WAVES_1200_2400, title: '供给波次只在 authority tick 1200 与 2400 出现' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.AUTHORITY_REMAINING_TICKS, title: '倒计时仅展示 authority remainingTicks' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.LIFECYCLE_599_600_601, title: '599/600/601 生命周期、拾取与清空符合权威投影' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.ATOMIC_REPLACEMENT, title: '旧持有实例回收与新实例替换只产生一条原子 Cue' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.PAUSE_BACKGROUND_NO_WALL_CLOCK, title: '暂停与后台不使用墙钟推进供给表现' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.CATCHUP_NO_DUPLICATE_ONE_SHOT, title: 'catch-up 与重放不补播或重复 one-shot Cue' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.REDUCED_MOTION_MUTED_ASSET_FALLBACK, title: '低动效、静音与资产失败仍保留供给因果和可访问 fallback' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.BOUNDED_RESOURCES_DOUBLE_DESTROY, title: '连续对局和双 destroy 后 listener、voice、particle 与 GPU 资源归零' },
      { id: ARENA_P1_SUPPLY_DEVICE_CHECK_ID.HARNESS_NOT_PRODUCTION_REACHABLE, title: 'P1 harness 不进入默认 Product、发布入口或正式资产清单' },
    ],
    targets: [
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.MOBILE_BROWSER,
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.DOUYIN_DEVELOPER_TOOL,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        ['macOS'],
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.DOUYIN_IOS_PHONE,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        ['iOS'],
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.DOUYIN_ANDROID_PHONE,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        ['Android'],
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WECHAT_DEVELOPER_TOOL,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.DEVELOPER_TOOL,
        ['macOS'],
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WECHAT_IOS_PHONE,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        ['iOS'],
      ),
      target(
        ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WECHAT_ANDROID_PHONE,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        ARENA_DEVICE_ACCEPTANCE_SURFACE.PHYSICAL_DEVICE,
        ['Android'],
      ),
    ],
  });
}
