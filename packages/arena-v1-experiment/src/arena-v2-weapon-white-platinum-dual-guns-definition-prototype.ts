import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ARENA_GAMEPLAY_V2_TUNING,
  createActionDefinition,
  createEquipmentDefinition,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  type ActionDefinition,
  type ArenaWeaponPublicNumericProjection,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
} from './arena-v2-weapon-white-platinum-dual-guns-case-study.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import {
  createArenaV2WeaponResearchOverviewContexts,
  type ArenaV2WeaponResearchOverviewContext,
} from './arena-v2-weapon-research-overview-prototype.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';
import {
  ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';

export const ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_ID =
  'research-white-platinum-dual-guns';
export const ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID =
  'research-white-platinum-dual-guns-ground';
export const ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_AERIAL_ACTION_ID =
  'research-white-platinum-dual-guns-aerial';

export interface ArenaV2WeaponWhitePlatinumDualGunsDefinitionPrototype {
  readonly candidateId: 'case-study-white-platinum-dual-guns';
  readonly weaponId: typeof ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_ID;
  readonly referenceId: 'white-platinum-dual-guns';
  readonly referenceName: '白金双枪';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly equipment: EquipmentDefinition;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly publicBehaviorAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly researchSignals: readonly ['line-shot', 'height-branch', 'landing-risk'];
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponWhitePlatinumDualGunsNumericOverview {
  readonly candidateId: 'case-study-white-platinum-dual-guns';
  readonly weaponId: typeof ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_ID;
  readonly displayName: '白金双枪';
  readonly referenceName: '白金双枪';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly comparisonWeaponIds: readonly string[];
  readonly numericReadoutReason: string;
}

function shotDefinition({
  id,
  aerial,
  targeting,
  timing,
  targetGroundKnockbackDistance,
  verticalImpulse,
  hitstunTicks,
  selfMovementImpulse,
  tags,
}: Readonly<{
  id: string;
  aerial: boolean;
  targeting: Readonly<{ kind: string; parameters: Readonly<Record<string, unknown>> }>;
  timing: Readonly<{
    windupTicks: number;
    activeTicks: number;
    recoveryTicks: number;
    cooldownTicks: number;
  }>;
  targetGroundKnockbackDistance: number;
  verticalImpulse: number;
  hitstunTicks: number;
  selfMovementImpulse: number;
  tags: readonly string[];
}>): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'research-white-platinum-dual-guns-shot',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-white-platinum-dual-guns'],
    timing,
    targeting,
    effects: [
      ...(aerial ? [{
        id: `${id}-begin-descent`,
        kind: 'begin-down-smash',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: {},
      }] : []),
      {
        id: `${id}-self-impulse`,
        kind: 'apply-self-impulse',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: { horizontalImpulse: selfMovementImpulse },
      },
      {
        id: `${id}-interrupt`,
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: `${id}-hitstun`,
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: hitstunTicks },
      },
      {
        id: `${id}-impulse`,
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: Math.sqrt(
            2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration
              * targetGroundKnockbackDistance,
          ),
          verticalImpulse,
        },
      },
    ],
    tags,
  });
}

const groundAction = shotDefinition({
  id: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 5.5, minimumFacingDot: 0.84, maximumVerticalDifference: 1.25 },
  },
  timing: { windupTicks: 12, activeTicks: 2, recoveryTicks: 16, cooldownTicks: 48 },
  targetGroundKnockbackDistance: 0.65,
  verticalImpulse: 1.1,
  hitstunTicks: 8,
  selfMovementImpulse: 0.05,
  tags: ['white-platinum-dual-guns', 'line-shot', 'ground'],
});

const aerialAction = shotDefinition({
  id: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3.6, radius: 0.9, minimumVerticalDrop: 0, maximumVerticalDifference: 3.2 },
  },
  timing: { windupTicks: 5, activeTicks: 3, recoveryTicks: 22, cooldownTicks: 56 },
  targetGroundKnockbackDistance: 0.9,
  verticalImpulse: 1.8,
  hitstunTicks: 10,
  selfMovementImpulse: 0.3,
  tags: ['white-platinum-dual-guns', 'height-branch', 'landing-risk', 'aerial'],
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_ID,
  category: 'research-language',
  slot: 'primary',
  actionDefinitionId: groundAction.id,
  aerialActionDefinitionId: aerialAction.id,
  pickup: {
    mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC,
    radius: ARENA_GAMEPLAY_V2_TUNING.equipment.automaticPickupRadius,
  },
  drop: {
    onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
    invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
  },
  presentationSemantic: 'research-white-platinum-dual-guns',
  tags: ['research', 'v2-case-study', 'line-shot', 'height-branch'],
});

const prototype: ArenaV2WeaponWhitePlatinumDualGunsDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-white-platinum-dual-guns',
  weaponId: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY.minimumVersion.coreVerb,
  status: 'research-only',
  numericStatus: 'definition-projected-hypothesis',
  groundAction,
  aerialAction,
  equipment,
  groundStats: projectArenaV2ActionDefinitionPublicNumbers(groundAction),
  aerialStats: projectArenaV2ActionDefinitionPublicNumbers(aerialAction),
  publicOverviewAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
  publicBehaviorAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS]),
  researchSignals: Object.freeze(['line-shot', 'height-branch', 'landing-risk'] as const),
  measurementPlan: Object.freeze([
    '用地面点射和离开攻击线 Replay，确认长距离不是自动追踪，方向门槛会产生真实挥空。',
    '用空中斜下射击和地面点射对照 Replay，分别记录高度差、覆盖宽度和落点位移。',
    '在宽平台、窄路入口和断层上记录命中后的路线变化，确认低击退与自身落点风险共同构成武器身份。',
    '把跑动扇形作为后续扩展动作，先验证覆盖形状和收招，暂不迁移原作 MP 与弹药密度。',
    '完成命中反馈、目标设备触控和真人首见时间测试后，才讨论生产迁移。',
  ]),
});

export const ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponWhitePlatinumDualGunsNumericOverview():
  ArenaV2WeaponWhitePlatinumDualGunsNumericOverview {
  const whiteProjection = Object.freeze({
    groundStats: prototype.groundStats,
    aerialStats: prototype.aerialStats,
  });
  const comparisonCandidates = ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.filter(({ weaponId }) => (
    weaponId !== 'research-line-pressure'
  ));
  const comparisonProjections = Object.freeze([
    ...comparisonCandidates.map(({ groundStats, aerialStats }) => (
      Object.freeze({ groundStats, aerialStats })
    )),
    whiteProjection,
  ]);
  return Object.freeze({
    candidateId: prototype.candidateId,
    weaponId: prototype.weaponId,
    displayName: prototype.referenceName,
    referenceName: prototype.referenceName,
    coreVerb: prototype.coreVerb,
    status: prototype.status,
    numericStatus: prototype.numericStatus,
    contexts: createArenaV2WeaponResearchOverviewContexts(
      whiteProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...comparisonCandidates.map(({ weaponId }) => weaponId),
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自白金双枪独立研究 Definition 的权威投影，当前是可测试的调优假设；资源回补、扇形连续覆盖和最终弹道仍保持研究边界。',
  });
}
