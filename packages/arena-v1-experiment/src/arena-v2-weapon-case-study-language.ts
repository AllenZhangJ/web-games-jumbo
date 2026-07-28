import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  type ArenaV2WeaponFunctionLanguageId,
} from './arena-v2-weapon-function-language.js';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS,
  createArenaV2WeaponLanguageReadabilityReport,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';

export interface ArenaV2WeaponCaseStudySignatureAxis {
  readonly id: ArenaV2WeaponPublicAxisId;
  readonly label: string;
}

export interface ArenaV2WeaponCaseStudyLanguageBinding {
  readonly referenceId: string;
  readonly functionLanguageId: ArenaV2WeaponFunctionLanguageId;
  readonly languageLabel: string;
  readonly whyEffective: string;
  readonly signatureAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly signatureAxes: readonly ArenaV2WeaponCaseStudySignatureAxis[];
  readonly counterplay: readonly string[];
  readonly mapSpaces: readonly string[];
  readonly minimumArenaVersion: string;
  /** Research inference explaining why this case study belongs to this language. */
  readonly bindingReason: string;
}

export interface ArenaV2WeaponCaseStudyLanguageBindingInput {
  readonly referenceId: string;
  readonly functionLanguageId: ArenaV2WeaponFunctionLanguageId;
  readonly bindingReason: string;
}

const BINDING_INPUTS: readonly ArenaV2WeaponCaseStudyLanguageBindingInput[] = Object.freeze([
  Object.freeze({
    referenceId: 'magic-blood-scythe',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
    bindingReason: '中距离投射、延迟危险区和多档承诺共同改变对手下一步路线。',
  }),
  Object.freeze({
    referenceId: 'true-hades-hook-scythe',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
    bindingReason: '近战命中后的勾取、拉近和距离转换比单次伤害更决定后续交锋。',
  }),
  Object.freeze({
    referenceId: 'white-platinum-dual-guns',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
    bindingReason: '地面、跑动和空中射击用攻击线与覆盖逼迫对手换路，而非要求贴身换血。',
  }),
  Object.freeze({
    referenceId: 'blood-shadow-hook-blade',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
    bindingReason: '目标朝向、侧后方进入和障碍物共同决定钩刃是否能把位置优势兑现。',
  }),
  Object.freeze({
    referenceId: 'phantom-tiger-fist',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
    bindingReason: '蓄力、等待和高回报冲击把命中价值放在识别对手承诺，而不是无脑先手。',
  }),
  Object.freeze({
    referenceId: 'mammoth-stone-axe',
    functionLanguageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
    bindingReason: '预判落点、公开预警和高击飞把熟悉地图节奏转化为重击机会。',
  }),
]);

const profileById = new Map(
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.map((profile) => [profile.id, profile]),
);
const axisDefinitionById = new Map(
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const ARENA_V2_WEAPON_CASE_STUDY_LANGUAGE_BINDINGS = Object.freeze(BINDING_INPUTS);

export function createArenaV2WeaponCaseStudyLanguageBinding(
  input: ArenaV2WeaponCaseStudyLanguageBindingInput,
): ArenaV2WeaponCaseStudyLanguageBinding {
  const profile = profileById.get(input.functionLanguageId);
  if (!profile) throw new RangeError(`逐件研究案例缺少战斗语言：${input.functionLanguageId}`);
  const report = createArenaV2WeaponLanguageReadabilityReport(profile);
  const signatureAxes = Object.freeze(report.requiredAxes.map((axisId) => {
    const definition = axisDefinitionById.get(axisId);
    if (!definition) throw new RangeError(`战斗语言缺少公开轴定义：${axisId}`);
    return Object.freeze({ id: axisId, label: definition.label });
  }));
  return Object.freeze({
    referenceId: input.referenceId,
    functionLanguageId: input.functionLanguageId,
    languageLabel: profile.label,
    whyEffective: profile.whyEffective,
    signatureAxisIds: report.requiredAxes,
    signatureAxes,
    counterplay: profile.counterplay,
    mapSpaces: profile.mapSpaces,
    minimumArenaVersion: profile.minimumArenaVersion,
    bindingReason: input.bindingReason,
  });
}

export function createArenaV2WeaponCaseStudyLanguageBindings(): readonly ArenaV2WeaponCaseStudyLanguageBinding[] {
  return Object.freeze(BINDING_INPUTS.map(createArenaV2WeaponCaseStudyLanguageBinding));
}
