import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  resolveArenaV2WeaponFunctionLanguage,
  type ArenaV2WeaponFunctionLanguageId,
} from './arena-v2-weapon-function-language.js';
import {
  ARENA_V2_WEAPON_RESEARCH_CATALOG,
  type ArenaV2WeaponResearchCard,
} from './arena-v2-weapon-research-catalog.js';
import {
  createArenaV2WeaponLanguageReadabilityReport,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';

export interface ArenaV2WeaponMinimumRule {
  readonly targeting: string;
  readonly timing: string;
  readonly hitResult: string;
  readonly mapRelationship: string;
  readonly failureCost: string;
}

export interface ArenaV2WeaponMinimumVersionSpecification {
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly representativeReferenceId: string | null;
  readonly coreVerb: string;
  readonly input: 'primary-attack';
  readonly contexts: readonly ['ground', 'aerial'];
  readonly minimumRule: ArenaV2WeaponMinimumRule;
  readonly counterplay: readonly string[];
  readonly notToCopy: readonly string[];
}

export interface ArenaV2WeaponMinimumVersion {
  readonly referenceId: string;
  readonly referenceName: string;
  readonly sourceUrl: string;
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly languageLabel: string;
  readonly coreVerb: string;
  readonly input: 'primary-attack';
  readonly contexts: readonly string[];
  readonly arenaMinimumVersion: string;
  readonly minimumRule: ArenaV2WeaponMinimumRule;
  readonly requiredPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly supportedPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly unresolvedResearchAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly readiness: 'ready' | 'blocked';
  readonly mapUses: readonly string[];
  readonly counterplay: readonly string[];
  readonly failureCost: string;
  readonly notToCopy: readonly string[];
}

export interface ArenaV2ProductionWeaponMinimumVersion {
  readonly equipmentDefinitionId: string;
  readonly displayName: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly languageLabel: string;
  readonly coreVerb: string;
  readonly input: 'primary-attack';
  readonly contexts: readonly ['ground', 'aerial'];
  readonly minimumRule: ArenaV2WeaponMinimumRule;
  readonly requiredPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly readiness: 'ready' | 'blocked';
  readonly mappingStatus: 'aligned';
}

const specifications: readonly ArenaV2WeaponMinimumVersionSpecification[] = Object.freeze([
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
    representativeReferenceId: 'red-demon-claw',
    coreVerb: '冲入',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '正面短距离目标，攻击方向决定是否接触。',
      timing: '短前摇后进行一次有限位移，命中窗口短而清楚。',
      hitResult: '中等横向击退，并保留使用者自身的位移结果。',
      mapRelationship: '长直线、窄路入口和断层边缘放大抢位价值。',
      failureCost: '挥空或冲过头会把使用者留在危险位置。',
    }),
    counterplay: Object.freeze(['让出直线', '跳过攻击线', '诱导冲过头']),
    notToCopy: Object.freeze(['多段连招', '无敌旋转', '复杂派生']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY,
    representativeReferenceId: null,
    coreVerb: '推离',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '正面短距离目标，攻击方向决定是否进入重击范围。',
      timing: '明显前摇后形成一次清晰有效命中，挥空后保留可惩罚收招。',
      hitResult: '高于普通攻击的横向击退，并用垂直控制改变目标落点。',
      mapRelationship: '平台边缘、窄桥和断层入口直接放大击退价值。',
      failureCost: '对手提前离开正面线会诱导挥空，使用者在收招期间失去主动。',
    }),
    counterplay: Object.freeze(['提前离开正面线', '诱导挥空', '从侧面接近']),
    notToCopy: Object.freeze(['真正格挡', '多段连招树', '命中即自动追击']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
    representativeReferenceId: 'magic-blood-scythe',
    coreVerb: '封路',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '在可见的地面区域放置一次危险标记。',
      timing: '公开预警后短延迟生效，并在有限时间后结束。',
      hitResult: '让一小段路线暂时不可安全通过，而不是直接追踪目标。',
      mapRelationship: '窄路入口、固定落点和路线交汇处提供明确价值。',
      failureCost: '标记位置错误会浪费一次冷却，并给对手换路线机会。',
    }),
    counterplay: Object.freeze(['提前离开区域', '等待危险结束', '从另一条路线进入']),
    notToCopy: Object.freeze(['自动锁定', '无限叠加陷阱', '复杂资源系统']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
    representativeReferenceId: 'true-hades-hook-scythe',
    coreVerb: '换位',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '目标必须处于距离、方向和障碍物都允许的范围内。',
      timing: '一次可预判的拉近、推远或位置交换，不叠加多段派生。',
      hitResult: '命中优先改变双方距离和边缘关系，而不是单纯增加伤害。',
      mapRelationship: '平台角落、高低差和边缘入口决定换位是否值得。',
      failureCost: '方向或距离判断失败会失去主动，障碍物可以打断结果。',
    }),
    counterplay: Object.freeze(['横向移动', '跳跃改变高度', '利用障碍物']),
    notToCopy: Object.freeze(['无敌突进', '破防与高击飞同时存在', '复杂反弹路径']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
    representativeReferenceId: 'phantom-tiger-fist',
    coreVerb: '读招反制',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '短距离正面目标，成功条件要求目标进入承诺范围。',
      timing: '蓄力阶段有可见节点，提前释放、完成承诺和到期取消必须可区分。',
      hitResult: '成功读招时获得明显高于普通先手的横向或垂直控制。',
      mapRelationship: '平台边缘、窄路封口和短距离对峙放大读招回报。',
      failureCost: '预测错误会损失蓄力时间，并在结束后暴露明确空档。',
    }),
    counterplay: Object.freeze(['假动作', '等待承诺结束', '从侧面逼迫出招']),
    notToCopy: Object.freeze(['架招系统', '真正格挡', '破防反击链']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
    representativeReferenceId: 'white-platinum-dual-guns',
    coreVerb: '直线压制',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '一条玩家和对手都能看见的直线攻击面。',
      timing: '固定且可读的重复间隔，不引入多种瞄准操作。',
      hitResult: '用低至中等击退逼迫对手离开安全路线。',
      mapRelationship: '宽平台、长直线和高低差决定攻击线的覆盖价值。',
      failureCost: '贴身后收益下降，连续空放会失去下一次压制机会。',
    }),
    counterplay: Object.freeze(['绕出攻击线', '贴身压迫', '利用高低差']),
    notToCopy: Object.freeze(['自动跟踪', '高频连续射击', '多套瞄准操作']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
    representativeReferenceId: 'blood-blade',
    coreVerb: '绕后',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '命中条件读取目标朝向关系，正面不能通过扩大范围替代绕后。',
      timing: '侧向或背后位置成立时才获得方向性击退。',
      hitResult: '把击退方向和目标原有朝向结合，改变安全路线。',
      mapRelationship: '分叉路线、绕后空间和边缘入口提供换位机会。',
      failureCost: '正面交换能力不稳定，走错路线会同时暴露自己和脚下空间。',
    }),
    counterplay: Object.freeze(['保持正面', '封住分叉', '跳过侧向攻击']),
    notToCopy: Object.freeze(['不可防御与背后召唤叠加', '持续伤害堆叠', '复杂陷阱链']),
  }),
  Object.freeze({
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
    representativeReferenceId: 'mammoth-stone-axe',
    coreVerb: '延迟重击',
    input: 'primary-attack',
    contexts: Object.freeze(['ground', 'aerial'] as const),
    minimumRule: Object.freeze({
      targeting: '指定一个玩家能辨认的落点或路线表面。',
      timing: '先显示公开预警，再经过明确延迟产生一次强力结果。',
      hitResult: '以高覆盖、高击退或垂直控制换取对手提前离开。',
      mapRelationship: '边缘、断层落点和路线交汇处放大预判价值。',
      failureCost: '目标提前离开后容易空放，且不能立即重复覆盖同一位置。',
    }),
    counterplay: Object.freeze(['离开标记点', '诱导提前释放', '利用恢复平台']),
    notToCopy: Object.freeze(['多档蓄力树', '滚动物体链', '撞墙追加攻击']),
  }),
]);

