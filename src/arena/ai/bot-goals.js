import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  ARENA_TICK_RATE,
} from '../config.js';

export const BOT_GOAL_ID = Object.freeze({
  INACTIVE: 'inactive',
  RECOVER_EDGE: 'recover-edge',
  EVADE_THREAT: 'evade-threat',
  ATTACK: 'attack',
  REPOSITION: 'reposition',
  CONTROL_CENTER: 'control-center',
});

function distance2d(first, second) {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

function surfaceContains(surface, position, radius = 0) {
  return Math.abs(position.x - surface.center.x) <= surface.halfExtents.x - radius
    && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z - radius;
}

function nearestSurface(arena, position) {
  return arena.surfaces
    .map((surface, index) => ({
      surface,
      index,
      distance: distance2d(surface.center, position),
    }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.surface ?? null;
}

function supportSurface(observation, participant) {
  return observation.arena.surfaces.find(
    (surface) => surface.id === participant.supportSurfaceId,
  ) ?? observation.arena.surfaces.find(
    (surface) => surfaceContains(surface, participant.position),
  ) ?? null;
}

function clearanceFromEdge(surface, position, radius) {
  if (!surface) return Number.NEGATIVE_INFINITY;
  return Math.min(
    surface.halfExtents.x - Math.abs(position.x - surface.center.x) - radius,
    surface.halfExtents.z - Math.abs(position.z - surface.center.z) - radius,
  );
}

function predictedOpponent(context) {
  const { opponent } = context.observation;
  const seconds = context.profile.targetPredictionTicks / ARENA_TICK_RATE;
  return {
    x: opponent.position.x + opponent.velocity.x * seconds,
    y: opponent.position.y + opponent.velocity.y * seconds,
    z: opponent.position.z + opponent.velocity.z * seconds,
  };
}

function clampTargetToSurface(target, surface, margin) {
  if (!surface) return { ...target };
  const marginX = Math.min(margin, surface.halfExtents.x);
  const marginZ = Math.min(margin, surface.halfExtents.z);
  return {
    x: Math.max(
      surface.center.x - surface.halfExtents.x + marginX,
      Math.min(surface.center.x + surface.halfExtents.x - marginX, target.x),
    ),
    y: target.y,
    z: Math.max(
      surface.center.z - surface.halfExtents.z + marginZ,
      Math.min(surface.center.z + surface.halfExtents.z - marginZ, target.z),
    ),
  };
}

function attackGeometry(context) {
  const { observation } = context;
  const target = predictedOpponent(context);
  const dx = target.x - observation.self.position.x;
  const dz = target.z - observation.self.position.z;
  const distance = Math.hypot(dx, dz);
  const directionX = distance > 1e-7 ? dx / distance : observation.self.facing.x;
  const directionZ = distance > 1e-7 ? dz / distance : observation.self.facing.z;
  return {
    target,
    distance,
    verticalDifference: Math.abs(target.y - observation.self.position.y),
    facingDot: directionX * observation.self.facing.x + directionZ * observation.self.facing.z,
  };
}

function canAct(observation) {
  return observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
    && observation.self.hitstunTicks === 0
    && observation.self.action.phase === ARENA_ACTION_PHASE.IDLE
    && observation.opponent.status === ARENA_PARTICIPANT_STATUS.ACTIVE
    && observation.opponent.invulnerableTicks === 0;
}

const EVALUATORS = Object.freeze([
  Object.freeze({
    id: BOT_GOAL_ID.INACTIVE,
    priority: 100,
    score: ({ observation }) => (
      observation.phase !== ARENA_MATCH_PHASE.RUNNING
      && observation.phase !== ARENA_MATCH_PHASE.SUDDEN_DEATH
    ) || observation.self.status !== ARENA_PARTICIPANT_STATUS.ACTIVE ? 1 : 0,
    createPlan: ({ observation }) => ({
      target: { ...observation.self.position },
      speedScale: 0,
      actionCandidate: false,
    }),
  }),
  Object.freeze({
    id: BOT_GOAL_ID.RECOVER_EDGE,
    priority: 90,
    score: (context) => {
      const { observation, profile, personality } = context;
      if (observation.self.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return 0;
      const surface = supportSurface(observation, observation.self);
      const clearance = clearanceFromEdge(
        surface,
        observation.self.position,
        observation.arena.characterRadius,
      );
      if (!surface || !observation.self.grounded) return 0.99;
      const safetyMargin = profile.edgeSafetyMargin * (1.1 - personality.riskTolerance * 0.2);
      if (clearance >= safetyMargin) return 0;
      return Math.min(0.98, 0.82 + (safetyMargin - clearance) / Math.max(1, safetyMargin) * 0.16);
    },
    createPlan: ({ observation }) => {
      const surface = supportSurface(observation, observation.self)
        ?? nearestSurface(observation.arena, observation.self.position);
      return {
        target: surface ? { ...surface.center } : { x: 0, y: 0, z: 0 },
        speedScale: 1,
        actionCandidate: false,
      };
    },
  }),
  Object.freeze({
    id: BOT_GOAL_ID.EVADE_THREAT,
    priority: 85,
    score: (context) => {
      const { observation, profile } = context;
      if (observation.self.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return 0;
      const threatening = observation.opponent.action.phase === ARENA_ACTION_PHASE.WINDUP
        || observation.opponent.action.phase === ARENA_ACTION_PHASE.ACTIVE;
      if (!threatening) return 0;
      const distance = distance2d(observation.self.position, observation.opponent.position);
      if (distance > observation.actionRule.range * 1.45) return 0;
      return Math.min(0.97, 0.35 + profile.threatAwareness * 0.62);
    },
    createPlan: ({ observation, profile }) => {
      const surface = supportSurface(observation, observation.self)
        ?? nearestSurface(observation.arena, observation.self.position);
      const awayX = observation.self.position.x - observation.opponent.position.x;
      const awayZ = observation.self.position.z - observation.opponent.position.z;
      const awayLength = Math.hypot(awayX, awayZ);
      const directionX = awayLength > 1e-7 ? awayX / awayLength : 1;
      const directionZ = awayLength > 1e-7 ? awayZ / awayLength : 0;
      const centerX = (surface?.center.x ?? 0) - observation.self.position.x;
      const centerZ = (surface?.center.z ?? 0) - observation.self.position.z;
      return {
        target: clampTargetToSurface({
          x: observation.self.position.x + directionX * 1.6 + centerX * 0.45,
          y: observation.self.position.y,
          z: observation.self.position.z + directionZ * 1.6 + centerZ * 0.45,
        }, surface, observation.arena.characterRadius + profile.edgeSafetyMargin * 0.45),
        speedScale: 1,
        actionCandidate: false,
      };
    },
  }),
  Object.freeze({
    id: BOT_GOAL_ID.ATTACK,
    priority: 80,
    score: (context) => {
      if (!canAct(context.observation)) return 0;
      const geometry = attackGeometry(context);
      if (
        geometry.distance > context.observation.actionRule.range * context.profile.attackRangeScale
        || geometry.verticalDifference > context.observation.actionRule.maximumVerticalDifference
        || geometry.facingDot < context.observation.actionRule.minimumFacingDot
      ) return 0;
      const targetSurface = supportSurface(context.observation, context.observation.opponent);
      const targetClearance = clearanceFromEdge(
        targetSurface,
        context.observation.opponent.position,
        context.observation.arena.characterRadius,
      );
      const exposure = targetSurface
        ? Math.max(0, 1 - targetClearance / Math.max(targetSurface.halfExtents.x, targetSurface.halfExtents.z))
        : 1;
      return Math.min(1, 0.84 + exposure * 0.1 + context.personality.aggression * 0.06);
    },
    createPlan: (context) => {
      const { observation, profile } = context;
      const surface = supportSurface(observation, observation.self)
        ?? nearestSurface(observation.arena, observation.self.position);
      return {
        // A delayed target may already be falling. Clamp pursuit to safe ground
        // so faster planning does not make a stronger bot chase over the rim.
        target: clampTargetToSurface(
          attackGeometry(context).target,
          surface,
          observation.arena.characterRadius + profile.edgeSafetyMargin * 0.5,
        ),
        speedScale: 0.65,
        actionCandidate: true,
      };
    },
  }),
  Object.freeze({
    id: BOT_GOAL_ID.REPOSITION,
    priority: 50,
    score: ({ observation, personality }) => (
      observation.opponent.status === ARENA_PARTICIPANT_STATUS.ACTIVE
        ? Math.min(0.82, 0.54 + personality.aggression * 0.18 + personality.patience * 0.08)
        : 0
    ),
    createPlan: (context) => {
      const { observation, personality, profile } = context;
      const target = predictedOpponent(context);
      const surface = supportSurface(observation, observation.opponent)
        ?? nearestSurface(observation.arena, target);
      const center = surface?.center ?? { x: 0, y: target.y, z: 0 };
      const outwardX = target.x - center.x;
      const outwardZ = target.z - center.z;
      const length = Math.hypot(outwardX, outwardZ);
      const directionX = length > 1e-7 ? outwardX / length : 1;
      const directionZ = length > 1e-7 ? outwardZ / length : 0;
      const preferredDistance = observation.actionRule.range
        * (0.72 + personality.patience * 0.12);
      return {
        target: clampTargetToSurface({
          x: target.x - directionX * preferredDistance,
          y: target.y,
          z: target.z - directionZ * preferredDistance,
        }, surface, observation.arena.characterRadius + profile.edgeSafetyMargin * 0.35),
        speedScale: 1,
        actionCandidate: false,
      };
    },
  }),
  Object.freeze({
    id: BOT_GOAL_ID.CONTROL_CENTER,
    priority: 10,
    score: () => 0.25,
    createPlan: ({ observation }) => {
      const surface = nearestSurface(observation.arena, observation.self.position);
      return {
        target: surface ? { ...surface.center } : { x: 0, y: 0, z: 0 },
        speedScale: 0.75,
        actionCandidate: false,
      };
    },
  }),
]);

export function getArenaBotEvaluators() {
  return EVALUATORS;
}
