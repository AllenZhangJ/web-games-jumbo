import type { ArenaWeaponPublicNumericProjection } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
  type ArenaV2WeaponLaunchResearchDefinitionPrototype,
} from './arena-v2-weapon-launch-research-definition-prototype.js';

export type ArenaV2WeaponResearchOverviewDirection =
  | 'higher-is-better'
  | 'lower-is-better'
  | 'higher-is-risk';

export interface ArenaV2WeaponResearchOverviewStat {
  readonly id: ArenaV2WeaponPublicAxisId;
  readonly label: string;
  readonly value: number;
  readonly maxValue: number;
  readonly unit: '格' | 'tick' | '冲量' | '°';
  readonly direction: ArenaV2WeaponResearchOverviewDirection;
  readonly precision: number;
  readonly playerMeaning: string;
}

export type ArenaV2WeaponResearchOverviewContextId = 'ground' | 'aerial';

export interface ArenaV2WeaponResearchOverviewContext {
  readonly id: ArenaV2WeaponResearchOverviewContextId;
  readonly label: string;
  readonly stats: readonly ArenaV2WeaponResearchOverviewStat[];
  /** Context-only values keep height and state requirements visible without expanding the main axis set. */
  readonly contextStats: readonly ArenaV2WeaponResearchOverviewStat[];
  readonly behaviorStats: readonly ArenaV2WeaponResearchOverviewStat[];
}

export interface ArenaV2WeaponResearchOverviewProjectionPair {
  readonly groundStats: ArenaWeaponPublicNumericProjection;
  readonly aerialStats: ArenaWeaponPublicNumericProjection;
}

export interface ArenaV2WeaponResearchOverviewRow {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly displayName: string;
  readonly languageId: string;
  readonly coreVerb: string;
  readonly hitResult: string;
  readonly mapSpaces: readonly string[];
  readonly counterplay: readonly string[];
  /** Ground and aerial values stay separate so the overview cannot hide context changes. */
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
}

export interface ArenaV2WeaponResearchOverviewMatrix {
  readonly rows: readonly ArenaV2WeaponResearchOverviewRow[];
  readonly comparedAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly allRowsHaveComparableAxes: true;
  readonly allRowsHaveDistinctBehaviorFingerprint: true;
}

type ProjectionKey = keyof ArenaWeaponPublicNumericProjection;
interface AxisReadout {
  readonly source: ProjectionKey;
  readonly unit: ArenaV2WeaponResearchOverviewStat['unit'];
  readonly direction: ArenaV2WeaponResearchOverviewDirection;
  readonly precision: number;
}

interface ContextConfig {
  readonly id: ArenaV2WeaponResearchOverviewContextId;
  readonly label: string;
  readonly action: 'groundStats' | 'aerialStats';
}

const CONTEXT_CONFIGS: readonly ContextConfig[] = Object.freeze([
  Object.freeze({ id: 'ground', label: '地面动作', action: 'groundStats' }),
  Object.freeze({ id: 'aerial', label: '空中动作', action: 'aerialStats' }),
]);

const AXIS_READOUTS: Readonly<Record<string, AxisReadout>> = Object.freeze({
  range: Object.freeze({ source: 'range', unit: '格', direction: 'higher-is-better', precision: 2 }),
  coverage: Object.freeze({ source: 'coverage', unit: '格', direction: 'higher-is-better', precision: 2 }),
  startup: Object.freeze({ source: 'windupTicks', unit: 'tick', direction: 'lower-is-better', precision: 0 }),
  recovery: Object.freeze({ source: 'recoveryTicks', unit: 'tick', direction: 'lower-is-better', precision: 0 }),
  impact: Object.freeze({ source: 'impactDistance', unit: '格', direction: 'higher-is-better', precision: 2 }),
  vertical: Object.freeze({ source: 'verticalImpulse', unit: '冲量', direction: 'higher-is-better', precision: 2 }),
  control: Object.freeze({ source: 'hitstunTicks', unit: 'tick', direction: 'higher-is-better', precision: 0 }),
  'self-movement': Object.freeze({ source: 'selfMovementImpulse', unit: '冲量', direction: 'higher-is-risk', precision: 2 }),
  cooldown: Object.freeze({ source: 'cooldownTicks', unit: 'tick', direction: 'lower-is-better', precision: 0 }),
  'height-gap': Object.freeze({ source: 'heightGap', unit: '格', direction: 'higher-is-better', precision: 2 }),
});

const HIT_RESULT_BY_LANGUAGE: Readonly<Record<string, string>> = Object.freeze({
  'line-pressure': '远距离命中后改变目标路线位置。',
  'read-punish': '完成承诺后以较强垂直/横向控制惩罚等待目标。',
  flank: '读取目标朝向，从背后命中并改变边缘关系。',
});

function readoutFor(axisId: ArenaV2WeaponPublicAxisId): AxisReadout {
  const readout = AXIS_READOUTS[axisId];
  if (!readout) throw new RangeError(`研究武器概览缺少 ${axisId} 数值投影。`);
  return readout;
}

