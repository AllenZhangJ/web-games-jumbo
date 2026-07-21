export function toVisualPosition(position) {
  return Object.freeze({ x: -position.x, y: position.y, z: position.z });
}

export function toVisualFacing(facing) {
  return Object.freeze({ x: -facing.x, z: facing.z });
}

export function visualFacingYaw(facing) {
  return Math.atan2(-facing.x, facing.z);
}
