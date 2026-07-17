import {
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
  SynchronousStorageLease,
} from '../../storage/synchronous-storage-lease.js';

export const INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION = (
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
);

/**
 * Pilot keeps its public class name and stored schema while sharing the
 * low-level synchronous storage ownership protocol with Stage 8 profiles.
 */
export class InputPilotStorageLease extends SynchronousStorageLease {
  constructor(options) {
    super({ ...options, label: 'InputPilotStorageLease' });
  }
}