function maxValueFor(
  projections: readonly ArenaV2WeaponResearchOverviewProjectionPair[],
  source: ProjectionKey,
): number {
  const maximum = Math.max(...projections.flatMap(({ groundStats, aerialStats }) => (
    [groundStats[source], aerialStats[source]]
  )));
  return Math.max(1, Math.ceil((maximum * 1.25) * 100) / 100);
}

function createStat(
  axisId: ArenaV2WeaponPublicAxisId,
  projection: ArenaWeaponPublicNumericProjection,
  projections: readonly ArenaV2WeaponResearchOverviewProjectionPair[],
): ArenaV2WeaponResearchOverviewStat {
  const definition = ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.find(({ id }) => id === axisId);
  if (!definition) throw new RangeError(`研究武器概览引用未知数值轴：${axisId}`);
  const readout = readoutFor(axisId);
  const value = projection[readout.source];
  return Object.freeze({
    id: axisId,
    label: definition.label,
    value,
    maxValue: maxValueFor(projections, readout.source),
    unit: readout.unit,
    direction: readout.direction,
    precision: readout.precision,
    playerMeaning: definition.playerMeaning,
  });
}

function behaviorStat(
  axisId: ArenaV2WeaponPublicAxisId,
  projection: ArenaWeaponPublicNumericProjection,
  projections: readonly ArenaV2WeaponResearchOverviewProjectionPair[],
): ArenaV2WeaponResearchOverviewStat {
  const source: ProjectionKey = axisId === 'active-frames'
    ? 'activeTicks'
    : 'directionToleranceDegrees';
  const definition = ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.find(({ id }) => id === axisId);
  if (!definition) throw new RangeError(`研究武器行为概览引用未知数值轴：${axisId}`);
  const value = projection[source];
  return Object.freeze({
    id: axisId,
    label: definition.label,
    value,
    maxValue: maxValueFor(projections, source),
    unit: axisId === 'direction-tolerance' ? '°' : 'tick',
    direction: 'higher-is-better',
    precision: axisId === 'direction-tolerance' ? 2 : 0,
    playerMeaning: definition.playerMeaning,
  });
}

function behaviorFingerprint(row: ArenaV2WeaponResearchOverviewRow): string {
  return row.contexts.map(({ id, stats, behaviorStats }) => (
    `${id}:${stats.map(({ id: statId, value }) => `${statId}:${value}`).join('|')}`
      + behaviorStats.map(({ id: statId, value }) => `${statId}:${value}`).join('|')
  )).join('||');
}

function createContext(
  projection: ArenaWeaponPublicNumericProjection,
  config: ContextConfig,
  projections: readonly ArenaV2WeaponResearchOverviewProjectionPair[],
): ArenaV2WeaponResearchOverviewContext {
  return Object.freeze({
    id: config.id,
    label: config.label,
    stats: Object.freeze(ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS.map((axisId) => (
      createStat(axisId, projection, projections)
    ))),
    contextStats: Object.freeze(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS.map((axisId) => (
      createStat(axisId, projection, projections)
    ))),
    behaviorStats: Object.freeze(['active-frames', 'direction-tolerance'].map((axisId) => (
      behaviorStat(axisId as ArenaV2WeaponPublicAxisId, projection, projections)
    ))),
  });
}

export function createArenaV2WeaponResearchOverviewContexts(
  projectionPair: ArenaV2WeaponResearchOverviewProjectionPair,
  comparisonProjections: readonly ArenaV2WeaponResearchOverviewProjectionPair[] = [projectionPair],
): readonly ArenaV2WeaponResearchOverviewContext[] {
  return Object.freeze(CONTEXT_CONFIGS.map((config) => createContext(
    config.action === 'groundStats' ? projectionPair.groundStats : projectionPair.aerialStats,
    config,
    comparisonProjections,
  )));
}

export function createArenaV2WeaponResearchOverviewMatrix(): ArenaV2WeaponResearchOverviewMatrix {
  const prototypes = ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES;
  const projections = Object.freeze(prototypes.map(({ groundStats, aerialStats }) => (
    Object.freeze({ groundStats, aerialStats })
  )));
  const rows = Object.freeze(prototypes.map((prototype) => Object.freeze({
    candidateId: prototype.candidateId,
    weaponId: prototype.weaponId,
    displayName: prototype.displayName,
    languageId: prototype.languageId,
    coreVerb: prototype.coreVerb,
    hitResult: HIT_RESULT_BY_LANGUAGE[prototype.languageId] ?? '命中后改变目标位置。',
    mapSpaces: prototype.mapSpaces,
    counterplay: prototype.counterplay,
    contexts: createArenaV2WeaponResearchOverviewContexts(
      Object.freeze({ groundStats: prototype.groundStats, aerialStats: prototype.aerialStats }),
      projections,
    ),
  })));
  const fingerprints = new Set(rows.map(behaviorFingerprint));
  if (fingerprints.size !== rows.length) {
    throw new Error('研究武器概览的行为指纹不能重复，避免武器只剩外观差异。');
  }
  return Object.freeze({
    rows,
    comparedAxisIds: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS]),
    allRowsHaveComparableAxes: true,
    allRowsHaveDistinctBehaviorFingerprint: true,
  });
}
