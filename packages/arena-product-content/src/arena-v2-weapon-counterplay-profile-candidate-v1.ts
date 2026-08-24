import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  WeaponFailureRiskV1,
  WeaponMapSituationV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';

export const ARENA_V2_WEAPON_COUNTERPLAY_PROFILE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_COUNTERPLAY_THREAT_BAND_CANDIDATE_V1 = Object.freeze({
  CLOSE: 'close',
  MID: 'mid',
  LONG: 'long',
} as const);

export const ARENA_V2_COUNTERPLAY_RESPONSE_CANDIDATE_V1 = Object.freeze({
  RETREAT: 'retreat',
  CLOSE_INSIDE: 'close-inside',
  SIDESTEP_LINE: 'sidestep-line',
  CROSS_FACING: 'cross-facing',
  JUMP_AWAY: 'jump-away',
  JUMP_TOWARD: 'jump-toward',
  CHANGE_HEIGHT: 'change-height',
} as const);

export const ARENA_V2_COUNTERPLAY_PUNISH_CUE_CANDIDATE_V1 = Object.freeze({
  WHIFF_RECOVERY: 'whiff-recovery',
  OVERSHOOT_RECOVERY: 'overshoot-recovery',
  LANDING_RECOVERY: 'landing-recovery',
  HOLD_RELEASE: 'hold-release',
  FACING_RESET: 'facing-reset',
  COOLDOWN_GAP: 'cooldown-gap',
} as const);

export const ARENA_V2_COUNTERPLAY_ROUTE_RESPONSE_CANDIDATE_V1 = Object.freeze({
  LEAVE_EDGE: 'leave-edge',
  EXIT_NARROW_PATH: 'exit-narrow-path',
  TAKE_HEIGHT: 'take-height',
  CROSS_PLATFORM_ENTRY: 'cross-platform-entry',
  RESET_GAP: 'reset-gap',
  HOLD_OPEN_CENTER: 'hold-open-center',
} as const);

export type ArenaV2CounterplayThreatBandCandidateV1 =
  typeof ARENA_V2_COUNTERPLAY_THREAT_BAND_CANDIDATE_V1[
    keyof typeof ARENA_V2_COUNTERPLAY_THREAT_BAND_CANDIDATE_V1
  ];
export type ArenaV2CounterplayResponseCandidateV1 =
  typeof ARENA_V2_COUNTERPLAY_RESPONSE_CANDIDATE_V1[
    keyof typeof ARENA_V2_COUNTERPLAY_RESPONSE_CANDIDATE_V1
  ];
export type ArenaV2CounterplayPunishCueCandidateV1 =
  typeof ARENA_V2_COUNTERPLAY_PUNISH_CUE_CANDIDATE_V1[
    keyof typeof ARENA_V2_COUNTERPLAY_PUNISH_CUE_CANDIDATE_V1
  ];
export type ArenaV2CounterplayRouteResponseCandidateV1 =
  typeof ARENA_V2_COUNTERPLAY_ROUTE_RESPONSE_CANDIDATE_V1[
    keyof typeof ARENA_V2_COUNTERPLAY_ROUTE_RESPONSE_CANDIDATE_V1
  ];

export interface ArenaV2WeaponCounterplayProfileCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_WEAPON_COUNTERPLAY_PROFILE_CANDIDATE_V1_SCHEMA_VERSION;
  readonly profileId: string;
  readonly weaponId: string;
  readonly collectionOrder: number;
  readonly equipmentDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly learningProblem: string;
  readonly threatBand: ArenaV2CounterplayThreatBandCandidateV1;
  readonly groundThreatDistance: number;
  readonly aerialThreatDistance: number;
  readonly preferredMinimumDistance: number;
  readonly preferredMaximumDistance: number;
  readonly groundResponse: ArenaV2CounterplayResponseCandidateV1;
  readonly aerialResponse: ArenaV2CounterplayResponseCandidateV1;
  readonly groundFailureRisk: WeaponFailureRiskV1;
  readonly aerialFailureRisk: WeaponFailureRiskV1;
  readonly punishCue: ArenaV2CounterplayPunishCueCandidateV1;
  readonly primaryMapSituation: WeaponMapSituationV1;
  readonly routeResponse: ArenaV2CounterplayRouteResponseCandidateV1;
  readonly counterplaySignature: string;
  readonly contentHash: string;
}

interface CounterplaySpec {
  readonly weaponId: string;
  readonly threatBand: ArenaV2CounterplayThreatBandCandidateV1;
  readonly groundResponse: ArenaV2CounterplayResponseCandidateV1;
  readonly aerialResponse: ArenaV2CounterplayResponseCandidateV1;
  readonly punishCue: ArenaV2CounterplayPunishCueCandidateV1;
  readonly routeResponse: ArenaV2CounterplayRouteResponseCandidateV1;
}

