import { assertPositiveFinite } from '@number-strategy-jump/arena-contracts';

function assertPosition(value, name) {
  if (
    !value
    || !Number.isFinite(value.x)
    || !Number.isFinite(value.y)
    || !Number.isFinite(value.z)
  ) throw new TypeError(`${name} 必须是有限三维位置。`);
  return value;
}

export function equipmentPickupDistanceSquared(participantPosition, equipmentPosition) {
  const participant = assertPosition(participantPosition, 'participantPosition');
  const equipment = assertPosition(equipmentPosition, 'equipmentPosition');
  const dx = participant.x - equipment.x;
  const dy = participant.y - equipment.y;
  const dz = participant.z - equipment.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (!Number.isFinite(distanceSquared)) throw new RangeError('equipment pickup 距离超出有限范围。');
  return distanceSquared;
}

export function isWithinEquipmentPickupRadius(
  participantPosition,
  equipmentPosition,
  pickupRadius,
) {
  assertPositiveFinite(pickupRadius, 'pickupRadius');
  return equipmentPickupDistanceSquared(participantPosition, equipmentPosition)
    <= pickupRadius * pickupRadius;
}
