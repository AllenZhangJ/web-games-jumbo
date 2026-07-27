import {
  type ActionDefinition,
  type ArenaWeaponPublicNumericProjection,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2WeaponLanguageCandidates,
  runArenaV2WeaponLanguagePrototype,
} from './arena-v2-weapon-language-prototype.js';
import { ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID } from './arena-v2-weapon-function-language.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';

export interface ArenaV2LinePressureDefinitionPrototype {
  readonly weaponId: 'research-line-pressure';
  readonly languageId: typeof ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE;
  readonly status: 'research-only';
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
  readonly publicOverviewAxes: readonly string[];
  readonly counterplay: readonly string[];
  readonly probe: Readonly<{
    readonly holdOutcome: 'hit';
    readonly holdFirstHitTick: number;
    readonly stepOutOutcome: 'miss';
    readonly stepOutFirstHitTick: null;
    readonly responseTicks: number;
  }>;
}

function projectAction(action: ActionDefinition): ArenaWeaponPublicNumericProjection {
  return projectArenaV2ActionDefinitionPublicNumbers(action);
}

export function createArenaV2LinePressureDefinitionPrototype(): ArenaV2LinePressureDefinitionPrototype {
  const candidate = createArenaV2WeaponLanguageCandidates().find(({ weaponId }) => (
    weaponId === 'research-line-pressure'
  ));
  if (!candidate) throw new RangeError('缺少直线压制研究候选 Definition。');
  const probeResults = runArenaV2WeaponLanguagePrototype().results;
  const hold = probeResults.find(({ weaponId, policy }) => (
    weaponId === candidate.weaponId && policy === 'hold'
  ));
  const stepOut = probeResults.find(({ weaponId, policy }) => (
    weaponId === candidate.weaponId && policy === 'step-out'
  ));
  if (!hold || !stepOut || hold.outcome !== 'hit' || stepOut.outcome !== 'miss') {
    throw new RangeError('直线压制研究候选缺少可复现的等待/离线回应证据。');
  }
  if (hold.firstHitTick === null || stepOut.firstHitTick !== null) {
    throw new RangeError('直线压制研究候选的命中 tick 证据不完整。');
  }
  return Object.freeze({
    weaponId: 'research-line-pressure' as const,
    languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
    status: 'research-only',
    groundActionDefinitionId: candidate.groundAction.id,
    aerialActionDefinitionId: candidate.aerialAction.id,
    groundStats: projectAction(candidate.groundAction),
    aerialStats: projectAction(candidate.aerialAction),
    publicOverviewAxes: Object.freeze([
      'range',
      'coverage',
      'startup',
      'recovery',
      'impact',
      'vertical',
      'control',
      'self-movement',
      'cooldown',
      'active-frames',
      'direction-tolerance',
    ]),
    counterplay: Object.freeze(['绕出攻击线', '贴身压迫', '利用高低差']),
    probe: Object.freeze({
      holdOutcome: 'hit',
      holdFirstHitTick: hold.firstHitTick,
      stepOutOutcome: 'miss',
      stepOutFirstHitTick: null,
      responseTicks: hold.responseTicks,
    }),
  });
}

export const ARENA_V2_LINE_PRESSURE_DEFINITION_PROTOTYPE =
  createArenaV2LinePressureDefinitionPrototype();
