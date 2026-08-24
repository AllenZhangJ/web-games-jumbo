import {
  assertNonEmptyString,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  KZ_ROUTE_SURVIVAL_ROLE,
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  MODE_RESPAWN_ANCHOR_POLICY_KIND,
  MODE_ROLE,
  createRespawnPolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
} from './arena-v2-survival-respawn-capability-id-v1.js';

export const ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_SURVIVAL_FIRST_RESPAWN_DELAY_TICKS_CANDIDATE_V1 = 60 as const;
export const ARENA_V2_SURVIVAL_FIRST_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1 = 30 as const;

const ROUTES = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

const MAP_BINDINGS = Object.freeze(ROUTES.map((route) => {
  const anchor = route.anchors.find(({ id }) => (
    id === ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1
  ));
  if (anchor === undefined) {
    throw new RangeError(`Survival地图${route.mapDefinitionId}缺少统一首次复活安全锚。`);
  }
  const segment = route.segments.find(({ surfaceIds }) => surfaceIds.includes(anchor.surfaceId));
  if (segment === undefined || segment.survivalRole !== KZ_ROUTE_SURVIVAL_ROLE.SAFE) {
    throw new RangeError(`Survival地图${route.mapDefinitionId}首次复活锚必须位于安全路线段。`);
  }
  return Object.freeze({
    mapDefinitionId: route.mapDefinitionId,
    routeDefinitionId: route.id,
    anchorCapabilityId:
      ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
    anchorSurfaceId: anchor.surfaceId,
    safeSegmentId: segment.id,
  });
}));

export const ARENA_V2_SURVIVAL_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1 =
  createRespawnPolicyDefinition({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-policy.survival.respawn.first-fall.candidate.v1',
    contentVersion: 1,
    modeKind: MODE_KIND.SURVIVAL,
    rolePolicies: [{
      modeRole: MODE_ROLE.ENEMY,
      enabled: false,
      delayTicks: 0,
      maximumRespawns: 0,
      anchorPolicy: { kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED },
      protectionTicks: 0,
    }, {
      modeRole: MODE_ROLE.PLAYER,
      enabled: true,
      delayTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_DELAY_TICKS_CANDIDATE_V1,
      maximumRespawns: 1,
      anchorPolicy: {
        kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR,
        anchorCapabilityId:
          ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
      },
      protectionTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1,
    }],
  });

export const ARENA_V2_SURVIVAL_RESPAWN_POLICY_CONTENT_HASH_CANDIDATE_V1 =
  createDeterministicDataHash(
    ARENA_V2_SURVIVAL_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1,
    'Arena V2 Survival respawn policy candidate V1',
  );

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  balanceApprovalStatus: 'not-run' as const,
  hardGate: false as const,
  delayTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_DELAY_TICKS_CANDIDATE_V1,
  protectionTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1,
  maximumRespawns: 1 as const,
  terminalPlayerFallCount: 2 as const,
  anchorCapabilityId:
    ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
  respawnPolicyDefinition:
    ARENA_V2_SURVIVAL_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1,
  respawnPolicyContentHash:
    ARENA_V2_SURVIVAL_RESPAWN_POLICY_CONTENT_HASH_CANDIDATE_V1,
  mapBindings: MAP_BINDINGS,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Survival first respawn tuning candidate V1',
  ),
});

export function resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1(
  mapDefinitionIdValue: unknown,
): string {
  const mapDefinitionId = assertNonEmptyString(
    mapDefinitionIdValue,
    'Arena V2 Survival first respawn mapDefinitionId',
  );
  const binding = MAP_BINDINGS.find((candidate) => (
    candidate.mapDefinitionId === mapDefinitionId
  ));
  if (binding === undefined) {
    throw new RangeError(`Arena V2 Survival首次复活不支持地图${mapDefinitionId}。`);
  }
  return binding.anchorCapabilityId;
}
