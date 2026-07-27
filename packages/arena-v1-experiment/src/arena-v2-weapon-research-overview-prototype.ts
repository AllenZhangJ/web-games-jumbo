import type { ArenaWeaponPublicNumericProjection } from '@number-strategy-jump/arena-definitions';
import {
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

export interface ArenaV2WeaponResearchOverviewRow {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly displayName: string;
  readonly languageId: string;
  readonly coreVerb: string;
  readonly hitResult: string;
  readonly mapSpaces: readonly string[];
  readonly counterplay: readonly string[];
  readonly stats: readonly ArenaV2WeaponResearchOverviewStat[];
  readonly behaviorStats: readonly ArenaV2WeaponResearchOverviewStat[];
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
  prototypes: readonly ArenaV2WeaponLaunchResearchDefinitionPrototype[],
  action: 'groundStats' | 'aerialStats',
  source: ProjectionKey,
): number {
  const maximum = Math.max(...prototypes.map((prototype) => prototype[action][source]));
  return Math.max(1, Math.ceil((maximum * 1.25) * 100) / 100);
}

function createStat(
  axisId: ArenaV2WeaponPublicAxisId,
  prototype: ArenaV2WeaponLaunchResearchDefinitionPrototype,
  action: 'groundStats' | 'aerialStats',
  prototypes: readonly ArenaV2WeaponLaunchResearchDefinitionPrototype[],
): ArenaV2WeaponResearchOverviewStat {
  const definition = ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.find(({ id }) => id === axisId);
  if (!definition) throw new RangeError(`研究武器概览引用未知数值轴：${axisId}`);
  const readout = readoutFor(axisId);
  const value = prototype[action][readout.source];
  return Object.freeze({
    id: axisId,
    label: definition.label,
    value,
    maxValue: maxValueFor(prototypes, action, readout.source),
    unit: readout.unit,
    direction: readout.direction,
    precision: readout.precision,
    playerMeaning: definition.playerMeaning,
  });
}

function behaviorStat(
  axisId: ArenaV2WeaponPublicAxisId,
  prototype: ArenaV2WeaponLaunchResearchDefinitionPrototype,
  action: 'groundStats' | 'aerialStats',
  prototypes: readonly ArenaV2WeaponLaunchResearchDefinitionPrototype[],
): ArenaV2WeaponResearchOverviewStat {
  const source: ProjectionKey = axisId === 'active-frames'
    ? 'activeTicks'
    : 'directionToleranceDegrees';
  const definition = ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.find(({ id }) => id === axisId);
  if (!definition) throw new RangeError(`研究武器行为概览引用未知数值轴：${axisId}`);
  const value = prototype[action][source];
  return Object.freeze({
    id: axisId,
    label: definition.label,
    value,
    maxValue: maxValueFor(prototypes, action, source),
    unit: axisId === 'direction-tolerance' ? '°' : 'tick',
    direction: 'higher-is-better',
    precision: axisId === 'direction-tolerance' ? 2 : 0,
    playerMeaning: definition.playerMeaning,
  });
}

function behaviorFingerprint(row: ArenaV2WeaponResearchOverviewRow): string {
  return row.stats.map(({ id, value }) => `${id}:${value}`).join('|')
    + row.behaviorStats.map(({ id, value }) => `${id}:${value}`).join('|');
}

export function createArenaV2WeaponResearchOverviewMatrix(): ArenaV2WeaponResearchOverviewMatrix {
  const prototypes = ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES;
  const rows = Object.freeze(prototypes.map((prototype) => Object.freeze({
    candidateId: prototype.candidateId,
    weaponId: prototype.weaponId,
    displayName: prototype.displayName,
    languageId: prototype.languageId,
    coreVerb: prototype.coreVerb,
    hitResult: HIT_RESULT_BY_LANGUAGE[prototype.languageId] ?? '命中后改变目标位置。',
    mapSpaces: prototype.mapSpaces,
    counterplay: prototype.counterplay,
    stats: Object.freeze(ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS.map((axisId) => (
      createStat(axisId, prototype, 'groundStats', prototypes)
    ))),
    behaviorStats: Object.freeze(['active-frames', 'direction-tolerance'].map((axisId) => (
      behaviorStat(axisId as ArenaV2WeaponPublicAxisId, prototype, 'groundStats', prototypes)
    ))),
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
