import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

const PROTOTYPE_TARGET_HOURS = 200;
const DEFAULT_WEAPON_COUNT = 20;
const DEFAULT_ROUTE_COUNT = 12;
const DEFAULT_MODE_COUNT = 3;
const DEFAULT_CHALLENGE_SET_COUNT = 16;
const HOURS_PER_FIRST_USE = 1;
const HOURS_PER_WEAPON_CONTEXT = 1;
const HOURS_PER_ROUTE = 2;
const HOURS_PER_MODE = 8;
const HOURS_PER_CHALLENGE_SET = 2;
const OPTIONS_KEYS = new Set([
  'targetHours',
  'weaponCount',
  'routeCount',
  'modeCount',
  'challengeSetCount',
]);

export type ArenaV2CollectionEvidenceKind =
  | 'first-use'
  | 'ground-context'
  | 'aerial-context'
  | 'map-edge-context'
  | 'one-v-one-counterplay'
  | 'survival-application';

export interface ArenaV2CollectionEvidenceStep {
  readonly kind: ArenaV2CollectionEvidenceKind;
  readonly hours: number;
  readonly completionSignal: string;
}

export interface ArenaV2CollectionWeaponPlan {
  readonly researchSlotId: string;
  readonly evidence: readonly ArenaV2CollectionEvidenceStep[];
  readonly packageHours: number;
}

export interface ArenaV2CollectionBudgetTrack {
  readonly id: 'weapon-collection' | 'weapon-contexts' | 'map-routes' | 'mode-records' | 'challenge-sets';
  readonly label: string;
  readonly unitCount: number;
  readonly hoursPerUnit: number;
  readonly hours: number;
  readonly repeatDropHours: number;
  readonly completionSignal: string;
}

export interface ArenaV2CollectionBudgetMilestone {
  readonly hours: number;
  readonly objective: string;
  readonly evidence: readonly string[];
}

export interface ArenaV2CollectionBudgetSensitivity {
  readonly weaponCount: number;
  readonly totalHours: number;
  readonly reachesTarget: boolean;
  readonly differenceFromTargetHours: number;
}

export interface ArenaV2CollectionBudgetPrototypeResult {
  readonly schemaVersion: 1;
  readonly targetHours: number;
  readonly baselineIsCandidateOnly: true;
  readonly repeatsDoNotCountAsContent: true;
  readonly weaponPlans: readonly ArenaV2CollectionWeaponPlan[];
  readonly tracks: readonly ArenaV2CollectionBudgetTrack[];
  readonly milestones: readonly ArenaV2CollectionBudgetMilestone[];
  readonly sensitivity: readonly ArenaV2CollectionBudgetSensitivity[];
  readonly totalHours: number;
  readonly totalRepeatDropHours: number;
  readonly reachesTarget: boolean;
}

interface BudgetOptions {
  readonly targetHours: number;
  readonly weaponCount: number;
  readonly routeCount: number;
  readonly modeCount: number;
  readonly challengeSetCount: number;
}

function readOptions(value: unknown): BudgetOptions {
  const source = cloneFrozenData(value ?? {}, 'Arena V2 collection budget options');
  assertKnownKeys(source, OPTIONS_KEYS, 'Arena V2 collection budget options');
  return {
    targetHours: assertIntegerAtLeast(
      source.targetHours ?? PROTOTYPE_TARGET_HOURS,
      1,
      'targetHours',
    ),
    weaponCount: assertIntegerAtLeast(
      source.weaponCount ?? DEFAULT_WEAPON_COUNT,
      1,
      'weaponCount',
    ),
    routeCount: assertIntegerAtLeast(
      source.routeCount ?? DEFAULT_ROUTE_COUNT,
      1,
      'routeCount',
    ),
    modeCount: assertIntegerAtLeast(
      source.modeCount ?? DEFAULT_MODE_COUNT,
      1,
      'modeCount',
    ),
    challengeSetCount: assertIntegerAtLeast(
      source.challengeSetCount ?? DEFAULT_CHALLENGE_SET_COUNT,
      1,
      'challengeSetCount',
    ),
  };
}

function createWeaponEvidence(): readonly ArenaV2CollectionEvidenceStep[] {
  return Object.freeze([
    Object.freeze({
      kind: 'first-use',
      hours: HOURS_PER_FIRST_USE,
      completionSignal: '能说出核心动词并完成一次有效命中',
    }),
    Object.freeze({
      kind: 'ground-context',
      hours: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '完成一次地面命中、一次挥空和一次安全撤离',
    }),
    Object.freeze({
      kind: 'aerial-context',
      hours: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '理解空中动作与地面动作的数值/落点差异',
    }),
    Object.freeze({
      kind: 'map-edge-context',
      hours: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '在宽平台、窄路或边缘完成一次地图决策',
    }),
    Object.freeze({
      kind: 'one-v-one-counterplay',
      hours: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '能识别至少一种对手反制并调整出招时机',
    }),
    Object.freeze({
      kind: 'survival-application',
      hours: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '在生存压力下主动选择该武器而不是随机替换',
    }),
  ]);
}

