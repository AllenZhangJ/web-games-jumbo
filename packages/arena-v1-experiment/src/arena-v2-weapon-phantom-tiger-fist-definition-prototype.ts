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
import { ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY } from './arena-v2-weapon-phantom-tiger-fist-case-study.js';
import {
  createArenaV2WeaponResearchOverviewContexts,
  type ArenaV2WeaponResearchOverviewContext,
} from './arena-v2-weapon-research-overview-prototype.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';
import {
  ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';

export const ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_ID = 'research-phantom-tiger-fist';
export const ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID = 'research-phantom-tiger-fist-ground';
export const ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_AERIAL_ACTION_ID = 'research-phantom-tiger-fist-aerial';

export type ArenaV2WeaponPhantomTigerFistNumericStatus =
  'definition-projected-hypothesis';

export interface ArenaV2WeaponPhantomTigerFistDefinitionPrototype {
  readonly candidateId: 'case-study-phantom-tiger-fist';
  readonly weaponId: typeof ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_ID;
  readonly referenceId: 'phantom-tiger-fist';
  readonly referenceName: '幻虎巨拳';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: ArenaV2WeaponPhantomTigerFistNumericStatus;
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly equipment: EquipmentDefinition;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly publicBehaviorAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly measurementPlan: readonly string[];
}

export interface ArenaV2WeaponPhantomTigerFistNumericOverview {
  readonly candidateId: 'case-study-phantom-tiger-fist';
  readonly weaponId: typeof ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_ID;
  readonly displayName: '幻虎巨拳';
  readonly referenceName: '幻虎巨拳';
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly numericStatus: ArenaV2WeaponPhantomTigerFistNumericStatus;
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly comparisonWeaponIds: readonly string[];
  readonly numericReadoutReason: string;
}

const commitment: ActionCommitmentDefinition = Object.freeze({
  commitTicks: 12,
  expireTicks: 18,
  expireOutcome: 'cancel',
  canTurn: true,
  levelThresholds: Object.freeze([6, 12]),
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
    kind: 'research-phantom-tiger-fist-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-phantom-tiger-fist'],
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
  id: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID,
  aerial: false,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 3.4, minimumFacingDot: 0.78, maximumVerticalDifference: 1.2 },
  },
  timing: { windupTicks: 20, activeTicks: 3, recoveryTicks: 26, cooldownTicks: 84 },
  targetGroundKnockbackDistance: 2.6,
  verticalImpulse: 5.2,
  hitstunTicks: 22,
  selfMovementImpulse: 1.1,
  tags: ['phantom-tiger-fist', 'read-punish', 'commitment', 'ground'],
  actionCommitment: commitment,
});

const aerialAction = attackDefinition({
  id: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_AERIAL_ACTION_ID,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 2.8, radius: 1.05, minimumVerticalDrop: 0, maximumVerticalDifference: 2.4 },
  },
  timing: { windupTicks: 14, activeTicks: 3, recoveryTicks: 28, cooldownTicks: 84 },
  targetGroundKnockbackDistance: 2.1,
  verticalImpulse: 5.6,
  hitstunTicks: 20,
  selfMovementImpulse: 0.7,
  tags: ['phantom-tiger-fist', 'height-branch', 'aerial'],
});

const equipment = createEquipmentDefinition({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_ID,
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
  presentationSemantic: 'research-phantom-tiger-fist',
  tags: ['research', 'v2-case-study', 'read-punish'],
});

const prototype: ArenaV2WeaponPhantomTigerFistDefinitionPrototype = Object.freeze({
  candidateId: 'case-study-phantom-tiger-fist',
  weaponId: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_ID,
  referenceId: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY.referenceId,
  referenceName: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY.referenceName,
  coreVerb: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY.minimumVersion.coreVerb,
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
    '实测蓄力闪光到释放的首见时间和取消归因。',
    '实测地面重拳的命中距离、横向击退和自身位移风险。',
    '实测空中目标与地面目标的高度分支是否能被玩家正确预测。',
    '完成 Replay、地图边缘、目标主动离开和设备反馈验证后，才讨论生产迁移。',
  ]),
});

export const ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE = prototype;

export function createArenaV2WeaponPhantomTigerFistNumericOverview(): ArenaV2WeaponPhantomTigerFistNumericOverview {
  const phantomProjection = Object.freeze({
    groundStats: prototype.groundStats,
    aerialStats: prototype.aerialStats,
  });
  const comparisonProjections = Object.freeze([
    ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ groundStats, aerialStats }) => (
      Object.freeze({ groundStats, aerialStats })
    )),
    phantomProjection,
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
      phantomProjection,
      comparisonProjections,
    ),
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    comparisonWeaponIds: Object.freeze([
      ...ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
      prototype.weaponId,
    ]),
    numericReadoutReason: '数值来自本项目候选 Definition 的权威投影，当前仍是可测试的调优假设，不是原作数值移植，也不是生产平衡结论。',
  });
}
