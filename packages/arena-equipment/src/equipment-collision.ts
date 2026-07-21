import { assertPositiveFinite } from '@number-strategy-jump/arena-contracts';
import type { EquipmentPosition } from './equipment-runtime.js';

function assertPosition(value: unknown, name: string): Readonly<EquipmentPosition> {
  const position = value as Partial<EquipmentPosition> | null;
  if (
    !position
    || !Number.isFinite(position.x)
    || !Number.isFinite(position.y)
    || !Number.isFinite(position.z)
  ) throw new TypeError(`${name} 必须是有限三维位置。`);
  return position as EquipmentPosition;
}

export function equipmentPickupDistanceSquared(
  participantPosition: unknown,
  equipmentPosition: unknown,
): number {
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
  participantPosition: unknown,
  equipmentPosition: unknown,
  pickupRadius: unknown,
): boolean {
  const radius = assertPositiveFinite(pickupRadius, 'pickupRadius');
  return equipmentPickupDistanceSquared(participantPosition, equipmentPosition)
    <= radius * radius;
}
