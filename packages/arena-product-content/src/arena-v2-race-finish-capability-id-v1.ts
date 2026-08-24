/**
 * Shared semantic finish capability implemented by every launch Race map.
 * Each map keeps its own concrete KZ route finish anchor and exposes an
 * explicit binding from this capability to that anchor.
 */
export const ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1 =
  'arena-v2.map-capability.race-finish-gate.candidate.v1' as const;
