import { createSynchronousStoragePort } from '@number-strategy-jump/arena-contracts';

export function createInputPilotStoragePort(value) {
  return createSynchronousStoragePort(value, { label: 'Pilot Storage' });
}