export const ARENA_V2_WEAPON_MINIMUM_VERSION_SPECIFICATIONS = specifications;

const specificationByLanguageId = new Map(
  specifications.map((specification) => [specification.languageId, specification]),
);

function resolveSpecification(
  languageId: ArenaV2WeaponFunctionLanguageId,
): ArenaV2WeaponMinimumVersionSpecification {
  const specification = specificationByLanguageId.get(languageId);
  if (!specification) throw new RangeError(`战斗语言缺少最小版本合同：${languageId}`);
  return specification;
}

function validateRepresentativeReferences(): void {
  for (const specification of specifications) {
    if (specification.representativeReferenceId === null) continue;
    const card = ARENA_V2_WEAPON_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === specification.representativeReferenceId
    ));
    if (!card) {
      throw new RangeError(`最小版本合同缺少代表性参考武器：${specification.representativeReferenceId}`);
    }
    if (resolveArenaV2WeaponFunctionLanguage(card).id !== specification.languageId) {
      throw new RangeError(`参考武器 ${card.referenceId} 与最小版本战斗语言不一致。`);
    }
  }
}

function createMinimumVersion(
  card: ArenaV2WeaponResearchCard,
): ArenaV2WeaponMinimumVersion {
  const profile = resolveArenaV2WeaponFunctionLanguage(card);
  const specification = resolveSpecification(profile.id);
  const readability = createArenaV2WeaponLanguageReadabilityReport(profile);
  return Object.freeze({
    referenceId: card.referenceId,
    referenceName: card.referenceName,
    sourceUrl: card.sourceUrl,
    languageId: profile.id,
    languageLabel: profile.label,
    coreVerb: specification.coreVerb,
    input: specification.input,
    contexts: card.contexts,
    arenaMinimumVersion: card.arenaMinimumVersion,
    minimumRule: specification.minimumRule,
    requiredPublicAxes: readability.requiredAxes,
    supportedPublicAxes: readability.supportedPublicAxes,
    unresolvedResearchAxes: readability.unresolvedResearchAxes,
    readiness: readability.readiness,
    mapUses: card.mapUses,
    counterplay: specification.counterplay,
    failureCost: card.failureCost,
    notToCopy: card.notToCopy,
  });
}

