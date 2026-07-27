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
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-magic-blood-scythe-case-study.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.js';
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

export const ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_ID = 'research-magic-blood-scythe';
export const ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID = 'research-magic-blood-scythe-ground';
export const ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_AERIAL_ACTION_ID = 'research-magic-blood-scythe-aerial';

export interface ArenaV2WeaponMagicBloodScytheWarningHypothesis {
  readonly delayTicks: number;
  readonly warningTicks: number;
  readonly activeTicks: number;
  readonly radius: number;
  readonly maximumVerticalDifference: number;
  readonly status: 'research-only';
}

export interface ArenaV2WeaponMagicBloodScytheDefinitionPrototype {
  readonly candidateId: 'case-study-magic-blood-scythe';
  readonly weaponId: typeof ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_ID;
  readonly referenceId: 'magic-blood-scythe';
  readonly referenceName: '魔血镰刃';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  /** The delay/telegraph contract is intentionally separate until the warning runtime is connected. */
  readonly warningHypothesis: ArenaV2WeaponMagicBloodScytheWarningHypothesis;
  readonly equipment: EquipmentDefinition;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly publicBehaviorAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly researchSignals: readonly ['zone-denial', 'warning-zone', 'height-branch'];
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponMagicBloodScytheNumericOverview {
  readonly candidateId: 'case-study-magic-blood-scythe';
  readonly weaponId: typeof ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_ID;
  readonly displayName: '魔血镰刃';
  readonly referenceName: '魔血镰刃';
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
    kind: 'research-magic-blood-scythe-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-magic-blood-scythe'],
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
  id: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'facing-capsule',
    parameters: { range: 4, radius: 1.2, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 20, activeTicks: 3, recoveryTicks: 24, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 1.4,
  verticalImpulse: 3.4,
  hitstunTicks: 17,
  selfMovementImpulse: 0.25,
  tags: ['magic-blood-scythe', 'zone-denial', 'warning', 'ground'],
});

const aerialAction = attackDefinition({
  id: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3.2, radius: 1.4, minimumVerticalDrop: 0, maximumVerticalDifference: 3.2 },
  },
  timing: { windupTicks: 16, activeTicks: 4, recoveryTicks: 28, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 1.2,
  verticalImpulse: 4.8,
  hitstunTicks: 18,
  selfMovementImpulse: 0.45,
  tags: ['magic-blood-scythe', 'height-branch', 'aerial'],
});

const warningHypothesis: ArenaV2WeaponMagicBloodScytheWarningHypothesis = Object.freeze({
  delayTicks: 18,
  warningTicks: 18,
  activeTicks: 6,
  radius: 1.35,
  maximumVerticalDifference: 1.5,
  status: 'research-only',
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_ID,
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
  presentationSemantic: 'research-magic-blood-scythe',
  tags: ['research', 'v2-case-study', 'zone-denial', 'warning'],
});

const prototype: ArenaV2WeaponMagicBloodScytheDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-magic-blood-scythe',
  weaponId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY.minimumVersion.coreVerb,
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
  researchSignals: Object.freeze(['zone-denial', 'warning-zone', 'height-branch'] as const),
  measurementPlan: Object.freeze([
    '用地面直线命中、离开攻击线和高度差三个 Replay，确认宽覆盖不会变成自动追踪。',
    '把 warningHypothesis 接入独立危险区运行时，实测看见标记后离开、等待和换路线三种回应。',
    '比较地面投射与空中下压的射程、覆盖、起手、恢复、击退和高度差，概览必须直接展示差异。',
    '加入有支撑面、断层和墙角的地图探针，确认落点与地图几何共同决定命中后的路线结果。',
    '完成命中特效、受击反馈、设备触控和真人首见时间测试后，才讨论生产迁移。',
  ]),
});

export const ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponMagicBloodScytheNumericOverview(): ArenaV2WeaponMagicBloodScytheNumericOverview {
  const magicProjection = Object.freeze({
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
      groundStats: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.groundStats,
      aerialStats: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.aerialStats,
    }),
    magicProjection,
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
      magicProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
      'research-phantom-tiger-fist',
      'research-blood-shadow-hook-blade',
      'research-true-hades-hook-scythe',
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自本项目魔血镰刃研究 Definition 的权威投影，当前是可测试的调优假设；延迟危险区仍保持在独立研究信号中，尚未伪装成已接入的权威动作系统。',
  });
}