const B = ARENA_V2_COUNTERPLAY_THREAT_BAND_CANDIDATE_V1;
const R = ARENA_V2_COUNTERPLAY_RESPONSE_CANDIDATE_V1;
const P = ARENA_V2_COUNTERPLAY_PUNISH_CUE_CANDIDATE_V1;
const M = ARENA_V2_COUNTERPLAY_ROUTE_RESPONSE_CANDIDATE_V1;

const SPECS: readonly CounterplaySpec[] = Object.freeze([
  {
    weaponId: 'charge-shield', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.RETREAT,
    punishCue: P.OVERSHOOT_RECOVERY, routeResponse: M.CROSS_PLATFORM_ENTRY,
  },
  {
    weaponId: 'heavy-hammer', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.JUMP_AWAY,
    punishCue: P.WHIFF_RECOVERY, routeResponse: M.HOLD_OPEN_CENTER,
  },
  {
    weaponId: 'gravity-chain', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.FACING_RESET, routeResponse: M.EXIT_NARROW_PATH,
  },
  {
    weaponId: 'line-suppressor', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.JUMP_TOWARD,
    punishCue: P.COOLDOWN_GAP, routeResponse: M.TAKE_HEIGHT,
  },
  {
    weaponId: 'read-counter', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.HOLD_RELEASE, routeResponse: M.RESET_GAP,
  },
  {
    weaponId: 'flank-blade', threatBand: B.CLOSE,
    groundResponse: R.CROSS_FACING, aerialResponse: R.RETREAT,
    punishCue: P.FACING_RESET, routeResponse: M.HOLD_OPEN_CENTER,
  },
  {
    weaponId: 'hook-spear', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.JUMP_TOWARD,
    punishCue: P.FACING_RESET, routeResponse: M.RESET_GAP,
  },
  {
    weaponId: 'burst-gauntlet', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.RETREAT,
    punishCue: P.COOLDOWN_GAP, routeResponse: M.EXIT_NARROW_PATH,
  },
  {
    weaponId: 'vault-lance', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.JUMP_AWAY,
    punishCue: P.OVERSHOOT_RECOVERY, routeResponse: M.LEAVE_EDGE,
  },
  {
    weaponId: 'scatter-cannon', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.COOLDOWN_GAP, routeResponse: M.CROSS_PLATFORM_ENTRY,
  },
  {
    weaponId: 'sky-anchor', threatBand: B.CLOSE,
    groundResponse: R.CLOSE_INSIDE, aerialResponse: R.SIDESTEP_LINE,
    punishCue: P.LANDING_RECOVERY, routeResponse: M.TAKE_HEIGHT,
  },
  {
    weaponId: 'edge-scythe', threatBand: B.CLOSE,
    groundResponse: R.CLOSE_INSIDE, aerialResponse: R.JUMP_TOWARD,
    punishCue: P.WHIFF_RECOVERY, routeResponse: M.HOLD_OPEN_CENTER,
  },
  {
    weaponId: 'rebound-hook', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CROSS_FACING,
    punishCue: P.WHIFF_RECOVERY, routeResponse: M.LEAVE_EDGE,
  },
  {
    weaponId: 'pulse-baton', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.COOLDOWN_GAP, routeResponse: M.RESET_GAP,
  },
  {
    weaponId: 'siege-axe', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.JUMP_AWAY,
    punishCue: P.WHIFF_RECOVERY, routeResponse: M.LEAVE_EDGE,
  },
  {
    weaponId: 'twin-fan', threatBand: B.CLOSE,
    groundResponse: R.CLOSE_INSIDE, aerialResponse: R.CROSS_FACING,
    punishCue: P.COOLDOWN_GAP, routeResponse: M.CROSS_PLATFORM_ENTRY,
  },
  {
    weaponId: 'diving-claw', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.RETREAT,
    punishCue: P.LANDING_RECOVERY, routeResponse: M.TAKE_HEIGHT,
  },
  {
    weaponId: 'route-bow', threatBand: B.MID,
    groundResponse: R.SIDESTEP_LINE, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.FACING_RESET, routeResponse: M.CROSS_PLATFORM_ENTRY,
  },
  {
    weaponId: 'pivot-blade', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CROSS_FACING,
    punishCue: P.FACING_RESET, routeResponse: M.EXIT_NARROW_PATH,
  },
  {
    weaponId: 'commitment-fist', threatBand: B.LONG,
    groundResponse: R.RETREAT, aerialResponse: R.CHANGE_HEIGHT,
    punishCue: P.HOLD_RELEASE, routeResponse: M.HOLD_OPEN_CENTER,
  },
]);

const BAND_MULTIPLIERS = Object.freeze({
  [B.CLOSE]: Object.freeze({ minimum: 0.28, maximum: 0.68 }),
  [B.MID]: Object.freeze({ minimum: 0.92, maximum: 1.18 }),
  [B.LONG]: Object.freeze({ minimum: 1.12, maximum: 1.52 }),
});

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function threatDistance(action: ActionDefinition, name: string): number {
  const parameters = action.targeting.parameters as Readonly<Record<string, unknown>>;
  const range = parameters.range;
  if (typeof range !== 'number' || !Number.isFinite(range) || range <= 0) {
    throw new RangeError(`${name}缺少有限正数targeting.parameters.range。`);
  }
  return range;
}

