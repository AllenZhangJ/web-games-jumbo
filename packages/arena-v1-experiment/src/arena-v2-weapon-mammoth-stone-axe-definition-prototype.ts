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
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
} from './arena-v2-weapon-mammoth-stone-axe-case-study.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.js';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-magic-blood-scythe-definition-prototype.js';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-phantom-tiger-fist-definition-prototype.js';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-true-hades-hook-scythe-definition-prototype.js';
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

export const ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_ID = 'research-mammoth-stone-axe';
export const ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID = 'research-mammoth-stone-axe-ground';
export const ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_AERIAL_ACTION_ID = 'research-mammoth-stone-axe-aerial';

export interface ArenaV2WeaponMammothStoneAxeWarningHypothesis {
  readonly delayTicks: number;
  readonly warningTicks: number;
  readonly activeTicks: number;
  readonly radius: number;
  readonly maximumVerticalDifference: number;
  readonly status: 'research-only';
}

export interface ArenaV2WeaponMammothStoneAxeDefinitionPrototype {
  readonly candidateId: 'case-study-mammoth-stone-axe';
  readonly weaponId: typeof ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_ID;
  readonly referenceId: 'mammoth-stone-axe';
  readonly referenceName: '猛犸石斧';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  /** Delay/telegraph remains a separate research contract until its runtime is connected to the action. */
  readonly warningHypothesis: ArenaV2WeaponMammothStoneAxeWarningHypothesis;
  readonly equipment: EquipmentDefinition;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly publicBehaviorAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly researchSignals: readonly ['delayed-impact', 'map-geometry', 'support-surface'];
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponMammothStoneAxeNumericOverview {
  readonly candidateId: 'case-study-mammoth-stone-axe';
  readonly weaponId: typeof ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_ID;
  readonly displayName: '猛犸石斧';
  readonly referenceName: '猛犸石斧';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly comparisonWeaponIds: readonly string[];
  readonly numericReadoutReason: string;
}

function attackDefinition({
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
    kind: 'research-mammoth-stone-axe-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-mammoth-stone-axe'],
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

const groundAction = attackDefinition({
  id: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'facing-capsule',
    parameters: { range: 3.6, radius: 1.2, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 24, activeTicks: 3, recoveryTicks: 32, cooldownTicks: 108 },
  targetGroundKnockbackDistance: 2.1,
  verticalImpulse: 5.5,
  hitstunTicks: 20,
  selfMovementImpulse: 0.4,
  tags: ['mammoth-stone-axe', 'delayed-impact', 'charged', 'ground'],
});

const aerialAction = attackDefinition({
  id: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3.6, radius: 1.2, minimumVerticalDrop: 0, maximumVerticalDifference: 3.4 },
  },
  timing: { windupTicks: 14, activeTicks: 4, recoveryTicks: 34, cooldownTicks: 108 },
  targetGroundKnockbackDistance: 1.8,
  verticalImpulse: 6.2,
  hitstunTicks: 19,
  selfMovementImpulse: 0.65,
  tags: ['mammoth-stone-axe', 'support-surface', 'aerial'],
});

const warningHypothesis: ArenaV2WeaponMammothStoneAxeWarningHypothesis = Object.freeze({
  delayTicks: 18,
  warningTicks: 18,
  activeTicks: 2,
  radius: 1.4,
  maximumVerticalDifference: 1,
  status: 'research-only',
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_ID,
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
  presentationSemantic: 'research-mammoth-stone-axe',
  tags: ['research', 'v2-case-study', 'delayed-impact', 'map-geometry'],
});

const prototype: ArenaV2WeaponMammothStoneAxeDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-mammoth-stone-axe',
  weaponId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY.minimumVersion.coreVerb,
  status: 'research-only',
  numericStatus: 'definition-projected-hypothesis',
  groundAction,
  aerialAction,
  warningHypothesis,
  equipment,
  groundStats: projectArenaV2ActionDefinitionPublicNumbers(groundAction),
  aerialStats: projectArenaV2ActionDefinitionPublicNumbers(aerialAction),
  publicOverviewAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
  publicBehaviorAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS]),
  researchSignals: Object.freeze(['delayed-impact', 'map-geometry', 'support-surface'] as const),
  measurementPlan: Object.freeze([
    '将独立预警区的 18 tick 延迟、2 tick 有效窗口和路线/高度回应保持为独立证据，不伪装成普通前摇。',
    '比较地面蓄力重击与空中下压的距离、覆盖、起手、恢复、击退、垂直作用和高度差，概览必须显示差异。',
    '在宽平台、窄路、断层和墙面几何上复测命中后的支撑面结果，确认位移不是脱离地图的单一数值。',
    '将滚动物体、墙面反弹、公共危险和恢复物分别建立探针，再决定是否扩展权威规则字段。',
    '完成命中归因、设备触控和真人首见时间后，才讨论是否进入生产迁移门禁。',
  ]),
});

export const ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponMammothStoneAxeNumericOverview(): ArenaV2WeaponMammothStoneAxeNumericOverview {
  const mammothProjection = Object.freeze({
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
    Object.freeze({
      groundStats: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.groundStats,
      aerialStats: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.aerialStats,
    }),
    Object.freeze({
      groundStats: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.groundStats,
      aerialStats: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.aerialStats,
    }),
    Object.freeze({
      groundStats: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.groundStats,
      aerialStats: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.aerialStats,
    }),
    mammothProjection,
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
      mammothProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
      'research-phantom-tiger-fist',
      'research-blood-shadow-hook-blade',
      'research-magic-blood-scythe',
      'research-true-hades-hook-scythe',
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自本项目猛犸石斧研究 Definition 的权威投影，当前是可测试的调优假设；延迟预警、滚动物体、墙面反弹、公共危险和恢复物仍保持独立研究边界。',
  });
}
