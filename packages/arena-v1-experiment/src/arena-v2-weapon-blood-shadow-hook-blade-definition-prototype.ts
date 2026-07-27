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
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
} from './arena-v2-weapon-blood-shadow-hook-blade-case-study.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-phantom-tiger-fist-definition-prototype.js';
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

export const ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_ID = 'research-blood-shadow-hook-blade';
export const ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID = 'research-blood-shadow-hook-blade-ground';
export const ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_AERIAL_ACTION_ID = 'research-blood-shadow-hook-blade-aerial';

export interface ArenaV2WeaponBloodShadowHookBladeDefinitionPrototype {
  readonly candidateId: 'case-study-blood-shadow-hook-blade';
  readonly weaponId: typeof ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_ID;
  readonly referenceId: 'blood-shadow-hook-blade';
  readonly referenceName: '血影钩刃';
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
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponBloodShadowHookBladeNumericOverview {
  readonly candidateId: 'case-study-blood-shadow-hook-blade';
  readonly weaponId: typeof ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_ID;
  readonly displayName: '血影钩刃';
  readonly referenceName: '血影钩刃';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly comparisonWeaponIds: readonly string[];
  readonly numericReadoutReason: string;
}

function pullAttack({
  id,
  aerial,
  targeting,
  timing,
  pullDistance,
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
  pullDistance: number;
  verticalImpulse: number;
  hitstunTicks: number;
  selfMovementImpulse: number;
  tags: readonly string[];
}>): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'research-blood-shadow-hook-blade-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-blood-shadow-hook-blade'],
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
        id: `${id}-pull`,
        kind: 'pull-to-source',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: Math.sqrt(
            2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration * pullDistance,
          ),
          verticalImpulse,
        },
      },
    ],
    tags,
  });
}

const groundAction = pullAttack({
  id: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'rear-cone',
    parameters: { range: 3.6, minimumFacingDot: 0.72, maximumVerticalDifference: 1.4 },
  },
  timing: { windupTicks: 10, activeTicks: 3, recoveryTicks: 24, cooldownTicks: 72 },
  pullDistance: 1.8,
  verticalImpulse: 1.8,
  hitstunTicks: 16,
  selfMovementImpulse: 0.8,
  tags: ['blood-shadow-hook-blade', 'rear-entry', 'pull', 'ground'],
});

const aerialAction = pullAttack({
  id: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 2.8, radius: 1.05, minimumVerticalDrop: 0, maximumVerticalDifference: 2.4 },
  },
  timing: { windupTicks: 12, activeTicks: 3, recoveryTicks: 27, cooldownTicks: 72 },
  pullDistance: 1.5,
  verticalImpulse: 3.8,
  hitstunTicks: 18,
  selfMovementImpulse: 0.6,
  tags: ['blood-shadow-hook-blade', 'height-branch', 'pull', 'aerial'],
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_ID,
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
  presentationSemantic: 'research-blood-shadow-hook-blade',
  tags: ['research', 'v2-case-study', 'pull', 'directional'],
});

const prototype: ArenaV2WeaponBloodShadowHookBladeDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-blood-shadow-hook-blade',
  weaponId: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY.minimumVersion.coreVerb,
  status: 'research-only',
  numericStatus: 'definition-projected-hypothesis',
  groundAction,
  aerialAction,
  equipment,
  groundStats: projectArenaV2ActionDefinitionPublicNumbers(groundAction),
  aerialStats: projectArenaV2ActionDefinitionPublicNumbers(aerialAction),
  publicOverviewAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
  publicBehaviorAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS]),
  measurementPlan: Object.freeze([
    '实测目标背向角度、距离和地面高度差，确认拉近不是扩大正面命中。',
    '实测拉近后的目标位置、攻击者自身位移和边缘安全余量，分别记录命中与地图后果。',
    '实测空中下压的高度门槛、落点和目标拉近结果，不能用地面动作数据代替。',
    '用障碍探针与真实地图表面验证柱体、墙角和断层是否切断拉位；当前 Definition 不宣称已具备障碍判定。',
    '完成 Replay、命中反馈、地图边缘和真人首见时间测试后，才讨论生产迁移。',
  ]),
});

export const ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponBloodShadowHookBladeNumericOverview(): ArenaV2WeaponBloodShadowHookBladeNumericOverview {
  const bloodShadowProjection = Object.freeze({
    groundStats: prototype.groundStats,
    aerialStats: prototype.aerialStats,
  });
  const comparisonProjections = Object.freeze([
    ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ groundStats, aerialStats }) => (
      Object.freeze({ groundStats, aerialStats })
    )),
    Object.freeze({
      groundStats: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.groundStats,
      aerialStats: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.aerialStats,
    }),
    bloodShadowProjection,
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
      bloodShadowProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
      'research-phantom-tiger-fist',
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自本项目血影钩刃研究 Definition 的权威投影，当前是可测试的调优假设；原作动作事实、地图障碍和生产平衡仍需单独验证。',
  });
}