function createWeaponPlans(weaponCount: number): readonly ArenaV2CollectionWeaponPlan[] {
  const evidence = createWeaponEvidence();
  const packageHours = evidence.reduce((total, step) => total + step.hours, 0);
  return Object.freeze(Array.from({ length: weaponCount }, (_, index) => Object.freeze({
    researchSlotId: `weapon-research-slot-${String(index + 1).padStart(2, '0')}`,
    evidence,
    packageHours,
  })));
}

function createTracks(options: BudgetOptions): readonly ArenaV2CollectionBudgetTrack[] {
  const tracks = [
    {
      id: 'weapon-collection' as const,
      label: '武器首次理解与收藏',
      unitCount: options.weaponCount,
      hoursPerUnit: HOURS_PER_FIRST_USE,
      completionSignal: '已获得并能解释该武器的核心用途',
    },
    {
      id: 'weapon-contexts' as const,
      label: '武器上下文熟悉',
      unitCount: options.weaponCount * 5,
      hoursPerUnit: HOURS_PER_WEAPON_CONTEXT,
      completionSignal: '地面、空中、地图边缘、1v1 反制和生存应用均有记录',
    },
    {
      id: 'map-routes' as const,
      label: '地图段落与路线熟悉',
      unitCount: options.routeCount,
      hoursPerUnit: HOURS_PER_ROUTE,
      completionSignal: '完成段落并记录安全路线、危险路线和恢复路线',
    },
    {
      id: 'mode-records' as const,
      label: '模式记录',
      unitCount: options.modeCount,
      hoursPerUnit: HOURS_PER_MODE,
      completionSignal: '在该模式形成可复现的个人记录或策略',
    },
    {
      id: 'challenge-sets' as const,
      label: '武器×地图×模式挑战集合',
      unitCount: options.challengeSetCount,
      hoursPerUnit: HOURS_PER_CHALLENGE_SET,
      completionSignal: '完成一个明确的玩法目标，不以重复掉落充数',
    },
  ];
  return Object.freeze(tracks.map((track) => Object.freeze({
    ...track,
    hours: track.unitCount * track.hoursPerUnit,
    repeatDropHours: 0,
  })));
}

function createMilestones(options: BudgetOptions): readonly ArenaV2CollectionBudgetMilestone[] {
  return Object.freeze([
    Object.freeze({
      hours: 0.05,
      objective: '3 分钟掌握基础操作',
      evidence: Object.freeze(['移动、跳跃、基础攻击和被击飞反馈可解释']),
    }),
    Object.freeze({
      hours: 1,
      objective: '完成第一把武器的首次理解',
      evidence: Object.freeze(['核心动词', '有效距离', '基础命中结果']),
    }),
    Object.freeze({
      hours: 10,
      objective: '形成第一组武器与地图选择习惯',
      evidence: Object.freeze(['至少 2 把武器', '至少 2 个地图段落', '一次模式切换']),
    }),
    Object.freeze({
      hours: Math.floor(options.targetHours / 2),
      objective: '完成一半武器上下文并开始主动反制',
      evidence: Object.freeze(['地面/空中差异', '地图边缘结果', '1v1 反制记录']),
    }),
    Object.freeze({
      hours: options.targetHours,
      objective: `完成候选 ${options.weaponCount} 把武器、地图段落、三模式记录和挑战集合`,
      evidence: Object.freeze(['全武器研究卡', '地图路线记录', '模式记录', '挑战完成记录']),
    }),
  ]);
}

function createSensitivity(options: BudgetOptions): readonly ArenaV2CollectionBudgetSensitivity[] {
  return Object.freeze([options.weaponCount - 8, options.weaponCount, options.weaponCount + 8].map(
    (weaponCount) => {
      const totalHours = weaponCount * (HOURS_PER_FIRST_USE + (HOURS_PER_WEAPON_CONTEXT * 5))
        + options.routeCount * HOURS_PER_ROUTE
        + options.modeCount * HOURS_PER_MODE
        + options.challengeSetCount * HOURS_PER_CHALLENGE_SET;
      return Object.freeze({
        weaponCount,
        totalHours,
        reachesTarget: totalHours >= options.targetHours,
        differenceFromTargetHours: totalHours - options.targetHours,
      });
    },
  ));
}

export function runArenaV2CollectionBudgetPrototype(
  options: unknown = {},
): ArenaV2CollectionBudgetPrototypeResult {
  const resolved = readOptions(options);
  const weaponPlans = createWeaponPlans(resolved.weaponCount);
  const tracks = createTracks(resolved);
  const totalHours = tracks.reduce((total, track) => total + track.hours, 0);
  const totalRepeatDropHours = tracks.reduce((total, track) => total + track.repeatDropHours, 0);
  return Object.freeze({
    schemaVersion: 1,
    targetHours: resolved.targetHours,
    baselineIsCandidateOnly: true,
    repeatsDoNotCountAsContent: true,
    weaponPlans,
    tracks,
    milestones: createMilestones(resolved),
    sensitivity: createSensitivity(resolved),
    totalHours,
    totalRepeatDropHours,
    reachesTarget: totalHours >= resolved.targetHours,
  });
}