function createProfile(
  spec: CounterplaySpec,
): ArenaV2WeaponCounterplayProfileCandidateV1 {
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => (
    id === spec.weaponId
  ));
  if (!weapon) throw new RangeError(`反制档案引用未知武器${spec.weaponId}。`);
  const groundContext = weapon.grammar.contexts[0];
  const aerialContext = weapon.grammar.contexts[1];
  const groundAction = weapon.actions.find(({ id }) => id === groundContext?.actionDefinitionId);
  const aerialAction = weapon.actions.find(({ id }) => id === aerialContext?.actionDefinitionId);
  if (
    groundContext?.kind !== 'ground'
    || aerialContext?.kind !== 'aerial'
    || !groundAction
    || !aerialAction
  ) throw new RangeError(`反制档案${spec.weaponId}缺少闭合的地面/空中动作。`);
  const groundThreatDistance = threatDistance(groundAction, `${spec.weaponId}.ground`);
  const aerialThreatDistance = threatDistance(aerialAction, `${spec.weaponId}.aerial`);
  const maximumThreatDistance = Math.max(groundThreatDistance, aerialThreatDistance);
  const multiplier = BAND_MULTIPLIERS[spec.threatBand];
  const primaryMapSituation = groundContext.mapSituations[0];
  if (!primaryMapSituation) throw new RangeError(`反制档案${spec.weaponId}缺少地图场景。`);
  const counterplaySignature = [
    spec.threatBand,
    spec.groundResponse,
    spec.aerialResponse,
    spec.punishCue,
    spec.routeResponse,
  ].join(':');
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_WEAPON_COUNTERPLAY_PROFILE_CANDIDATE_V1_SCHEMA_VERSION,
    profileId: `arena-v2.weapon-counterplay.${spec.weaponId}.candidate.v1`,
    weaponId: weapon.id,
    collectionOrder: weapon.collectionOrder,
    equipmentDefinitionId: weapon.equipment.id,
    groundActionDefinitionId: groundAction.id,
    aerialActionDefinitionId: aerialAction.id,
    learningProblem: weapon.learningProblem,
    threatBand: spec.threatBand,
    groundThreatDistance,
    aerialThreatDistance,
    preferredMinimumDistance: rounded(maximumThreatDistance * multiplier.minimum),
    preferredMaximumDistance: rounded(maximumThreatDistance * multiplier.maximum),
    groundResponse: spec.groundResponse,
    aerialResponse: spec.aerialResponse,
    groundFailureRisk: groundContext.failureRisk,
    aerialFailureRisk: aerialContext.failureRisk,
    punishCue: spec.punishCue,
    primaryMapSituation,
    routeResponse: spec.routeResponse,
    counterplaySignature,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      `Arena V2 weapon counterplay profile ${spec.weaponId}`,
    ),
  });
}

function assertClosure(
  profiles: readonly ArenaV2WeaponCounterplayProfileCandidateV1[],
): void {
  if (SPECS.length !== 20 || profiles.length !== 20) {
    throw new RangeError('Arena V2武器反制档案必须精确覆盖20把收藏武器。');
  }
  const collectionIds: readonly string[] = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(
    ({ id }) => id,
  );
  const profileIds = profiles.map(({ weaponId }) => weaponId);
  if (new Set(profileIds).size !== 20 || profileIds.some((id) => !collectionIds.includes(id))) {
    throw new RangeError('Arena V2武器反制档案存在重复或未知武器。');
  }
  if (collectionIds.some((id) => !profileIds.includes(id))) {
    throw new RangeError('Arena V2武器反制档案未闭合收藏目录。');
  }
  if (new Set(profiles.map(({ counterplaySignature }) => counterplaySignature)).size !== 20) {
    throw new RangeError('Arena V2的20把武器必须具有不同反制签名。');
  }
  profiles.forEach((profile) => {
    if (
      profile.preferredMinimumDistance <= 0
      || profile.preferredMaximumDistance <= profile.preferredMinimumDistance
    ) throw new RangeError(`Arena V2反制档案${profile.weaponId}距离窗口无效。`);
  });
}

export const ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1 = Object.freeze(
  SPECS.map(createProfile).sort((left, right) => left.collectionOrder - right.collectionOrder),
);

assertClosure(ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1);

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_WEAPON_COUNTERPLAY_PROFILE_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  collectionWeaponCount: 20 as const,
  addsInput: false as const,
  permittedInputConcepts: Object.freeze(['direction', 'jump', 'primary'] as const),
  profiles: ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_WEAPON_COUNTERPLAY_PROFILE_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Weapon Counterplay Profile Catalog Candidate V1',
  ),
});
