import { createSynchronousStoragePort } from '../../storage/synchronous-storage-port.js';

export function createInputPilotStoragePort(value) {
  return createSynchronousStoragePort(value, { label: 'Pilot Storage' });
}
