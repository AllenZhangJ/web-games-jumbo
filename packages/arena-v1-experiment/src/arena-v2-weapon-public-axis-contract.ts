import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  type ArenaV2WeaponFunctionLanguageId,
  type ArenaV2WeaponFunctionLanguageProfile,
} from './arena-v2-weapon-function-language.js';

export const ARENA_V2_WEAPON_PUBLIC_AXIS_ID = Object.freeze({
  RANGE: 'range',
  COVERAGE: 'coverage',
  STARTUP: 'startup',
  RECOVERY: 'recovery',
  IMPACT: 'impact',
  VERTICAL: 'vertical',
  CONTROL: 'control',
  SELF_MOVEMENT: 'self-movement',
  COOLDOWN: 'cooldown',
  HEIGHT_GAP: 'height-gap',
  DELAY: 'delay',
  WARNING: 'warning',
  ACTIVE_FRAMES: 'active-frames',
  DIRECTION_TOLERANCE: 'direction-tolerance',
} as const);

export type ArenaV2WeaponPublicAxisId = typeof ARENA_V2_WEAPON_PUBLIC_AXIS_ID[
  keyof typeof ARENA_V2_WEAPON_PUBLIC_AXIS_ID
];

export type ArenaV2WeaponPublicAxisSurface = 'overview' | 'context' | 'research-only';

export interface ArenaV2WeaponPublicAxisDefinition {
  readonly id: ArenaV2WeaponPublicAxisId;
  readonly label: string;
  readonly surface: ArenaV2WeaponPublicAxisSurface;
  readonly sourceStatIds: readonly string[];
  readonly playerMeaning: string;
}

export interface ArenaV2WeaponLanguageReadabilityReport {
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly languageLabel: string;
  readonly requiredAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly supportedPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly unresolvedResearchAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly readiness: 'ready' | 'blocked';
}

const definitions: readonly ArenaV2WeaponPublicAxisDefinition[] = [
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
    label: '有效距离',
    surface: 'overview',
    sourceStatIds: Object.freeze(['range']),
    playerMeaning: '从多远开始能产生有效威胁。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
    label: '覆盖宽度',
    surface: 'overview',
    sourceStatIds: Object.freeze(['coverage']),
    playerMeaning: '攻击判定横向能影响多宽的空间。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
    label: '出手时间',
    surface: 'overview',
    sourceStatIds: Object.freeze(['startup']),
    playerMeaning: '从开始动作到形成有效攻击需要多久。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
    label: '收招时间',
    surface: 'overview',
    sourceStatIds: Object.freeze(['recovery']),
    playerMeaning: '挥空或命中后恢复自由行动需要多久。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
    label: '横向击飞',
    surface: 'overview',
    sourceStatIds: Object.freeze(['impact']),
    playerMeaning: '命中后把目标沿水平方向改变多远。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
    label: '垂直控制',
    surface: 'overview',
    sourceStatIds: Object.freeze(['vertical']),
    playerMeaning: '命中后把目标抬高或改变落点的能力。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL,
    label: '控制时间',
    surface: 'overview',
    sourceStatIds: Object.freeze(['control']),
    playerMeaning: '命中后目标暂时失去有效行动的时间。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
    label: '自身位移风险',
    surface: 'overview',
    sourceStatIds: Object.freeze(['self-movement']),
    playerMeaning: '使用动作时自己被带离安全位置的风险。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
    label: '再次使用时间',
    surface: 'overview',
    sourceStatIds: Object.freeze(['cooldown']),
    playerMeaning: '动作结束后再次尝试需要等待多久。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
    label: '命中高度差',
    surface: 'context',
    sourceStatIds: Object.freeze(['height-gap']),
    playerMeaning: '地面或空中动作允许的目标垂直关系。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
    label: '延迟时间',
    surface: 'research-only',
    sourceStatIds: Object.freeze([]),
    playerMeaning: '预警或落点出现后到实际危险生效的等待时间。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    label: '预警时间',
    surface: 'research-only',
    sourceStatIds: Object.freeze([]),
    playerMeaning: '玩家看到危险标记后可以作出回应的时间。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
    label: '有效攻击窗口',
    surface: 'research-only',
    sourceStatIds: Object.freeze([]),
    playerMeaning: '攻击判定保持有效的时间窗口。',
  },
  {
    id: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
    label: '方向容错',
    surface: 'research-only',
    sourceStatIds: Object.freeze([]),
    playerMeaning: '攻击方向偏离目标后仍能成立的范围。',
  },
];

export const ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS = Object.freeze(definitions);

export const ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS = Object.freeze([
  'range',
  'coverage',
  'startup',
  'recovery',
  'impact',
  'vertical',
  'control',
  'self-movement',
  'cooldown',
] as const);

export const ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS = Object.freeze([
  'range',
  'coverage',
  'startup',
  'impact',
  'vertical',
  'height-gap',
] as const);

const definitionById = new Map<string, ArenaV2WeaponPublicAxisDefinition>(
  definitions.map((definition) => [definition.id, definition]),
);

function resolveAxisDefinition(axisId: string): ArenaV2WeaponPublicAxisDefinition {
  const definition = definitionById.get(axisId);
  if (!definition) throw new RangeError(`武器战斗语言声明了未知公开数值轴：${axisId}`);
  return definition;
}

export function createArenaV2WeaponLanguageReadabilityReport(
  profile: ArenaV2WeaponFunctionLanguageProfile,
): ArenaV2WeaponLanguageReadabilityReport {
  const requiredAxes = profile.requiredPublicAxes.map((axisId) => resolveAxisDefinition(axisId));
  const requiredIds = Object.freeze(requiredAxes.map(({ id }) => id));
  const supportedPublicAxes = Object.freeze(
    requiredAxes
      .filter(({ surface }) => surface !== 'research-only')
      .map(({ id }) => id),
  );
  const unresolvedResearchAxes = Object.freeze(
    requiredAxes
      .filter(({ surface }) => surface === 'research-only')
      .map(({ id }) => id),
  );
  return Object.freeze({
    languageId: profile.id,
    languageLabel: profile.label,
    requiredAxes: requiredIds,
    supportedPublicAxes,
    unresolvedResearchAxes,
    readiness: unresolvedResearchAxes.length === 0 ? 'ready' : 'blocked',
  });
}

export function createArenaV2WeaponLanguageReadabilityReports(): readonly ArenaV2WeaponLanguageReadabilityReport[] {
  return Object.freeze(
    ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.map(
      createArenaV2WeaponLanguageReadabilityReport,
    ),
  );
}
