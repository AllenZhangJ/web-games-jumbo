import {
  assertNonEmptyString,
  createDeterministicDataHash,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
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
  ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
} from './arena-v2-race-respawn-capability-id-v1.js';

export const ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_RACE_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1 = 30 as const;

const ROUTES = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

const MAP_BINDINGS = Object.freeze(ROUTES.map((route) => {
  const anchor = route.anchors.find(({ id }) => (
    id === ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1
  ));
  if (anchor === undefined) {
    throw new RangeError(`Race地图${route.mapDefinitionId}缺少统一重生兜底安全锚。`);
  }
  const firstSegment = route.segments[0];
  if (firstSegment === undefined
    || firstSegment.survivalRole !== KZ_ROUTE_SURVIVAL_ROLE.SAFE
    || !firstSegment.surfaceIds.includes(anchor.surfaceId)
    || firstSegment.respawnAnchorId
      !== ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1) {
    throw new RangeError(
      `Race地图${route.mapDefinitionId}重生兜底锚必须绑定第一条安全路线段。`,
    );
  }
  return Object.freeze({
    mapDefinitionId: route.mapDefinitionId,
    routeDefinitionId: route.id,
    anchorCapabilityId: ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
    anchorSurfaceId: anchor.surfaceId,
    safeSegmentId: firstSegment.id,
  });
}));

export const ARENA_V2_RACE_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1 =
  createRespawnPolicyDefinition({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-policy.race.respawn.latest-safe-anchor.candidate.v1',
    contentVersion: 1,
    modeKind: MODE_KIND.RACE,
    rolePolicies: [{
      modeRole: MODE_ROLE.COMPETITOR,
      enabled: true,
      delayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
      maximumRespawns: null,
      anchorPolicy: {
        kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR,
        fallbackAnchorCapabilityId:
          ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
      },
      protectionTicks: ARENA_V2_RACE_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1,
    }],
  });

export const ARENA_V2_RACE_RESPAWN_POLICY_CONTENT_HASH_CANDIDATE_V1 =
  createDeterministicDataHash(
    ARENA_V2_RACE_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1,
    'Arena V2 Race respawn policy candidate V1',
  );

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  protectionBalanceApprovalStatus: 'not-run' as const,
  hardGate: false as const,
  delayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  protectionTicks: ARENA_V2_RACE_RESPAWN_PROTECTION_TICKS_CANDIDATE_V1,
  maximumRespawns: null,
  anchorCapabilityId: ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
  respawnPolicyDefinition: ARENA_V2_RACE_RESPAWN_POLICY_DEFINITION_CANDIDATE_V1,
  respawnPolicyContentHash: ARENA_V2_RACE_RESPAWN_POLICY_CONTENT_HASH_CANDIDATE_V1,
  mapBindings: MAP_BINDINGS,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Race respawn tuning candidate V1',
  ),
});

export function resolveArenaV2RaceRespawnFallbackAnchorCandidateV1(
  mapDefinitionIdValue: unknown,
): string {
  const mapDefinitionId = assertNonEmptyString(
    mapDefinitionIdValue,
    'Arena V2 Race respawn mapDefinitionId',
  );
  const binding = MAP_BINDINGS.find((candidate) => candidate.mapDefinitionId === mapDefinitionId);
  if (binding === undefined) {
    throw new RangeError(`Arena V2 Race重生兜底不支持地图${mapDefinitionId}。`);
  }
  return binding.anchorCapabilityId;
}
