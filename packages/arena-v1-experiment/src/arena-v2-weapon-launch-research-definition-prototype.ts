import type {
  ActionDefinition,
  ArenaWeaponPublicNumericProjection,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES,
  type ArenaV2WeaponLaunchCandidate,
} from './arena-v2-weapon-launch-candidate-contract.js';
import {
  ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';
import {
  createArenaV2WeaponLanguageCandidates,
  runArenaV2WeaponLanguagePrototype,
  type ArenaV2WeaponLanguageCandidate,
} from './arena-v2-weapon-language-prototype.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';

export interface ArenaV2WeaponLaunchResearchDefinitionPrototype {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly displayName: string;
  readonly referenceId: string;
  readonly referenceName: string;
  readonly languageId: ArenaV2WeaponLaunchCandidate['languageId'];
  readonly languageLabel: string;
  readonly coreVerb: string;
  readonly status: 'research-only';
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly publicBehaviorAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly counterplay: readonly string[];
  readonly mapSpaces: readonly string[];
  readonly probe: Readonly<{
    readonly holdOutcome: 'hit';
    readonly holdFirstHitTick: number;
    readonly stepOutOutcome: 'miss';
    readonly stepOutFirstHitTick: null;
    readonly responseTicks: number;
  }>;
}

const RESEARCH_CANDIDATES = Object.freeze(
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES.filter(({ source }) => source === 'research-candidate'),
);
const LANGUAGE_CANDIDATES = createArenaV2WeaponLanguageCandidates();

function candidateFor(
  launchCandidate: ArenaV2WeaponLaunchCandidate,
): ArenaV2WeaponLanguageCandidate {
  const candidate = LANGUAGE_CANDIDATES.find(({ languageId }) => (
    languageId === launchCandidate.languageId
  ));
  if (!candidate) throw new RangeError(`研究候选缺少 ActionDefinition：${launchCandidate.candidateId}`);
  return candidate;
}

function probeFor(
  candidate: ArenaV2WeaponLanguageCandidate,
): ArenaV2WeaponLaunchResearchDefinitionPrototype['probe'] {
  const probes = runArenaV2WeaponLanguagePrototype().results;
  const hold = probes.find(({ weaponId, policy }) => (
    weaponId === candidate.weaponId && policy === 'hold'
  ));
  const stepOut = probes.find(({ weaponId, policy }) => (
    weaponId === candidate.weaponId && policy === 'step-out'
  ));
  if (!hold || !stepOut || hold.outcome !== 'hit' || stepOut.outcome !== 'miss') {
    throw new RangeError(`研究候选缺少可复现的等待/离开回应证据：${candidate.weaponId}`);
  }
  if (hold.firstHitTick === null || stepOut.firstHitTick !== null) {
    throw new RangeError(`研究候选的命中 tick 证据不完整：${candidate.weaponId}`);
  }
  return Object.freeze({
    holdOutcome: 'hit',
    holdFirstHitTick: hold.firstHitTick,
    stepOutOutcome: 'miss',
    stepOutFirstHitTick: null,
    responseTicks: hold.responseTicks,
  });
}

function createPrototype(
  launchCandidate: ArenaV2WeaponLaunchCandidate,
): ArenaV2WeaponLaunchResearchDefinitionPrototype {
  if (!launchCandidate.referenceId || !launchCandidate.referenceName) {
    throw new RangeError(`研究候选缺少参考武器身份：${launchCandidate.candidateId}`);
  }
  const candidate = candidateFor(launchCandidate);
  const groundStats = projectArenaV2ActionDefinitionPublicNumbers(candidate.groundAction);
  const aerialStats = projectArenaV2ActionDefinitionPublicNumbers(candidate.aerialAction);
  return Object.freeze({
    candidateId: launchCandidate.candidateId,
    weaponId: candidate.weaponId,
    displayName: launchCandidate.displayName,
    referenceId: launchCandidate.referenceId,
    referenceName: launchCandidate.referenceName,
    languageId: launchCandidate.languageId,
    languageLabel: launchCandidate.languageLabel,
    coreVerb: launchCandidate.coreVerb,
    status: 'research-only',
    groundActionDefinitionId: candidate.groundAction.id,
    aerialActionDefinitionId: candidate.aerialAction.id,
    groundAction: candidate.groundAction,
    aerialAction: candidate.aerialAction,
    groundStats,
    aerialStats,
    publicOverviewAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    publicBehaviorAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS]),
    counterplay: launchCandidate.languageId === 'read-punish'
      ? Object.freeze(['假动作', '等待承诺结束', '从侧面逼迫出招'])
      : launchCandidate.languageId === 'flank'
        ? Object.freeze(['保持正面', '封住分叉', '跳过侧向攻击'])
        : Object.freeze(['绕出攻击线', '贴身压迫', '利用高低差']),
    mapSpaces: launchCandidate.languageId === 'read-punish'
      ? Object.freeze(['平台边缘', '窄路封口', '短距离对峙'])
      : launchCandidate.languageId === 'flank'
        ? Object.freeze(['分叉路线', '绕后空间', '边缘入口'])
        : Object.freeze(['宽平台', '长直线', '窄桥']),
    probe: probeFor(candidate),
  });
}

export const ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES = Object.freeze(
  RESEARCH_CANDIDATES.map(createPrototype),
);

export function findArenaV2WeaponLaunchResearchDefinitionPrototype(
  candidateId: string,
): ArenaV2WeaponLaunchResearchDefinitionPrototype | undefined {
  return ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.find(({ candidateId: id }) => (
    id === candidateId
  ));
}
