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
  type ActionCommitmentDefinition,
  type ActionDefinition,
  type ArenaWeaponPublicNumericProjection,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-true-hades-hook-scythe-case-study.js';
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
  createArenaV2WeaponResearchOverviewContexts,
  type ArenaV2WeaponResearchOverviewContext,
} from './arena-v2-weapon-research-overview-prototype.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';
import {
  ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';

export const ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_ID = 'research-true-hades-hook-scythe';
export const ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID = 'research-true-hades-hook-scythe-ground';
export const ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_AERIAL_ACTION_ID = 'research-true-hades-hook-scythe-aerial';

export interface ArenaV2WeaponTrueHadesHookScytheDefinitionPrototype {
  readonly candidateId: 'case-study-true-hades-hook-scythe';
  readonly weaponId: typeof ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_ID;
  readonly referenceId: 'true-hades-hook-scythe';
  readonly referenceName: '真·哈迪斯钩镰';
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
  readonly researchSignals: readonly ['stage-confirmation', 'support-surface', 'nonlethal-commitment'];
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponTrueHadesHookScytheNumericOverview {
  readonly candidateId: 'case-study-true-hades-hook-scythe';
  readonly weaponId: typeof ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_ID;
  readonly displayName: '真·哈迪斯钩镰';
  readonly referenceName: '真·哈迪斯钩镰';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: 'definition-projected-hypothesis';
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly comparisonWeaponIds: readonly string[];
  readonly numericReadoutReason: string;
}

const commitment: ActionCommitmentDefinition = Object.freeze({
  commitTicks: 8,
  expireTicks: 14,
  expireOutcome: 'cancel',
  canTurn: false,
  levelThresholds: Object.freeze([4, 8]),
});

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
  actionCommitment,
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
  actionCommitment?: ActionCommitmentDefinition;
}>): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'research-true-hades-hook-scythe-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-true-hades-hook-scythe'],
    timing,
    ...(actionCommitment ? { commitment: actionCommitment } : {}),
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
  id: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 2.8, minimumFacingDot: 0.58, maximumVerticalDifference: 1.3 },
  },
  timing: { windupTicks: 16, activeTicks: 3, recoveryTicks: 28, cooldownTicks: 84 },
  targetGroundKnockbackDistance: 2.2,
  verticalImpulse: 5.2,
  hitstunTicks: 20,
  selfMovementImpulse: 1.1,
  tags: ['true-hades-hook-scythe', 'stage-confirmation', 'charged', 'ground'],
  actionCommitment: commitment,
});

const aerialAction = attackDefinition({
  id: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 2.6, radius: 1.1, minimumVerticalDrop: 0, maximumVerticalDifference: 2.5 },
  },
  timing: { windupTicks: 10, activeTicks: 4, recoveryTicks: 30, cooldownTicks: 84 },
  targetGroundKnockbackDistance: 1.7,
  verticalImpulse: 6.1,
  hitstunTicks: 18,
  selfMovementImpulse: 0.5,
  tags: ['true-hades-hook-scythe', 'support-surface', 'aerial'],
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_ID,
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
  presentationSemantic: 'research-true-hades-hook-scythe',
  tags: ['research', 'v2-case-study', 'stage-confirmation', 'support-surface'],
});

const prototype: ArenaV2WeaponTrueHadesHookScytheDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-true-hades-hook-scythe',
  weaponId: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY.minimumVersion.coreVerb,
  status: 'research-only',
  numericStatus: 'definition-projected-hypothesis',
  groundAction,
  aerialAction,
  equipment,
  groundStats: projectArenaV2ActionDefinitionPublicNumbers(groundAction),
  aerialStats: projectArenaV2ActionDefinitionPublicNumbers(aerialAction),
  publicOverviewAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
  publicBehaviorAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS]),
  researchSignals: Object.freeze([
    'stage-confirmation',
    'support-surface',
    'nonlethal-commitment',
  ] as const),
  measurementPlan: Object.freeze([
    '实测蓄力开始、提前释放、提交和到期取消，确认前段承诺不能被 UI 文案替代。',
    '实测地面冲击的前冲、自身位移和边缘结果，把固定伤害转译为可观察位置结果。',
    '实测空中下压在不同支撑面上的命中高度、落点和恢复，确认支撑面是动作条件而非背景。',
    '用阶段 Replay 验证前段未命中时不自动派生后段，避免把多阶段动作变成无条件追踪。',
    '完成地图支撑面、命中反馈、设备和真人首见时间验证后，才讨论生产迁移。',
  ]),
});

export const ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponTrueHadesHookScytheNumericOverview(): ArenaV2WeaponTrueHadesHookScytheNumericOverview {
  const trueHadesProjection = Object.freeze({
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
    trueHadesProjection,
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
      trueHadesProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
      'research-phantom-tiger-fist',
      'research-blood-shadow-hook-blade',
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自本项目真·哈迪斯钩镰研究 Definition 的权威投影，当前是可测试的调优假设；支撑面、多阶段命中和非致死语义仍需独立 Replay 与地图验证。',
  });
}
