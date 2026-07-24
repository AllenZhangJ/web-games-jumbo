export interface ArenaVisualPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ArenaVisualFacing {
  readonly x: number;
  readonly z: number;
}

function finiteAxis(value: unknown, axis: string, name: string): number {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, axis);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isFinite(descriptor.value)) {
    throw new TypeError(`${name}.${axis} 必须是有限数数据字段。`);
  }
  return descriptor.value as number;
}

export function toVisualPosition(position: unknown): Readonly<ArenaVisualPosition> {
  return Object.freeze({
    x: -finiteAxis(position, 'x', 'position'),
    y: finiteAxis(position, 'y', 'position'),
    z: finiteAxis(position, 'z', 'position'),
  });
}

export function toVisualFacing(facing: unknown): Readonly<ArenaVisualFacing> {
  return Object.freeze({
    x: -finiteAxis(facing, 'x', 'facing'),
    z: finiteAxis(facing, 'z', 'facing'),
  });
}

export function visualFacingYaw(facing: unknown): number {
  return Math.atan2(-finiteAxis(facing, 'x', 'facing'), finiteAxis(facing, 'z', 'facing'));
}
