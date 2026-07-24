import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';

export function isEquipmentCooldownReady(remainingTicks: unknown): boolean {
  return assertIntegerAtLeast(remainingTicks, 0, 'equipment cooldown') === 0;
}

export function advanceEquipmentCooldown(remainingTicks: unknown): number {
  const current = assertIntegerAtLeast(remainingTicks, 0, 'equipment cooldown');
  return Math.max(0, current - 1);
}
