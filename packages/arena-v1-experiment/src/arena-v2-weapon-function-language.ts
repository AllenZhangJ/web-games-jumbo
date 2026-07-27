import type { ArenaV2WeaponResearchCard } from './arena-v2-weapon-research-catalog.js';

export const ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID = Object.freeze({
  APPROACH: 'approach',
  ZONE_DENIAL: 'zone-denial',
  REPOSITION: 'reposition',
  READ_PUNISH: 'read-punish',
  LINE_PRESSURE: 'line-pressure',
  FLANK: 'flank',
  DELAYED_HEAVY: 'delayed-heavy',
} as const);

export type ArenaV2WeaponFunctionLanguageId =
  typeof ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID[
    keyof typeof ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID
  ];

export type ArenaV2WeaponModeFit = '1v1' | 'race' | 'survival';

export interface ArenaV2WeaponFunctionLanguageProfile {
  readonly id: ArenaV2WeaponFunctionLanguageId;
  readonly label: string;
  readonly whyEffective: string;
  readonly requiredPublicAxes: readonly string[];
  readonly counterplay: readonly string[];
  readonly mapSpaces: readonly string[];
  readonly modeFit: readonly ArenaV2WeaponModeFit[];
  readonly minimumArenaVersion: string;
}

const profiles: readonly ArenaV2WeaponFunctionLanguageProfile[] = [
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
    label: '冲入',
    whyEffective: '用自身位移换取接触机会，把攻击者的位置也纳入命中结果。',
    requiredPublicAxes: Object.freeze(['range', 'startup', 'impact', 'self-movement', 'recovery']),
    counterplay: Object.freeze(['让开直线', '跳过攻击线', '诱导冲过头']),
    mapSpaces: Object.freeze(['长直线', '窄路入口', '断层边缘']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '短距离突进 + 低至中等目标击退 + 可见自身位移风险。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
    label: '封路',
    whyEffective: '把命中前的等待和危险区域变成路线选择，让对手不能只盯着攻击者。',
    requiredPublicAxes: Object.freeze(['coverage', 'delay', 'warning', 'cooldown', 'impact']),
    counterplay: Object.freeze(['提前离开区域', '等待危险结束', '从另一条路线进入']),
    mapSpaces: Object.freeze(['窄路入口', '固定落点', '路线交汇处']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '一处短时危险区 + 明确预警 + 一次可理解的冷却。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
    label: '换位',
    whyEffective: '命中收益不是单纯击飞，而是重写双方距离、朝向或边缘关系。',
    requiredPublicAxes: Object.freeze(['range', 'impact', 'vertical', 'control', 'recovery']),
    counterplay: Object.freeze(['横向移动', '跳跃改变高度', '不要站在边缘直线']),
    mapSpaces: Object.freeze(['平台角落', '高低差', '边缘入口']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '一次可预判的拉近、推远或双方位置交换。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
    label: '读招反制',
    whyEffective: '通过更高的命中回报奖励玩家识别对手的攻击时机，而不是无脑先手。',
    requiredPublicAxes: Object.freeze(['startup', 'active-frames', 'impact', 'recovery', 'control']),
    counterplay: Object.freeze(['假动作', '等待承诺结束', '从侧面逼迫出招']),
    mapSpaces: Object.freeze(['平台边缘', '窄路封口', '短距离对峙']),
    modeFit: Object.freeze(['1v1', 'survival']),
    minimumArenaVersion: '短暂蓄力或等待窗口 + 高击退 + 预测失败后的明确空档。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
    label: '直线压制',
    whyEffective: '用距离和可见的攻击线逼迫对手改变路线，形成低伤害但稳定的空间压力。',
    requiredPublicAxes: Object.freeze(['range', 'coverage', 'startup', 'impact', 'cooldown']),
    counterplay: Object.freeze(['绕出攻击线', '贴身压迫', '利用高低差']),
    mapSpaces: Object.freeze(['宽平台', '长直线', '窄桥']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '一条直线投射或刺击 + 低至中等击退 + 可读的重复间隔。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
    label: '绕后',
    whyEffective: '把方向注意力和路线选择纳入对战，迫使玩家同时观察攻击者与脚下空间。',
    requiredPublicAxes: Object.freeze(['range', 'startup', 'impact', 'recovery', 'direction-tolerance']),
    counterplay: Object.freeze(['保持正面', '封住分叉', '跳过侧向攻击']),
    mapSpaces: Object.freeze(['分叉路线', '绕后空间', '边缘入口']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '侧向或背后成立的命中条件 + 方向性击退，不叠加不可防御捷径。',
  },
  {
    id: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
    label: '延迟重击',
    whyEffective: '用公开预警换取大范围或高击飞，让熟悉地图和节奏的玩家能做预判。',
    requiredPublicAxes: Object.freeze(['delay', 'warning', 'coverage', 'impact', 'vertical']),
    counterplay: Object.freeze(['离开标记点', '诱导提前释放', '利用恢复平台']),
    mapSpaces: Object.freeze(['边缘', '断层落点', '路线交汇处']),
    modeFit: Object.freeze(['1v1', 'race', 'survival']),
    minimumArenaVersion: '指定落点的延迟重击 + 公开预警 + 失败后不可立即重复。',
  },
];

export const ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES = Object.freeze(profiles);

const languageByReferenceFamily: Readonly<Record<string, ArenaV2WeaponFunctionLanguageId>> = Object.freeze({
  'close-pressure': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
  'area-denial': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
  'distance-conversion': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
  'read-and-punish': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
  'line-pressure': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
  'line-pierce': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
  'flank-and-trap': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
  'throwing-zoning': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
  'point-or-zone': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
  'corridor-denial': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
  'delayed-heavy-hit': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
  'heavy-second-threat': ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
});

export function resolveArenaV2WeaponFunctionLanguage(
  card: ArenaV2WeaponResearchCard,
): ArenaV2WeaponFunctionLanguageProfile {
  const languageId = languageByReferenceFamily[card.functionalFamily];
  if (!languageId) {
    throw new RangeError(`参考武器功能族缺少 Arena 战斗语言映射：${card.functionalFamily}`);
  }
  const profile = profiles.find(({ id }) => id === languageId);
  if (!profile) throw new RangeError(`Arena 战斗语言缺少定义：${languageId}`);
  return profile;
}

export const ARENA_V2_WEAPON_FUNCTION_LANGUAGE_FAMILY_MAP = languageByReferenceFamily;
