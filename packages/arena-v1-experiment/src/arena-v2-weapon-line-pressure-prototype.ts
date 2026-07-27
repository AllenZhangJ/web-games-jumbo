import {
  ARENA_GAMEPLAY_V2_TUNING,
  type ActionDefinition,
  type ArenaWeaponPublicNumericProjection,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2WeaponLanguageCandidates,
  runArenaV2WeaponLanguagePrototype,
} from './arena-v2-weapon-language-prototype.js';
import { ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID } from './arena-v2-weapon-function-language.js';

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

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function positiveNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须是大于 0 的有限数。`);
  }
  return value as number;
}

function effectNumber(action: ActionDefinition, kind: string, field: string): number {
  const effect = action.effects.find(({ kind: effectKind }) => effectKind === kind);
  if (!effect) throw new RangeError(`${action.id} 缺少 ${kind} effect。`);
  const parameters = record(effect.parameters, `${action.id}.${kind}.parameters`);
  return positiveNumber(parameters[field], `${action.id}.${kind}.${field}`);
}

function targetParameter(action: ActionDefinition, field: string): number | undefined {
  const parameters = record(action.targeting.parameters, `${action.id}.targeting.parameters`);
  const value = parameters[field];
  if (value === undefined) return undefined;
  return positiveNumber(value, `${action.id}.targeting.${field}`);
}

function coverageWidth(action: ActionDefinition, range: number): number {
  const radius = targetParameter(action, 'radius');
  if (radius !== undefined) return radius * 2;
  const minimumFacingDot = targetParameter(action, 'minimumFacingDot');
  if (minimumFacingDot !== undefined) {
    return range * 2 * Math.sqrt(Math.max(0, 1 - minimumFacingDot ** 2));
  }
  return range * 2;
}

function directionToleranceDegrees(action: ActionDefinition, range: number): number {
  const radius = targetParameter(action, 'radius');
  const minimumFacingDot = targetParameter(action, 'minimumFacingDot');
  if (minimumFacingDot !== undefined) {
    return (2 * Math.acos(Math.max(-1, Math.min(1, minimumFacingDot))) * 180) / Math.PI;
  }
  if (radius !== undefined) return (2 * Math.atan(radius / range) * 180) / Math.PI;
  return 180;
}

function projectAction(action: ActionDefinition): ArenaWeaponPublicNumericProjection {
  const range = targetParameter(action, 'range');
  const maximumVerticalDifference = targetParameter(action, 'maximumVerticalDifference');
  if (range === undefined || maximumVerticalDifference === undefined) {
    throw new RangeError(`${action.id} 缺少 range 或 maximumVerticalDifference。`);
  }
  const horizontalImpulse = effectNumber(action, 'apply-directional-impulse', 'horizontalImpulse');
  const verticalImpulse = effectNumber(action, 'apply-directional-impulse', 'verticalImpulse');
  const hitstunTicks = effectNumber(action, 'apply-hitstun', 'ticks');
  const impactDistance = (horizontalImpulse ** 2)
    / (2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration);
  return Object.freeze({
    range,
    coverage: coverageWidth(action, range),
    windupTicks: action.timing.windupTicks,
    activeTicks: action.timing.activeTicks,
    recoveryTicks: action.timing.recoveryTicks,
    cooldownTicks: action.timing.cooldownTicks,
    impactDistance,
    verticalImpulse,
    hitstunTicks,
    selfMovementImpulse: 0,
    heightGap: maximumVerticalDifference,
    directionToleranceDegrees: directionToleranceDegrees(action, range),
  });
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
