import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';

export const WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION = 1 as const;

export const WEAPON_COUNTERPLAY_THREAT_BAND_V1 = Object.freeze({
  CLOSE: 'close',
  MID: 'mid',
  LONG: 'long',
} as const);

export const WEAPON_COUNTERPLAY_RESPONSE_V1 = Object.freeze({
  RETREAT: 'retreat',
  CLOSE_INSIDE: 'close-inside',
  SIDESTEP_LINE: 'sidestep-line',
  CROSS_FACING: 'cross-facing',
  JUMP_AWAY: 'jump-away',
  JUMP_TOWARD: 'jump-toward',
  CHANGE_HEIGHT: 'change-height',
} as const);

export const WEAPON_COUNTERPLAY_PUNISH_CUE_V1 = Object.freeze({
  WHIFF_RECOVERY: 'whiff-recovery',
  OVERSHOOT_RECOVERY: 'overshoot-recovery',
  LANDING_RECOVERY: 'landing-recovery',
  HOLD_RELEASE: 'hold-release',
  FACING_RESET: 'facing-reset',
  COOLDOWN_GAP: 'cooldown-gap',
} as const);

export const WEAPON_COUNTERPLAY_ROUTE_RESPONSE_V1 = Object.freeze({
  LEAVE_EDGE: 'leave-edge',
  EXIT_NARROW_PATH: 'exit-narrow-path',
  TAKE_HEIGHT: 'take-height',
  CROSS_PLATFORM_ENTRY: 'cross-platform-entry',
  RESET_GAP: 'reset-gap',
  HOLD_OPEN_CENTER: 'hold-open-center',
} as const);

export const WEAPON_COUNTERPLAY_ROUTE_TRAVERSAL_V1 = Object.freeze({
  WALK: 'walk',
  JUMP: 'jump',
} as const);

export const WEAPON_COUNTERPLAY_ACTION_PHASE_V1 = Object.freeze({
  IDLE: 'idle',
  WINDUP: 'windup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
} as const);

export type WeaponCounterplayThreatBandV1 = typeof WEAPON_COUNTERPLAY_THREAT_BAND_V1[
  keyof typeof WEAPON_COUNTERPLAY_THREAT_BAND_V1
];
export type WeaponCounterplayResponseV1 = typeof WEAPON_COUNTERPLAY_RESPONSE_V1[
  keyof typeof WEAPON_COUNTERPLAY_RESPONSE_V1
];
export type WeaponCounterplayPunishCueV1 = typeof WEAPON_COUNTERPLAY_PUNISH_CUE_V1[
  keyof typeof WEAPON_COUNTERPLAY_PUNISH_CUE_V1
];
export type WeaponCounterplayRouteResponseV1 = typeof WEAPON_COUNTERPLAY_ROUTE_RESPONSE_V1[
  keyof typeof WEAPON_COUNTERPLAY_ROUTE_RESPONSE_V1
];
export type WeaponCounterplayRouteTraversalV1 = typeof WEAPON_COUNTERPLAY_ROUTE_TRAVERSAL_V1[
  keyof typeof WEAPON_COUNTERPLAY_ROUTE_TRAVERSAL_V1
];
export type WeaponCounterplayActionPhaseV1 = typeof WEAPON_COUNTERPLAY_ACTION_PHASE_V1[
  keyof typeof WEAPON_COUNTERPLAY_ACTION_PHASE_V1
];

export interface WeaponCounterplayProbeProfileV1 {
  readonly schemaVersion: typeof WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION;
  readonly profileId: string;
  readonly equipmentDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly threatBand: WeaponCounterplayThreatBandV1;
  readonly preferredMinimumDistance: number;
  readonly preferredMaximumDistance: number;
  readonly groundResponse: WeaponCounterplayResponseV1;
  readonly aerialResponse: WeaponCounterplayResponseV1;
  readonly punishCue: WeaponCounterplayPunishCueV1;
  readonly routeResponse: WeaponCounterplayRouteResponseV1;
}

export interface WeaponCounterplayProbeVector3V1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WeaponCounterplayProbeObservationV1 {
  readonly schemaVersion: typeof WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly participantId: string;
  readonly opponentParticipantId: string;
  readonly self: Readonly<{
    position: WeaponCounterplayProbeVector3V1;
    grounded: boolean;
    jumpAvailable: boolean;
    primaryReady: boolean;
    primaryRange: number;
  }>;
  readonly opponent: Readonly<{
    position: WeaponCounterplayProbeVector3V1;
    facingX: number;
    facingZ: number;
    actionDefinitionId: string | null;
    actionPhase: WeaponCounterplayActionPhaseV1;
  }>;
  readonly routeTargets: readonly WeaponCounterplayProbeRouteTargetV1[];
}

