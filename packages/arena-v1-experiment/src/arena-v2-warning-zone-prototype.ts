export type ArenaV2WarningZonePhase = 'telegraph' | 'active' | 'expired';

export interface ArenaV2WarningZoneDefinition {
  readonly id: string;
  readonly ownerId: string;
  readonly languageId: string;
  readonly center: Readonly<{ x: number; y: number; z: number }>;
  readonly radius: number;
  readonly maximumVerticalDifference: number;
  readonly startsAtTick: number;
  readonly activeTicks: number;
  readonly expiresAtTickExclusive: number;
}

export interface ArenaV2WarningZoneRuntime extends ArenaV2WarningZoneDefinition {
  readonly lastObservedTick: number;
  readonly phase: ArenaV2WarningZonePhase;
}

export interface ArenaV2WarningZonePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} 必须是有限数值。`);
  return value;
}

function positiveNumber(value: number, label: string): number {
  finiteNumber(value, label);
  if (value <= 0) throw new RangeError(`${label} 必须大于 0。`);
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} 必须是非负整数 tick。`);
  return value;
}

function phaseAtTick(
  tick: number,
  startsAtTick: number,
  expiresAtTickExclusive: number,
): ArenaV2WarningZonePhase {
  return tick < startsAtTick
    ? 'telegraph'
    : tick < expiresAtTickExclusive
      ? 'active'
      : 'expired';
}

export function createArenaV2WarningZoneRuntime(input: Readonly<{
  id: string;
  ownerId: string;
  languageId: string;
  center: ArenaV2WarningZonePoint;
  radius: number;
  maximumVerticalDifference: number;
  startsAtTick: number;
  activeTicks: number;
}>): ArenaV2WarningZoneRuntime {
  const startsAtTick = nonNegativeInteger(input.startsAtTick, 'startsAtTick');
  const activeTicks = positiveNumber(input.activeTicks, 'activeTicks');
  if (!Number.isInteger(activeTicks)) throw new RangeError('activeTicks 必须是正整数 tick。');
  const radius = positiveNumber(input.radius, 'radius');
  const maximumVerticalDifference = positiveNumber(
    input.maximumVerticalDifference,
    'maximumVerticalDifference',
  );
  const center = Object.freeze({
    x: finiteNumber(input.center.x, 'center.x'),
    y: finiteNumber(input.center.y, 'center.y'),
    z: finiteNumber(input.center.z, 'center.z'),
  });
  const expiresAtTickExclusive = startsAtTick + activeTicks;
  return Object.freeze({
    id: input.id,
    ownerId: input.ownerId,
    languageId: input.languageId,
    center,
    radius,
    maximumVerticalDifference,
    startsAtTick,
    activeTicks,
    expiresAtTickExclusive,
    lastObservedTick: -1,
    phase: 'telegraph',
  });
}

export function advanceArenaV2WarningZone(
  runtime: ArenaV2WarningZoneRuntime,
  tick: number,
): ArenaV2WarningZoneRuntime {
  nonNegativeInteger(tick, 'tick');
  if (tick !== runtime.lastObservedTick + 1) {
    throw new RangeError(
      `预警标记要求连续 tick：期望 ${runtime.lastObservedTick + 1}，实际 ${tick}。`,
    );
  }
  return Object.freeze({
    ...runtime,
    lastObservedTick: tick,
    phase: phaseAtTick(tick, runtime.startsAtTick, runtime.expiresAtTickExclusive),
  });
}

export function isArenaV2WarningZonePointInside(
  runtime: ArenaV2WarningZoneRuntime,
  point: ArenaV2WarningZonePoint,
): boolean {
  if (runtime.phase !== 'active') return false;
  return Math.hypot(point.x - runtime.center.x, point.z - runtime.center.z) <= runtime.radius
    && Math.abs(point.y - runtime.center.y) <= runtime.maximumVerticalDifference;
}