export function createArenaV2WeaponMinimumVersionCatalog(): readonly ArenaV2WeaponMinimumVersion[] {
  validateRepresentativeReferences();
  const catalog = Object.freeze(ARENA_V2_WEAPON_RESEARCH_CATALOG.map(createMinimumVersion));
  const referenceIds = new Set(catalog.map(({ referenceId }) => referenceId));
  if (referenceIds.size !== ARENA_V2_WEAPON_RESEARCH_CATALOG.length) {
    throw new RangeError('武器最小版本合同出现重复参考武器。');
  }
  return catalog;
}

export const ARENA_V2_WEAPON_MINIMUM_VERSIONS =
  createArenaV2WeaponMinimumVersionCatalog();

const PRODUCTION_LANGUAGE_BY_EQUIPMENT_ID: Readonly<Record<string, {
  readonly displayName: string;
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly coreVerb: string;
}>> = Object.freeze({
  hammer: Object.freeze({
    displayName: '重锤',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY,
    coreVerb: '推离',
  }),
  chain: Object.freeze({
    displayName: '引力锁链',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
    coreVerb: '换位',
  }),
  shield: Object.freeze({
    displayName: '冲锋盾',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
    coreVerb: '冲入',
  }),
});

function createProductionMinimumVersion(
  definition: typeof STAGE4_EQUIPMENT_DEFINITIONS[number],
): ArenaV2ProductionWeaponMinimumVersion {
  const mapping = PRODUCTION_LANGUAGE_BY_EQUIPMENT_ID[definition.id];
  if (!mapping) throw new RangeError(`生产武器缺少最小版本语言映射：${definition.id}`);
  const profile = ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.find(({ id }) => (
    id === mapping.languageId
  ));
  if (!profile) throw new RangeError(`生产武器引用未知战斗语言：${mapping.languageId}`);
  const specification = resolveSpecification(mapping.languageId);
  const readability = createArenaV2WeaponLanguageReadabilityReport(profile);
  return Object.freeze({
    equipmentDefinitionId: definition.id,
    displayName: mapping.displayName,
    groundActionDefinitionId: definition.actionDefinitionId,
    aerialActionDefinitionId: definition.aerialActionDefinitionId,
    languageId: mapping.languageId,
    languageLabel: profile.label,
    coreVerb: mapping.coreVerb,
    input: specification.input,
    contexts: specification.contexts,
    minimumRule: specification.minimumRule,
    requiredPublicAxes: readability.requiredAxes,
    readiness: readability.readiness,
    mappingStatus: 'aligned',
  });
}

export const ARENA_V2_PRODUCTION_WEAPON_MINIMUM_VERSIONS = Object.freeze(
  STAGE4_EQUIPMENT_DEFINITIONS.map(createProductionMinimumVersion),
);

export function findArenaV2WeaponMinimumVersion(
  referenceId: string,
): ArenaV2WeaponMinimumVersion | undefined {
  return ARENA_V2_WEAPON_MINIMUM_VERSIONS.find((version) => version.referenceId === referenceId);
}

export function listArenaV2WeaponMinimumVersionLanguages(): readonly ArenaV2WeaponFunctionLanguageId[] {
  return Object.freeze(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.map(({ id }) => id));
}
