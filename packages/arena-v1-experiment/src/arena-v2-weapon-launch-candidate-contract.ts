import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  type ArenaV2WeaponFunctionLanguageId,
} from './arena-v2-weapon-function-language.js';
import {
  ARENA_V2_PRODUCTION_WEAPON_MINIMUM_VERSIONS,
  findArenaV2WeaponMinimumVersion,
} from './arena-v2-weapon-minimum-version-contract.js';
import type { ArenaV2WeaponPublicAxisId } from './arena-v2-weapon-public-axis-contract.js';

export type ArenaV2WeaponLaunchCandidateSource =
  | 'production-baseline'
  | 'research-candidate';

export type ArenaV2WeaponLaunchCandidateImplementationStatus =
  | 'implemented-baseline'
  | 'research-contract-only';

export interface ArenaV2WeaponLaunchCandidate {
  readonly slot: 1 | 2 | 3 | 4 | 5 | 6;
  readonly candidateId: string;
  readonly displayName: string;
  readonly source: ArenaV2WeaponLaunchCandidateSource;
  readonly referenceId: string | null;
  readonly referenceName: string | null;
  readonly sourceUrl: string | null;
  readonly productionEquipmentDefinitionId: string | null;
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly languageLabel: string;
  readonly coreVerb: string;
  readonly modeFit: readonly string[];
  readonly requiredPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly readiness: 'ready';
  readonly implementationStatus: ArenaV2WeaponLaunchCandidateImplementationStatus;
  readonly selectionReason: string;
}

interface ArenaV2WeaponLaunchCandidateSpec {
  readonly slot: ArenaV2WeaponLaunchCandidate['slot'];
  readonly candidateId: string;
  readonly displayName: string;
  readonly source: ArenaV2WeaponLaunchCandidateSource;
  readonly referenceId: string | null;
  readonly productionEquipmentDefinitionId: string | null;
  readonly languageId: ArenaV2WeaponFunctionLanguageId;
  readonly selectionReason: string;
}

const launchCandidateSpecs: readonly ArenaV2WeaponLaunchCandidateSpec[] = Object.freeze([
  Object.freeze({
    slot: 1,
    candidateId: 'launch-01-approach',
    displayName: '冲锋盾',
    source: 'production-baseline',
    referenceId: null,
    productionEquipmentDefinitionId: 'shield',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
    selectionReason: '作为最容易理解的接触交换基线，先让玩家掌握方向、前摇和自身位移风险。',
  }),
  Object.freeze({
    slot: 2,
    candidateId: 'launch-02-push-away',
    displayName: '重锤',
    source: 'production-baseline',
    referenceId: null,
    productionEquipmentDefinitionId: 'hammer',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY,
    selectionReason: '提供最清晰的命中反馈和边缘击落目标，建立“命中结果改变地图位置”的基线。',
  }),
  Object.freeze({
    slot: 3,
    candidateId: 'launch-03-reposition',
    displayName: '引力锁链',
    source: 'production-baseline',
    referenceId: null,
    productionEquipmentDefinitionId: 'chain',
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
    selectionReason: '把武器差异从击退扩展到距离和边缘关系，验证地图熟悉度的长期价值。',
  }),
  Object.freeze({
    slot: 4,
    candidateId: 'launch-04-line-pressure',
    displayName: '直线压制候选',
    source: 'research-candidate',
    referenceId: 'white-platinum-dual-guns',
    productionEquipmentDefinitionId: null,
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
    selectionReason: '补足宽平台和长直线的远距离路线压力，同时保持单一攻击线和可读间隔。',
  }),
  Object.freeze({
    slot: 5,
    candidateId: 'launch-05-read-punish',
    displayName: '读招反制候选',
    source: 'research-candidate',
    referenceId: 'phantom-tiger-fist',
    productionEquipmentDefinitionId: null,
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
    selectionReason: '补足熟悉对手节奏后的高回报决策，让长期游玩不只依赖反复提升数值。',
  }),
  Object.freeze({
    slot: 6,
    candidateId: 'launch-06-flank',
    displayName: '绕后候选',
    source: 'research-candidate',
    referenceId: 'blood-blade',
    productionEquipmentDefinitionId: null,
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
    selectionReason: '补足分叉路线和侧后方观察，让 KZ 地图的路线选择直接进入对战决策。',
  }),
]);

