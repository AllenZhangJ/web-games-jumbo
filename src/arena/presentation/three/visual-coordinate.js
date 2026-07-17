export function toVisualPosition(position) {
  return Object.freeze({ x: -position.x, y: position.y, z: position.z });
}

export function toVisualFacing(facing) {
  return Object.freeze({ x: -facing.x, z: facing.z });
}

export function visualFacingYaw(facing) {
  const visual = toVisualFacing(facing);
  return Math.atan2(visual.x, visual.z);
}
