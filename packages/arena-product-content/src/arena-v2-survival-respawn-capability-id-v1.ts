/**
 * Shared semantic capability used by every launch Survival map. The concrete
 * position remains map-owned; Mode policy and runtime only exchange this ID.
 */
export const ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1 =
  'arena-v2.map-capability.survival-player-respawn-safe-anchor.candidate.v1' as const;