function createLaunchCandidate(
  spec: ArenaV2WeaponLaunchCandidateSpec,
): ArenaV2WeaponLaunchCandidate {
  const profile = ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.find(({ id }) => (
    id === spec.languageId
  ));
  if (!profile) throw new RangeError(`首发候选引用未知战斗语言：${spec.candidateId}`);

  const productionVersion = spec.productionEquipmentDefinitionId === null
    ? undefined
    : ARENA_V2_PRODUCTION_WEAPON_MINIMUM_VERSIONS.find(({ equipmentDefinitionId }) => (
      equipmentDefinitionId === spec.productionEquipmentDefinitionId
    ));
  const researchVersion = spec.referenceId === null
    ? undefined
    : findArenaV2WeaponMinimumVersion(spec.referenceId);
  const minimumVersion = productionVersion ?? researchVersion;
  if (!minimumVersion) {
    throw new RangeError(`首发候选缺少最小版本合同：${spec.candidateId}`);
  }
  if (minimumVersion.languageId !== spec.languageId) {
    throw new RangeError(`首发候选与最小版本语言不一致：${spec.candidateId}`);
  }
  if (minimumVersion.readiness !== 'ready') {
    throw new RangeError(`首发候选仍依赖未公开数值轴：${spec.candidateId}`);
  }
  if (spec.source === 'production-baseline' && !productionVersion) {
    throw new RangeError(`生产基线候选缺少权威 Definition：${spec.candidateId}`);
  }
  if (spec.source === 'research-candidate' && !researchVersion) {
    throw new RangeError(`研究候选缺少参考武器：${spec.candidateId}`);
  }

  return Object.freeze({
    slot: spec.slot,
    candidateId: spec.candidateId,
    displayName: spec.displayName,
    source: spec.source,
    referenceId: spec.referenceId,
    referenceName: researchVersion?.referenceName ?? null,
    sourceUrl: researchVersion?.sourceUrl ?? null,
    productionEquipmentDefinitionId: spec.productionEquipmentDefinitionId,
    languageId: minimumVersion.languageId,
    languageLabel: profile.label,
    coreVerb: minimumVersion.coreVerb,
    modeFit: profile.modeFit,
    requiredPublicAxes: minimumVersion.requiredPublicAxes,
    readiness: 'ready',
    implementationStatus: spec.source === 'production-baseline'
      ? 'implemented-baseline'
      : 'research-contract-only',
    selectionReason: spec.selectionReason,
  });
}

function validateLaunchCandidates(
  candidates: readonly ArenaV2WeaponLaunchCandidate[],
): void {
  if (candidates.length !== 6) {
    throw new RangeError(`首发武器候选必须保持六个，实际为 ${candidates.length} 个。`);
  }
  if (new Set(candidates.map(({ candidateId }) => candidateId)).size !== candidates.length) {
    throw new RangeError('首发武器候选不能有重复身份。');
  }
  if (new Set(candidates.map(({ languageId }) => languageId)).size !== candidates.length) {
    throw new RangeError('首发武器候选必须覆盖六种不同战斗语言。');
  }
  const productionCount = candidates.filter(({ source }) => source === 'production-baseline').length;
  const researchCount = candidates.filter(({ source }) => source === 'research-candidate').length;
  if (productionCount !== 3 || researchCount !== 3) {
    throw new RangeError('首发武器候选必须由三把生产基线和三把研究候选组成。');
  }
  if (candidates.some(({ readiness }) => readiness !== 'ready')) {
    throw new RangeError('首发武器候选不能带有未闭合的公开数值轴。');
  }
}

export const ARENA_V2_WEAPON_LAUNCH_CANDIDATES = Object.freeze(
  launchCandidateSpecs.map(createLaunchCandidate),
);

validateLaunchCandidates(ARENA_V2_WEAPON_LAUNCH_CANDIDATES);

export const ARENA_V2_WEAPON_LAUNCH_LANGUAGE_IDS = Object.freeze(
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES.map(({ languageId }) => languageId),
);
