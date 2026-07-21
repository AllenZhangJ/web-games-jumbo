import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';

export function isEquipmentCooldownReady(remainingTicks) {
  return assertIntegerAtLeast(remainingTicks, 0, 'equipment cooldown') === 0;
}

export function advanceEquipmentCooldown(remainingTicks) {
  const current = assertIntegerAtLeast(remainingTicks, 0, 'equipment cooldown');
  return Math.max(0, current - 1);
}