export interface WeaponCounterplayProbeRouteTargetV1 {
  readonly targetId: string;
  readonly position: WeaponCounterplayProbeVector3V1;
  readonly responseKinds: readonly WeaponCounterplayRouteResponseV1[];
  readonly traversal: WeaponCounterplayRouteTraversalV1;
  readonly priority: number;
}

const PROFILE_KEYS = new Set([
  'schemaVersion', 'profileId', 'equipmentDefinitionId', 'groundActionDefinitionId',
  'aerialActionDefinitionId', 'threatBand', 'preferredMinimumDistance',
  'preferredMaximumDistance', 'groundResponse', 'aerialResponse', 'punishCue',
  'routeResponse',
]);
const OBSERVATION_KEYS = new Set([
  'schemaVersion', 'tick', 'participantId', 'opponentParticipantId', 'self', 'opponent',
  'routeTargets',
]);
const SELF_KEYS = new Set([
  'position', 'grounded', 'jumpAvailable', 'primaryReady', 'primaryRange',
]);
const OPPONENT_KEYS = new Set([
  'position', 'facingX', 'facingZ', 'actionDefinitionId', 'actionPhase',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const ROUTE_TARGET_KEYS = new Set([
  'targetId', 'position', 'responseKinds', 'traversal', 'priority',
]);
const THREAT_BANDS: ReadonlySet<unknown> = new Set(
  Object.values(WEAPON_COUNTERPLAY_THREAT_BAND_V1),
);
const RESPONSES: ReadonlySet<unknown> = new Set(Object.values(WEAPON_COUNTERPLAY_RESPONSE_V1));
const PUNISH_CUES: ReadonlySet<unknown> = new Set(
  Object.values(WEAPON_COUNTERPLAY_PUNISH_CUE_V1),
);
const ROUTE_RESPONSES: ReadonlySet<unknown> = new Set(
  Object.values(WEAPON_COUNTERPLAY_ROUTE_RESPONSE_V1),
);
const ROUTE_TRAVERSALS: ReadonlySet<unknown> = new Set(
  Object.values(WEAPON_COUNTERPLAY_ROUTE_TRAVERSAL_V1),
);
const ACTION_PHASES: ReadonlySet<unknown> = new Set(
  Object.values(WEAPON_COUNTERPLAY_ACTION_PHASE_V1),
);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是布尔值。`);
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
): T {
  if (!values.has(value)) throw new RangeError(`${name}不受支持：${String(value)}。`);
  return value as T;
}

function vector(value: unknown, name: string): WeaponCounterplayProbeVector3V1 {
  exactRecord(value, VECTOR_KEYS, name);
  return Object.freeze({
    x: finite(value.x, `${name}.x`),
    y: finite(value.y, `${name}.y`),
    z: finite(value.z, `${name}.z`),
  });
}

export function createWeaponCounterplayProbeProfileV1(
  value: unknown,
): WeaponCounterplayProbeProfileV1 {
  const source = cloneFrozenData(value, 'WeaponCounterplayProbeProfileV1');
  exactRecord(source, PROFILE_KEYS, 'WeaponCounterplayProbeProfileV1');
  if (source.schemaVersion !== WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION) {
    throw new RangeError('WeaponCounterplayProbeProfileV1.schemaVersion必须是1。');
  }
  const preferredMinimumDistance = assertPositiveFinite(
    source.preferredMinimumDistance,
    'WeaponCounterplayProbeProfileV1.preferredMinimumDistance',
  );
  const preferredMaximumDistance = assertPositiveFinite(
    source.preferredMaximumDistance,
    'WeaponCounterplayProbeProfileV1.preferredMaximumDistance',
  );
  if (preferredMaximumDistance <= preferredMinimumDistance) {
    throw new RangeError('WeaponCounterplayProbeProfileV1偏好距离上界必须大于下界。');
  }
  return Object.freeze({
    schemaVersion: WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION,
    profileId: assertNonEmptyString(source.profileId, 'WeaponCounterplayProbeProfileV1.profileId'),
    equipmentDefinitionId: assertNonEmptyString(
      source.equipmentDefinitionId,
      'WeaponCounterplayProbeProfileV1.equipmentDefinitionId',
    ),
    groundActionDefinitionId: assertNonEmptyString(
      source.groundActionDefinitionId,
      'WeaponCounterplayProbeProfileV1.groundActionDefinitionId',
    ),
    aerialActionDefinitionId: assertNonEmptyString(
      source.aerialActionDefinitionId,
      'WeaponCounterplayProbeProfileV1.aerialActionDefinitionId',
    ),
    threatBand: enumValue<WeaponCounterplayThreatBandV1>(
      source.threatBand,
      THREAT_BANDS,
      'WeaponCounterplayProbeProfileV1.threatBand',
    ),
    preferredMinimumDistance,
    preferredMaximumDistance,
    groundResponse: enumValue<WeaponCounterplayResponseV1>(
      source.groundResponse,
      RESPONSES,
      'WeaponCounterplayProbeProfileV1.groundResponse',
    ),
    aerialResponse: enumValue<WeaponCounterplayResponseV1>(
      source.aerialResponse,
      RESPONSES,
      'WeaponCounterplayProbeProfileV1.aerialResponse',
    ),
    punishCue: enumValue<WeaponCounterplayPunishCueV1>(
      source.punishCue,
      PUNISH_CUES,
      'WeaponCounterplayProbeProfileV1.punishCue',
    ),
    routeResponse: enumValue<WeaponCounterplayRouteResponseV1>(
      source.routeResponse,
      ROUTE_RESPONSES,
      'WeaponCounterplayProbeProfileV1.routeResponse',
    ),
  });
}

function canonicalRouteTargetOrder(
  left: WeaponCounterplayProbeRouteTargetV1,
  right: WeaponCounterplayProbeRouteTargetV1,
): number {
  return right.priority - left.priority
    || (left.targetId < right.targetId ? -1 : left.targetId > right.targetId ? 1 : 0);
}

export function createWeaponCounterplayProbeObservationV1(
  value: unknown,
): WeaponCounterplayProbeObservationV1 {
  const source = cloneFrozenData(value, 'WeaponCounterplayProbeObservationV1');
  exactRecord(source, OBSERVATION_KEYS, 'WeaponCounterplayProbeObservationV1');
  if (source.schemaVersion !== WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION) {
    throw new RangeError('WeaponCounterplayProbeObservationV1.schemaVersion必须是1。');
  }
  exactRecord(source.self, SELF_KEYS, 'WeaponCounterplayProbeObservationV1.self');
  exactRecord(source.opponent, OPPONENT_KEYS, 'WeaponCounterplayProbeObservationV1.opponent');
  const participantId = assertNonEmptyString(
    source.participantId,
    'WeaponCounterplayProbeObservationV1.participantId',
  );
  const opponentParticipantId = assertNonEmptyString(
    source.opponentParticipantId,
    'WeaponCounterplayProbeObservationV1.opponentParticipantId',
  );
  if (participantId === opponentParticipantId) {
    throw new RangeError('WeaponCounterplayProbeObservationV1不能观察自己为对手。');
  }
  const facingX = finite(
    source.opponent.facingX,
    'WeaponCounterplayProbeObservationV1.opponent.facingX',
  );
  const facingZ = finite(
    source.opponent.facingZ,
    'WeaponCounterplayProbeObservationV1.opponent.facingZ',
  );
  if (Math.hypot(facingX, facingZ) > 1.000001) {
    throw new RangeError('WeaponCounterplayProbeObservationV1对手朝向长度不能超过1。');
  }
  if (!Array.isArray(source.routeTargets) || source.routeTargets.length > 6) {
    throw new RangeError('WeaponCounterplayProbeObservationV1.routeTargets必须是最多6项的数组。');
  }
  const routeTargetIds = new Set<string>();
  const routeTargets = source.routeTargets.map((entry, index) => {
    const name = `WeaponCounterplayProbeObservationV1.routeTargets[${index}]`;
    exactRecord(entry, ROUTE_TARGET_KEYS, name);
    const targetId = assertNonEmptyString(entry.targetId, `${name}.targetId`);
    if (routeTargetIds.has(targetId)) throw new RangeError(`${name}.targetId重复。`);
    routeTargetIds.add(targetId);
    if (!Array.isArray(entry.responseKinds) || entry.responseKinds.length === 0) {
      throw new RangeError(`${name}.responseKinds至少需要1项。`);
    }
    const responseKinds = entry.responseKinds.map((response, responseIndex) => (
      enumValue<WeaponCounterplayRouteResponseV1>(
        response,
        ROUTE_RESPONSES,
        `${name}.responseKinds[${responseIndex}]`,
      )
    ));
    if (new Set(responseKinds).size !== responseKinds.length) {
      throw new RangeError(`${name}.responseKinds不能重复。`);
    }
    const priority = assertIntegerAtLeast(entry.priority, 0, `${name}.priority`);
    if (priority > 100) throw new RangeError(`${name}.priority不能超过100。`);
    return Object.freeze({
      targetId,
      position: vector(entry.position, `${name}.position`),
      responseKinds: Object.freeze(responseKinds),
      traversal: enumValue<WeaponCounterplayRouteTraversalV1>(
        entry.traversal,
        ROUTE_TRAVERSALS,
        `${name}.traversal`,
      ),
      priority,
    });
  });
  const canonicalRouteTargets = [...routeTargets].sort(canonicalRouteTargetOrder);
  if (routeTargets.some((target, index) => (
    target.targetId !== canonicalRouteTargets[index]!.targetId
  ))) throw new RangeError('WeaponCounterplayProbeObservationV1.routeTargets顺序不规范。');
  return Object.freeze({
    schemaVersion: WEAPON_COUNTERPLAY_PROBE_V1_SCHEMA_VERSION,
    tick: assertIntegerAtLeast(source.tick, 0, 'WeaponCounterplayProbeObservationV1.tick'),
    participantId,
    opponentParticipantId,
    self: Object.freeze({
      position: vector(source.self.position, 'WeaponCounterplayProbeObservationV1.self.position'),
      grounded: booleanValue(
        source.self.grounded,
        'WeaponCounterplayProbeObservationV1.self.grounded',
      ),
      jumpAvailable: booleanValue(
        source.self.jumpAvailable,
        'WeaponCounterplayProbeObservationV1.self.jumpAvailable',
      ),
      primaryReady: booleanValue(
        source.self.primaryReady,
        'WeaponCounterplayProbeObservationV1.self.primaryReady',
      ),
      primaryRange: assertPositiveFinite(
        source.self.primaryRange,
        'WeaponCounterplayProbeObservationV1.self.primaryRange',
      ),
    }),
    opponent: Object.freeze({
      position: vector(
        source.opponent.position,
        'WeaponCounterplayProbeObservationV1.opponent.position',
      ),
      facingX,
      facingZ,
      actionDefinitionId: source.opponent.actionDefinitionId === null
        ? null
        : assertNonEmptyString(
          source.opponent.actionDefinitionId,
          'WeaponCounterplayProbeObservationV1.opponent.actionDefinitionId',
        ),
      actionPhase: enumValue<WeaponCounterplayActionPhaseV1>(
        source.opponent.actionPhase,
        ACTION_PHASES,
        'WeaponCounterplayProbeObservationV1.opponent.actionPhase',
      ),
    }),
    routeTargets: Object.freeze(routeTargets),
  });
}

function unit(x: number, z: number): Readonly<{ x: number; z: number }> {
  const length = Math.hypot(x, z);
  if (length <= Number.EPSILON) return Object.freeze({ x: 0, z: 0 });
  return Object.freeze({ x: x / length, z: z / length });
}

function stableSide(participantId: string, opponentParticipantId: string): -1 | 1 {
  return participantId < opponentParticipantId ? -1 : 1;
}

function responseIntent(
  response: WeaponCounterplayResponseV1,
  observation: WeaponCounterplayProbeObservationV1,
  preferredRouteTarget: WeaponCounterplayProbeRouteTargetV1 | null,
): Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean }> {
  const toOpponent = unit(
    observation.opponent.position.x - observation.self.position.x,
    observation.opponent.position.z - observation.self.position.z,
  );
  const facing = unit(observation.opponent.facingX, observation.opponent.facingZ);
  const side = stableSide(observation.participantId, observation.opponentParticipantId);
  const canJump = observation.self.grounded && observation.self.jumpAvailable;
  const routeDirection = preferredRouteTarget === null ? null : unit(
    preferredRouteTarget.position.x - observation.self.position.x,
    preferredRouteTarget.position.z - observation.self.position.z,
  );
  const combineWithRoute = (
    moveX: number,
    moveZ: number,
    jumpPressed: boolean,
  ): Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean }> => {
    if (routeDirection === null) return Object.freeze({ moveX, moveZ, jumpPressed });
    const combined = unit(
      moveX * 0.55 + routeDirection.x * 0.85,
      moveZ * 0.55 + routeDirection.z * 0.85,
    );
    const routeNeedsJump = preferredRouteTarget!.traversal === 'jump'
      || preferredRouteTarget!.position.y > observation.self.position.y + 0.2;
    return Object.freeze({
      moveX: combined.x,
      moveZ: combined.z,
      jumpPressed: jumpPressed || (canJump && routeNeedsJump),
    });
  };
  switch (response) {
    case WEAPON_COUNTERPLAY_RESPONSE_V1.RETREAT:
      return combineWithRoute(-toOpponent.x, -toOpponent.z, false);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.CLOSE_INSIDE:
      return combineWithRoute(toOpponent.x, toOpponent.z, false);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.SIDESTEP_LINE:
      return combineWithRoute(-facing.z * side, facing.x * side, false);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.CROSS_FACING:
      return combineWithRoute(-facing.x, -facing.z, false);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.JUMP_AWAY:
      return combineWithRoute(-toOpponent.x, -toOpponent.z, canJump);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.JUMP_TOWARD:
      return combineWithRoute(toOpponent.x, toOpponent.z, canJump);
    case WEAPON_COUNTERPLAY_RESPONSE_V1.CHANGE_HEIGHT:
      return combineWithRoute(-facing.z * side, facing.x * side, canJump);
  }
}

function preferredRouteTarget(
  profile: WeaponCounterplayProbeProfileV1,
  observation: WeaponCounterplayProbeObservationV1,
): WeaponCounterplayProbeRouteTargetV1 | null {
  return observation.routeTargets.find(({ responseKinds }) => (
    responseKinds.includes(profile.routeResponse)
  )) ?? null;
}

function spacingIntent(
  distance: number,
  profile: WeaponCounterplayProbeProfileV1,
  toOpponent: Readonly<{ x: number; z: number }>,
): Readonly<{ x: number; z: number }> {
  if (distance < profile.preferredMinimumDistance) {
    return Object.freeze({ x: -toOpponent.x, z: -toOpponent.z });
  }
  if (distance > profile.preferredMaximumDistance) return toOpponent;
  return Object.freeze({ x: 0, z: 0 });
}

/**
 * Candidate probe for counterplay evaluation. It only consumes a current,
 * restricted observation and only emits the three public player concepts.
 * Hit, movement, cooldown and victory authority remain outside the bot.
 */
export function createWeaponCounterplayProbeInputV1(
  profileValue: unknown,
  observationValue: unknown,
): ArenaInputFrame {
  const profile = createWeaponCounterplayProbeProfileV1(profileValue);
  const observation = createWeaponCounterplayProbeObservationV1(observationValue);
  const toOpponent = unit(
    observation.opponent.position.x - observation.self.position.x,
    observation.opponent.position.z - observation.self.position.z,
  );
  const horizontalDistance = Math.hypot(
    observation.opponent.position.x - observation.self.position.x,
    observation.opponent.position.z - observation.self.position.z,
  );
  const actionDefinitionId = observation.opponent.actionDefinitionId;
  const isGroundAction = actionDefinitionId === profile.groundActionDefinitionId;
  const isAerialAction = actionDefinitionId === profile.aerialActionDefinitionId;
  const isKnownAction = isGroundAction || isAerialAction;
  const canPunish = isKnownAction
    && observation.opponent.actionPhase === WEAPON_COUNTERPLAY_ACTION_PHASE_V1.RECOVERY
    && observation.self.primaryReady
    && horizontalDistance <= observation.self.primaryRange;
  const routeTarget = preferredRouteTarget(profile, observation);

  let move = spacingIntent(horizontalDistance, profile, toOpponent);
  let jumpPressed = false;
  if (isKnownAction && (
    observation.opponent.actionPhase === WEAPON_COUNTERPLAY_ACTION_PHASE_V1.WINDUP
    || observation.opponent.actionPhase === WEAPON_COUNTERPLAY_ACTION_PHASE_V1.ACTIVE
  )) {
    const intent = responseIntent(
      isGroundAction ? profile.groundResponse : profile.aerialResponse,
      observation,
      routeTarget,
    );
    move = Object.freeze({ x: intent.moveX, z: intent.moveZ });
    jumpPressed = intent.jumpPressed;
  } else if (
    isKnownAction
    && observation.opponent.actionPhase === WEAPON_COUNTERPLAY_ACTION_PHASE_V1.RECOVERY
  ) {
    move = toOpponent;
  }

  return normalizeInputFrame({
    tick: observation.tick,
    participantId: observation.participantId,
    moveX: move.x,
    moveZ: move.z,
    primaryPressed: canPunish,
    primaryHeld: false,
    jumpPressed,
    jumpHeld: jumpPressed,
    slamPressed: false,
  }, { expectedTick: observation.tick, participantIds: [observation.participantId] });
}

export const WEAPON_COUNTERPLAY_PROBE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultControllerWired: false as const,
  readsCurrentFactsOnly: true as const,
  exposesFutureMapState: false as const,
  exposesMatchCoreSessionOrRenderer: false as const,
  emittedInputConcepts: Object.freeze(['direction', 'jump', 'primary'] as const),
  emitsBlockOrSlam: false as const,
  validationStatus: 'not-run' as const,
});
